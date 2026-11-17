import type { CSSProperties } from 'react'

export const C = {
  bg: '#04060E',
  text: '#F5F5F7', text2: '#CFCFDA', text3: '#A4A4B4',
  crimson: '#E8384F', crimson2: '#F0475C', plum: '#5E2A7A',
  teal: '#5FD3C8', cream: '#F6EEE6',
  sun: '#D12E45', sunInner: '#F0475C',
  panel: 'rgba(10,14,32,0.78)', border: 'rgba(140,210,225,0.13)',
}

export const panel: CSSProperties = {
  background: C.panel, border: `1px solid ${C.border}`, borderRadius: 24,
  backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
}

export const cta: CSSProperties = {
  background: `linear-gradient(100deg, ${C.crimson2}, ${C.plum})`, color: '#fff', border: 'none', borderRadius: 999,
  fontWeight: 600, boxShadow: '0 10px 30px rgba(240,71,92,0.35)',
}

export const ghostBtn: CSSProperties = {
  background: 'rgba(255,255,255,0.05)', color: C.text2, border: `1px solid ${C.border}`, borderRadius: 999, fontWeight: 500,
}

export const tight = '"Inter Tight", Inter, system-ui, sans-serif'
