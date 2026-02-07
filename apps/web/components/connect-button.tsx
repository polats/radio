'use client'

import { Button } from './ui/button'
import { useAuth } from '@/lib/context/auth-context'
import { useState } from 'react'
import { gql, useMutation, useQuery } from '@urql/next'

const GET_NONCE_QUERY = gql`
  query GetNonce($walletAddress: String!) {
    getNonce(walletAddress: $walletAddress) {
      nonce
      message
    }
  }
`

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

export function ConnectButton() {
  const { agent, login, logout, isLoading } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [, registerMutation] = useMutation(REGISTER_MUTATION)
  const [, authenticateMutation] = useMutation(AUTHENTICATE_MUTATION)

  const handleConnect = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask to connect')
      return
    }

    setIsConnecting(true)
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
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-400">
          {agent.displayName || agent.walletAddress.slice(0, 6) + '...' + agent.walletAddress.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={logout}>
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  )
}

// Extend Window for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
