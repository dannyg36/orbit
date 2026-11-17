"""Anthropic wrapper: JSON out, pydantic-validated, cached by input hash, always has a fallback."""
import hashlib
import json
import os
import re
from pathlib import Path
from typing import Callable, Type, TypeVar

from pydantic import BaseModel, ValidationError

MODEL = "claude-sonnet-5-5"
CACHE_PATH = Path(__file__).parent / "data" / "llm_cache.json"
T = TypeVar("T", bound=BaseModel)
_client = None


def _cache() -> dict:
    try:
        return json.loads(CACHE_PATH.read_text())
    except Exception:
        return {}


def has_key() -> bool:
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def _call(system: str, prompt: str) -> str:
    global _client
    import anthropic

    if _client is None:
        _client = anthropic.Anthropic(timeout=45.0, max_retries=1)
    kwargs = dict(
        model=MODEL, max_tokens=4000, system=system,
        output_config={"effort": "low"},
        messages=[{"role": "user", "content": prompt}],
    )
    try:  # server-side refusal fallback (beta); plain call if this SDK/route rejects it
        resp = _client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kwargs)
    except (TypeError, anthropic.BadRequestError):
        resp = _client.messages.create(**kwargs)
    if resp.stop_reason == "refusal":
        raise RuntimeError("model declined")
    return "".join(b.text for b in resp.content if b.type == "text")


def ask_json(system: str, prompt: str, schema: Type[T], fallback: Callable[[], T]) -> tuple[T, str]:
    """Returns (validated object, source) where source is cache | llm | fallback."""
    system = system + "\nReply with a single JSON object matching this schema, no prose:\n" + json.dumps(schema.model_json_schema())
    key = hashlib.sha256(f"{MODEL}\n{system}\n{prompt}".encode()).hexdigest()
    cache = _cache()
    if key in cache:
        try:
            return schema.model_validate(cache[key]), "cache"
        except ValidationError:
            pass
    if has_key():
        try:
            text = _call(system, prompt)
            m = re.search(r"\{.*\}", text, re.S)
            obj = schema.model_validate_json(m.group(0) if m else text)
            cache[key] = obj.model_dump()
            CACHE_PATH.write_text(json.dumps(cache, indent=2))
            return obj, "llm"
        except Exception as e:  # never block the night run on the LLM
            print(f"[llm] falling back ({type(e).__name__}: {e})")
    return fallback(), "fallback"
