import { cacheExchange, createClient, fetchExchange, subscriptionExchange } from '@urql/core'
import { registerUrql } from '@urql/next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

// Create urql client
const makeClient = () => {
  return createClient({
    url: `${API_URL}/graphql`,
    exchanges: [
      cacheExchange,
      fetchExchange,
      // SSE subscription exchange will be added for client-side
    ],
    fetchOptions: () => {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('radio_token') 
        : null
      return {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }
    },
  })
}

export const { getClient, cacheExchange: urqlCacheExchange } = registerUrql(makeClient)
