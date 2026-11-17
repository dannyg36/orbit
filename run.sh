#!/bin/bash
# Starts backend (:8000) and frontend (:5173). Ctrl+C stops both.
cd "$(dirname "$0")"
trap 'kill 0' EXIT
(cd backend && .venv/bin/uvicorn main:app --port 8000) &
(cd frontend && npm run dev) &
wait
