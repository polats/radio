'use client'

import { AuthProvider } from '@/lib/context/auth-context'
import { PlayerProvider } from '@/lib/context/player-context'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <PlayerProvider>
        {children}
      </PlayerProvider>
    </AuthProvider>
  )
}
