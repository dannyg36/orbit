"""The night run: drift -> life events -> targets -> matchmaker -> negotiation -> Fo -> morning brief."""
import asyncio
import os
from datetime import date
from typing import AsyncIterator

import drift
import fo
import matchmaker
import memory
import negotiate
import state
from models import AgentMessage, FoTask, Proposal

MAX_OUTREACH = int(os.environ.get("ORBIT_MAX_OUTREACH", 3))
GIFT_BUDGET = int(os.environ.get("ORBIT_GIFT_BUDGET", 40))
STEPS = [
    ("drift", "Checked who's drifting", "12:04 AM"),
    ("life", "Looked for things worth celebrating", "12:47 AM"),
    ("targets", "Picked tonight's reach-outs", "1:31 AM"),
    ("match", "Found two friends who should meet", "2:18 AM"),
    ("negotiate", "Planned a dinner with their agents", "3:12 AM"),
    ("fo", "Handed the real-world bits to Fo", "4:26 AM"),
    ("brief", "Wrote your morning brief", "5:50 AM"),
]


def names(orbit, ids):
    n = [next(f["name"] for f in orbit["friends"] if f["id"] == i) for i in ids]
    return n[0] if len(n) == 1 else f"{', '.join(n[:-1])} & {n[-1]}"


async def run(pace: float = 1.0, dry: bool = False, seed_rsvps: bool = False) -> AsyncIterator[dict]:
    """dry=True plans the whole night but never contacts Fo (used when the brief is opened without a real run).
    seed_rsvps=True pretends all but one guest already replied (video mode only)."""
    nap = lambda s: asyncio.sleep(s * pace)
    fo.clear()
    orbit = drift.compute()
    people = {f["id"]: f for f in orbit["friends"]}
    me = orbit["me"]["name"]
    idx = {k: i for i, (k, _, _) in enumerate(STEPS)}

    def start(key):
        return {"type": "step_start", "key": key, "index": idx[key], "clock": STEPS[idx[key]][2]}

    def done(key, detail):
        return {"type": "step_done", "key": key, "index": idx[key], "detail": detail}

    yield {"type": "plan", "steps": [{"key": k, "title": t, "clock": c} for k, t, c in STEPS], "fo_mode": fo.mode()}
    await nap(0.8)

    # 1. drift
    yield start("drift"); await nap(1.6)
    drifting = [f for f in orbit["friends"] if f["status"] == "drifted"]
    cluster = orbit["clusters"][0] if orbit["clusters"] else []
    yield done("drift", f"{len(drifting)} friends past the drift line. {names(orbit, cluster)} drifted together." if cluster else f"{len(drifting)} friends past the drift line.")
    await nap(0.5)

    # 2. life events
    yield start("life"); await nap(1.6)
    celebrate = [f for f in orbit["friends"] if f["life_event"]]
    yield done("life", " · ".join(f["life_event"]["summary"] for f in celebrate) or "Nothing new tonight.")
    await nap(0.5)

    # 3. targets (max 3 outreach per night)
    yield start("targets"); await nap(1.5)
    targets = []
    if cluster:
        targets.append({"kind": "group", "friends": cluster})
    singles = sorted((f for f in drifting if f["id"] not in cluster), key=lambda f: -f["urgency"])
    birthdays = [f for f in celebrate if f["life_event"]["type"] == "birthday" and f["life_event"]["upcoming"]]
    for f in birthdays:
        targets.append({"kind": "gift", "friends": [f["id"]]})
    for f in singles:
        targets.append({"kind": "checkin", "friends": [f["id"]]})
    targets = targets[:MAX_OUTREACH]
    label = {"group": "one dinner for {}", "gift": "something for {}'s birthday", "checkin": "a hello to {}"}
    line = "; ".join(label[t["kind"]].format(names(orbit, t["friends"])) for t in targets)
    yield done("targets", line[:1].upper() + line[1:] + ".")
    await nap(0.5)

    # 4. matchmaker
    yield start("match"); await nap(1.6)
    intro = matchmaker.suggest(orbit)
    yield done("match", f"{people[intro['a']]['name']} and {people[intro['b']]['name']}: {intro['reason']}" if intro else "No intros tonight.")
    await nap(0.5)

    # 5. agent-to-agent negotiation
    yield start("negotiate"); await nap(0.9)
    proposal: Proposal | None = None
    if cluster:
        yield {"type": "negotiation_open", "participants": cluster}
        for item in negotiate.negotiate(cluster, orbit["life_events"]):
            if isinstance(item, AgentMessage):
                yield {"type": "typing", "sender": item.sender}
                await nap(1.25 if item.sender == "me" else 0.95)
                yield {"type": "agent_message", "message": item.model_dump()}
                await nap(0.55)
            else:
                proposal = item
        memory.remember("me", f"Dinner with {names(orbit, cluster)}: {proposal.time} at {proposal.venue.name}", kind="plan")
    yield done("negotiate", f"{proposal.time} at {proposal.venue.name}. Everyone's agent said yes." if proposal else "Nothing to schedule.")
    await nap(0.6)

    # 6. Fo: no-spend goes out now, spend waits for the morning
    yield start("fo"); await nap(0.8)
    tasks: list[FoTask] = []
    if proposal:
        v = proposal.venue
        for p in cluster:
            others = names(orbit, [x for x in cluster if x != p])
            tasks.append(FoTask(
                id=f"invite_{p}", kind="invite", friends=[p], emails=[people[p]["email"]], title=f"Dinner invite to {people[p]['name']}",
                body=(f"Please email {people[p]['name']} <{people[p]['email']}>:\n\n"
                      f"Hi {people[p]['name']}, this is {me}'s assistant. {me} would love to get everyone back around a table: "
                      f"{proposal.time} at {v.name} ({v.walk_min} min walk from {v.near}). {others} are invited too. "
                      f"Can you make it? A quick yes or no is perfect.\n\n{me}'s assistant")))
    for t in targets:
        f = people[t["friends"][0]]
        if t["kind"] == "checkin":
            tasks.append(FoTask(
                id=f"checkin_{f['id']}", kind="checkin", friends=[f["id"]], emails=[f["email"]], title=f"Checked in with {f['name']}",
                body=(f"Please email {f['name']} <{f['email']}>:\n\nHi {f['name']}, this is {me}'s assistant. It's been a while and {me}'s been "
                      f"meaning to catch up. Any chance you're free for a coffee in the next couple of weeks?\n\n{me}'s assistant")))
        if t["kind"] == "gift":
            like = next((m["fact"] for m in memory.recall(f["id"], ("preference",))), "")
            day = date.fromisoformat(f["life_event"]["date"]).strftime("%A")
            tasks.append(FoTask(
                id=f"gift_{f['id']}", kind="gift", friends=[f["id"]], emails=[f["email"]], spend=GIFT_BUDGET, title=f"Send {f['name']} birthday flowers",
                body=(f"Order a flower delivery for {f['name']} for {day}, up to ${GIFT_BUDGET} on {me}'s one-time card. Note from memory: {like}. "
                      f"Card message: \"Happy birthday, {f['name']}! Love, {me}\"")))
    if intro:
        a, b = people[intro["a"]], people[intro["b"]]
        tasks.append(FoTask(
            id="intro", kind="intro", friends=[a["id"], b["id"]], emails=[a["email"], b["email"]], title=f"Introduce {a['name']} and {b['name']}",
            body=(f"Please email {a['name']} <{a['email']}> and {b['name']} <{b['email']}> together:\n\n"
                  f"Hi {a['name']} and {b['name']}, this is {me}'s assistant. {me} thinks you two should meet. {intro['reason']} "
                  f"I'll leave you to it!\n\n{me}'s assistant")))
    await asyncio.to_thread(fo.dispatch_many, tasks, False, dry)  # one hand-off to Fo; never blocks the event loop
    for t in tasks:
        yield {"type": "fo_task", "task": t.model_dump()}
        await nap(0.7)
    if fo.LAST.get("text"):
        yield {"type": "fo_reply", "status": fo.LAST.get("status"), "text": fo.LAST["text"]}
        await nap(0.8)
    live = sum(t.status == "sent" for t in tasks)
    held = sum(t.status == "needs_approval" for t in tasks)
    logged = len(tasks) - live - held
    parts = ([f"{live} sent to Fo"] if live else []) + ([f"{logged} logged (dry run)"] if logged else []) + [f"{held} saved for your OK"]
    yield done("fo", ", ".join(parts) + ".")
    await nap(0.5)

    # 7. morning brief
    yield start("brief"); await nap(1.4)
    state.S["night"] = {"proposal": proposal.model_dump() if proposal else None, "tasks": {t.id: t for t in tasks},
                        "intro": intro, "cluster": cluster}
    state.S["rsvps"] = {p: ("in" if seed_rsvps and i < len(cluster) - 1 else "sent") for i, p in enumerate(cluster)}
    yield done("brief", "Ready when you wake up.")
    await nap(0.6)
    yield {"type": "done", "brief": brief()}


def gift_detail(f: dict) -> str:
    ev = f.get("life_event")
    day = date.fromisoformat(ev["date"]).strftime("%A") if ev else "soon"
    like = next((m["fact"] for m in memory.recall(f["id"], ("preference",))), None)
    return f"{f['name']}'s birthday is {day}. " + (f"Orbit remembers: {like[0].lower()}{like[1:]}." if like else "Flowers, delivered that morning.")


def brief() -> dict | None:
    night = state.S.get("night")
    if not night:
        return None
    orbit = drift.compute()
    people = {f["id"]: f for f in orbit["friends"]}
    me = orbit["me"]["name"]
    tasks: dict[str, FoTask] = night["tasks"]
    approvals = []
    for t in tasks.values():
        if t.kind == "gift":
            f = people[t.friends[0]]
            approvals.append({"id": t.id, "kind": "gift", "friends": t.friends, "status": t.status,
                              "title": f"Send {f['name']} birthday flowers?",
                              "detail": gift_detail(f),
                              "cost": f"${t.spend:.0f} · one-time card", "yes": "Yes, send", "no": "Not now"})
        if t.kind == "intro":
            a, b = people[t.friends[0]], people[t.friends[1]]
            approvals.append({"id": t.id, "kind": "intro", "friends": t.friends, "status": t.status,
                              "title": f"Introduce {a['name']} and {b['name']}?", "detail": night["intro"]["reason"],
                              "cost": "Free · one short email", "yes": "Introduce them", "no": "Not now"})
    handled = []
    p = night["proposal"]
    if p:
        handled.append({"kind": "dinner", "title": "Dinner's on!", "when": p["time"], "venue": p["venue"], "reason": p["reason"],
                        "talk_about": p["memory_hook"],
                        "rsvps": [{"friend": f, "status": state.S["rsvps"].get(f, "sent")} for f in p["participants"]]})
    for t in tasks.values():
        if t.kind == "checkin":
            handled.append({"kind": "checkin", "friend": t.friends[0], "title": f"Fo checked in with {people[t.friends[0]]['name']}",
                            "detail": f"A short hello from {me}'s assistant. No reply yet.", "status": t.status})
    open_n = sum(a["status"] == "needs_approval" for a in approvals)
    n = len(night["cluster"])
    word = {0: "Nothing needs", 1: "One quick thing needs", 2: "Two quick things need", 3: "Three quick things need"}.get(open_n, f"{open_n} quick things need")
    return {"greeting": f"Good morning, {me}!",
            "summary": f"While you slept, {n} friends came back into your orbit. {word} your OK.",
            "approvals": approvals, "handled": handled, "reunited": night["cluster"], "fo_mode": fo.mode(),
            "fo": {"status": fo.LAST.get("status"), "text": fo.LAST.get("text", "")},
            "outbox": fo.outbox()}


async def run_silently():
    async for _ in run(pace=0, dry=True, seed_rsvps=True):
        pass
