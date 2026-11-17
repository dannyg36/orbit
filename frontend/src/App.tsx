import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { api } from './api'
import Starfield from './components/Starfield'
import Build from './screens/Build'
import Morning from './screens/Morning'
import Night from './screens/Night'
import OrbitScreen from './screens/Orbit'
import type { Brief, Orbit } from './types'

type Screen = 'build' | 'orbit' | 'night' | 'morning'
const params = new URLSearchParams(location.search)
const DEMO = params.get('demo') === '1'
const START = (params.get('screen') as Screen) || 'build'
const W = 1440, H = 900 // design stage; scaled to fit whatever window it's recorded in

export default function App() {
  const [screen, setScreen] = useState<Screen>(START)
  const [orbit, setOrbit] = useState<Orbit | null>(null)
  const [brief, setBrief] = useState<Brief | null>(null)
  const [ff, setFfState] = useState(0)
  const [run, setRun] = useState(0)
  const [vp, setVp] = useState({ w: innerWidth, h: innerHeight })
  const seq = useRef(0)
  const scale = Math.min(vp.w / W, vp.h / H)

  const load = useCallback((n: number) => {
    const mine = ++seq.current
    return api.orbit(n).then((o) => { if (mine === seq.current) setOrbit(o) })
  }, [])
  const setFf = useCallback((n: number) => { setFfState(n); load(n) }, [load])

  useEffect(() => {
    (DEMO && START === 'build' ? api.reset() : Promise.resolve()).then(() => load(0))
    if (START === 'morning') api.brief().then(setBrief)
    const onResize = () => setVp({ w: innerWidth, h: innerHeight })
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [load])

  const rebuild = useCallback(async () => {
    await api.reset(); setBrief(null); setFfState(0); await load(0); setRun((r) => r + 1); setScreen('build')
  }, [load])
  const morning = useCallback(async (b?: Brief | null) => { setBrief(b ?? (await api.brief())); setScreen('morning') }, [])
  const sleep = useCallback(() => { setFfState(0); load(0); setRun((r) => r + 1); setScreen('night') }, [load])
  const approve = useCallback(async (id: string, yes: boolean) => { setBrief(await api.approve(id, yes)); load(ff) }, [ff, load])

  // video mode shortcuts
  const keys = useRef<Record<string, () => void>>({})
  keys.current = {
    b: rebuild,
    f: () => { setScreen('orbit'); setFf(ff ? 0 : 21) },
    s: sleep,
    m: () => morning(),
    o: () => setScreen('orbit'),
    r: async () => {
      const b = brief ?? (await api.brief())
      let last = b
      for (const h of b.handled) if (h.kind === 'dinner') for (const r of h.rsvps) if (r.status !== 'in') last = await api.simulateReply(r.friend)
      setBrief(last)
    },
  }
  useEffect(() => {
    if (!DEMO) return
    const on = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey && !e.altKey) keys.current[e.key.toLowerCase()]?.() }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden' }}>
      <Starfield dawn={screen === 'morning'} />
      <AnimatePresence mode="wait">
        {orbit && (
          <motion.div key={`${screen}${screen === 'orbit' ? '' : run}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45 }}
            style={{ position: 'absolute', zIndex: 1, width: W, height: H, left: '50%', top: '50%', marginLeft: -W / 2, marginTop: -H / 2, transform: `scale(${scale})`, transformOrigin: 'center' }}>
            {screen === 'build' && <Build orbit={orbit} onDone={() => setScreen('orbit')} vh={H} />}
            {screen === 'orbit' && (
              <OrbitScreen orbit={orbit} ff={ff} setFf={setFf} onSleep={sleep} onRebuild={rebuild} onMorning={() => morning()} demo={DEMO} vw={W} vh={H}
                onHangout={(id) => api.hangout(id, ff).then(setOrbit)} onIntro={() => approve('intro', true)} />
            )}
            {screen === 'night' && <Night orbit={orbit} pace={DEMO ? 1 : 0.6} demo={DEMO} onDone={(b) => morning(b)} />}
            {screen === 'morning' && brief && (
              <Morning orbit={orbit} brief={brief} vh={H} onApprove={approve} onReply={(f) => api.simulateReply(f).then(setBrief)} onOrbit={() => setScreen('orbit')} />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
