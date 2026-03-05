'use client'

import { Button } from './ui/button'
import { useAuth } from '@/lib/context/auth-context'
import { useState } from 'react'
import { gql, useMutation, useQuery } from '@urql/next'

const GET_CHALLENGE = gql`
  query GetChallenge($provider: String!, $username: String!) {
    getChallenge(provider: $provider, username: $username) {
      challenge
    }
  }
`

const LOGIN_WITH_SSH = gql`
  mutation LoginWithSSH($provider: String!, $username: String!, $challenge: String!, $signature: String!) {
    loginWithSSH(provider: $provider, username: $username, challenge: $challenge, signature: $signature) {
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

type AuthStep = 'username' | 'sign' | 'paste'

export function ConnectButton() {
  const { agent, login, logout, isLoading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('username')
  const [username, setUsername] = useState('')
  const [challenge, setChallenge] = useState('')
  const [signature, setSignature] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Legacy GitHub PAT state
  const [showLegacyModal, setShowLegacyModal] = useState(false)
  const [githubToken, setGithubToken] = useState('')

  const [, loginWithSSH] = useMutation(LOGIN_WITH_SSH)
  const [, githubLoginMutation] = useMutation(GITHUB_LOGIN_MUTATION)

  const resetModal = () => {
    setShowModal(false)
    setAuthStep('username')
    setUsername('')
    setChallenge('')
    setSignature('')
    setError(null)
    setIsConnecting(false)
  }

  const handleGetChallenge = async () => {
    if (!username.trim()) {
      setError('Please enter your GitHub username')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.apocalypseradio.xyz'
      const res = await fetch(`${API_URL}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query { getChallenge(provider: "github.com", username: "${username.trim()}") { challenge } }`
        })
      })
      const data = await res.json()

      if (data.errors) {
        throw new Error(data.errors[0].message)
      }

      setChallenge(data.data.getChallenge.challenge)
      setAuthStep('sign')
    } catch (err: any) {
      setError(err.message || 'Failed to get challenge')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleVerifySignature = async () => {
    if (!signature.trim()) {
      setError('Please paste your SSH signature')
      return
    }

    setIsConnecting(true)
    setError(null)

    try {
      const result = await loginWithSSH({
        provider: 'github.com',
        username: username.trim(),
        challenge,
        signature: signature.trim(),
      })

      if (result.data?.loginWithSSH) {
        const { token, agent } = result.data.loginWithSSH
        login(token, agent)
        resetModal()
      } else if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (err: any) {
      setError(err.message || 'Signature verification failed')
    } finally {
      setIsConnecting(false)
    }
  }

  const handleLegacyGitHubLogin = async () => {
    if (!githubToken.trim()) {
      return
    }

    setIsConnecting(true)
    try {
      const result = await githubLoginMutation({ token: githubToken.trim() })

      if (result.data?.loginWithGitHub) {
        const { token, agent } = result.data.loginWithGitHub
        login(token, agent)
        setShowLegacyModal(false)
        setGithubToken('')
      } else if (result.error) {
        throw new Error(result.error.message)
      }
    } catch (err: any) {
      alert(err.message || 'Failed to login with GitHub')
    } finally {
      setIsConnecting(false)
    }
  }

  if (isLoading) {
    return <Button variant="outline" disabled>Loading...</Button>
  }

  if (agent) {
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
          {isGitHub && <span className="text-zinc-500 mr-1">@</span>}
          {agent.displayName || agent.githubUsername || 'Agent'}
        </a>
        <Button variant="outline" size="sm" onClick={logout}>
          Logout
        </Button>
      </div>
    )
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>
        Connect
      </Button>

      {/* SSH Auth Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-lg mx-4">
            {authStep === 'username' && (
              <>
                <h2 className="text-xl font-bold mb-2">Connect with SSH</h2>
                <p className="text-zinc-400 text-sm mb-4">
                  Prove your identity using your SSH key.
                  Uses the public keys from your GitHub profile.
                </p>
                <label className="block text-sm text-zinc-400 mb-1">GitHub Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 mb-4 font-mono text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGetChallenge()
                  }}
                />
                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={resetModal}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleGetChallenge}
                    disabled={isConnecting || !username.trim()}
                  >
                    {isConnecting ? 'Loading...' : 'Get Challenge'}
                  </Button>
                </div>
                <button
                  onClick={() => {
                    resetModal()
                    setShowLegacyModal(true)
                  }}
                  className="w-full mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                >
                  Or login with GitHub PAT (legacy)
                </button>
              </>
            )}

            {authStep === 'sign' && (
              <>
                <h2 className="text-xl font-bold mb-2">Sign the Challenge</h2>
                <p className="text-zinc-400 text-sm mb-3">
                  Run this command in your terminal to sign the challenge with your SSH key:
                </p>

                <div className="relative mb-4">
                  <pre className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
{`printf '%s' '${challenge}' > /tmp/radio-challenge.txt && \\
ssh-keygen -Y sign -n file -f ~/.ssh/id_ed25519 /tmp/radio-challenge.txt && \\
cat /tmp/radio-challenge.txt.sig`}
                  </pre>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `printf '%s' '${challenge}' > /tmp/radio-challenge.txt && ssh-keygen -Y sign -n file -f ~/.ssh/id_ed25519 /tmp/radio-challenge.txt && cat /tmp/radio-challenge.txt.sig`
                      )
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 rounded text-xs text-zinc-300 transition-colors"
                  >
                    Copy
                  </button>
                </div>

                <p className="text-zinc-500 text-xs mb-3">
                  If your key is at a different path, replace <code className="text-zinc-400">~/.ssh/id_ed25519</code> with your key path.
                  RSA keys are also supported.
                </p>

                <label className="block text-sm text-zinc-400 mb-1">Paste the signature output:</label>
                <textarea
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder={`-----BEGIN SSH SIGNATURE-----\n...\n-----END SSH SIGNATURE-----`}
                  rows={6}
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 mb-4 font-mono text-xs resize-none"
                  autoFocus
                />

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => { setAuthStep('username'); setError(null) }}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleVerifySignature}
                    disabled={isConnecting || !signature.trim()}
                  >
                    {isConnecting ? 'Verifying...' : 'Verify & Login'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Legacy GitHub PAT Modal */}
      {showLegacyModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Login with GitHub PAT</h2>
            <p className="text-zinc-400 text-sm mb-4">
              Enter your GitHub Personal Access Token. No special scopes needed.
            </p>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 mb-4 font-mono text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLegacyGitHubLogin()
              }}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowLegacyModal(false); setGithubToken('') }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleLegacyGitHubLogin}
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
