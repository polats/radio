import type { Plugin } from 'graphql-yoga'
import { GraphQLError } from 'graphql'

interface RateLimitEntry {
  count: number
  resetTime: number
}

/**
 * Simple in-memory rate limiter
 * Limits requests per IP address within a time window
 */
export function useRateLimit(options: {
  max?: number // Max requests per window
  windowMs?: number // Time window in milliseconds
} = {}): Plugin {
  const max = options.max || 100
  const windowMs = options.windowMs || 60000 // 1 minute default

  const store = new Map<string, RateLimitEntry>()

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store.entries()) {
      if (entry.resetTime < now) {
        store.delete(key)
      }
    }
  }, windowMs)

  return {
    onRequest({ request }) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'

      const now = Date.now()
      let entry = store.get(ip)

      // Reset if window expired
      if (!entry || entry.resetTime < now) {
        entry = {
          count: 0,
          resetTime: now + windowMs,
        }
        store.set(ip, entry)
      }

      // Increment count
      entry.count++

      // Check limit
      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        console.log(JSON.stringify({
          type: 'rate_limit_exceeded',
          ip,
          count: entry.count,
          max,
          timestamp: new Date().toISOString(),
        }))

        throw new GraphQLError(`Rate limit exceeded. Try again in ${retryAfter} seconds.`, {
          extensions: { code: 'TOO_MANY_REQUESTS' },
        })
      }
    },
  }
}
