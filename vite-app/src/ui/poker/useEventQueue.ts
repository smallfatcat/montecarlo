import { useCallback, useMemo, useRef } from 'react'

type QueueEvent = {
  id: number
  dueAtMs: number
  fn: () => void
  tag?: string
}

export function useEventQueue() {
  const queueRef = useRef<QueueEvent[]>([])
  const rafIdRef = useRef<number | null>(null)
  const nextIdRef = useRef<number>(1)

  const clearSchedulers = () => {
    if (rafIdRef.current != null) { cancelAnimationFrame(rafIdRef.current); rafIdRef.current = null }
  }

  const tick = () => {
    rafIdRef.current = null
    const now = Date.now()
    // Pull all due events in order
    queueRef.current.sort((a, b) => a.dueAtMs - b.dueAtMs)
    const due: QueueEvent[] = []
    while (queueRef.current.length && queueRef.current[0].dueAtMs <= now) {
      due.push(queueRef.current.shift()!)
    }
    for (const ev of due) {
      try { ev.fn() } catch { /* swallow */ }
    }
    if (queueRef.current.length > 0) {
      rafIdRef.current = requestAnimationFrame(tick)
    }
  }

  const schedule = useCallback((fn: () => void, delayMs: number, tag?: string): number => {
    const id = nextIdRef.current++
    const dueAtMs = Date.now() + Math.max(0, Math.floor(delayMs))
    queueRef.current.push({ id, dueAtMs, fn, tag })
    if (rafIdRef.current == null) {
      rafIdRef.current = requestAnimationFrame(tick)
    }
    return id
  }, [])

  const cancel = useCallback((id: number) => {
    queueRef.current = queueRef.current.filter((e) => e.id !== id)
    if (queueRef.current.length === 0) clearSchedulers()
  }, [])

  const clearByTag = useCallback((tag: string) => {
    queueRef.current = queueRef.current.filter((e) => e.tag !== tag)
    if (queueRef.current.length === 0) clearSchedulers()
  }, [])

  const clearAll = useCallback(() => {
    queueRef.current = []
    clearSchedulers()
  }, [])

  const api = useMemo(() => ({ schedule, cancel, clearByTag, clearAll }), [schedule, cancel, clearByTag, clearAll])
  return api
}


