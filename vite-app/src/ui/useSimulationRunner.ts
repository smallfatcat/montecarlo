import { useEffect, useRef, useState } from 'react'
import { CONFIG } from '../config'

export interface SimulationRunOptions {
  numHands: number
  numPlayers: number
  deckCount: number
  initialBankrolls: number[]
  casinoInitial: number
  betsBySeat: number[]
}

export function useSimulationRunner() {
  const workerRef = useRef<Worker | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [isRunning, setIsRunning] = useState<boolean>(false)

  const terminate = () => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setIsRunning(false)
    setProgress(null)
  }

  const run = (opts: SimulationRunOptions, onDone: (result: { finalBankrolls: number[]; finalCasinoBank: number }) => void) => {
    terminate()
    const worker = new Worker(new URL('../workers/simWorker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    setProgress({ done: 0, total: opts.numHands })
    setIsRunning(true)
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as any
      if (data?.type === 'progress') setProgress({ done: data.completed, total: data.total })
      else if (data?.type === 'done') {
        setProgress(null)
        setIsRunning(false)
        onDone({ finalBankrolls: data.result.finalBankrolls, finalCasinoBank: data.result.finalCasinoBank })
        terminate()
      } else if (data?.type === 'error') {
        console.error('Simulation error', data.error)
        setProgress(null)
        setIsRunning(false)
        terminate()
      }
    }
    worker.postMessage({
      type: 'run',
      options: {
        numHands: opts.numHands,
        numPlayers: opts.numPlayers,
        deckCount: opts.deckCount,
        reshuffleCutoffRatio: CONFIG.shoe.reshuffleCutoffRatio,
        initialBankrolls: opts.initialBankrolls,
        casinoInitial: opts.casinoInitial,
        betsBySeat: opts.betsBySeat,
        rules: CONFIG.rules,
      }
    })
  }

  useEffect(() => () => terminate(), [])

  return { run, terminate, progress, isRunning }
}


