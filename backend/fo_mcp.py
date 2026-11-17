"""Fo over MCP (https://mcp.api.wajo.ai/fo). OAuth tokens live in .fo_mcp.json (gitignored).

  python fo_mcp.py login    # one-time: opens the browser so YOU approve Orbit's access to Fo
  python fo_mcp.py tools    # list Fo's tools
  python fo_mcp.py status

The server never starts a browser flow on its own: without saved tokens Fo stays in dry-run."""
import asyncio
import json
import os
import sys
import webbrowser
from contextlib import asynccontextmanager
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from mcp import ClientSession
from mcp.client.auth import OAuthClientProvider, TokenStorage
from mcp.client.streamable_http import create_mcp_http_client, streamable_http_client
from mcp.shared.auth import AuthorizationCodeResult, OAuthClientInformationFull, OAuthClientMetadata, OAuthToken

URL = os.environ.get("FO_MCP_URL", "https://mcp.api.wajo.ai/fo")
STORE = Path(__file__).parent / ".fo_mcp.json"
CALLBACK_PORT = 8765
REDIRECT = f"http://127.0.0.1:{CALLBACK_PORT}/callback"


class FileStorage(TokenStorage):
    def _read(self) -> dict:
        try:
            return json.loads(STORE.read_text())
        except Exception:
            return {}

    def _write(self, key: str, value: dict):
        data = self._read()
        data[key] = value
        STORE.write_text(json.dumps(data))
        STORE.chmod(0o600)

    async def get_tokens(self):
        t = self._read().get("tokens")
        return OAuthToken.model_validate(t) if t else None

    async def set_tokens(self, tokens):
        self._write("tokens", tokens.model_dump(mode="json"))

    async def get_client_info(self):
        c = self._read().get("client")
        return OAuthClientInformationFull.model_validate(c) if c else None

    async def set_client_info(self, client_info):
        self._write("client", client_info.model_dump(mode="json"))


def connected() -> bool:
    try:
        return bool(json.loads(STORE.read_text()).get("tokens"))
    except Exception:
        return False


async def _open_browser(url: str):
    print(f"\nApprove Orbit's access to Fo in your browser:\n{url}\n", flush=True)
    webbrowser.open(url)


async def _no_browser(url: str):
    raise RuntimeError("Fo MCP needs a fresh login: run `python fo_mcp.py login`")


async def _wait_for_callback() -> AuthorizationCodeResult:
    got: dict = {}

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            q = parse_qs(urlparse(self.path).query)
            got.update({k: v[0] for k, v in q.items()})
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<body style='font-family:sans-serif;background:#04060E;color:#F5F5F7;padding:48px'><h2>Orbit is connected to Fo.</h2>You can close this tab.</body>")

        def log_message(self, *a):
            pass

    server = HTTPServer(("127.0.0.1", CALLBACK_PORT), Handler)
    server.timeout = 1
    loop = asyncio.get_running_loop()
    for _ in range(420):  # wait up to 7 minutes for the approval
        await loop.run_in_executor(None, server.handle_request)
        if "code" in got or "error" in got:
            break
    server.server_close()
    if "code" not in got:
        raise RuntimeError(f"Fo login was not completed ({got.get('error', 'timed out')})")
    return AuthorizationCodeResult(code=got["code"], state=got.get("state"), iss=got.get("iss"))


@asynccontextmanager
async def session(interactive: bool = False):
    auth = OAuthClientProvider(
        server_url=URL,
        client_metadata=OAuthClientMetadata(
            client_name="Orbit", redirect_uris=[REDIRECT], grant_types=["authorization_code", "refresh_token"],
            response_types=["code"], token_endpoint_auth_method="none", scope="mcp"),
        storage=FileStorage(),
        redirect_handler=_open_browser if interactive else _no_browser,
        callback_handler=_wait_for_callback,
    )
    async with create_mcp_http_client(auth=auth) as http:
        async with streamable_http_client(URL, http_client=http) as streams:
            async with ClientSession(streams[0], streams[1]) as s:
                await s.initialize()
                yield s


async def list_tools(interactive: bool = False) -> list[dict]:
    async with session(interactive) as s:
        return [t.model_dump(mode="json", exclude_none=True) for t in (await s.list_tools()).tools]


async def call(tool: str, arguments: dict, timeout: float = 100) -> dict:
    """Call one Fo tool and return its structured result as a dict."""
    async with session() as s:
        res = await s.call_tool(tool, arguments, read_timeout_seconds=timeout)
        text = "\n".join(getattr(c, "text", "") or "" for c in getattr(res, "content", None) or [])
        if getattr(res, "is_error", False) or getattr(res, "isError", False):
            raise RuntimeError(text or "Fo returned an error")
        data = getattr(res, "structured_content", None) or getattr(res, "structuredContent", None)
        if not data:
            try:
                data = json.loads(text)
            except Exception:
                data = {"status": "complete", "response": text}
        return dict(data)


def call_sync(tool: str, arguments: dict, timeout: float = 100) -> dict:
    return asyncio.run(call(tool, arguments, timeout))


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    if cmd == "status":
        print("connected" if connected() else "not connected")
    elif cmd in ("login", "tools"):
        try:
            tools = asyncio.run(list_tools(interactive=cmd == "login"))
        except BaseException as e:  # the SDK wraps failures in exception groups
            causes = getattr(e, "exceptions", [e])
            print("Not connected to Fo:", "; ".join(str(c) for c in causes))
            sys.exit(1)
        print(f"Connected to Fo. {len(tools)} tools:")
        print(json.dumps(tools, indent=1))
