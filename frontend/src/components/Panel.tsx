import type { CSSProperties, ReactNode } from 'react'
import { C, cta, ghostBtn, panel, tight } from '../theme'

export function Panel({ children, style, className = '' }: { children: ReactNode; style?: CSSProperties; className?: string }) {
  return <div className={className} style={{ ...panel, padding: 22, ...style }}>{children}</div>
}

export function Cta({ children, onClick, disabled, style }: { children: ReactNode; onClick?: () => void; disabled?: boolean; style?: CSSProperties }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...cta, padding: '13px 24px', fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: disabled ? 0.4 : 1, transition: 'opacity .3s, transform .15s', ...style }}>
      {children}
    </button>
  )
}

export function Pill({ children, onClick, style, active }: { children: ReactNode; onClick?: () => void; style?: CSSProperties; active?: boolean }) {
  return (
    <button onClick={onClick} style={{ ...ghostBtn, padding: '9px 16px', fontSize: 13.5, ...(active ? { color: C.text, borderColor: 'rgba(245,245,247,.4)' } : {}), ...style }}>
      {children}
    </button>
  )
}

export function Tag({ children, color = C.text2, bg = 'rgba(255,255,255,0.07)', style }: { children: ReactNode; color?: string; bg?: string; style?: CSSProperties }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, color, background: bg, whiteSpace: 'nowrap', ...style }}>{children}</span>
}

export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size + 8} height={size + 8} viewBox="-16 -16 32 32">
        <ellipse rx={14} ry={6} transform="rotate(-24)" fill="none" stroke={C.teal} strokeWidth={1.6} opacity={0.9} />
        <circle r={6.5} fill={C.crimson2} />
        <circle cx={11.6} cy={-7.4} r={2.6} fill={C.cream} />
      </svg>
      <span style={{ fontFamily: tight, fontWeight: 700, fontSize: size, letterSpacing: -0.6 }}>Orbit</span>
    </div>
  )
}

export const Spinner = ({ size = 16, color = C.teal }: { size?: number; color?: string }) => (
  <svg className="spinner" width={size} height={size} viewBox="0 0 20 20"><circle cx={10} cy={10} r={8} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={2.5} /><path d="M10 2a8 8 0 0 1 8 8" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" /></svg>
)
export const Check = ({ size = 18, color = C.teal, mark = '#04201E' }: { size?: number; color?: string; mark?: string }) => (
  <svg width={size} height={size} viewBox="0 0 20 20"><circle cx={10} cy={10} r={10} fill={color} /><path d="M5.5 10.4l3 3 6-6.4" fill="none" stroke={mark} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" /></svg>
)
export const Moon = ({ size = 20, color = '#fff' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill={color} /></svg>
)
export const Sunrise = ({ size = 44 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <circle cx={24} cy={30} r={11} fill={C.crimson2} /><circle cx={22.5} cy={28.5} r={7.5} fill="#FF8A98" opacity={0.55} />
    <rect x={0} y={30} width={48} height={18} fill="transparent" />
    {[-60, -30, 0, 30, 60].map((a) => <rect key={a} x={23} y={8} width={2} height={7} rx={1} fill={C.cream} transform={`rotate(${a} 24 30)`} />)}
    <rect x={6} y={37} width={36} height={2.4} rx={1.2} fill={C.teal} /><rect x={13} y={42} width={22} height={2.4} rx={1.2} fill={C.teal} opacity={0.6} />
  </svg>
)

export const names = (list: string[]) => (list.length <= 1 ? list[0] ?? '' : `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`)
