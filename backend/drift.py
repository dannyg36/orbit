"""Drift = days_since_last / cadence. Orbit radius grows with drift; clusters = connected drifted friends."""
import math
from datetime import date, timedelta

import networkx as nx

import life_events
import state
from ingest import ingest

BASE, K, LINE, SOFT_CAP, MAX_R = 105.0, 95.0, 1.5, 2.6, 398.0
AT_RISK, LONG_LOST, FORECAST_DAYS = 1.0, 4.0, 14


def radius(drift: float) -> float:
    if drift <= SOFT_CAP:
        return BASE + K * drift
    return min(MAX_R, BASE + K * SOFT_CAP + 20 * math.log1p(drift - SOFT_CAP))


def status_of(drift: float) -> str:
    if drift >= LONG_LOST:
        return "long_lost"
    if drift >= LINE:
        return "drifted"
    return "at_risk" if drift >= AT_RISK else "close"


def compute(ff: int = 0) -> dict:
    g = ingest()
    today = date.fromisoformat(g["today"]) + timedelta(days=ff)
    events = life_events.extract()
    resets = state.S["resets"]
    friends = []
    for f in g["friends"]:
        days = f["days_since"] + ff
        if f["id"] in resets:  # "We hung out!"
            days = max(0, ff - resets[f["id"]])
        drift = days / f["cadence_days"]
        st = status_of(drift)
        ev = life_events.active_for(f["id"], events, today)
        forecast = None
        if st == "at_risk":
            fd = (days + FORECAST_DAYS) / f["cadence_days"]
            if fd >= LINE:
                forecast = {"days": FORECAST_DAYS, "drift": round(fd, 2), "radius": round(radius(fd), 1)}
        friends.append({
            **f, "days_since": days, "drift": round(drift, 2), "radius": round(radius(drift), 1), "status": st,
            "life_event": ev, "urgency": round(drift + (ev["boost"] if ev else 0), 2), "forecast": forecast,
        })
    drifted = {f["id"] for f in friends if f["status"] == "drifted"}
    G = nx.Graph()
    G.add_nodes_from(drifted)
    G.add_edges_from((l["a"], l["b"]) for l in g["links"] if l["a"] in drifted and l["b"] in drifted)
    order = {f["id"]: i for i, f in enumerate(friends)}
    by_id = {f["id"]: f for f in friends}
    clusters = [sorted(c, key=lambda i: -by_id[i]["drift"]) for c in nx.connected_components(G) if len(c) >= 2]
    return {
        "me": g["me"], "today": today.isoformat(), "ff": ff, "friends": friends, "links": g["links"],
        "clusters": clusters, "drift_line": {"drift": LINE, "radius": radius(LINE)},
        "life_events": [e.model_dump() for e in events], "stats": g["stats"],
    }
