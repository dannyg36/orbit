"""Zero-setup orbit: infer friends + friend–friend links from calendar and inbox."""
import json
from collections import Counter
from datetime import date
from functools import lru_cache
from itertools import combinations
from pathlib import Path
from statistics import median

DATA = Path(__file__).parent / "data"


def load(name: str):
    if not (DATA / "mock_contacts.json").exists():  # first run: build the mock world relative to today
        import subprocess
        import sys
        subprocess.run([sys.executable, str(Path(__file__).parent / "gen_mock.py")], check=True)
    return json.loads((DATA / name).read_text())


@lru_cache
def ingest() -> dict:
    book = load("mock_contacts.json")
    me, today = book["me"]["email"], date.fromisoformat(book["today"])
    by_email = {c["email"]: c for c in book["contacts"]}
    events, threads = load("mock_calendar.json"), load("mock_emails.json")

    seen, hangouts, thread_n = Counter(), {}, Counter()
    pair_events, pair_threads = Counter(), Counter()
    for e in events:
        others = sorted({a for a in e["attendees"] if a != me})
        day = date.fromisoformat(e["start"][:10])
        for a in others:
            seen[a] += 1
            hangouts.setdefault(a, []).append(day)
        for a, b in combinations(others, 2):
            pair_events[(a, b)] += 1
    for t in threads:
        others = sorted({a for a in [t["from"], *t["to"], *t["cc"]] if a != me})
        for a in others:
            seen[a] += 1
            thread_n[a] += 1
        for a, b in combinations(others, 2):
            pair_threads[(a, b)] += 1

    friends = []
    for email, n in seen.items():
        if n < 2 or email not in by_email:  # friend = anyone in >=2 events/threads with me
            continue
        c, days = by_email[email], sorted(hangouts.get(email, []))
        gaps = [(b - a).days for a, b in zip(days, days[1:]) if (b - a).days > 0]
        friends.append({
            **c,
            "last_seen": days[-1].isoformat() if days else None,
            "days_since": (today - days[-1]).days if days else 999,
            "hangouts": len(days), "threads": thread_n[email],
            "cadence_days": c.get("cadence_days") or (round(median(gaps)) if gaps else 30),
            "observed_gap": round(median(gaps)) if gaps else None,
        })
    friends.sort(key=lambda f: f["days_since"])
    ids = {f["email"]: f["id"] for f in friends}

    links = []
    for (a, b) in set(pair_events) | set(pair_threads):
        n = pair_events[(a, b)] + pair_threads[(a, b)]
        if a in ids and b in ids and n >= 2:  # friend–friend edge = >=2 co-occurrences
            links.append({"a": ids[a], "b": ids[b], "plans": pair_events[(a, b)], "threads": pair_threads[(a, b)], "count": n})
    links.sort(key=lambda l: (-l["count"], l["a"], l["b"]))
    return {
        "me": book["me"], "today": book["today"], "friends": friends, "links": links,
        "stats": {"events": len(events), "threads": len(threads), "friends": len(friends), "links": len(links)},
    }


if __name__ == "__main__":
    g = ingest()
    print(g["stats"])
    for f in g["friends"]:
        print(f"{f['name']:7} last {f['days_since']:4}d cadence {f['cadence_days']:3} obs {f['observed_gap']} drift {f['days_since'] / f['cadence_days']:.2f}")
    print(sorted((l["a"], l["b"], l["count"]) for l in g["links"]))
