export interface PokerSimOptions {
  hands: number
  seats: number
  startingStack: number
}

export function usePokerSimulationRunner() {
  const workerRef = (typeof window !== 'undefined' ? { current: null as Worker | null } : { current: null })
  const run = (opts: PokerSimOptions, onProgress: (done: number, total: number) => void, onDone: (endingStacks: number[]) => void) => {
    if ((workerRef as any).current) (workerRef as any).current.terminate()
    const worker = new Worker(new URL('../../workers/pokerSimWorker.ts', import.meta.url), { type: 'module' })
    ;(workerRef as any).current = worker
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data as any
      if (data?.type === 'progress') onProgress(data.completed, data.total)
      else if (data?.type === 'done') {
        onDone(data.result.endingStacks)
        ;(workerRef as any).current?.terminate()
        ;(workerRef as any).current = null
      } else if (data?.type === 'error') {
        console.error('Poker sim error', data.error)
        ;(workerRef as any).current?.terminate()
        ;(workerRef as any).current = null
      }
    }
    worker.postMessage({ type: 'run', options: opts })
  }
  const terminate = () => {
    if ((workerRef as any).current) (workerRef as any).current.terminate()
    ;(workerRef as any).current = null
  }
  return { run, terminate }
}


