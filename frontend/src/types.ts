export type PlanetStyle = 'bands' | 'bands_spot' | 'continents' | 'cloudbands' | 'craters' | 'swirls'
export type PlanetSpec = { light: string; mid: string; dark: string; style: PlanetStyle; size: number; moon: boolean; angle_hint: number; continent?: string }
export type LifeEvent = { friend: string; type: string; date: string; summary: string; chip: string; boost: number; upcoming: boolean }
export type Friend = {
  id: string; name: string; email: string; city: string; interests: string[]; cadence_days: number; planet: PlanetSpec
  days_since: number; drift: number; radius: number; status: 'close' | 'at_risk' | 'drifted' | 'long_lost'
  life_event: LifeEvent | null; forecast: { days: number; drift: number; radius: number } | null; memory: string[]; hangouts: number
}
export type Link = { a: string; b: string; plans: number; threads: number; count: number }
export type Intro = { a: string; b: string; reason: string; shared: string[]; city: string | null; confirmed: boolean }
export type Orbit = {
  me: { name: string; email: string }
  today: string; ff: number; friends: Friend[]; links: Link[]; clusters: string[][]
  drift_line: { drift: number; radius: number }; intro: Intro | null
  tonight: { drifting: number; groups: number; celebrate: number; intros: number }
  stats: { events: number; threads: number; friends: number; links: number }
  integrations: { llm: string; fo: string; memory: string }
}
export type AgentMessage = { round: number; sender: string; recipient: string; type: 'propose' | 'counter' | 'accept' | 'final'; reason: string; place_type?: string; budget?: string; time_window?: { day: string; start: string; end: string } }
export type FoTask = { id: string; kind: 'invite' | 'checkin' | 'gift' | 'intro'; friends: string[]; title: string; body: string; spend: number; status: string; note: string }
export type Approval = { id: string; kind: 'gift' | 'intro'; friends: string[]; status: string; title: string; detail: string; cost: string; yes: string; no: string }
export type Handled =
  | { kind: 'dinner'; title: string; when: string; venue: { name: string; cuisine: string; near: string; walk_min: number }; reason: string; talk_about: string; rsvps: { friend: string; status: 'in' | 'sent' }[] }
  | { kind: 'checkin'; friend: string; title: string; detail: string; status: string }
export type Brief = { greeting: string; summary: string; approvals: Approval[]; handled: Handled[]; reunited: string[]; fo_mode: string; outbox: FoTask[]; fo?: { status: string | null; text: string } }
