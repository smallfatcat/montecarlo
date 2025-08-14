import { useCallback, useEffect, useRef, useState } from 'react'

export interface PerformanceMetrics {
  renderTime: number
  frameRate: number
  memoryUsage?: number
  connectionLatency?: number
  errorCount: number
}

export interface PerformanceConfig {
  enableMonitoring?: boolean
  sampleInterval?: number
  maxSamples?: number
}

export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableMonitoring = true,
    sampleInterval = 1000,
    maxSamples = 60,
  } = config

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    frameRate: 0,
    errorCount: 0,
  })
  
  const [samples, setSamples] = useState<PerformanceMetrics[]>([])
  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const errorCountRef = useRef(0)
  const intervalRef = useRef<number | null>(null)

  // Frame rate monitoring
  const measureFrameRate = useCallback(() => {
    frameCountRef.current++
    const now = performance.now()
    
    if (now - lastTimeRef.current >= 1000) {
      const fps = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current))
      setMetrics(prev => ({ ...prev, frameRate: fps }))
      
      frameCountRef.current = 0
      lastTimeRef.current = now
    }
  }, [])

  // Render time monitoring
  const measureRenderTime = useCallback((startTime: number) => {
    const renderTime = performance.now() - startTime
    setMetrics(prev => ({ ...prev, renderTime }))
  }, [])

  // Memory usage monitoring
  const measureMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024) // MB
      setMetrics(prev => ({ ...prev, memoryUsage }))
    }
  }, [])

  // Connection latency monitoring
  const measureConnectionLatency = useCallback((latency: number) => {
    setMetrics(prev => ({ ...prev, connectionLatency: latency }))
  }, [])

  // Error tracking
  const trackError = useCallback(() => {
    errorCountRef.current++
    setMetrics(prev => ({ ...prev, errorCount: errorCountRef.current }))
  }, [])

  // Sample collection
  const collectSample = useCallback(() => {
    if (!enableMonitoring) return

    setSamples(prev => {
      const newSamples = [...prev, metrics]
      if (newSamples.length > maxSamples) {
        return newSamples.slice(-maxSamples)
      }
      return newSamples
    })
  }, [enableMonitoring, metrics, maxSamples])

  // Start monitoring
  useEffect(() => {
    if (!enableMonitoring) return

    const startMonitoring = () => {
      intervalRef.current = window.setInterval(() => {
        measureMemoryUsage()
        collectSample()
      }, sampleInterval)
    }

    startMonitoring()

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
      }
    }
  }, [enableMonitoring, sampleInterval, measureMemoryUsage, collectSample])

  // Frame rate monitoring
  useEffect(() => {
    if (!enableMonitoring) return

    const animationFrame = () => {
      measureFrameRate()
      requestAnimationFrame(animationFrame)
    }

    requestAnimationFrame(animationFrame)
  }, [enableMonitoring, measureFrameRate])

  // Calculate averages
  const getAverageMetrics = useCallback(() => {
    if (samples.length === 0) return metrics

    const sum = samples.reduce((acc, sample) => ({
      renderTime: acc.renderTime + sample.renderTime,
      frameRate: acc.frameRate + sample.frameRate,
      memoryUsage: (acc.memoryUsage || 0) + (sample.memoryUsage || 0),
      connectionLatency: (acc.connectionLatency || 0) + (sample.connectionLatency || 0),
      errorCount: acc.errorCount + sample.errorCount,
    }), {
      renderTime: 0,
      frameRate: 0,
      memoryUsage: 0,
      connectionLatency: 0,
      errorCount: 0,
    })

    return {
      renderTime: sum.renderTime / samples.length,
      frameRate: sum.frameRate / samples.length,
      memoryUsage: (sum.memoryUsage || 0) / samples.length,
      connectionLatency: (sum.connectionLatency || 0) / samples.length,
      errorCount: sum.errorCount / samples.length,
    }
  }, [samples, metrics])

  // Performance report
  const getPerformanceReport = useCallback(() => {
    const avg = getAverageMetrics()
    const current = metrics
    
    return {
      current,
      average: avg,
      samples: samples.length,
      recommendations: generateRecommendations(current, avg),
    }
  }, [metrics, getAverageMetrics, samples])

  // Generate performance recommendations
  const generateRecommendations = useCallback((current: PerformanceMetrics, _average: PerformanceMetrics) => {
    const recommendations: string[] = []

    if (current.frameRate < 30) {
      recommendations.push('Frame rate is low. Consider reducing animation complexity.')
    }

    if (current.renderTime > 16) {
      recommendations.push('Render time is high. Consider optimizing component rendering.')
    }

    if (current.memoryUsage && current.memoryUsage > 100) {
      recommendations.push('Memory usage is high. Check for memory leaks.')
    }

    if (current.connectionLatency && current.connectionLatency > 100) {
      recommendations.push('Connection latency is high. Check network stability.')
    }

    if (current.errorCount > 0) {
      recommendations.push('Errors detected. Check console for details.')
    }

    return recommendations
  }, [])

  return {
    // Metrics
    metrics,
    samples,
    
    // Actions
    measureRenderTime,
    measureConnectionLatency,
    trackError,
    
    // Analysis
    getAverageMetrics,
    getPerformanceReport,
  }
}
