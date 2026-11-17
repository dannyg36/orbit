"""Tiny in-memory server state (one demo user)."""
from typing import Any

S: dict[str, Any] = {}


def reset():
    S.clear()
    S.update(resets={}, intro_confirmed=False, night=None, rsvps={}, approvals={})


reset()
