import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { forceCollide, forceLink, forceRadial, forceSimulation } from 'd3-force'
import { AnimatePresence, motion } from 'framer-motion'
import { C } from '../theme'
import type { Friend, Intro, Link } from '../types'
import { PlanetArt, SaturnRing } from './Planet'
import Sun from './Sun'

const RAD = Math.PI / 180
const xy = (r: number, deg: number) => ({ x: r * Math.cos(deg * RAD), y: -r * Math.sin(deg * RAD) })
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)

/** Angles come from a one-off d3-force layout (radial + friend–friend links + collide); radii then animate freely. */
const angleCache = new Map<string, Record<string, number>>()
function layoutAngles(friends: Friend[], links: Link[]): Record<string, number> {
  const key = friends.map((f) => f.id).sort().join(',')
  const hit = angleCache.get(key)
  if (hit) return hit
  type N = { id: string; x: number; y: number; r: number; size: number }
  const nodes: N[] = friends.map((f) => ({ id: f.id, r: f.radius, size: f.planet.size, ...xy(f.radius, f.planet.angle_hint) }))
  const sim = forceSimulation(nodes)
    .force('radial', forceRadial<N>((n) => n.r).strength(1))
    .force('link', forceLink<N, { source: string; target: string }>(links.map((l) => ({ source: l.a, target: l.b }))).id((n) => n.id).distance(120).strength(0.012))
    .force('collide', forceCollide<N>((n) => n.size + 30).strength(0.9))
    .alpha(0.5)
    .stop()
  for (let i = 0; i < 160; i++) sim.tick()
  const out: Record<string, number> = {}
  nodes.forEach((n) => (out[n.id] = (Math.atan2(-n.y, n.x) / RAD + 360) % 360))
  angleCache.set(key, out)
  return out
}

function Chip({ text, bg, fg, y = 0 }: { text: string; bg: string; fg: string; y?: number }) {
  const w = text.length * 6.3 + 18
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={-w / 2} y={-10.5} width={w} height={21} rx={10.5} fill={bg} />
      <text textAnchor="middle" y={4} fontSize={11} fontWeight={600} fill={fg}>{text}</text>
    </g>
  )
}

const spark = (s: number) => `M0 ${-s}Q0 0 ${s} 0Q0 0 0 ${s}Q0 0 ${-s} 0Q0 0 0 ${-s}Z`
function Burst({ r }: { r: number }) {
  return (
    <g>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.3
        const d = r + 16 + (i % 3) * 9
        return (
          <motion.path key={i} d={spark(4 + (i % 3) * 2.5)} fill={i % 2 ? C.cream : C.teal}
            initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, scale: [0, 1.5, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, delay: (i % 4) * 0.09, repeat: 2, repeatDelay: 0.35, ease: 'easeOut' }} />
        )
      })}
    </g>
  )
}

type Props = {
  friends: Friend[]
  links: Link[]
  clusters: string[][]
  driftR: number
  intro?: Intro | null
  selected?: string | null
  onSelect?: (id: string) => void
  visible?: Set<string> | null // Build screen: which planets have popped in
  linkCount?: number // Build screen: how many links are revealed
  flash?: { a: string; b: string; text: string; n: number } | null
  sparkle?: string[]
  mini?: boolean
  labelOnly?: string[]
  labelAbove?: string[]
  size: number // rendered px (square)
  view?: number // viewBox half-extent
}

export default function OrbitGraph({ friends, links, clusters, driftR, intro, selected, onSelect, visible, linkCount, flash, sparkle, mini, labelOnly, labelAbove, size, view = 416 }: Props) {
  const angles = useMemo(() => layoutAngles(friends, links), [friends.map((f) => f.id).join(','), links.length]) // eslint-disable-line
  const shown = useMemo(() => friends.filter((f) => !visible || visible.has(f.id)), [friends, visible])
  const shownLinks = useMemo(
    () => links.slice(0, linkCount ?? links.length).filter((l) => !visible || (visible.has(l.a) && visible.has(l.b))),
    [links, linkCount, visible],
  )
  const clusterOf = useMemo(() => new Set(clusters.flat()), [clusters])
  const byId = useMemo(() => Object.fromEntries(friends.map((f) => [f.id, f])), [friends])

  // ---- animation: springs on radius + gentle sway, written straight to the DOM each frame
  const latest = useRef({ friends: shown, links: shownLinks, clusters, intro, flash })
  latest.current = { friends: shown, links: shownLinks, clusters, intro, flash }
  const sim = useRef<Record<string, { r: number; v: number }>>({})
  const el = useRef<Record<string, SVGElement | null>>({})
  const set = (k: string) => (node: SVGElement | null) => { el.current[k] = node }

  const frame = (t: number, dt: number) => {
    const { friends, links, clusters, intro, flash } = latest.current
    const pos: Record<string, { x: number; y: number; r: number; a: number }> = {}
    for (const f of friends) {
      const s = (sim.current[f.id] ??= { r: f.radius + 150, v: 0 })
      const steps = Math.max(1, Math.ceil(dt / 0.008))
      for (let i = 0; i < steps; i++) {
        const h = dt / steps
        s.v += (38 * (f.radius - s.r) - 9.5 * s.v) * h
        s.r += s.v * h
      }
      const h = hash(f.id)
      const sway = (2 + (h % 10) / 10) * Math.sin((t / 1000) * ((2 * Math.PI) / (11 + (h % 9))) + h)
      const a = angles[f.id] + sway
      pos[f.id] = { ...xy(s.r, a), r: s.r, a }
      el.current[`n:${f.id}`]?.setAttribute('transform', `translate(${pos[f.id].x.toFixed(2)} ${pos[f.id].y.toFixed(2)})`)
      el.current[`o:${f.id}`]?.setAttribute('r', s.r.toFixed(1))
      if (f.forecast) {
        const g = xy(f.forecast.radius, a)
        const line = el.current[`gl:${f.id}`]
        line?.setAttribute('x1', `${pos[f.id].x}`); line?.setAttribute('y1', `${pos[f.id].y}`)
        line?.setAttribute('x2', `${g.x}`); line?.setAttribute('y2', `${g.y}`)
        el.current[`gc:${f.id}`]?.setAttribute('transform', `translate(${g.x} ${g.y})`)
      }
    }
    const seg = (key: string, a: string, b: string) => {
      const line = el.current[key], p = pos[a], q = pos[b]
      if (!line || !p || !q) return
      line.setAttribute('x1', `${p.x}`); line.setAttribute('y1', `${p.y}`); line.setAttribute('x2', `${q.x}`); line.setAttribute('y2', `${q.y}`)
    }
    links.forEach((l) => seg(`l:${l.a}-${l.b}`, l.a, l.b))
    if (intro && pos[intro.a] && pos[intro.b]) {
      seg('intro', intro.a, intro.b)
      el.current['introChip']?.setAttribute('transform', `translate(${pos[intro.a].x * 0.36 + pos[intro.b].x * 0.64} ${pos[intro.a].y * 0.36 + pos[intro.b].y * 0.64 - 15})`)
    }
    if (flash && pos[flash.a] && pos[flash.b]) {
      el.current['flash']?.setAttribute('transform', `translate(${(pos[flash.a].x + pos[flash.b].x) / 2} ${(pos[flash.a].y + pos[flash.b].y) / 2 - 16})`)
      seg('flashLine', flash.a, flash.b)
    }
    clusters.forEach((c, i) => {
      const pts = c.map((id) => pos[id]).filter(Boolean).sort((p, q) => p.a - q.a)
      if (pts.length > 1) el.current[`c:${i}`]?.setAttribute('d', 'M' + pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('L') + 'Z')
    })
  }

  useLayoutEffect(() => { frame(performance.now(), 0.001) })
  useEffect(() => {
    let raf = 0, last = performance.now()
    const loop = (t: number) => {
      frame(t, Math.min(0.05, (t - last) / 1000))
      last = t
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, []) // eslint-disable-line

  const inCluster = (l: Link) => clusters.some((c) => c.includes(l.a) && c.includes(l.b))
  const showLabel = (id: string) => !mini || labelOnly?.includes(id)

  return (
    <svg width={size} height={size} viewBox={`${-view} ${-view} ${view * 2} ${view * 2}`} style={{ overflow: 'visible', display: 'block' }}>
      <defs>
        <filter id="soft" filterUnits="userSpaceOnUse" x={-view * 1.5} y={-view * 1.5} width={view * 3} height={view * 3}><feGaussianBlur stdDeviation="16" /></filter>
      </defs>

      {/* faint orbit ring per friend */}
      {shown.map((f) => (
        <circle key={f.id} ref={set(`o:${f.id}`)} fill="none" stroke="rgba(200,225,255,0.07)" strokeWidth={1} />
      ))}

      {/* the drift line */}
      <g style={{ filter: `drop-shadow(0 0 7px ${C.crimson})` }}>
        <circle className="drift-ring" r={driftR} fill="none" stroke={C.crimson} strokeWidth={mini ? 2.6 : 2} strokeDasharray="14 9" strokeLinecap="round" opacity={0.95} />
      </g>
      {!mini && (
        <g transform={`translate(${xy(driftR, 118).x} ${xy(driftR, 118).y})`}>
          <rect x={-33} y={-9} width={66} height={18} rx={9} fill="#04060E" opacity={0.85} />
          <text textAnchor="middle" y={3.5} fontSize={10} fontWeight={600} letterSpacing={0.6} fill={C.crimson2}>DRIFT LINE</text>
        </g>
      )}

      {/* drifting clusters: soft pulsing crimson band */}
      {clusters.map((c, i) => (
        <g key={c.join()} className="glow-pulse">
          <path ref={set(`c:${i}`)} fill={C.crimson} fillOpacity={c.length <= 4 ? 0.16 : 0} stroke={C.crimson} strokeOpacity={0.3} strokeWidth={84} strokeLinejoin="round" strokeLinecap="round" filter="url(#soft)" />
        </g>
      ))}

      {/* friend–friend links */}
      {shownLinks.map((l) => (
        <motion.line key={`${l.a}-${l.b}`} ref={set(`l:${l.a}-${l.b}`) as any} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          stroke={inCluster(l) ? 'rgba(240,110,125,0.5)' : 'rgba(170,205,235,0.2)'} strokeWidth={inCluster(l) ? 1.5 : 1.1} />
      ))}
      {flash && <line key={`f${flash.n}`} ref={set('flashLine') as any} stroke={C.teal} strokeWidth={2.4} strokeLinecap="round" opacity={0.9} />}

      {/* matchmaker */}
      {intro && byId[intro.a] && byId[intro.b] && (!visible || (visible.has(intro.a) && visible.has(intro.b))) && !mini && (
        <>
          <line ref={set('intro') as any} className={intro.confirmed ? '' : 'flow'} stroke={C.teal} strokeWidth={intro.confirmed ? 2.2 : 2} strokeLinecap="round"
            strokeDasharray={intro.confirmed ? undefined : '8 6'} style={{ filter: `drop-shadow(0 0 5px ${C.teal})` }} />
          <g ref={set('introChip') as any}>
            <Chip text={intro.confirmed ? 'Introduced' : 'Intro?'} bg={C.teal} fg="#06302E" />
          </g>
        </>
      )}

      {/* 14-day forecast ghosts */}
      {!mini && shown.filter((f) => f.forecast).map((f) => (
        <g key={`g${f.id}`} opacity={0.7}>
          <line ref={set(`gl:${f.id}`) as any} stroke={C.crimson2} strokeWidth={1.2} strokeDasharray="1.5 5" strokeLinecap="round" />
          <g ref={set(`gc:${f.id}`) as any}>
            <circle r={f.planet.size * 0.9} fill="rgba(232,56,79,0.06)" stroke={C.crimson2} strokeWidth={1.1} strokeDasharray="3 4" />
            <text textAnchor="middle" y={f.planet.size + 13} fontSize={9.5} fill={C.crimson2} fontWeight={500}>in {f.forecast!.days} days</text>
          </g>
        </g>
      ))}

      <Sun r={mini ? 40 : 44} />

      {/* planets */}
      {shown.map((f) => {
        const r = f.planet.size * (mini ? 0.98 : 1)
        const out = f.status === 'drifted' || f.status === 'long_lost'
        const ring = !!f.life_event
        return (
          <g key={f.id} ref={set(`n:${f.id}`) as any} onClick={() => onSelect?.(f.id)} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }}>
              {selected === f.id && <circle r={r + 11} fill="rgba(255,255,255,0.06)" stroke="rgba(245,245,247,0.75)" strokeWidth={1.4} />}
              {clusterOf.has(f.id) && !mini && <circle r={r + 16} fill={C.crimson} opacity={0.1} />}
              <g opacity={out ? 0.85 : 1}>
                {ring && <SaturnRing r={r} half="back" />}
                <PlanetArt p={f.planet} r={r} />
                {ring && <SaturnRing r={r} half="front" />}
              </g>
              {out && <circle r={r + 5.5} fill="none" stroke={C.crimson2} strokeWidth={1.3} strokeDasharray="4 4" opacity={0.9} />}
              {showLabel(f.id) && (
                <>
                  <text textAnchor="middle" y={labelAbove?.includes(f.id) ? -r - 10 : r + 19} fontSize={mini ? 15 : 12.5} fontWeight={600} fill={C.text} style={{ paintOrder: 'stroke', stroke: 'rgba(4,6,14,0.75)', strokeWidth: 3 }}>{f.name}</text>
                  {out && !mini && (
                    <text textAnchor="middle" y={r + 33} fontSize={10.5} fontWeight={500} fill={C.crimson2} style={{ paintOrder: 'stroke', stroke: 'rgba(4,6,14,0.75)', strokeWidth: 3 }}>
                      {f.days_since > 400 ? `${Math.round(f.days_since / 365)} years` : `${f.days_since} days`}
                    </text>
                  )}
                </>
              )}
              {ring && !mini && <Chip text={f.life_event!.chip} bg={C.cream} fg="#3A2A22" y={-r - 20} />}
              <AnimatePresence>{sparkle?.includes(f.id) && <Burst r={r} />}</AnimatePresence>
            </motion.g>
          </g>
        )
      })}

      {/* Build screen: "friends!" flash chip */}
      <AnimatePresence>
        {flash && (
          <g ref={set('flash') as any} key={`chip${flash.n}`}>
            <motion.g initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <Chip text={flash.text} bg={C.teal} fg="#06302E" />
            </motion.g>
          </g>
        )}
      </AnimatePresence>
    </svg>
  )
}
