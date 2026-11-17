import asyncio
import json

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.responses import StreamingResponse  # noqa: E402
from pydantic import BaseModel  # noqa: E402

import drift  # noqa: E402
import fo  # noqa: E402
import llm  # noqa: E402
import matchmaker  # noqa: E402
import memory  # noqa: E402
import night_run  # noqa: E402
import state  # noqa: E402
from ingest import ingest  # noqa: E402

app = FastAPI(title="Orbit")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def sse(gen):
    async def wrap():
        async for item in gen:
            yield f"data: {json.dumps(item)}\n\n"
    return StreamingResponse(wrap(), media_type="text/event-stream", headers=SSE_HEADERS)


def orbit_view(ff: int = 0) -> dict:
    o = drift.compute(ff)
    for f in o["friends"]:
        f["memory"] = [m["chip"] for m in memory.recall(f["id"], ("interest", "preference", "schedule"))]
    intro = matchmaker.suggest(o) if ff == 0 else (state.S.get("_intro"))
    if ff == 0:
        state.S["_intro"] = intro
    if intro:
        intro = {**intro, "confirmed": state.S["intro_confirmed"]}
    drifting = [f for f in o["friends"] if f["status"] == "drifted"]
    o["intro"] = intro
    o["tonight"] = {"drifting": len(drifting), "groups": len(o["clusters"]),
                    "celebrate": sum(1 for f in o["friends"] if f["life_event"]), "intros": 1 if intro and not intro["confirmed"] else 0}
    o["integrations"] = {"llm": "live" if llm.has_key() else "cached/fallback", "fo": fo.mode(), "memory": memory.BACKEND}
    return o


@app.get("/api/orbit")
def get_orbit(ff: int = 0):
    return orbit_view(ff)


@app.get("/api/ingest/stream")
async def ingest_stream(pace: float = 1.0):
    async def gen():
        g, o = ingest(), drift.compute()
        nap = lambda s: asyncio.sleep(s * pace)
        yield {"type": "stage", "key": "calendar", "state": "working"}
        await nap(0.9)
        for f in o["friends"]:
            yield {"type": "friend", "id": f["id"]}
            await nap(0.42)
        yield {"type": "stage", "key": "calendar", "state": "done", "count": g["stats"]["events"]}
        yield {"type": "stage", "key": "inbox", "state": "working"}
        await nap(1.3)
        celebrate = [f["id"] for f in o["friends"] if f["life_event"]]
        yield {"type": "stage", "key": "inbox", "state": "done", "count": len(celebrate), "friends": celebrate}
        yield {"type": "stage", "key": "links", "state": "working"}
        await nap(0.7)
        for i, l in enumerate(o["links"]):
            yield {"type": "link", "a": l["a"], "b": l["b"], "plans": l["plans"], "n": i + 1}
            await nap(0.36)
        yield {"type": "stage", "key": "links", "state": "done", "count": len(o["links"])}
        await nap(0.4)
        yield {"type": "done"}
    return sse(gen())


@app.api_route("/api/night-run", methods=["GET", "POST"])
async def night(pace: float = 1.0, demo: bool = False):
    return sse(night_run.run(pace, seed_rsvps=demo))


@app.get("/api/brief")
async def get_brief():
    if not state.S.get("night"):
        await night_run.run_silently()
    return night_run.brief()


class FriendBody(BaseModel):
    friend: str
    ff: int = 0


@app.post("/api/hangout")
def hangout(b: FriendBody):
    state.S["resets"][b.friend] = b.ff  # "We hung out!" on (today + ff)
    return orbit_view(b.ff)


class ApproveBody(BaseModel):
    id: str
    yes: bool


@app.post("/api/approve")
async def approve(b: ApproveBody):
    if not state.S.get("night"):
        await night_run.run_silently()
    task = state.S["night"]["tasks"][b.id]
    if b.yes:
        await asyncio.to_thread(fo.dispatch, task, True)
        if task.kind == "intro":
            state.S["intro_confirmed"] = True
    else:
        fo.decline(task)
    return night_run.brief()


@app.post("/api/intro/confirm")
async def intro_confirm():
    return await approve(ApproveBody(id="intro", yes=True))


@app.post("/api/simulate-reply")
def simulate_reply(b: FriendBody):
    state.S["rsvps"][b.friend] = "in"
    return night_run.brief()


@app.get("/api/fo/status")
async def fo_status(wait: int = 0):
    return await asyncio.to_thread(fo.poll, min(max(wait, 0), 30))


@app.get("/api/fo/outbox")
def fo_outbox():
    return {"mode": fo.mode(), "items": fo.outbox()}


@app.post("/api/demo/reset")
def demo_reset():
    state.reset()
    memory.reset()
    fo.clear()
    return {"ok": True}
