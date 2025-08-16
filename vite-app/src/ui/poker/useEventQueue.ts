import { useCallback, useMemo, useRef } from 'react'

type QueueEvent = {
  id: number
  dueAtMs: number
  fn: () => void
  tag?: string
}

export function useEventQueue() {
  const queueRef = useRef<QueueEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextIdRef = useRef<number>(1)

  const clearTimer = () => {
    if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  const armTimer = () => {
    clearTimer()
    if (queueRef.current.length === 0) return
    queueRef.current.sort((a, b) => a.dueAtMs - b.dueAtMs)
    const waitMs = Math.max(0, queueRef.current[0].dueAtMs - Date.now())
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const now = Date.now()
      const due: QueueEvent[] = []
      while (queueRef.current.length && queueRef.current[0].dueAtMs <= now) {
        due.push(queueRef.current.shift()!)
      }
      for (const ev of due) { try { ev.fn() } catch {} }
      armTimer()
    }, waitMs)
  }

  const schedule = useCallback((fn: () => void, delayMs: number, tag?: string): number => {
    const id = nextIdRef.current++
    const dueAtMs = Date.now() + Math.max(0, Math.floor(delayMs))
    queueRef.current.push({ id, dueAtMs, fn, tag })
    if (timerRef.current == null) armTimer()
    return id
  }, [])

  const cancel = useCallback((id: number) => {
    queueRef.current = queueRef.current.filter((e) => e.id !== id)
    if (queueRef.current.length === 0) clearTimer(); else armTimer()
  }, [])

  const clearByTag = useCallback((tag: string) => {
    queueRef.current = queueRef.current.filter((e) => e.tag !== tag)
    if (queueRef.current.length === 0) clearTimer(); else armTimer()
  }, [])

  const clearAll = useCallback(() => {
    queueRef.current = []
    clearTimer()
  }, [])

  const api = useMemo(() => ({ schedule, cancel, clearByTag, clearAll }), [schedule, cancel, clearByTag, clearAll])
  return api
}


