# Orbit

Your friends are drifting out of orbit. Orbit pulls them back while you sleep.

You are a star; friends are planets. Orbit radius = how long since you last connected, relative to your usual
rhythm with that person. Overnight an agent applies drift, spots life events, finds drifting friend groups,
suggests intros, negotiates a hangout agent-to-agent, and hands real-world actions to
[Fo](https://wajo.ai). In the morning you approve anything that costs money.

## Run

```bash
cd backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..
./run.sh            # backend on :8000, frontend on :5173
open "http://localhost:5173/?demo=1"
```

The mock world (calendar, inbox, friends' calendars) is generated on first run, relative to today's date.
Regenerate any time with `cd backend && .venv/bin/python gen_mock.py`.

## Nothing personal is in the code

| What | Where it comes from |
| --- | --- |
| Your name, and real people in the cast | `backend/local_roster.json` (untracked; copy `local_roster.example.json`). Maps any fictional cast member to a real name/email. |
| "Today" | The system date, or `ORBIT_TODAY=YYYY-MM-DD`. Life events, calendars and the negotiation window follow it. |
| Venues and cities | `backend/config/venues.json` |
| Friends, links, cadence, drift, clusters, intros | Inferred by `ingest.py` / `drift.py` / `matchmaker.py` from the calendar and inbox data |
| Keys and tokens | `backend/.env` and `backend/.fo_mcp.json` (both untracked) |

## Env (`backend/.env`, all optional)

| Var | Without it |
| --- | --- |
| `ANTHROPIC_API_KEY` | Life events, intro reason and conversation starter come from deterministic fallbacks. With it, `claude-sonnet-5-5` answers are cached in `data/llm_cache.json` by input hash. |
| `FO_LIVE=1` (after `cd backend && .venv/bin/python fo_mcp.py login`) | Nothing is sent. With it, night-run tasks go to Fo's `ask_fo` MCP tool in one hand-off. Friends with `@example.com` addresses are always skipped, and an identical hand-off is never sent twice (delete `.fo_sent.json` to resend). |
| `FO_EMAIL`, `SMTP_USER`, `SMTP_APP_PASSWORD` | Alternative to MCP: email tasks to Fo. Otherwise dry-run, logged to `backend/fo_outbox.json`. |
| `ORBIT_MEMORY=cognee` | Memory uses a JSON store. Cognee also needs its own `LLM_API_KEY` etc. |
| `ORBIT_GIFT_BUDGET`, `ORBIT_MAX_OUTREACH`, `ORBIT_USER_NAME` | 40, 3, and the roster's name |

Fo always writes from its own address as "<your name>'s assistant", never as you. Anything that spends money,
and any intro, waits for your OK in the morning brief.

## Video mode

`?demo=1` resets state on load, hides dev UI, seeds two RSVPs, and adds shortcuts:

| Key | Does |
| --- | --- |
| `B` | Build: planets pop into orbit |
| `F` | Fast-forward 3 weeks (press again to come back) |
| `S` | Go to sleep: the night run plays at a readable pace |
| `M` | Morning brief (plans the night without contacting Fo if it hasn't run) |
| `R` | Simulate the remaining RSVPs |
| `O` | Back to the orbit |

The app draws on a fixed 1440×900 stage and scales to fit the window.

## Layout

- `backend/`: FastAPI. `ingest.py` (zero-setup orbit), `drift.py`, `life_events.py`, `matchmaker.py`,
  `negotiate.py` (each agent sees only its own owner's calendar), `fo.py` + `fo_mcp.py`, `memory.py`,
  `night_run.py` (SSE), `gen_mock.py`.
- `frontend/`: Vite + React + TypeScript. Custom SVG planets, d3-force for the layout, framer-motion.
