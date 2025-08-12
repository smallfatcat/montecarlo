import { useCallback, useMemo, useRef } from 'react'

type QueueEvent = {
  id: number
  dueAtMs: number
  fn: () => void
  tag?: string
}

/**
 * A background-safe timer queue using setTimeout.
 * - Maintains a single active timer to the earliest due event
 * - Supports unique scheduling by tag
 * - Provides cancellation by id and by tag
 */
export function useTimerQueue() {
  const eventsRef = useRef<QueueEvent[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextIdRef = useRef<number>(1)
  const tagToIdRef = useRef<Map<string, number>>(new Map())

  const clearActiveTimer = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const armTimer = useCallback(() => {
    clearActiveTimer()
    if (eventsRef.current.length === 0) return
    // Ensure sorted by due time
    eventsRef.current.sort((a, b) => a.dueAtMs - b.dueAtMs)
    const earliest = eventsRef.current[0]
    const waitMs = Math.max(0, earliest.dueAtMs - Date.now())
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      const now = Date.now()
      const due: QueueEvent[] = []
      while (eventsRef.current.length > 0 && eventsRef.current[0].dueAtMs <= now) {
        const ev = eventsRef.current.shift()!
        // If this was registered as the unique event for its tag, clear mapping
        if (ev.tag && tagToIdRef.current.get(ev.tag) === ev.id) {
          tagToIdRef.current.delete(ev.tag)
        }
        due.push(ev)
      }
      for (const ev of due) {
        try { ev.fn() } catch { /* swallow */ }
      }
      armTimer()
    }, waitMs)
  }, [])

  const schedule = useCallback((fn: () => void, delayMs: number, tag?: string): number => {
    const id = nextIdRef.current++
    const dueAtMs = Date.now() + Math.max(0, Math.floor(delayMs))
    eventsRef.current.push({ id, dueAtMs, fn, tag })
    armTimer()
    return id
  }, [armTimer])

  const scheduleUnique = useCallback((fn: () => void, delayMs: number, tag: string): number => {
    // Cancel any existing event for this tag first
    const existingId = tagToIdRef.current.get(tag)
    if (existingId != null) {
      eventsRef.current = eventsRef.current.filter((e) => e.id !== existingId)
      tagToIdRef.current.delete(tag)
    }
    const id = nextIdRef.current++
    const dueAtMs = Date.now() + Math.max(0, Math.floor(delayMs))
    eventsRef.current.push({ id, dueAtMs, fn, tag })
    tagToIdRef.current.set(tag, id)
    armTimer()
    return id
  }, [armTimer])

  const cancel = useCallback((id: number) => {
    // Remove event and any tag mapping that points to it
    const ev = eventsRef.current.find((e) => e.id === id)
    if (ev?.tag) {
      if (tagToIdRef.current.get(ev.tag) === id) tagToIdRef.current.delete(ev.tag)
    }
    eventsRef.current = eventsRef.current.filter((e) => e.id !== id)
    armTimer()
  }, [armTimer])

  const clearByTag = useCallback((tag: string) => {
    const mappedId = tagToIdRef.current.get(tag)
    if (mappedId != null) tagToIdRef.current.delete(tag)
    eventsRef.current = eventsRef.current.filter((e) => e.tag !== tag)
    armTimer()
  }, [armTimer])

  const clearAll = useCallback(() => {
    eventsRef.current = []
    tagToIdRef.current.clear()
    clearActiveTimer()
  }, [])

  const api = useMemo(() => ({ schedule, scheduleUnique, cancel, clearByTag, clearAll }), [schedule, scheduleUnique, cancel, clearByTag, clearAll])
  return api
}


