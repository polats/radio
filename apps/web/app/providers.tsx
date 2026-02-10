'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { PlayerProvider } from '@/lib/context/player-context'
import { ReactNode, useMemo } from 'react'
import { UrqlProvider, ssrExchange, cacheExchange, fetchExchange, createClient, subscriptionExchange } from '@urql/next'
import { createClient as createWSClient } from 'graphql-ws'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.apocalypseradio.xyz'
const WS_URL = API_URL.replace('https://', 'wss://').replace('http://', 'ws://')

export function Providers({ children }: { children: ReactNode }) {
  const [client, ssr] = useMemo(() => {
    const ssr = ssrExchange({
      isClient: typeof window !== 'undefined',
    })

    // Only create WebSocket client on the browser
    let wsClient: ReturnType<typeof createWSClient> | null = null
    if (typeof window !== 'undefined') {
      wsClient = createWSClient({
        url: `${WS_URL}/graphql`,
        connectionParams: () => {
          const token = localStorage.getItem('radio_token')
          return token ? { Authorization: `Bearer ${token}` } : {}
        },
        retryAttempts: 5,
        shouldRetry: () => true,
      })
    }

    const exchanges = [cacheExchange, ssr, fetchExchange]
    
    // Add subscription exchange only on client
    if (wsClient) {
      exchanges.push(
        subscriptionExchange({
          forwardSubscription(request) {
            const input = { ...request, query: request.query || '' }
            return {
              subscribe(sink) {
                const unsubscribe = wsClient!.subscribe(input, sink)
                return { unsubscribe }
              },
            }
          },
        })
      )
    }

    const client = createClient({
      url: `${API_URL}/graphql`,
      exchanges,
      suspense: true,
      fetchOptions: () => {
        const token = typeof window !== 'undefined' 
          ? localStorage.getItem('radio_token') 
          : null
        return token 
          ? { headers: { Authorization: `Bearer ${token}` } }
          : {}
      },
    })
    return [client, ssr]
  }, [])

  return (
    <UrqlProvider client={client} ssr={ssr}>
      <AuthProvider>
        <PlayerProvider>
          {children}
        </PlayerProvider>
      </AuthProvider>
    </UrqlProvider>
  )
}
