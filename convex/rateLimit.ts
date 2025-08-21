import { httpAction } from "./_generated/server"

/**
 * Rate limiting configuration for different endpoints
 */
const RATE_LIMITS = {
  '/ingest/action': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  '/ingest/handStarted': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 hands per minute
  '/ingest/handEnded': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 hands per minute
  '/ingest/seat': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 seat changes per minute
  '/ingest/unseat': { maxRequests: 20, windowMs: 60 * 1000 }, // 20 unseat actions per minute
  '/ingest/deal': { maxRequests: 50, windowMs: 60 * 1000 }, // 50 deals per minute
  '/ingest/stateMachineEvent': { maxRequests: 1000, windowMs: 60 * 1000 }, // 1000 events per minute
  '/ingest/gameStateSnapshot': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 snapshots per minute
  '/ingest/potHistoryEvent': { maxRequests: 200, windowMs: 60 * 1000 }, // 200 pot events per minute
} as const

/**
 * In-memory rate limiting store
 * In production, consider using Redis or a distributed cache
 */
interface RateLimitRecord {
  count: number
  resetTime: number
  firstRequestTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Get client identifier from request headers
 */
function getClientId(req: Request): string {
  // Try to get real IP from various headers (for reverse proxy setups)
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  const cfConnectingIp = req.headers.get('cf-connecting-ip') // Cloudflare
  
  // Use the first IP from x-forwarded-for if available
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0].trim()
    if (firstIp) return firstIp
  }
  
  // Fallback to other headers
  return realIp || cfConnectingIp || 'unknown'
}

/**
 * Check if request should be rate limited
 */
function shouldRateLimit(endpoint: string, clientId: string): { 
  limited: boolean
  retryAfter?: number
  remaining?: number
} {
  const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
  if (!limit) {
    return { limited: false }
  }

  const key = `${endpoint}:${clientId}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  // No previous record - allow request
  if (!record) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
      firstRequestTime: now
    })
    return { limited: false, remaining: limit.maxRequests - 1 }
  }

  // Window has expired - reset counter
  if (now >= record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + limit.windowMs,
      firstRequestTime: now
    })
    return { limited: false, remaining: limit.maxRequests - 1 }
  }

  // Within window - check if limit exceeded
  if (record.count >= limit.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000)
    return { limited: true, retryAfter }
  }

  // Update counter
  record.count++
  const remaining = limit.maxRequests - record.count
  return { limited: false, remaining }
}

/**
 * Clean up expired rate limit records
 * Should be called periodically to prevent memory leaks
 */
function cleanupExpiredRecords(): void {
  const now = Date.now()
  const keysToDelete: string[] = []

  for (const [key, record] of rateLimitStore.entries()) {
    if (now >= record.resetTime + 60000) { // Keep for 1 minute after expiry
      keysToDelete.push(key)
    }
  }

  keysToDelete.forEach(key => rateLimitStore.delete(key))
}

/**
 * Create a rate-limited HTTP action handler
 * This is a higher-order function that wraps the handler logic
 */
export function createRateLimitedHandler(
  endpoint: string
) {
  return (handler: Parameters<typeof httpAction>[0]) => {
    return httpAction(async (ctx, req) => {
      const clientId = getClientId(req)
      const rateLimitResult = shouldRateLimit(endpoint, clientId)

      // Clean up expired records occasionally (1% chance per request)
      if (Math.random() < 0.01) {
        cleanupExpiredRecords()
      }

      if (rateLimitResult.limited) {
        const errorResponse = {
          error: 'Rate limit exceeded',
          message: `Too many requests to ${endpoint}. Please try again later.`,
          retryAfter: rateLimitResult.retryAfter
        }

        return new Response(JSON.stringify(errorResponse), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 60),
            'X-RateLimit-Limit': String(RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]?.maxRequests || 0),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + (rateLimitResult.retryAfter || 60))
          }
        })
      }

      // Add rate limit headers to successful responses
      const response = await handler(ctx, req)
      
      if (response && rateLimitResult.remaining !== undefined) {
        const limit = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS]
        if (limit) {
          response.headers.set('X-RateLimit-Limit', String(limit.maxRequests))
          response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
          response.headers.set('X-RateLimit-Reset', String(Math.ceil((Date.now() + limit.windowMs) / 1000)))
        }
      }

      return response
    })
  }
}

/**
 * Get current rate limit statistics (for monitoring)
 */
export function getRateLimitStats(): {
  totalClients: number
  totalRecords: number
  endpointStats: Record<string, { clients: number; totalRequests: number }>
} {
  const endpointStats: Record<string, { clients: number; totalRequests: number }> = {}
  
  for (const [key, record] of rateLimitStore.entries()) {
    const [endpoint] = key.split(':')
    if (!endpointStats[endpoint]) {
      endpointStats[endpoint] = { clients: 0, totalRequests: 0 }
    }
    endpointStats[endpoint].clients++
    endpointStats[endpoint].totalRequests += record.count
  }

  return {
    totalClients: new Set(Array.from(rateLimitStore.keys()).map(key => key.split(':')[1])).size,
    totalRecords: rateLimitStore.size,
    endpointStats
  }
}
