import type { Plugin } from 'graphql-yoga'

interface SubscriptionConnection {
  connectionId: string
  lastActivity: number
  timeoutHandle?: ReturnType<typeof setTimeout>
}

/**
 * Subscription connection manager to prevent abuse
 * - Limits concurrent subscription connections per IP address
 * - Auto-closes idle subscriptions
 */
export function useSubscriptionManager(options: {
  maxConnectionsPerIp?: number
  idleTimeoutMs?: number
} = {}): Plugin {
  const maxConnectionsPerIp = options.maxConnectionsPerIp || 5
  const idleTimeoutMs = options.idleTimeoutMs || 30 * 60 * 1000 // 30 minutes default

  const connections = new Map<string, Map<string, SubscriptionConnection>>()

  function closeConnection(ip: string, connectionId: string, reason: string) {
    const ipConnections = connections.get(ip)
    if (!ipConnections) return

    const conn = ipConnections.get(connectionId)
    if (conn?.timeoutHandle) {
      clearTimeout(conn.timeoutHandle)
    }

    ipConnections.delete(connectionId)

    if (ipConnections.size === 0) {
      connections.delete(ip)
    }

    console.log(JSON.stringify({
      type: 'subscription_closed',
      reason,
      ip,
      connectionId,
      activeConnections: ipConnections?.size || 0,
      timestamp: new Date().toISOString(),
    }))
  }

  function resetIdleTimeout(ip: string, connectionId: string, onTimeout: () => void) {
    const ipConnections = connections.get(ip)
    const conn = ipConnections?.get(connectionId)
    if (!conn) return

    // Clear existing timeout
    if (conn.timeoutHandle) {
      clearTimeout(conn.timeoutHandle)
    }

    // Update last activity
    conn.lastActivity = Date.now()

    // Set new timeout
    conn.timeoutHandle = setTimeout(() => {
      console.log(JSON.stringify({
        type: 'subscription_idle_timeout',
        ip,
        connectionId,
        idleTimeoutMs,
        timestamp: new Date().toISOString(),
      }))
      onTimeout()
    }, idleTimeoutMs)
  }

  return {
    onSubscribe({ args }) {
      // Extract IP from context (set by createContext)
      const contextValue = args.contextValue as any
      const ip = contextValue.ip || 'unknown'

      // Get or create connection map for this IP
      let ipConnections = connections.get(ip)
      if (!ipConnections) {
        ipConnections = new Map()
        connections.set(ip, ipConnections)
      }

      // Check connection limit
      if (ipConnections.size >= maxConnectionsPerIp) {
        console.log(JSON.stringify({
          type: 'subscription_limit_exceeded',
          ip,
          currentConnections: ipConnections.size,
          max: maxConnectionsPerIp,
          timestamp: new Date().toISOString(),
        }))

        throw new Error(`Maximum ${maxConnectionsPerIp} concurrent subscriptions exceeded`)
      }

      // Generate unique connection ID
      const connectionId = `${ip}-${Date.now()}-${Math.random().toString(36).slice(2)}`
      
      const connection: SubscriptionConnection = {
        connectionId,
        lastActivity: Date.now(),
      }
      ipConnections.set(connectionId, connection)

      console.log(JSON.stringify({
        type: 'subscription_opened',
        ip,
        connectionId,
        activeConnections: ipConnections.size,
        idleTimeoutMs,
        timestamp: new Date().toISOString(),
      }))

      // Return cleanup function
      return {
        onSubscribeResult({ result }) {
          // For async iterators (subscriptions), wrap to track activity
          if (Symbol.asyncIterator in result) {
            const originalIterator = result[Symbol.asyncIterator]()
            let closed = false

            const closeSubscription = () => {
              if (!closed) {
                closed = true
                closeConnection(ip, connectionId, 'idle_timeout')
                originalIterator.return?.()
              }
            }

            // Set initial idle timeout
            resetIdleTimeout(ip, connectionId, closeSubscription)

            // Wrap the iterator to track activity
            result[Symbol.asyncIterator] = () => ({
              async next() {
                const nextResult = await originalIterator.next()
                if (!nextResult.done) {
                  // Reset timeout on each message
                  resetIdleTimeout(ip, connectionId, closeSubscription)
                }
                return nextResult
              },
              async return() {
                closeConnection(ip, connectionId, 'client_closed')
                return originalIterator.return?.() ?? { done: true, value: undefined }
              },
              async throw(error: unknown) {
                closeConnection(ip, connectionId, 'error')
                return originalIterator.throw?.(error) ?? { done: true, value: undefined }
              },
            })
          }

          return {
            onEnd() {
              closeConnection(ip, connectionId, 'completed')
            },
          }
        },
      }
    },
  }
}
