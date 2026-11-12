import { useEffect, useState } from 'react'

const read = () => window.location.hash.replace(/^#/, '') || '/'

export function useRoute(): string {
  const [route, setRoute] = useState(read)
  useEffect(() => {
    const f = () => setRoute(read())
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  return route
}

export function go(path: string) {
  window.location.hash = path
}

export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const PREFILL = 'hivewright.prefill'
export function setPrefill(text: string) {
  try { sessionStorage.setItem(PREFILL, text) } catch { /* storage unavailable */ }
}
export function takePrefill(): string {
  try {
    const v = sessionStorage.getItem(PREFILL) || ''
    sessionStorage.removeItem(PREFILL)
    return v
  } catch {
    return ''
  }
}
