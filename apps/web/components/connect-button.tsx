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
                <h2 className="text-xl font-bold mb-3">Connect with SSH</h2>

                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-4 space-y-2">
                  <p className="text-zinc-300 text-sm font-medium">How it works</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Apocalypse Radio uses <span className="text-zinc-200">SSH key authentication</span> — the
                    same keys you use to push code to GitHub. No passwords or tokens leave your machine.
                  </p>
                  <ol className="text-zinc-400 text-sm space-y-1 list-decimal list-inside">
                    <li>Enter your GitHub username</li>
                    <li>Sign a one-time challenge with your SSH key</li>
                    <li>We verify against your <a href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">public keys on GitHub</a></li>
                  </ol>
                </div>

                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3 mb-4">
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    <span className="text-zinc-400 font-medium">Prerequisites:</span>{' '}
                    An SSH key added to your GitHub account.
                    Check with: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">ssh -T git@github.com</code>.
                    If you don't have one, <a href="https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 underline underline-offset-2">follow GitHub's guide</a>.
                  </p>
                </div>

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
                    {isConnecting ? 'Loading...' : 'Next'}
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
                <h2 className="text-xl font-bold mb-1">Sign the Challenge</h2>
                <p className="text-zinc-500 text-xs mb-3">Signing as <span className="text-zinc-300 font-mono">@{username}</span> — challenge expires in 5 minutes</p>

                <div className="mb-3">
                  <p className="text-zinc-400 text-sm mb-2">
                    <span className="text-zinc-300 font-medium">Step 1:</span> Copy and run this in your terminal:
                  </p>
                  <div className="relative">
                    <pre className="bg-zinc-950 border border-zinc-700 rounded-lg p-3 pr-16 text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
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
                </div>

                <details className="mb-3 group">
                  <summary className="text-zinc-500 text-xs cursor-pointer hover:text-zinc-400 transition-colors">
                    Using a different key? Troubleshooting tips
                  </summary>
                  <div className="mt-2 bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3 space-y-2">
                    <p className="text-zinc-400 text-xs">
                      <span className="text-zinc-300">Different key path:</span> Replace <code className="bg-zinc-800 px-1 rounded text-zinc-300">~/.ssh/id_ed25519</code> with
                      your key (e.g. <code className="bg-zinc-800 px-1 rounded text-zinc-300">~/.ssh/id_rsa</code>)
                    </p>
                    <p className="text-zinc-400 text-xs">
                      <span className="text-zinc-300">List your keys:</span>{' '}
                      <code className="bg-zinc-800 px-1 rounded text-zinc-300">ls ~/.ssh/*.pub</code>
                    </p>
                    <p className="text-zinc-400 text-xs">
                      <span className="text-zinc-300">Check GitHub keys:</span>{' '}
                      <code className="bg-zinc-800 px-1 rounded text-zinc-300">curl https://github.com/{username}.keys</code>
                    </p>
                    <p className="text-zinc-400 text-xs">
                      <span className="text-zinc-300">Ed25519 and RSA</span> keys are both supported.
                    </p>
                  </div>
                </details>

                <div className="mb-4">
                  <p className="text-zinc-400 text-sm mb-2">
                    <span className="text-zinc-300 font-medium">Step 2:</span> Paste the full output (including the BEGIN/END lines):
                  </p>
                  <textarea
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={`-----BEGIN SSH SIGNATURE-----\n...\n-----END SSH SIGNATURE-----`}
                    rows={6}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 font-mono text-xs resize-none"
                    autoFocus
                  />
                </div>

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
