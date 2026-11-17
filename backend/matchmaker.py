"""Matchmaker: unlinked friend pairs scored by shared interests + same city + both recently active."""
from datetime import date
from itertools import combinations

from llm import ask_json
from models import IntroReason


def suggest(orbit: dict) -> dict | None:
    today = date.fromisoformat(orbit["today"])
    linked = {frozenset((l["a"], l["b"])) for l in orbit["links"]}
    moved = {e["friend"] for e in orbit["life_events"] if e["type"] == "moved" and 0 <= (today - date.fromisoformat(e["date"])).days <= 60}
    best = None
    for a, b in combinations(orbit["friends"], 2):
        if frozenset((a["id"], b["id"])) in linked:
            continue
        shared = sorted(set(a["interests"]) & set(b["interests"]))
        if not shared:
            continue
        same_city = a["city"] == b["city"]
        active = a["drift"] < 1.2 and b["drift"] < 1.2
        both_moved = a["id"] in moved and b["id"] in moved and same_city
        score = 2 * len(shared) + 1.5 * same_city + 1.0 * active + 1.5 * both_moved
        if best is None or score > best["score"]:
            best = {"a": a, "b": b, "shared": shared, "same_city": same_city, "both_moved": both_moved, "score": score}
    if not best or best["score"] < 5:
        return None
    a, b = best["a"], best["b"]

    def fallback() -> IntroReason:
        first = next((s for s in ("climbing", "running", "hiking") if s in best["shared"]), best["shared"][0])
        verb = {"climbing": "climb", "running": "run", "hiking": "hike"}.get(first, f"love {first}")
        tail = f", and both just moved to {a['city']}" if best["both_moved"] else (f", and both live in {a['city']}" if best["same_city"] else "")
        return IntroReason(reason=f"They both {verb}{tail}.")

    system = "You suggest warm, plain one-line reasons two of the user's friends should meet. Under 16 words. No hype."
    prompt = (f"{a['name']} ({a['city']}; interests: {', '.join(a['interests'])}; recently moved: {a['id'] in moved}) and "
              f"{b['name']} ({b['city']}; interests: {', '.join(b['interests'])}; recently moved: {b['id'] in moved}). "
              f"They have never met. Shared: {', '.join(best['shared'])}.")
    reason, source = ask_json(system, prompt, IntroReason, fallback)
    return {"a": a["id"], "b": b["id"], "shared": best["shared"], "city": a["city"] if best["same_city"] else None,
            "score": best["score"], "reason": reason.reason, "source": source}
