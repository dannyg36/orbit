import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import OrbitGraph from '../components/OrbitGraph'
import { Cta, Logo, Moon, names, Panel, Pill, Tag } from '../components/Panel'
import { PlanetAvatar } from '../components/Planet'
import { C, tight } from '../theme'
import type { Friend, Orbit as OrbitData } from '../types'

const cadence = (d: number) =>
  d <= 7 ? 'every week' : d <= 10 ? 'every week or so' : d <= 14 ? 'every couple of weeks' : d <= 21 ? 'every three weeks' : d <= 31 ? 'about once a month' : 'a few times a year'
const STATUS = {
  close: { label: 'In orbit', color: C.teal, bg: 'rgba(95,211,200,.14)' },
  at_risk: { label: 'Starting to drift', color: '#FFB8BE', bg: 'rgba(240,71,92,.12)' },
  drifted: { label: 'Cooling off', color: C.crimson2, bg: 'rgba(240,71,92,.16)' },
  long_lost: { label: 'Long lost', color: C.text2, bg: 'rgba(255,255,255,.08)' },
}
const ago = (d: number) => (d === 0 ? 'You just hung out.' : d > 400 ? `It's been about ${Math.round(d / 365)} years.` : `It's been ${d} day${d === 1 ? '' : 's'}.`)
const H = ({ children }: { children: string }) => <div style={{ fontSize: 11.5, letterSpacing: 0.8, textTransform: 'uppercase', color: C.text3, fontWeight: 600, margin: '18px 0 8px' }}>{children}</div>

type Props = {
  orbit: OrbitData; ff: number; setFf: (n: number) => void; onSleep: () => void; onRebuild: () => void; onMorning: () => void
  onHangout: (id: string) => void; onIntro: () => void; vw: number; vh: number; demo: boolean
}

export default function Orbit({ orbit, ff, setFf, onSleep, onRebuild, onMorning, onHangout, onIntro, vw, vh, demo }: Props) {
  const [selected, setSelected] = useState<string>(() => orbit.clusters[0]?.[0] ?? orbit.friends[0].id)
  const [skipped, setSkipped] = useState<string[]>([])
  const byId = Object.fromEntries(orbit.friends.map((f) => [f.id, f]))
  const f: Friend = byId[selected] ?? orbit.friends[0]
  const cluster = orbit.clusters.find((c) => c.includes(f.id))
  const intro = orbit.intro && (orbit.intro.a === f.id || orbit.intro.b === f.id) ? orbit.intro : null
  const t = orbit.tonight
  const rows = [
    { n: t.drifting, text: 'Reach friends drifting away', color: C.crimson2 },
    { n: t.groups, text: 'Reunite a friend group', color: '#FF8A98' },
    { n: t.celebrate, text: 'Celebrate big moments', color: C.cream },
    { n: t.intros, text: 'Introduce two friends', color: C.teal },
  ]
  const size = Math.min(vh - 84, vw - 700, 830)
  const st = STATUS[f.status]

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <header style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', zIndex: 3 }}>
        <Logo />
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', color: C.text2, fontSize: 14.5, fontWeight: 500 }}>
          {ff ? `Fast-forward · ${ff} days from now` : `${new Date(orbit.today + 'T12:00').toLocaleDateString('en-US', { weekday: 'long' })} night · 11:42 PM`}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Pill onClick={onRebuild}>Rebuild</Pill>
          <Pill onClick={onMorning}>This morning</Pill>
        </div>
      </header>

      <div style={{ position: 'absolute', top: 68, bottom: 0, left: 338, right: 348, display: 'grid', placeItems: 'center' }}>
        <OrbitGraph friends={orbit.friends} links={orbit.links} clusters={orbit.clusters} driftR={orbit.drift_line.radius} intro={orbit.intro} selected={f.id} onSelect={setSelected} size={size} />
      </div>

      <div style={{ position: 'absolute', top: 76, left: 24, width: 314, display: 'grid', gap: 14, zIndex: 2 }}>
        <Panel>
          <h2 style={{ fontSize: 23, letterSpacing: -0.5, margin: '0 0 14px' }}>Tonight, Orbit will…</h2>
          <div style={{ display: 'grid', gap: 9 }}>
            {rows.map((r) => (
              <div key={r.text} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: r.n ? 1 : 0.4 }}>
                <div style={{ width: 30, height: 30, borderRadius: 99, display: 'grid', placeItems: 'center', fontFamily: tight, fontWeight: 700, fontSize: 15, color: '#0A0E20', background: r.color }}>{r.n}</div>
                <div style={{ fontSize: 14.5, color: C.text }}>{r.text}</div>
              </div>
            ))}
          </div>
          <Cta onClick={onSleep} style={{ width: '100%', padding: '16px 0', fontSize: 17, fontFamily: tight, marginTop: 18 }}><Moon size={19} /> Go to sleep</Cta>
          <p style={{ color: C.text3, fontSize: 12.5, lineHeight: 1.5, margin: '13px 2px 0' }}>
            Notes go out from "{orbit.me.name}'s assistant", never as you. Anything that costs money waits for your OK in the morning.
          </p>
        </Panel>
        <Panel style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 16.5 }}>Fast-forward time</div>
            <div style={{ color: ff ? C.crimson2 : C.text3, fontSize: 13, fontWeight: 500 }}>{ff ? `+${ff} days` : 'Today'}</div>
          </div>
          <input className="ff" type="range" min={0} max={42} value={ff} onChange={(e) => setFf(+e.target.value)} />
          <div style={{ display: 'grid', gap: 7, marginTop: 16, fontSize: 12.5, color: C.text2 }}>
            <Legend swatch={<svg width={26} height={8}><line x1={1} y1={4} x2={25} y2={4} stroke={C.crimson} strokeWidth={2.2} strokeDasharray="6 4" strokeLinecap="round" /></svg>} text="Past the drift line: cooling off" />
            <Legend swatch={<svg width={26} height={12}><ellipse cx={13} cy={6} rx={11} ry={3.6} fill="none" stroke={C.cream} strokeWidth={2} /></svg>} text="Something to celebrate" />
            <Legend swatch={<svg width={26} height={8}><line x1={1} y1={4} x2={25} y2={4} stroke={C.teal} strokeWidth={2.2} strokeDasharray="5 4" strokeLinecap="round" /></svg>} text="Two friends who should meet" />
            <Legend swatch={<svg width={26} height={8}><line x1={1} y1={4} x2={25} y2={4} stroke={C.crimson2} strokeWidth={1.6} strokeDasharray="1 4" strokeLinecap="round" /></svg>} text="Where they'll be in 14 days" />
          </div>
        </Panel>
        {!demo && <div style={{ color: C.text3, fontSize: 11, padding: '0 8px' }}>dev · llm: {orbit.integrations.llm} · fo: {orbit.integrations.fo} · memory: {orbit.integrations.memory}</div>}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={f.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
          style={{ position: 'absolute', top: 76, right: 24, width: 324, zIndex: 2 }}>
          <Panel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <PlanetAvatar p={f.planet} size={68} ring={!!f.life_event} />
              <div>
                <h2 style={{ fontSize: 26, letterSpacing: -0.6, margin: 0 }}>{f.name}</h2>
                <Tag color={st.color} bg={st.bg} style={{ marginTop: 6 }}>{st.label}</Tag>
              </div>
            </div>
            <p style={{ color: C.text2, fontSize: 14.5, lineHeight: 1.5, margin: '16px 0 0' }}>
              {ago(f.days_since)} You two usually hang out {cadence(f.cadence_days)}.
            </p>
            {f.life_event && (
              <>
                <H>Something to celebrate</H>
                <div style={{ background: 'rgba(246,238,230,.1)', border: '1px solid rgba(246,238,230,.22)', borderRadius: 16, padding: '11px 14px', color: C.cream, fontSize: 14.5, fontWeight: 500 }}>
                  {f.life_event.summary}
                  <span style={{ color: C.text3, fontWeight: 400 }}> · {new Date(f.life_event.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              </>
            )}
            {f.memory.length > 0 && (
              <>
                <H>Orbit remembers</H>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>{f.memory.map((m) => <Tag key={m}>{m}</Tag>)}</div>
              </>
            )}
            {cluster && (
              <>
                <H>Better together</H>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexShrink: 0 }}>{cluster.slice(0, 4).map((id, i) => <PlanetAvatar key={id} p={byId[id].planet} size={34} style={{ marginLeft: i ? -9 : 0 }} />)}</div>
                  <div style={{ fontSize: 13.5, color: C.text2, lineHeight: 1.4 }}>
                    <b style={{ color: C.text, fontWeight: 600 }}>{cluster.length <= 4 ? names(cluster.map((id) => byId[id].name)) : `${byId[cluster[0]].name} and ${cluster.length - 1} others`}</b> drifted together. One dinner beats {cluster.length} catch-ups.
                  </div>
                </div>
              </>
            )}
            {intro && (
              <>
                <H>Should meet</H>
                <div style={{ background: 'rgba(95,211,200,.09)', border: '1px solid rgba(95,211,200,.25)', borderRadius: 16, padding: '11px 14px', fontSize: 13.5, color: C.text2, lineHeight: 1.45 }}>
                  <b style={{ color: C.teal, fontWeight: 600 }}>{byId[intro.a].name} & {byId[intro.b].name}.</b> {intro.reason}
                  {!intro.confirmed && <div><Pill onClick={onIntro} style={{ marginTop: 10, color: C.teal, borderColor: 'rgba(95,211,200,.4)', padding: '7px 14px', fontSize: 13 }}>Introduce them</Pill></div>}
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <Cta onClick={() => onHangout(f.id)} style={{ flex: 1, padding: '12px 0', fontSize: 14.5 }}>We hung out!</Cta>
              <Pill onClick={() => setSkipped((s) => [...s, f.id])} style={{ flex: 1, opacity: skipped.includes(f.id) ? 0.5 : 1 }}>{skipped.includes(f.id) ? 'Skipping tonight' : 'Not tonight'}</Pill>
            </div>
          </Panel>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const Legend = ({ swatch, text }: { swatch: React.ReactNode; text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 28, display: 'grid', placeItems: 'center' }}>{swatch}</div>{text}</div>
)
