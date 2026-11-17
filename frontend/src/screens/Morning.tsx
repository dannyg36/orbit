import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import OrbitGraph from '../components/OrbitGraph'
import { Check, Cta, names, Panel, Pill, Sunrise, Tag } from '../components/Panel'
import { PlanetAvatar } from '../components/Planet'
import { C, tight } from '../theme'
import type { Brief, Orbit } from '../types'

const HOME = [0.22, 1.12, 0.74] // drift each reunited friend settles at once dinner is on

type Props = { orbit: Orbit; brief: Brief; onApprove: (id: string, yes: boolean) => void; onReply: (friend: string) => void; onOrbit: () => void; vh: number }

export default function Morning({ orbit, brief, onApprove, onReply, onOrbit, vh }: Props) {
  const byId = Object.fromEntries(orbit.friends.map((f) => [f.id, f]))
  const [back, setBack] = useState(false)
  const [sparkle, setSparkle] = useState<string[]>([])
  const [fo, setFo] = useState(brief.fo ?? { status: null, text: '' })
  useEffect(() => {
    // while Fo is still working on last night's hand-off, keep asking how it's going
    if (brief.fo_mode !== 'mcp' || fo.status !== 'working') return
    const t = setTimeout(() => fetch('/api/fo/status?wait=8').then((r) => r.json()).then(setFo).catch(() => {}), 4000)
    return () => clearTimeout(t)
  }, [fo, brief.fo_mode])
  useEffect(() => {
    const a = setTimeout(() => setBack(true), 1500)
    const b = setTimeout(() => setSparkle(brief.reunited), 2300)
    const c = setTimeout(() => setSparkle([]), 7500)
    return () => { clearTimeout(a); clearTimeout(b); clearTimeout(c) }
  }, []) // eslint-disable-line

  const K = 0.78 // the mini orbit is the same universe, drawn tighter
  const friends = useMemo(
    () => orbit.friends.map((f) => {
      const i = brief.reunited.indexOf(f.id)
      const home = back && i >= 0
      return { ...f, forecast: null, radius: (home ? 105 + 95 * HOME[i % 3] : f.radius) * K, status: home ? ('close' as const) : f.status }
    }),
    [orbit, brief.reunited, back],
  )
  const dinner = brief.handled.find((h) => h.kind === 'dinner')
  const others = brief.handled.filter((h) => h.kind === 'checkin')
  const mini = Math.min(vh - 290, 452)

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '64px 56px 0', display: 'grid', gridTemplateColumns: '1fr 500px', gap: 30, alignContent: 'start' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 34 }}>
          <motion.div initial={{ y: 26, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 1.1, ease: 'easeOut' }}><Sunrise size={62} /></motion.div>
          <div>
            <h1 style={{ fontSize: 46, letterSpacing: -1, margin: 0, lineHeight: 1.05 }}>{brief.greeting}</h1>
            <p style={{ color: C.text2, fontSize: 17, margin: '8px 0 0' }}>{brief.summary}</p>
          </div>
        </div>

        <h2 style={{ fontSize: 20, letterSpacing: -0.3, margin: '0 0 12px' }}>Quick yes or no</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {brief.approvals.map((a, i) => {
            const open = a.status === 'needs_approval', no = a.status === 'declined'
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.12 }}>
                <Panel style={{ height: '100%', display: 'flex', flexDirection: 'column', borderColor: a.kind === 'intro' ? 'rgba(95,211,200,.28)' : 'rgba(246,238,230,.24)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex' }}>{a.friends.map((id, j) => <PlanetAvatar key={id} p={byId[id].planet} size={42} ring={a.kind === 'gift'} style={{ marginLeft: j ? -8 : 0 }} />)}</div>
                    <div style={{ fontFamily: tight, fontWeight: 600, fontSize: 18.5, letterSpacing: -0.3 }}>{a.title}</div>
                  </div>
                  <p style={{ color: C.text2, fontSize: 15, lineHeight: 1.45, margin: '14px 0 6px', flex: 1 }}>{a.detail}</p>
                  <div style={{ color: C.text3, fontSize: 13, marginBottom: 16 }}>{a.cost}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {open ? (
                      <>
                        <Cta onClick={() => onApprove(a.id, true)} style={{ padding: '12px 22px', fontSize: 14.5, whiteSpace: 'nowrap', ...(a.kind === 'intro' ? { background: C.teal, color: '#06302E', boxShadow: '0 10px 26px rgba(95,211,200,.25)' } : {}) }}>{a.yes}</Cta>
                        <Pill onClick={() => onApprove(a.id, false)} style={{ padding: '11px 18px', whiteSpace: 'nowrap' }}>{a.no}</Pill>
                      </>
                    ) : no ? <Tag>Okay, not now</Tag> : (
                      <Tag color="#06302E" bg={C.teal} style={{ fontWeight: 600, padding: '9px 15px', fontSize: 13.5 }}><Check size={15} color="#06302E" mark={C.teal} /> {a.kind === 'gift' ? 'On it. Fo is ordering' : 'Introduced'}</Tag>
                    )}
                  </div>
                </Panel>
              </motion.div>
            )
          })}
        </div>

        <h2 style={{ fontSize: 20, letterSpacing: -0.3, margin: '32px 0 12px' }}>Already handled</h2>
        {dinner && dinner.kind === 'dinner' && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Panel>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: tight, fontWeight: 600, fontSize: 23, letterSpacing: -0.5 }}>{dinner.title} {dinner.when}</span>
                <span style={{ color: C.text3, fontSize: 14 }}>{dinner.venue.name} · {dinner.venue.walk_min} min from {dinner.venue.near}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, margin: '14px 0', flexWrap: 'wrap', alignItems: 'center' }}>
                {dinner.rsvps.map((r) => {
                  const f = byId[r.friend], yes = r.status === 'in'
                  return (
                    <motion.div key={r.friend} layout style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 13px 5px 5px', borderRadius: 999, background: yes ? 'rgba(95,211,200,.15)' : 'rgba(255,255,255,.06)', border: `1px solid ${yes ? 'rgba(95,211,200,.45)' : C.border}` }}>
                      <PlanetAvatar p={f.planet} size={28} />
                      <span style={{ fontSize: 13.5, fontWeight: 500, color: yes ? C.teal : C.text2 }}>{yes ? `${f.name}'s in` : `${f.name} · invite sent`}</span>
                      {!yes && <button onClick={() => onReply(r.friend)} style={{ background: 'none', border: 'none', color: C.text3, fontSize: 11.5, textDecoration: 'underline', padding: 0 }}>Simulate reply</button>}
                    </motion.div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14.5, color: C.text2 }}>
                <Tag color="#3A2A22" bg={C.cream} style={{ fontWeight: 600 }}>Talk about</Tag>{dinner.talk_about}
              </div>
            </Panel>
          </motion.div>
        )}
        {others.map((h) => h.kind === 'checkin' && (
          <motion.div key={h.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '14px 6px 0', color: C.text2, fontSize: 14.5 }}>
            <PlanetAvatar p={byId[h.friend].planet} size={26} /><b style={{ color: C.text, fontWeight: 600 }}>{h.title}.</b> {h.detail}
          </motion.div>
        ))}
        {fo.text && (
          <div style={{ display: 'flex', gap: 10, margin: '14px 6px 0', color: C.text2, fontSize: 14, lineHeight: 1.45 }}>
            <Tag color="#06302E" bg={C.teal} style={{ fontWeight: 600, alignSelf: 'flex-start' }}>{fo.status === 'working' ? 'Fo is on it' : 'Fo says'}</Tag>
            <span>{fo.text.length > 260 ? fo.text.slice(0, 260) + '…' : fo.text}</span>
          </div>
        )}
        {brief.fo_mode === 'dry_run' && <div style={{ color: C.text3, fontSize: 11.5, margin: '14px 6px 0' }}>Fo is in dry-run mode: every task above is logged to fo_outbox.json instead of emailed.</div>}
      </div>

      <Panel style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '22px 22px 20px' }}>
        <h2 style={{ fontSize: 22, letterSpacing: -0.4, margin: 0, alignSelf: 'flex-start' }}>Welcome back, everyone</h2>
        <p style={{ color: C.text3, fontSize: 13.5, margin: '5px 0 0', alignSelf: 'flex-start' }}>{names(brief.reunited.map((id) => byId[id].name))} are back inside the drift line.</p>
        <div style={{ height: mini, display: 'grid', placeItems: 'center', margin: '8px 0' }}>
          <OrbitGraph mini friends={friends} links={orbit.links} clusters={[]} driftR={orbit.drift_line.radius * K} size={mini} view={330} sparkle={sparkle} labelOnly={brief.reunited} labelAbove={brief.reunited.slice(0, 1)} />
        </div>
        <Cta onClick={onOrbit} style={{ padding: '12px 26px', fontSize: 14.5 }}>See my orbit</Cta>
      </Panel>
    </div>
  )
}
