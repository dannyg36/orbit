import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { stream } from '../api'
import { Check, Moon, Panel, Pill, Spinner } from '../components/Panel'
import { PlanetAvatar } from '../components/Planet'
import { C, tight } from '../theme'
import type { AgentMessage, Brief, FoTask, Orbit } from '../types'

type Step = { key: string; title: string; clock: string; state: 'todo' | 'doing' | 'done'; detail?: string }
const DAY: Record<string, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' }
const clock = (t: string) => { const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
const hexA = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }

export default function Night({ orbit, onDone, pace, demo }: { orbit: Orbit; onDone: (b: Brief | null) => void; pace: number; demo: boolean }) {
  const [steps, setSteps] = useState<Step[]>([])
  const [who, setWho] = useState<string[]>([])
  const [msgs, setMsgs] = useState<AgentMessage[]>([])
  const [typing, setTyping] = useState<string | null>(null)
  const [tasks, setTasks] = useState<FoTask[]>([])
  const [time, setTime] = useState('11:58 PM')
  const [finished, setFinished] = useState(false)
  const [foSays, setFoSays] = useState('')
  const scroller = useRef<HTMLDivElement>(null)
  const byId = Object.fromEntries(orbit.friends.map((f) => [f.id, f]))

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const stop = stream(`/api/night-run?pace=${pace}&demo=${demo}`, (e) => {
      if (e.type === 'plan') setSteps(e.steps.map((s: Step) => ({ ...s, state: 'todo' })))
      if (e.type === 'step_start') { setTime(e.clock); setSteps((s) => s.map((x) => (x.key === e.key ? { ...x, state: 'doing' } : x))) }
      if (e.type === 'step_done') setSteps((s) => s.map((x) => (x.key === e.key ? { ...x, state: 'done', detail: e.detail } : x)))
      if (e.type === 'negotiation_open') setWho(e.participants)
      if (e.type === 'typing') setTyping(e.sender)
      if (e.type === 'agent_message') { setTyping(null); setMsgs((m) => [...m, e.message]) }
      if (e.type === 'fo_task') setTasks((x) => [...x, e.task])
      if (e.type === 'fo_reply') setFoSays(e.text)
      if (e.type === 'done') { setFinished(true); setTime('6:30 AM'); t = setTimeout(() => onDone(e.brief), 2400 * Math.max(pace, 0.3)) }
    })
    return () => { stop(); clearTimeout(t) }
  }, []) // eslint-disable-line

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }) }, [msgs, typing, tasks])
  const doneCount = steps.filter((s) => s.state === 'done').length

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <header style={{ height: 96, display: 'flex', alignItems: 'center', gap: 18, padding: '0 40px' }}>
        <div style={{ width: 50, height: 50, borderRadius: 99, display: 'grid', placeItems: 'center', background: 'rgba(140,122,184,.25)', border: `1px solid ${C.border}` }}><Moon size={24} color="#E4DCF6" /></div>
        <div>
          <h1 style={{ fontSize: 32, letterSpacing: -1, margin: 0 }}>{finished ? 'Morning already.' : "Sleep well. Orbit's on it."}</h1>
          <div style={{ color: C.text3, fontSize: 14.5, marginTop: 3 }}>{time} · {doneCount} of {steps.length || 7} done</div>
        </div>
        <div style={{ flex: 1 }} />
        <Pill onClick={() => onDone(null)}>Skip to morning</Pill>
      </header>

      <div style={{ position: 'absolute', top: 104, bottom: 28, left: 40, right: 40, display: 'grid', gridTemplateColumns: '430px 1fr', gap: 22 }}>
        <Panel style={{ overflow: 'hidden' }}>
          <h2 style={{ fontSize: 21, letterSpacing: -0.4, margin: '0 0 16px' }}>While you slept</h2>
          <div style={{ display: 'grid', gap: 10 }}>
            {steps.map((s) => (
              <motion.div key={s.key} animate={{ opacity: s.state === 'todo' ? 0.38 : 1 }}
                style={{ display: 'flex', gap: 13, padding: '12px 14px', borderRadius: 16, border: `1px solid ${s.state === 'doing' ? 'rgba(240,71,92,.5)' : 'rgba(255,255,255,.06)'}`,
                  background: s.state === 'doing' ? 'rgba(240,71,92,.1)' : 'rgba(255,255,255,.03)', boxShadow: s.state === 'doing' ? '0 0 24px rgba(240,71,92,.18)' : 'none' }}>
                <div style={{ width: 20, paddingTop: 1 }}>{s.state === 'done' ? <Check /> : s.state === 'doing' ? <Spinner size={18} color={C.crimson2} /> : <div style={{ width: 15, height: 15, margin: 1.5, borderRadius: 99, border: '2px solid rgba(255,255,255,.22)' }} />}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 14.5 }}>{s.title}</span>
                    <span style={{ color: C.text3, fontSize: 12, flexShrink: 0 }}>{s.clock}</span>
                  </div>
                  {s.detail && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ color: C.text2, fontSize: 13, lineHeight: 1.4, marginTop: 3 }}>{s.detail}</motion.div>}
                </div>
              </motion.div>
            ))}
          </div>
        </Panel>

        <Panel style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 24px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex' }}>
              <svg width={38} height={38} viewBox="-20 -20 40 40"><circle r={19} fill={C.sun} /><circle r={13} cx={-2} cy={-2} fill={C.sunInner} /></svg>
              {who.map((id) => <PlanetAvatar key={id} p={byId[id].planet} size={38} style={{ marginLeft: -10 }} />)}
            </div>
            <h2 style={{ fontSize: 21, letterSpacing: -0.4, margin: 0 }}>{who.length ? 'Your agent is chatting with theirs' : 'Agents are warming up'}</h2>
            <div style={{ flex: 1 }} />
            <span style={{ color: C.text3, fontSize: 12.5 }}>Each agent sees only its own person's calendar</span>
          </div>
          <div ref={scroller} className="scroll-soft" style={{ flex: 1, overflowY: 'auto', padding: '18px 24px 24px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {!who.length && <div style={{ margin: 'auto', color: C.text3, fontSize: 14.5 }}>Nothing to schedule yet. Orbit is still working out who needs you.</div>}
            <AnimatePresence initial={false}>
              {msgs.map((m, i) => {
                const mine = m.sender === 'me'
                const color = mine ? C.crimson2 : byId[m.sender].planet.mid
                const light = mine ? '#FFC2C9' : byId[m.sender].planet.light
                const newRound = mine && i > 0
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28 }}
                    style={{ alignSelf: mine ? 'flex-start' : 'flex-end', maxWidth: '74%', marginTop: newRound ? 10 : 0, display: 'flex', gap: 9, flexDirection: mine ? 'row' : 'row-reverse', alignItems: 'flex-end' }}>
                    {mine ? <svg width={28} height={28} viewBox="-20 -20 40 40" style={{ flexShrink: 0 }}><circle r={19} fill={C.sun} /><circle r={13} cx={-2} cy={-2} fill={C.sunInner} /></svg> : <PlanetAvatar p={byId[m.sender].planet} size={28} />}
                    <div style={{ background: hexA(color, mine ? 0.2 : 0.26), border: `1px solid ${hexA(color, 0.6)}`, borderRadius: 18, [mine ? 'borderBottomLeftRadius' : 'borderBottomRightRadius']: 6, padding: '9px 14px' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 11.5, fontWeight: 600, color: light, marginBottom: 3 }}>
                        {mine ? `${orbit.me.name}'s agent` : `${byId[m.sender].name}'s agent`}
                        <span style={{ fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase', padding: '2px 7px', borderRadius: 99, background: 'rgba(0,0,0,.28)', color: m.type === 'accept' || m.type === 'final' ? C.teal : light }}>{m.type}</span>
                        {m.time_window && m.type !== 'accept' && <span style={{ fontWeight: 500, color: C.text3 }}>{DAY[m.time_window.day]} {clock(m.time_window.start)}{m.budget ? ` · ${m.budget}` : ''}</span>}
                      </div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.42, color: C.text }}>{m.reason}</div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
            {typing && (
              <div style={{ alignSelf: typing === 'me' ? 'flex-start' : 'flex-end', display: 'flex', alignItems: 'center', gap: 8, color: typing === 'me' ? C.crimson2 : byId[typing].planet.light, fontSize: 12.5, padding: '4px 8px' }}>
                <span>{typing === 'me' ? `${orbit.me.name}'s agent` : `${byId[typing].name}'s agent`}</span><span className="typing"><i /><i /><i /></span>
              </div>
            )}
            {tasks.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 14, borderRadius: 20, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,.035)', padding: '16px 18px' }}>
                <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 17, marginBottom: 10 }}>Handing off to Fo</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {tasks.map((t) => {
                    const hold = t.status === 'needs_approval'
                    return (
                      <motion.div key={t.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 14 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 99, background: hold ? C.cream : C.teal, boxShadow: `0 0 10px ${hold ? C.cream : C.teal}` }} />
                        <span style={{ color: C.text }}>{t.title}</span>
                        <span style={{ color: hold ? C.cream : C.text3, fontSize: 12.5 }}>{hold ? (t.spend ? `$${t.spend} · saved for your OK in the morning` : 'saved for your OK in the morning') : t.status === 'sent' ? 'sent to Fo' : t.note.startsWith('placeholder') ? 'logged only · placeholder address' : 'logged · dry run'}</span>
                      </motion.div>
                    )
                  })}
                </div>
                {foSays && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, paddingTop: 11, borderTop: `1px solid ${C.border}`, fontSize: 13.5, color: C.text2 }}><b style={{ color: C.teal, fontWeight: 600 }}>Fo:</b> {foSays}</motion.div>}
              </motion.div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
