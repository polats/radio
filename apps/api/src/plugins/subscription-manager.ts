import type { Plugin } from 'graphql-yoga'

/**
 * Subscription connection manager to prevent abuse
 * Limits concurrent subscription connections per IP address
 */
export function useSubscriptionManager(options: {
  maxConnectionsPerIp?: number
} = {}): Plugin {
  const maxConnectionsPerIp = options.maxConnectionsPerIp || 5
  const connections = new Map<string, Set<string>>()

  return {
    onSubscribe({ args }) {
      // Extract IP from context (set by createContext)
      const contextValue = args.contextValue as any
      const ip = contextValue.ip || 'unknown'

      // Get or create connection set for this IP
      let ipConnections = connections.get(ip)
      if (!ipConnections) {
        ipConnections = new Set()
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
      const connectionId = `${ip}-${Date.now()}-${Math.random()}`
      ipConnections.add(connectionId)

      console.log(JSON.stringify({
        type: 'subscription_opened',
        ip,
        connectionId,
        activeConnections: ipConnections.size,
        timestamp: new Date().toISOString(),
      }))

      // Return cleanup function
      return {
        onSubscribeResult() {
          return {
            onEnd() {
              ipConnections?.delete(connectionId)

              // Clean up empty sets
              if (ipConnections?.size === 0) {
                connections.delete(ip)
              }

              console.log(JSON.stringify({
                type: 'subscription_closed',
                ip,
                connectionId,
                activeConnections: ipConnections?.size || 0,
                timestamp: new Date().toISOString(),
              }))
            },
          }
        },
      }
    },
  }
}
