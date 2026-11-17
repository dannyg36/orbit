"""Life-event gravity: LLM pulls {friend, type, date, summary} out of the inbox (heuristic fallback)."""
import json
import math
import re
from datetime import date
from functools import lru_cache

import memory
from ingest import ingest, load
from llm import ask_json
from models import LifeEvent, LifeEventList

LABEL = {"birthday": "Birthday", "new_job": "New job", "moved": "Just moved", "promotion": "Promoted",
         "achievement": "Big win", "graduation": "Graduated"}
PATTERNS = [
    ("birthday", r"(\w+)'s birthday is[^.!]*?(\w{3,9} \d{1,2})"),
    ("new_job", r"started at (\w+) on (\w{3,9} \d{1,2})"),
    ("moved", r"moved to (\w+) on (\w{3,9} \d{1,2})"),
    ("promotion", r"promoted to ([\w ]+?)! Starts (\w{3,9} \d{1,2})"),
    ("achievement", r"finished the ([\w ]+?) on (\w{3,9} \d{1,2})"),
    ("graduation", r"(graduated) as of (\w{3,9} \d{1,2})"),
]
MONTHS = {m: i + 1 for i, m in enumerate("jan feb mar apr may jun jul aug sep oct nov dec".split())}


def _heuristic(threads, by_email, today: date) -> LifeEventList:
    out = []
    names = {c["name"].lower(): c["id"] for c in by_email.values()}
    for t in threads:
        for typ, pat in PATTERNS:
            m = re.search(pat, t["body"])
            if not m:
                continue
            mon, day = m.group(2).split()
            when = min((date(today.year + k, MONTHS[mon[:3].lower()], int(day)) for k in (-1, 0, 1)),
                       key=lambda c: abs((c - today).days))  # the email names no year: take the closest one
            friend = by_email.get(t["from"], {}).get("id")
            what = m.group(1)
            if typ == "birthday":
                friend = names.get(what.lower())
            if not friend:
                continue
            name = next(c["name"] for c in by_email.values() if c["id"] == friend)
            summary = {
                "birthday": f"{name}'s birthday", "new_job": f"{name} started at {what}", "moved": f"{name} moved to {what}",
                "promotion": f"{name} was promoted to {what}", "achievement": f"{name} finished the {what}",
                "graduation": f"{name} graduated",
            }[typ]
            out.append(LifeEvent(friend=friend, type=typ, date=when.isoformat(), summary=summary, source_id=t["id"]))
    return LifeEventList(events=out)


@lru_cache
def extract() -> tuple[LifeEvent, ...]:
    g = ingest()
    today = date.fromisoformat(g["today"])
    by_email = {f["email"]: f for f in g["friends"]}
    threads = [t for t in load("mock_emails.json") if t["from"] in by_email]
    slim = [{"id": t["id"], "date": t["date"], "from": by_email[t["from"]]["id"], "subject": t["subject"], "body": t["body"]} for t in threads]
    system = (
        "You read a user's inbox and extract positive life events about their friends. "
        f"Today is {today.isoformat()}. Friend ids: {', '.join(f['id'] for f in g['friends'])}. "
        "Types: birthday, new_job, moved, promotion, achievement, graduation. Use the friend id the event is ABOUT "
        "(not necessarily the sender). date = ISO date of the event. summary = under 8 words, e.g. 'Sam started at Acme'. "
        "Only include events explicitly stated. source_id = the thread id."
    )
    result, source = ask_json(system, json.dumps(slim), LifeEventList, lambda: _heuristic(threads, by_email, today))
    known = {f["id"] for f in g["friends"]}
    events = tuple(sorted((e for e in result.events if e.friend in known), key=lambda e: e.date))
    for e in events:
        memory.remember(e.friend, e.summary, LABEL[e.type], "life_event")
    print(f"[life_events] {len(events)} events via {source}")
    return events


def boost(e: LifeEvent, today: date) -> float:
    """Gravity: strongest on the day, decays with a ~10 day time constant; upcoming events pull too."""
    delta = (today - date.fromisoformat(e.date)).days
    if delta < 0:
        return math.exp(delta / 10) if delta >= -10 else 0.0
    return math.exp(-delta / 10)


def active_for(friend: str, events, today: date) -> dict | None:
    best = None
    for e in events:
        b = boost(e, today)
        if e.friend == friend and b >= 0.2 and (best is None or b > best["boost"]):
            when = date.fromisoformat(e.date)
            chip = LABEL[e.type]
            if e.type == "birthday" and when >= today:
                chip = "Birthday today" if when == today else f"Birthday {when.strftime('%a')}"
            best = {**e.model_dump(), "boost": round(b, 2), "chip": chip, "upcoming": when >= today}
    return best
