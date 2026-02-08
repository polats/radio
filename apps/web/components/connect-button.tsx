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

const GITHUB_LOGIN_MUTATION = gql`
  mutation LoginWithGitHub($token: String!) {
    loginWithGitHub(token: $token) {
      token
      agent {
        id
        githubId
        githubUsername
        githubAvatarUrl
        displayName
        soulMd
      }
    }
  }
`

export function ConnectButton() {
  const { agent, login, logout, isLoading } = useAuth()
  const [isConnecting, setIsConnecting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showGitHubModal, setShowGitHubModal] = useState(false)
  const [githubToken, setGithubToken] = useState('')
  const [, registerMutation] = useMutation(REGISTER_MUTATION)
  const [, authenticateMutation] = useMutation(AUTHENTICATE_MUTATION)
  const [, guestLoginMutation] = useMutation(GUEST_LOGIN_MUTATION)
  const [, githubLoginMutation] = useMutation(GITHUB_LOGIN_MUTATION)

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

  const handleGitHubLogin = async () => {
    if (!githubToken.trim()) {
      alert('Please enter your GitHub Personal Access Token')
      return
    }

    setIsConnecting(true)
    try {
      const result = await githubLoginMutation({
        token: githubToken.trim()
      })
      
      if (result.data?.loginWithGitHub) {
        const { token, agent } = result.data.loginWithGitHub
        login(token, agent)
        setShowGitHubModal(false)
        setGithubToken('')
      } else if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (err: any) {
      console.error('GitHub login failed:', err)
      alert(err.message || 'Failed to login with GitHub')
    } finally {
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return <Button variant="outline" disabled>Loading...</Button>
  }

  if (agent) {
    const isGuest = agent.walletAddress?.startsWith('0xguest')
    const isGitHub = !!agent.githubUsername
    return (
      <div className="flex items-center gap-2">
        {isGitHub && agent.githubAvatarUrl && (
          <img 
            src={agent.githubAvatarUrl} 
            alt={agent.githubUsername}
            className="w-6 h-6 rounded-full"
          />
        )}
        <a 
          href={isGitHub ? `/profile/${agent.githubUsername}` : undefined}
          className={`text-sm text-zinc-400 ${isGitHub ? 'hover:text-white cursor-pointer' : ''}`}
        >
          {isGuest && <span className="text-yellow-500 mr-1">👤</span>}
          {isGitHub && <span className="text-zinc-500 mr-1">@</span>}
          {agent.displayName || agent.githubUsername || (agent.walletAddress ? agent.walletAddress.slice(0, 8) + '...' + agent.walletAddress.slice(-4) : 'Unknown')}
        </a>
        <Button variant="outline" size="sm" onClick={logout}>
          {isGuest ? 'Exit' : 'Logout'}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="relative">
        <Button onClick={() => setShowMenu(!showMenu)} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect'}
        </Button>
        
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50">
            <button
              onClick={() => {
                setShowMenu(false)
                setShowGitHubModal(true)
              }}
              className="w-full px-4 py-3 text-left hover:bg-zinc-800 rounded-t-lg transition-colors"
            >
              <div className="font-medium">🐙 Login with GitHub</div>
              <div className="text-xs text-zinc-500">Use a Personal Access Token</div>
            </button>
            <button
              onClick={handleGuestLogin}
              className="w-full px-4 py-3 text-left hover:bg-zinc-800 border-t border-zinc-800 transition-colors"
            >
              <div className="font-medium">Continue as Guest</div>
              <div className="text-xs text-zinc-500">No login needed</div>
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

      {/* GitHub PAT Modal */}
      {showGitHubModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Login with GitHub</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Enter your GitHub Personal Access Token. You can create one at{' '}
              <a 
                href="https://github.com/settings/tokens/new" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                github.com/settings/tokens
              </a>
              . No special scopes needed for public profiles.
            </p>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 mb-4 font-mono text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleGitHubLogin()
              }}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowGitHubModal(false)
                  setGithubToken('')
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleGitHubLogin}
                disabled={isConnecting || !githubToken.trim()}
              >
                {isConnecting ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Extend Window for ethereum
declare global {
  interface Window {
    ethereum?: any
  }
}
