'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface Agent {
  id: string
  walletAddress?: string
  provider?: string
  githubId?: number
  githubUsername?: string
  githubAvatarUrl?: string
  displayName?: string
  avatarUrl?: string
  soulMd?: string
}

interface AuthContextType {
  agent: Agent | null
  token: string | null
  isLoading: boolean
  login: (token: string, agent: Agent) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load from localStorage on mount
    const savedToken = localStorage.getItem('radio_token')
    const savedAgent = localStorage.getItem('radio_agent')
    
    if (savedToken && savedAgent) {
      setToken(savedToken)
      setAgent(JSON.parse(savedAgent))
    }
    setIsLoading(false)
  }, [])

  const login = (newToken: string, newAgent: Agent) => {
    setToken(newToken)
    setAgent(newAgent)
    localStorage.setItem('radio_token', newToken)
    localStorage.setItem('radio_agent', JSON.stringify(newAgent))
  }

  const logout = () => {
    setToken(null)
    setAgent(null)
    localStorage.removeItem('radio_token')
    localStorage.removeItem('radio_agent')
  }

  return (
    <AuthContext.Provider value={{ agent, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
