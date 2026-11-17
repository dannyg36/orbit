import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { stream } from '../api'
import OrbitGraph from '../components/OrbitGraph'
import { Check, Cta, Logo, Spinner } from '../components/Panel'
import { C, panel, tight } from '../theme'
import type { Orbit } from '../types'

type Stage = { state: 'pending' | 'working' | 'done'; count?: number }

export default function Build({ orbit, onDone, vh }: { orbit: Orbit; onDone: () => void; vh: number }) {
  const [visible, setVisible] = useState<Set<string>>(new Set())
  const [linkCount, setLinkCount] = useState(0)
  const [flash, setFlash] = useState<{ a: string; b: string; text: string; n: number } | null>(null)
  const [stages, setStages] = useState<Record<string, Stage>>({ calendar: { state: 'pending' }, inbox: { state: 'pending' }, links: { state: 'pending' } })
  const [done, setDone] = useState(false)

  useEffect(() => {
    let clear: ReturnType<typeof setTimeout>
    const stop = stream('/api/ingest/stream', (e) => {
      if (e.type === 'stage') setStages((s) => ({ ...s, [e.key]: { state: e.state, count: e.count } }))
      if (e.type === 'friend') setVisible((v) => new Set(v).add(e.id))
      if (e.type === 'link') {
        setLinkCount(e.n)
        setFlash({ a: e.a, b: e.b, n: e.n, text: e.plans ? `friends! ${e.plans} plans together` : 'friends!' })
        clearTimeout(clear)
        clear = setTimeout(() => setFlash(null), 1100)
      }
      if (e.type === 'done') setDone(true)
    })
    return () => { stop(); clearTimeout(clear) }
  }, [])

  // rings + chips only after the inbox has been skimmed; no drama (clusters, intros) until the orbit screen
  const friends = useMemo(
    () => orbit.friends.map((f) => ({ ...f, forecast: null, life_event: stages.inbox.state === 'done' ? f.life_event : null })),
    [orbit, stages.inbox.state],
  )
  const total = orbit.friends.length + orbit.links.length
  const progress = done ? 1 : (visible.size + linkCount) / total
  const rows = [
    { key: 'calendar', idle: 'Looking through your calendar', title: 'Looked through your calendar', sub: (n?: number) => `${n ?? orbit.stats.events} plans` },
    { key: 'inbox', idle: 'Skimming your inbox', title: 'Skimmed your inbox', sub: (n?: number) => `${n ?? 0} things worth celebrating` },
    { key: 'links', idle: 'Connecting the dots', title: 'Connected the dots', sub: (n?: number) => `${n ?? linkCount} friendships between your friends` },
  ]
  const size = Math.min(vh - 60, 820)

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
      <div style={{ width: 480, paddingLeft: 72, flexShrink: 0 }}>
        <Logo size={24} />
        <h1 style={{ fontSize: 50, lineHeight: 1.04, letterSpacing: -1, margin: '34px 0 14px' }}>Building your little universe…</h1>
        <p style={{ color: C.text2, fontSize: 16.5, lineHeight: 1.5, margin: 0, maxWidth: 380 }}>
          No setup. Orbit looks at who you actually make plans with, and how often, then puts everyone in orbit around you.
        </p>
        <div style={{ display: 'grid', gap: 12, margin: '30px 0 22px' }}>
          {rows.map((r) => {
            const s = stages[r.key]
            return (
              <motion.div key={r.key} animate={{ opacity: s.state === 'pending' ? 0.45 : 1 }} style={{ ...panel, borderRadius: 18, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 22, display: 'grid', placeItems: 'center' }}>
                  {s.state === 'done' ? <Check /> : s.state === 'working' ? <Spinner size={18} /> : <div style={{ width: 16, height: 16, borderRadius: 99, border: '2px solid rgba(255,255,255,.2)' }} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{s.state === 'done' ? r.title : r.idle}</div>
                  <div style={{ color: C.text3, fontSize: 13.5, marginTop: 2 }}>
                    {s.state === 'pending' ? 'Up next' : s.state === 'working' && r.key !== 'links' ? 'One moment…' : r.sub(s.count)}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.08)', overflow: 'hidden', marginBottom: 26 }}>
          <motion.div animate={{ width: `${progress * 100}%` }} transition={{ ease: 'easeOut', duration: 0.4 }} style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg, ${C.teal}, ${C.crimson2})` }} />
        </div>
        <Cta onClick={onDone} disabled={!done} style={{ padding: '15px 30px', fontSize: 16, fontFamily: tight }}>See my orbit →</Cta>
      </div>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
        <OrbitGraph friends={friends} links={orbit.links} clusters={[]} driftR={orbit.drift_line.radius} visible={visible} linkCount={linkCount} flash={flash} size={size} />
      </div>
    </div>
  )
}
