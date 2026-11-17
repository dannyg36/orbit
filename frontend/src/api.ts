import type { Brief, Orbit } from './types'

const get = <T,>(url: string) => fetch(url).then((r) => r.json() as Promise<T>)
const post = <T,>(url: string, body: unknown = {}) =>
  fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json() as Promise<T>)

export const api = {
  orbit: (ff = 0) => get<Orbit>(`/api/orbit?ff=${ff}`),
  hangout: (friend: string, ff: number) => post<Orbit>('/api/hangout', { friend, ff }),
  brief: () => get<Brief>('/api/brief'),
  approve: (id: string, yes: boolean) => post<Brief>('/api/approve', { id, yes }),
  simulateReply: (friend: string) => post<Brief>('/api/simulate-reply', { friend }),
  reset: () => post<{ ok: boolean }>('/api/demo/reset'),
}

/** Server-Sent Events helper. Returns a stop function. */
export function stream(url: string, onEvent: (e: any) => void): () => void {
  const es = new EventSource(url)
  es.onmessage = (m) => {
    const e = JSON.parse(m.data)
    onEvent(e)
    if (e.type === 'done') es.close()
  }
  es.onerror = () => es.close()
  return () => es.close()
}
