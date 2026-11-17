"""Memory interface. Default backend: JSON store. Set ORBIT_MEMORY=cognee to mirror writes into Cognee
(best effort; reads always come from the JSON store so the demo stays deterministic)."""
import json
import os
from pathlib import Path

DATA = Path(__file__).parent / "data"
STORE = DATA / "memory_store.json"
BACKEND = "json"


def _load() -> list[dict]:
    try:
        return json.loads(STORE.read_text())
    except Exception:
        return []


def _cognee(make_coro, timeout: float = 90):
    """Run a Cognee coroutine on its own loop/thread (FastAPI already owns one). None on any failure."""
    if os.environ.get("ORBIT_MEMORY") != "cognee":
        return None
    try:
        import asyncio
        from concurrent.futures import ThreadPoolExecutor

        import cognee

        with ThreadPoolExecutor(1) as pool:
            out = pool.submit(lambda: asyncio.run(make_coro(cognee))).result(timeout=timeout)
        global BACKEND
        BACKEND = "cognee+json"
        return out
    except Exception as e:
        print(f"[memory] cognee unavailable, using JSON store ({type(e).__name__}: {e})")
        return None


def _mirror_to_cognee(text: str):
    _cognee(lambda c: c.add(text, dataset_name="orbit"))


def sync():
    """Build Cognee's graph from everything added so far (no-op on the JSON backend)."""
    _cognee(lambda c: c.cognify(datasets="orbit"), timeout=240)


def ask(question: str) -> str | None:
    """Free-text recall through Cognee's graph search. None on the JSON backend (callers fall back to recall())."""
    res = _cognee(lambda c: c.search(query_text=question, datasets="orbit"))
    if not res:
        return None
    first = res[0]
    text = getattr(first, "search_result", first)
    return str(text[0] if isinstance(text, list) and text else text)[:400]


def reset():
    from ingest import load
    load("mock_contacts.json")  # makes sure the mock world exists
    STORE.write_text(json.dumps(json.loads((DATA / "memory_seed.json").read_text()), indent=2))


def remember(subject: str, fact: str, chip: str | None = None, kind: str = "note"):
    items = _load()
    if any(i["subject"] == subject and i["fact"] == fact for i in items):
        return
    items.append({"subject": subject, "fact": fact, "chip": chip or fact, "kind": kind})
    STORE.write_text(json.dumps(items, indent=2))
    _mirror_to_cognee(f"{subject}: {fact}")


def recall(subject: str, kinds: tuple[str, ...] | None = None) -> list[dict]:
    return [i for i in _load() if i["subject"] == subject and (kinds is None or i["kind"] in kinds)]


if not STORE.exists():
    reset()
