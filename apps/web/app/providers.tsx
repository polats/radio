'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { PlayerProvider } from '@/lib/context/player-context'
import { ReactNode, useMemo } from 'react'
import { UrqlProvider, ssrExchange, cacheExchange, fetchExchange, createClient } from '@urql/next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-9382.up.railway.app'

export function Providers({ children }: { children: ReactNode }) {
  const [client, ssr] = useMemo(() => {
    const ssr = ssrExchange({
      isClient: typeof window !== 'undefined',
    })
    const client = createClient({
      url: `${API_URL}/graphql`,
      exchanges: [cacheExchange, ssr, fetchExchange],
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
