import { C } from '../theme'

/** "You" at the center: stacked flat discs. */
export default function Sun({ r = 44, label = 'You' }: { r?: number; label?: string }) {
  const o = r * 0.2
  const disc = (cx: number, cy: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`
  return (
    <g>
      <circle className="halo" r={r * 1.38} fill={C.crimson} opacity={0.22} />
      <circle r={r} fill={C.sun} />
      <circle r={r * 0.74} cx={-r * 0.06} cy={-r * 0.06} fill={C.sunInner} />
      <clipPath id="sun-clip"><circle r={r} /></clipPath>
      <path clipPath="url(#sun-clip)" fillRule="evenodd" d={disc(0, 0) + disc(-o, -o)} fill="#7A1226" opacity={0.5} />
      <ellipse cx={-r * 0.42} cy={-r * 0.5} rx={r * 0.2} ry={r * 0.1} transform={`rotate(-38 ${-r * 0.42} ${-r * 0.5})`} fill="#FFD9DD" opacity={0.9} />
      {label && (
        <text textAnchor="middle" y={r * 0.13} fontSize={r * 0.4} fontWeight={700} fill="#fff" style={{ fontFamily: '"Inter Tight", Inter, sans-serif' }}>
          {label}
        </text>
      )}
    </g>
  )
}
