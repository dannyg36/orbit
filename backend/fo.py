"""Fo (wajo.ai's action agent). Three ways out, best available wins:

  mcp      Fo's MCP server (`python fo_mcp.py login` once, then FO_LIVE=1). Tasks go to Fo's `ask_fo` tool.
  smtp     Email the task to FO_EMAIL through Gmail (SMTP_USER / SMTP_APP_PASSWORD).
  dry_run  Log only.

Every dispatch is logged to fo_outbox.json and shown in the UI. Fo writes from its own address as
"<you>'s assistant" and never as you. Anything that spends money (and any intro) waits for morning approval.
Tasks for friends with placeholder @example.com addresses are never sent live."""
import json
import os
import smtplib
from datetime import datetime
from email.message import EmailMessage
from pathlib import Path

from models import FoTask

OUTBOX = Path(__file__).parent / "fo_outbox.json"


def me() -> str:
    from ingest import ingest
    return ingest()["me"]["name"]


def rules() -> str:
    return (f"Ground rules: write from your own address and sign as \"{me()}'s assistant\". Never write as {me()}. "
            f"Do not spend money unless a task says {me()} approved it.")


LAST: dict = {}  # most recent Fo conversation: {conversationId, status, text}
SENT = Path(__file__).parent / ".fo_sent.json"  # live hand-offs already made, so repeat takes never re-send


def _sent() -> dict:
    try:
        return json.loads(SENT.read_text())
    except Exception:
        return {}


def _key(tasks: list[FoTask]) -> str:
    import hashlib
    return hashlib.sha256("\n".join(sorted(t.id + t.body for t in tasks)).encode()).hexdigest()[:24]


def smtp_ready() -> bool:
    return all(os.environ.get(k) for k in ("FO_EMAIL", "SMTP_USER", "SMTP_APP_PASSWORD"))


def mcp_connected() -> bool:
    try:
        import fo_mcp
        return fo_mcp.connected()
    except Exception:
        return False


def mode() -> str:
    if os.environ.get("FO_LIVE") == "1" and mcp_connected():
        return "mcp"
    return "smtp" if smtp_ready() else "dry_run"


def outbox() -> list[dict]:
    try:
        return json.loads(OUTBOX.read_text())
    except Exception:
        return []


def clear():
    OUTBOX.write_text("[]")
    LAST.clear()


def _log(task: FoTask):
    items = [t for t in outbox() if t["id"] != task.id] + [task.model_dump()]
    OUTBOX.write_text(json.dumps(items, indent=2))


def _placeholder(task: FoTask) -> bool:
    return not task.emails or any(e.endswith("@example.com") for e in task.emails)


def _describe(task: FoTask) -> str:
    earlier = _sent().get("_tasks", {}).get(task.id)
    update = ("This replaces an earlier version of the same task that you already carried out. "
              "Make clear to the recipient that it is an update.\n") if earlier and earlier != task.body else ""
    return f"{task.title}\n{update}" + (f"{me()} approved spending up to ${task.spend:.0f}.\n" if task.spend else "") + task.body


def _remember(res: dict):
    working = res.get("status") == "working"  # while working, `response` is only polling guidance
    text = (res.get("progress") or "Working on it") if working else (res.get("response") or res.get("progress") or "")
    LAST.update(conversationId=res.get("conversationId"), status=res.get("status", "working"), text=" ".join(text.split())[:400])


def _ask_fo(tasks: list[FoTask]) -> dict:
    import fo_mcp

    listing = "\n\n".join(f"{i}. {_describe(t)}" for i, t in enumerate(tasks, 1))
    message = (f"Orbit, {me()}'s friendship app, is passing along {'a task' if len(tasks) == 1 else f'{len(tasks)} tasks'} "
               f"{me()} set up tonight. Please do {'it' if len(tasks) == 1 else 'each one'}.\n{rules()}\n\n{listing}")
    res = fo_mcp.call_sync("ask_fo", {"message": message, "newConversation": True})
    _remember(res)
    return res


def _send_smtp(task: FoTask):
    msg = EmailMessage()
    msg["Subject"] = f"[Orbit] {task.title}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = os.environ["FO_EMAIL"]
    msg.set_content(f"Hi Fo, a task from Orbit on behalf of {me()}.\n\n{rules()}\n\n{_describe(task)}\n")
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15) as s:
        s.login(os.environ["SMTP_USER"], os.environ["SMTP_APP_PASSWORD"])
        s.send_message(msg)


def dispatch_many(tasks: list[FoTask], approved: bool = False, dry: bool = False) -> list[FoTask]:
    """Send what can go now; park anything that needs the user's OK. Blocking: call from a worker thread.
    dry=True never contacts Fo, whatever the mode."""
    now, m = datetime.now().isoformat(timespec="seconds"), "dry_run" if dry else mode()
    ready = []
    for t in tasks:
        t.ts = now
        if (t.spend > 0 or t.kind == "intro") and not approved:
            t.status, t.note = "needs_approval", "saved for your OK in the morning"
        elif m != "dry_run" and _placeholder(t):
            t.status, t.note = "dry_run", "placeholder address: logged, not sent"
        elif m == "dry_run":
            t.status, t.note = "dry_run", "dry run: logged to fo_outbox.json"
        else:
            ready.append(t)
    if ready and m == "mcp":
        try:
            key, sent = _key(ready), _sent()
            if key in sent:  # this exact hand-off already went out: don't email people twice
                res = sent[key]
                _remember(res)
            else:
                res = _ask_fo(ready)
                sent[key] = {**res, "at": now}
                sent.setdefault("_tasks", {}).update({t.id: t.body for t in ready})
                SENT.write_text(json.dumps(sent, indent=1))
            for t in ready:
                t.status, t.note = "sent", "handed to Fo" if res.get("status") != "failed" else "Fo could not do this"
                if res.get("status") == "failed":
                    t.status = "failed"
        except BaseException as e:
            why = "; ".join(str(x) for x in getattr(e, "exceptions", [e]))[:120]
            for t in ready:
                t.status, t.note = "dry_run", f"Fo unreachable ({why}); logged only"
    elif ready:  # smtp
        for t in ready:
            try:
                _send_smtp(t)
                t.status, t.note = "sent", f"emailed to Fo ({os.environ['FO_EMAIL']})"
            except Exception as e:
                t.status, t.note = "dry_run", f"SMTP failed ({type(e).__name__}); logged only"
    for t in tasks:
        _log(t)
    return tasks


def dispatch(task: FoTask, approved: bool = False) -> FoTask:
    return dispatch_many([task], approved)[0]


def decline(task: FoTask) -> FoTask:
    task.status, task.note = "declined", "not now"
    _log(task)
    return task


def poll(wait: int = 0) -> dict:
    """Latest word from Fo on the most recent hand-off. Blocking: call from a worker thread."""
    if mode() == "mcp" and LAST.get("status") == "working":
        try:
            import fo_mcp
            args = {"waitSeconds": wait}
            if LAST.get("conversationId"):
                args["conversationId"] = LAST["conversationId"]
            res = fo_mcp.call_sync("get_fo_reply", args)
            _remember(res)
            sent = _sent()
            for k, v in sent.items():  # keep the saved hand-off in step with Fo's latest word
                if k != "_tasks" and v.get("conversationId") == res.get("conversationId"):
                    sent[k] = {**v, **res}
            SENT.write_text(json.dumps(sent, indent=1))
        except BaseException as e:
            print(f"[fo] poll failed: {e}")
    return {"mode": mode(), "connected": mcp_connected(), "status": LAST.get("status"), "text": LAST.get("text", "")}
