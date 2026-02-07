import { cacheExchange, createClient, fetchExchange, Client } from '@urql/core'

// Use environment variable or default to production API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-9382.up.railway.app'

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

// Create urql client for client-side use
export function createBrowserClient(): Client {
  return createClient({
    url: `${API_URL}/graphql`,
    exchanges: [cacheExchange, fetchExchange],
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
