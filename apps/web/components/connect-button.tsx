'use client'

import { Button } from './ui/button'
import { useAuth } from '@/lib/context/auth-context'
import { useState } from 'react'
import { gql, useMutation } from '@urql/next'

const REGISTER_MUTATION = gql`
  mutation Register($walletAddress: String!, $signature: String!, $message: String!, $displayName: String) {
    register(walletAddress: $walletAddress, signature: $signature, message: $message, displayName: $displayName) {
      token
      agent {
        id
        walletAddress
        displayName
      }
    }
  }
`

const AUTHENTICATE_MUTATION = gql`
  mutation Authenticate($walletAddress: String!, $signature: String!, $message: String!) {
    authenticate(walletAddress: $walletAddress, signature: $signature, message: $message) {
      token
      agent {
        id
        walletAddress
        displayName
      }
    }
  }
`

const GUEST_LOGIN_MUTATION = gql`
  mutation LoginAsGuest($displayName: String) {
    loginAsGuest(displayName: $displayName) {
      token
      agent {
        id
        walletAddress
        displayName
      }
    }
  }
`

export function ConnectButton() {
  const { agent, login, logout, isLoading } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [, registerMutation] = useMutation(REGISTER_MUTATION)
  const [, authenticateMutation] = useMutation(AUTHENTICATE_MUTATION)
  const [, guestLoginMutation] = useMutation(GUEST_LOGIN_MUTATION)

  const handleGuestLogin = async () => {
    setIsConnecting(true)
    setShowMenu(false)
    try {
      const result = await guestLoginMutation({
        displayName: null
      })
      
      if (result.data?.loginAsGuest) {
        const { token, agent } = result.data.loginAsGuest
        login(token, agent)
      } else if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (err: any) {
      console.error('Guest login failed:', err)
      alert(err.message || 'Failed to login as guest')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleWalletConnect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect with a wallet')
      return
    }

    setIsConnecting(true)
    setShowMenu(false)
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      const walletAddress = accounts[0].toLowerCase()

      // Get nonce from API
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api-production-9382.up.railway.app'
      const nonceRes = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getNonce(walletAddress: "${walletAddress}") { nonce message } }`
        })
      })
      const nonceData = await nonceRes.json()
      const { message } = nonceData.data.getNonce

      // Sign the message
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, walletAddress]
      })

      // Try to authenticate first
      const authResult = await authenticateMutation({
        walletAddress,
        signature,
        message
      })

      if (authResult.data?.authenticate) {
        const { token, agent } = authResult.data.authenticate
        login(token, agent)
        return
      }

      // If auth fails, register
      const registerResult = await registerMutation({
        walletAddress,
        signature,
        message,
        displayName: `Agent ${walletAddress.slice(0, 6)}`
      })

      if (registerResult.data?.register) {
        const { token, agent } = registerResult.data.register
        login(token, agent)
      } else if (registerResult.error) {
        throw new Error(registerResult.error.message)
      }
    } catch (err: any) {
      console.error('Connection failed:', err)
      alert(err.message || 'Failed to connect')
    } finally {
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return <Button variant="outline" disabled>Loading...</Button>
  }

  if (agent) {
    const isGuest = agent.walletAddress.startsWith('0xguest')
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">
          {isGuest && <span className="text-yellow-500 mr-1">👤</span>}
          {agent.displayName || agent.walletAddress.slice(0, 8) + '...' + agent.walletAddress.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          {isGuest ? 'Exit' : 'Disconnect'}
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Button onClick={() => setShowMenu(!showMenu)} disabled={isConnecting}>
        {isConnecting ? 'Connecting...' : 'Connect'}
      </Button>
      
      {showMenu && (
        <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
          <button
            onClick={handleGuestLogin}
            className="w-full px-4 py-3 text-left hover:bg-zinc-800 rounded-t-lg transition-colors"
          >
            <div className="font-medium">Continue as Guest</div>
            <div className="text-xs text-zinc-500">No wallet needed</div>
          </button>
          <button
            onClick={handleWalletConnect}
            className="w-full px-4 py-3 text-left hover:bg-zinc-800 rounded-b-lg border-t border-zinc-800 transition-colors"
          >
            <div className="font-medium">Connect Wallet</div>
            <div className="text-xs text-zinc-500">MetaMask, etc.</div>
          </button>
        </div>
      )}
    </div>
  )
}

// Extend Window for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
