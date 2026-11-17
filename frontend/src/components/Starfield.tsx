import { memo } from 'react'

function rng(seed: number) {
  let s = seed
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296)
}

const NEBULA = [
  'radial-gradient(42% 48% at 12% 14%, rgba(38,140,150,.36), transparent 70%)',
  'radial-gradient(26% 20% at 30% 30%, rgba(95,205,200,.16), transparent 72%)',
  'radial-gradient(16% 22% at 72% 46%, rgba(245,225,212,.10), transparent 70%)',
  'radial-gradient(38% 30% at 74% 48%, rgba(205,62,72,.30), transparent 72%)',
  'radial-gradient(30% 26% at 56% 78%, rgba(170,70,60,.18), transparent 72%)',
  'radial-gradient(40% 44% at 90% 88%, rgba(120,95,185,.32), transparent 70%)',
  'radial-gradient(44% 46% at 8% 90%, rgba(52,64,150,.36), transparent 70%)',
  'radial-gradient(90% 80% at 50% 40%, rgba(22,30,70,.55), transparent 80%)',
].join(', ')

const sparkle = (s: number) => `M0 ${-s} Q0 0 ${s} 0 Q0 0 0 ${s} Q0 0 ${-s} 0 Q0 0 0 ${-s}Z`

export default memo(function Starfield({ dawn = false }: { dawn?: boolean }) {
  const r = rng(11)
  const dots = Array.from({ length: 190 }, () => ({ x: r() * 100, y: r() * 100, s: 0.5 + r() * 0.9, o: 0.25 + r() * 0.5 }))
  const bright = Array.from({ length: 34 }, () => ({ x: r() * 100, y: r() * 100, s: 1.1 + r() * 1.1, d: r() * 3.2 }))
  const sparks = Array.from({ length: 7 }, () => ({ x: 6 + r() * 88, y: 6 + r() * 88, s: 5 + r() * 5, d: r() * 3 }))
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04060E', overflow: 'hidden', zIndex: 0 }}>
      <div style={{ position: 'absolute', inset: '-4%', backgroundImage: NEBULA, animation: 'nebula-drift 40s ease-in-out infinite' }} />
      {dawn && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(232,56,79,.34) 0%, rgba(95,211,200,.16) 26%, transparent 52%)' }} />
      )}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        {dots.map((d, i) => <circle key={i} cx={`${d.x}%`} cy={`${d.y}%`} r={d.s} fill="#E9F1FF" opacity={d.o} />)}
        {bright.map((d, i) => (
          <circle key={`b${i}`} className="twinkle" cx={`${d.x}%`} cy={`${d.y}%`} r={d.s} fill="#fff" style={{ animationDelay: `${d.d}s` }} />
        ))}
        {sparks.map((d, i) => (
          <svg key={`s${i}`} x={`${d.x}%`} y={`${d.y}%`} overflow="visible">
            <path className="twinkle" d={sparkle(d.s)} fill="#F6EEE6" style={{ animationDelay: `${d.d}s`, animationDuration: '4.5s' }} />
          </svg>
        ))}
      </svg>
    </div>
  )
})
