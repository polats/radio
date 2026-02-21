import { cacheExchange, createClient, fetchExchange, Client, subscriptionExchange } from '@urql/core'
import { createClient as createWSClient } from 'graphql-ws'

// Use environment variable or default to production API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.apocalypseradio.xyz'
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || API_URL.replace(/^http(s?):\/\//, 'ws$1://')

// Create urql client for server-side use
export function createServerClient(): Client {
  return createClient({
    url: `${API_URL}/graphql`,
    exchanges: [cacheExchange, fetchExchange],
    fetchOptions: {
      cache: 'no-store',
    },
  })
}

// Create urql client for client-side use with subscription support
export function createBrowserClient(): Client {
  // WebSocket client for subscriptions
  const wsClient = createWSClient({
    url: `${WS_URL}/graphql`,
    connectionParams: () => {
      const token = localStorage.getItem('radio_token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    },
  })

  return createClient({
    url: `${API_URL}/graphql`,
    exchanges: [
      cacheExchange,
      fetchExchange,
      subscriptionExchange({
        forwardSubscription(request) {
          const input = { ...request, query: request.query || '' }
          return {
            subscribe(sink) {
              const unsubscribe = wsClient.subscribe(input, sink)
              return { unsubscribe }
            },
          }
        },
      }),
    ],
    fetchOptions: () => {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('radio_token') 
        : null
      return token 
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {}
    },
  })
}

// For SSR, export a simple getClient function
let browserClient: Client | null = null

export function getClient(): Client {
  if (typeof window === 'undefined') {
    // Server-side: create new client each time
    return createServerClient()
  }
  // Client-side: reuse client
  if (!browserClient) {
    browserClient = createBrowserClient()
  }
  return browserClient
}
