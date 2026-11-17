from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

LifeEventType = Literal["birthday", "new_job", "moved", "promotion", "achievement", "graduation"]


class LifeEvent(BaseModel):
    friend: str
    type: LifeEventType
    date: str  # ISO date
    summary: str
    source_id: Optional[str] = None


class LifeEventList(BaseModel):
    events: list[LifeEvent]


class IntroReason(BaseModel):
    reason: str


class Starter(BaseModel):
    memory_hook: str


class TimeWindow(BaseModel):
    day: str  # mon..sun
    start: str  # HH:MM
    end: str


class AgentMessage(BaseModel):
    round: int
    sender: str  # "me" (the user's agent) or a friend id
    recipient: str  # "all" or id
    type: Literal["propose", "counter", "accept", "final"]
    time_window: Optional[TimeWindow] = None
    place_type: Optional[str] = None
    budget: Optional[str] = None
    reason: str


class Venue(BaseModel):
    name: str
    cuisine: str
    city: str
    near: str
    walk_min: int
    price: str
    address: str = ""


class Proposal(BaseModel):
    participants: list[str]
    time: str
    time_iso: str
    venue: Venue
    reason: str
    memory_hook: str


class FoTask(BaseModel):
    id: str
    kind: Literal["invite", "checkin", "gift", "intro", "calendar", "reservation"]
    friends: list[str]
    emails: list[str] = []
    title: str
    body: str
    spend: float = 0
    status: Literal["sent", "dry_run", "needs_approval", "declined", "failed"] = "dry_run"
    note: str = ""
    ts: str = ""
