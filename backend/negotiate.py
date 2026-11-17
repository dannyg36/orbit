"""Agent-to-agent scheduling. Each agent sees ONLY its own owner's calendar + preferences.
Messages: {type: propose|counter|accept|final, time_window, place_type, budget, reason}. Max 4 rounds."""
import json
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator

import memory
from ingest import ingest, load
from llm import ask_json
from models import AgentMessage, Proposal, Starter, TimeWindow, Venue

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DAY_NAME = dict(zip(DAYS, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]))
CANDIDATE_TIMES, DURATION_MIN, MAX_ROUNDS = ["19:00", "19:30", "18:30"], 120, 4
CANDIDATE_DAYS: list[str] = []  # the four evenings after today; set per negotiation
_PLACES = json.loads((Path(__file__).parent / "config" / "venues.json").read_text())  # edit that file for your own city
CITY_XY, VENUES = _PLACES["cities"], _PLACES["venues"]


def _mins(hhmm: str) -> int:
    h, m = hhmm.split(":")
    return int(h) * 60 + int(m)


def clock(hhmm: str) -> str:
    h, m = map(int, hhmm.split(":"))
    return f"{(h - 1) % 12 + 1}:{m:02d} {'PM' if h >= 12 else 'AM'}"


class Agent:
    """One person's scheduling agent. Private state: that person's calendar file only."""

    def __init__(self, owner: str, name: str, today: date):
        self.owner, self.name = owner, name
        cal = load(f"friend_calendars/{owner}.json")
        self.prefs = cal["preferences"]
        self._busy = {}
        for b in cal["busy"]:
            day = DAYS[date.fromisoformat(b["date"]).weekday()]
            self._busy.setdefault(day, []).append((_mins(b["start"]), _mins(b["end"]), b["title"]))

    def _conflict(self, day: str, start: str) -> str | None:
        """Returns a plain sentence about why this slot fails, or None if it works."""
        s, e = _mins(start), _mins(start) + DURATION_MIN
        if day in self.prefs.get("no_weekdays", []):
            return f"{self.name} can't do {DAY_NAME[day]}s."
        earliest = self.prefs.get("earliest_start", {}).get(day)
        if earliest and s < _mins(earliest):
            note = self.prefs["notes"]
            return f"{self.name}'s {note[0].lower()}{note[1:]}"
        for bs, be, title in self._busy.get(day, []):
            if s < be and bs < e:
                return f"{self.name}'s {title.lower()} runs until {clock(f'{be // 60}:{be % 60:02d}')}."
        return None

    def free(self, day: str, start: str) -> bool:
        return self._conflict(day, start) is None


class FriendAgent(Agent):
    def respond(self, msg: AgentMessage) -> AgentMessage:
        day, start = msg.time_window.day, msg.time_window.start
        why = self._conflict(day, start)
        wants_bart = self.prefs.get("near_bart") and "BART" not in (msg.place_type or "")
        if why is None and not wants_bart:
            return AgentMessage(round=msg.round, sender=self.owner, recipient="me", type="accept", time_window=msg.time_window,
                                place_type=msg.place_type, budget=msg.budget, reason=f"Works for {self.name}. Locking it in on {self.name}'s calendar.")
        if why is None:  # time is fine, place isn't
            return AgentMessage(round=msg.round, sender=self.owner, recipient="me", type="counter", time_window=msg.time_window,
                                place_type="dinner · short walk from BART", budget=msg.budget,
                                reason=f"{DAY_NAME[day]} works. {self.name}'s car-free, so somewhere a short walk from BART, please.")
        # offer the nearest window this owner can actually do (same day later first, then later days)
        options = [(day, t) for t in sorted(CANDIDATE_TIMES) if t > start] + \
                  [(d, t) for d in CANDIDATE_DAYS[CANDIDATE_DAYS.index(day) + 1:] for t in sorted(CANDIDATE_TIMES)]
        alt = next(((d, t) for d, t in options if self.free(d, t)), None)
        if alt is None:
            alt = next((d, t) for d in CANDIDATE_DAYS for t in sorted(CANDIDATE_TIMES) if self.free(d, t))
        d2, t2 = alt
        early = next((t for t in self._busy.get(CANDIDATE_DAYS[min(CANDIDATE_DAYS.index(day) + 1, 3)], []) if t[0] < 7 * 60), None)
        extra = f" Plus a {early[2].split(' — ')[0].lower()} the next morning." if early else ""
        return AgentMessage(round=msg.round, sender=self.owner, recipient="me", type="counter",
                            time_window=TimeWindow(day=d2, start=t2, end="22:00"),
                            place_type="dinner · short walk from BART" if wants_bart else msg.place_type, budget=msg.budget,
                            reason=f"{why}{extra} {DAY_NAME[d2]} from {clock(t2)} is open.")


def pick_venue(friends: list[dict], need_bart: bool, likes: list[str]) -> Venue:
    pts = [CITY_XY[f["city"]] for f in friends] + [CITY_XY["Berkeley"]]
    mid = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))

    def score(v):
        dist = ((v["xy"][0] - mid[0]) ** 2 + (v["xy"][1] - mid[1]) ** 2) ** 0.5 * 100
        return (3 if any(v["cuisine"] in l.lower() for l in likes) else 0) - dist - v["walk_min"] / 10

    pool = [v for v in VENUES if not need_bart or ("BART" in v["near"] and v["walk_min"] <= 8)]
    return Venue(**{k: v for k, v in max(pool, key=score).items() if k != "xy"})


def negotiate(participants: list[str], life: list[dict]) -> Iterator[AgentMessage | Proposal]:
    """Yields each AgentMessage as it is 'sent', then the final Proposal."""
    g = ingest()
    today = date.fromisoformat(g["today"])
    people = {f["id"]: f for f in g["friends"]}
    me = g["me"]["name"]
    CANDIDATE_DAYS[:] = [DAYS[(today.weekday() + i) % 7] for i in range(1, 5)]
    mine = Agent("me", me, today)
    theirs = [FriendAgent(p, people[p]["name"], today) for p in participants]
    names = [people[p]["name"] for p in participants]
    slots = [(d, t) for d in CANDIDATE_DAYS for t in CANDIDATE_TIMES if mine.free(d, t)]
    windows: dict[str, TimeWindow] = {}
    place, budget, agreed = "dinner in Berkeley", "$$", None

    for rnd in range(1, MAX_ROUNDS):
        def fits(slot):
            return all(w.day == slot[0] and _mins(w.start) <= _mins(slot[1]) for w in windows.values())
        slot = next((s for s in slots if fits(s)), None) or next(
            s for s in slots if all(CANDIDATE_DAYS.index(s[0]) > CANDIDATE_DAYS.index(w.day) or (s[0] == w.day and s[1] >= w.start) for w in windows.values()))
        slots.remove(slot)
        day, start = slot
        if rnd == 1:
            gap = min(people[p]["days_since"] for p in participants)
            how_long = "over a month" if gap >= 30 else f"{gap} days"
            count = {2: "two", 3: "three", 4: "four", 5: "five", 6: "six"}.get(len(participants) + 1, str(len(participants) + 1))
            reason = f"It's been {how_long} since the {count} of them shared a table. Opening with {DAY_NAME[day]} at {clock(start)}."
        else:
            reason = f"Heard you. How about {DAY_NAME[day]} at {clock(start)}" + (", a short walk from BART?" if "BART" in place else "?")
        offer = AgentMessage(round=rnd, sender="me", recipient="all", type="propose",
                             time_window=TimeWindow(day=day, start=start, end=f"{(_mins(start) + DURATION_MIN) // 60}:{(_mins(start) + DURATION_MIN) % 60:02d}"),
                             place_type=place, budget=budget, reason=reason)
        yield offer
        replies = [a.respond(offer) for a in theirs]
        for r in replies:
            yield r
            if r.type == "counter":
                if r.time_window != offer.time_window:
                    windows[r.sender] = r.time_window
                if r.place_type and "BART" in r.place_type:
                    place = "dinner · short walk from BART"
        if all(r.type == "accept" for r in replies):
            agreed = offer
            break
    if agreed is None:  # out of rounds: go with the last offer
        agreed = offer

    likes = [f["fact"] for p in participants for f in memory.recall(p, ("preference",))]
    venue = pick_venue([people[p] for p in participants], "BART" in place, likes)
    day, start = agreed.time_window.day, agreed.time_window.start
    when = today + timedelta(days=(DAYS.index(day) - today.weekday()) % 7)
    time_label = f"{DAY_NAME[day]}, {clock(start)}"
    yield AgentMessage(round=agreed.round + 1, sender="me", recipient="all", type="final", time_window=agreed.time_window,
                       place_type=f"{venue.name} · {venue.walk_min} min walk from {venue.near}", budget=budget,
                       reason=f"Done: {time_label} at {venue.name} ({venue.cuisine.title()}), {venue.walk_min} minutes from {venue.near}. Sending invites through Fo.")

    facts = {p: [f["fact"] for f in memory.recall(p)] for p in participants}
    graph_recall = memory.ask(f"What should {me} ask {', '.join(names)} about at dinner?")  # Cognee, when enabled

    def fallback() -> Starter:
        bits = []
        for p in participants:
            ev = next((e for e in life if e["friend"] == p and e["type"] == "new_job"), None)
            interest = next((f["fact"] for f in memory.recall(p, ("interest",))), None)
            if ev and interest:
                bits.append(f"ask {people[p]['name']} about {ev['summary'].split(' at ')[-1]} and {interest.replace('Training for the ', '').replace(' marathon', '')} training")
        hook = bits[0] if bits else f"ask {names[0]} what's new"
        return Starter(memory_hook=hook[0].upper() + hook[1:])

    starter, _ = ask_json(
        "You write one short conversation starter for a dinner, grounded ONLY in the remembered facts given. Under 14 words, "
        "imperative, warm and plain. Example: 'Ask Sam about the new job and marathon training'.",
        f"Dinner guests and what {me}'s memory holds: {facts}" + (f"\nGraph memory says: {graph_recall}" if graph_recall else ""), Starter, fallback)
    yield Proposal(participants=participants, time=time_label, time_iso=f"{when.isoformat()}T{start}", venue=venue,
                   reason=f"{', '.join(names[:-1])} & {names[-1]} have all drifted, and they're friends with each other. One dinner beats three catch-ups.",
                   memory_hook=starter.memory_hook)
