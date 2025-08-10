import { useEffect, useRef, useState } from 'react'
import type { Card } from '../../blackjack/types'

export function useEquity() {
  const workerRef = useRef<Worker | null>(null)
  const [equity, setEquity] = useState<{ win: number[]; tie: number[] } | null>(null)
  const [running, setRunning] = useState(false)

  const terminate = () => { workerRef.current?.terminate(); workerRef.current = null; setRunning(false) }

  const run = (seats: { hole: Card[]; folded: boolean }[], community: Card[], samples: number) => {
    terminate()
    const w = new Worker(new URL('../../workers/equityWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = w
    setRunning(true)
    w.onmessage = (e: MessageEvent) => {
      const data = e.data as any
      if (data?.type === 'done') { setEquity(data.result); setRunning(false); terminate() }
      if (data?.type === 'error') { console.error('equity worker error', data.error); setRunning(false); terminate() }
    }
    w.postMessage({ type: 'run', data: { seats, community, samples } })
  }

  useEffect(() => () => terminate(), [])

  return { equity, run, running }
}


