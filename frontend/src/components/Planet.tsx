import { memo, useId } from 'react'
import type { PlanetSpec } from '../types'

const disc = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`

function Surface({ p, r }: { p: PlanetSpec; r: number }) {
  const { light, dark, style } = p
  switch (style) {
    case 'bands':
    case 'bands_spot':
      return (
        <g transform="rotate(-12)">
          <rect x={-r * 1.2} y={-r * 0.66} width={r * 2.4} height={r * 0.2} fill={dark} opacity={0.34} />
          <rect x={-r * 1.2} y={-r * 0.3} width={r * 2.4} height={r * 0.24} fill={light} opacity={0.32} />
          <rect x={-r * 1.2} y={r * 0.1} width={r * 2.4} height={r * 0.13} fill={dark} opacity={0.3} />
          <rect x={-r * 1.2} y={r * 0.4} width={r * 2.4} height={r * 0.22} fill={light} opacity={0.24} />
          <rect x={-r * 1.2} y={r * 0.76} width={r * 2.4} height={r * 0.3} fill={dark} opacity={0.3} />
          {style === 'bands_spot' && (
            <>
              <ellipse cx={r * 0.2} cy={r * 0.24} rx={r * 0.3} ry={r * 0.17} fill={light} opacity={0.9} />
              <ellipse cx={r * 0.23} cy={r * 0.26} rx={r * 0.16} ry={r * 0.08} fill={dark} opacity={0.45} />
            </>
          )}
        </g>
      )
    case 'continents': {
      const land = p.continent ?? dark
      return (
        <g>
          <path fill={land} d={`M${-r * 0.75} ${-r * 0.45}q${r * 0.25} ${-r * 0.3} ${r * 0.55} ${-r * 0.15}q${r * 0.2} ${r * 0.12} ${r * 0.05} ${r * 0.34}q${-r * 0.1} ${r * 0.16} ${-r * 0.3} ${r * 0.12}q${-r * 0.12} ${r * 0.22} ${-r * 0.3} ${r * 0.08}q${-r * 0.14} ${-r * 0.16} 0 ${-r * 0.39}z`} />
          <path fill={land} d={`M${r * 0.05} ${r * 0.2}q${r * 0.3} ${-r * 0.2} ${r * 0.55} ${r * 0.02}q${r * 0.2} ${r * 0.2} ${-r * 0.02} ${r * 0.42}q${-r * 0.2} ${r * 0.2} ${-r * 0.42} ${r * 0.1}q${-r * 0.3} ${-r * 0.2} ${-r * 0.11} ${-r * 0.54}z`} />
          <path fill={land} d={`M${-r * 0.6} ${r * 0.5}q${r * 0.2} ${-r * 0.12} ${r * 0.3} ${r * 0.06}q${r * 0.04} ${r * 0.2} ${-r * 0.16} ${r * 0.22}q${-r * 0.2} ${-r * 0.04} ${-r * 0.14} ${-r * 0.28}z`} />
          <rect x={-r * 0.2} y={-r * 0.12} width={r * 0.9} height={r * 0.11} rx={r * 0.055} fill={light} opacity={0.9} />
          <rect x={-r * 0.85} y={r * 0.26} width={r * 0.6} height={r * 0.09} rx={r * 0.045} fill={light} opacity={0.8} />
          <rect x={r * 0.1} y={-r * 0.62} width={r * 0.5} height={r * 0.08} rx={r * 0.04} fill={light} opacity={0.75} />
        </g>
      )
    }
    case 'cloudbands':
      return (
        <g transform="rotate(-8)">
          {[
            [-0.9, -0.62, 1.1, 0.13], [0.0, -0.4, 1.2, 0.11], [-1.1, -0.12, 1.5, 0.15], [0.1, 0.12, 0.8, 0.1],
            [-0.7, 0.36, 1.3, 0.14], [-0.2, 0.64, 0.9, 0.11],
          ].map(([x, y, w, h], i) => (
            <rect key={i} x={r * x} y={r * y} width={r * w} height={r * h} rx={(r * h) / 2} fill={i % 3 === 2 ? dark : light} opacity={i % 3 === 2 ? 0.3 : 0.55} />
          ))}
        </g>
      )
    case 'craters':
      return (
        <g>
          {[[-0.3, -0.25, 0.24], [0.35, 0.1, 0.17], [-0.15, 0.45, 0.14], [0.3, -0.5, 0.1], [-0.6, 0.15, 0.09]].map(([x, y, s], i) => (
            <g key={i}>
              <circle cx={r * x} cy={r * y} r={r * s} fill={dark} opacity={0.4} />
              <circle cx={r * (x + s * 0.18)} cy={r * (y + s * 0.18)} r={r * s * 0.78} fill={light} opacity={0.22} />
            </g>
          ))}
        </g>
      )
    case 'swirls':
      return (
        <g fill="none" strokeLinecap="round">
          <path d={`M${-r * 1.1} ${-r * 0.35}C${-r * 0.4} ${-r * 0.8} ${r * 0.1} ${-r * 0.05} ${r * 1.1} ${-r * 0.5}`} stroke={light} strokeWidth={r * 0.16} opacity={0.5} />
          <path d={`M${-r * 1.1} ${r * 0.1}C${-r * 0.5} ${-r * 0.25} ${r * 0.2} ${r * 0.5} ${r * 1.1} ${r * 0.05}`} stroke={dark} strokeWidth={r * 0.14} opacity={0.32} />
          <path d={`M${-r * 1.1} ${r * 0.55}C${-r * 0.3} ${r * 0.25} ${r * 0.3} ${r * 0.95} ${r * 1.1} ${r * 0.5}`} stroke={light} strokeWidth={r * 0.13} opacity={0.42} />
          <path d={`M${-r * 0.25} ${-r * 0.02}q${r * 0.2} ${-r * 0.16} ${r * 0.36} 0q${-r * 0.02} ${r * 0.2} ${-r * 0.2} ${r * 0.16}`} stroke={light} strokeWidth={r * 0.09} opacity={0.75} />
        </g>
      )
  }
}

/** Flat-vector planet, centered on (0,0). */
export const PlanetArt = memo(function PlanetArt({ p, r, moon = p.moon }: { p: PlanetSpec; r: number; moon?: boolean }) {
  const id = useId()
  const o = r * 0.22
  const rim = r - Math.max(0.6, r * 0.03)
  const pt = (deg: number) => `${rim * Math.cos((deg * Math.PI) / 180)} ${rim * Math.sin((deg * Math.PI) / 180)}`
  return (
    <g>
      <clipPath id={id}><circle r={r} /></clipPath>
      <circle r={r} fill={p.mid} />
      <g clipPath={`url(#${id})`}>
        <Surface p={p} r={r} />
        {/* hard-edged crescent shadow: planet minus the same circle nudged toward the light */}
        <path fillRule="evenodd" d={disc(0, 0, r) + disc(-o, -o, r)} fill={p.dark} opacity={0.62} />
        <ellipse cx={-r * 0.44} cy={-r * 0.5} rx={r * 0.2} ry={r * 0.1} transform={`rotate(-40 ${-r * 0.44} ${-r * 0.5})`} fill={p.light} opacity={0.9} />
        <circle cx={-r * 0.68} cy={-r * 0.2} r={Math.max(0.8, r * 0.05)} fill={p.light} opacity={0.9} />
      </g>
      <path d={`M${pt(172)}A${rim} ${rim} 0 0 1 ${pt(272)}`} fill="none" stroke={p.light} strokeWidth={Math.max(1, r * 0.06)} strokeLinecap="round" opacity={0.85} />
      {moon && (
        <g>
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="7s" repeatCount="indefinite" />
          <circle cx={r * 1.5} r={r * 0.17} fill="#DDE6F2" />
          <circle cx={r * 1.54} cy={r * 0.04} r={r * 0.12} fill="#7C8AA6" opacity={0.55} />
        </g>
      )}
    </g>
  )
})

/** Cream Saturn ring for life events. Render `back` before the planet and `front` after it. */
export function SaturnRing({ r, half }: { r: number; half: 'back' | 'front' }) {
  const rx = r * 1.62, ry = r * 0.44
  const d = half === 'back' ? `M${-rx} 0A${rx} ${ry} 0 0 1 ${rx} 0` : `M${-rx} 0A${rx} ${ry} 0 0 0 ${rx} 0`
  return <path d={d} transform="rotate(-18)" fill="none" stroke="#F6EEE6" strokeWidth={Math.max(2.4, r * 0.15)} strokeLinecap="round" opacity={half === 'back' ? 0.55 : 1} />
}

/** Standalone avatar (own <svg>) for panels and chat. */
export function PlanetAvatar({ p, size = 56, ring = false, style }: { p: PlanetSpec; size?: number; ring?: boolean; style?: React.CSSProperties }) {
  const r = 20
  return (
    <svg width={size} height={size} viewBox="-34 -34 68 68" style={{ flexShrink: 0, overflow: 'visible', ...style }}>
      {ring && <SaturnRing r={r} half="back" />}
      <PlanetArt p={p} r={ring ? r : 30} moon={false} />
      {ring && <SaturnRing r={r} half="front" />}
    </svg>
  )
}
