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
        provider
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
        provider
        githubId
        githubUsername
        githubAvatarUrl
        displayName
        soulMd
      }
    }
  }
`

type AuthStep = 'provider' | 'username' | 'sign' | 'paste'

type ProviderOption = {
  id: string
  label: string
  hostname: string
  color: string
  dotColor: string
  icon: string
}

const PROVIDERS: ProviderOption[] = [
  { id: 'github', label: 'GitHub', hostname: 'github.com', color: 'purple', dotColor: 'bg-purple-500', icon: '⬡' },
  { id: 'gitlab', label: 'GitLab', hostname: 'gitlab.com', color: 'orange', dotColor: 'bg-orange-500', icon: '◆' },
  { id: 'gitlab-crux', label: 'Crux Casa', hostname: 'gitlab.crux.casa', color: 'orange', dotColor: 'bg-orange-500', icon: '◆' },
]

function getProviderInfo(hostname: string | undefined): ProviderOption {
  const found = PROVIDERS.find(p => p.hostname === hostname)
  if (found) return found
  return { id: 'custom', label: hostname || 'Unknown', hostname: hostname || '', color: 'orange', dotColor: 'bg-orange-500', icon: '◆' }
}

export function ConnectButton() {
  const { agent, login, logout, isLoading } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [authStep, setAuthStep] = useState<AuthStep>('provider')
  const [selectedProvider, setSelectedProvider] = useState<string>('github.com')
  const [customProvider, setCustomProvider] = useState('')
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

  const provider = selectedProvider === 'custom' ? customProvider.trim() : selectedProvider
  const providerInfo = getProviderInfo(provider)
  const isGitHub = provider === 'github.com'

  const resetModal = () => {
    setShowModal(false)
    setAuthStep('provider')
    setSelectedProvider('github.com')
    setCustomProvider('')
    setUsername('')
    setChallenge('')
    setSignature('')
    setError(null)
    setIsConnecting(false)
  }

  const handleGetChallenge = async () => {
    if (!username.trim()) {
      setError('Please enter your username')
      return
    }
    if (!provider || !provider.includes('.')) {
      setError('Please enter a valid provider hostname')
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
          query: `query { getChallenge(provider: "${provider}", username: "${username.trim()}") { challenge } }`
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
        provider,
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
    const agentProvider = getProviderInfo(agent.provider)
    const hasProfile = !!agent.githubUsername
    const profileUrl = hasProfile ? `/profile/${agent.provider || 'github.com'}/${agent.githubUsername}` : undefined
    const externalUrl = hasProfile ? `https://${agent.provider || 'github.com'}/${agent.githubUsername}` : undefined

    return (
      <div className="flex items-center gap-2">
        {agent.githubAvatarUrl && (
          <div className="relative">
            <img
              src={agent.githubAvatarUrl}
              alt={agent.githubUsername}
              className="w-6 h-6 rounded-full"
            />
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 ${agentProvider.dotColor} rounded-full border border-zinc-900`} />
          </div>
        )}
        <a
          href={profileUrl}
          className={`text-sm text-zinc-400 ${hasProfile ? 'hover:text-white cursor-pointer' : ''}`}
        >
          {hasProfile && <span className="text-zinc-500 mr-1">@</span>}
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

            {/* Step 1: Choose Provider */}
            {authStep === 'provider' && (
              <>
                <h2 className="text-xl font-bold mb-3">Connect with SSH</h2>

                <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 mb-4 space-y-2">
                  <p className="text-zinc-300 text-sm font-medium">How it works</p>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    Apocalypse Radio uses <span className="text-zinc-200">SSH key authentication</span> — the
                    same keys you use to push code. No passwords or tokens leave your machine.
                  </p>
                  <ol className="text-zinc-400 text-sm space-y-1 list-decimal list-inside">
                    <li>Choose your Git provider</li>
                    <li>Sign a one-time challenge with your SSH key</li>
                    <li>We verify against your public keys on the provider</li>
                  </ol>
                </div>

                <label className="block text-sm text-zinc-400 mb-2">Choose your provider</label>
                <div className="grid grid-cols-1 gap-2 mb-4">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProvider(p.hostname)
                        setError(null)
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                        selectedProvider === p.hostname
                          ? `border-${p.color}-500/50 bg-${p.color}-500/10 text-white`
                          : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${p.dotColor}`} />
                      <span className="font-medium">{p.label}</span>
                      <span className="text-xs text-zinc-500 ml-auto font-mono">{p.hostname}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setSelectedProvider('custom')
                      setError(null)
                    }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                      selectedProvider === 'custom'
                        ? 'border-zinc-500/50 bg-zinc-500/10 text-white'
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                    <span className="font-medium">Custom GitLab</span>
                    <span className="text-xs text-zinc-500 ml-auto">self-hosted</span>
                  </button>
                </div>

                {selectedProvider === 'custom' && (
                  <input
                    type="text"
                    value={customProvider}
                    onChange={(e) => setCustomProvider(e.target.value)}
                    placeholder="gitlab.example.com"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 mb-4 font-mono text-sm"
                    autoFocus
                  />
                )}

                {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={resetModal}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      if (selectedProvider === 'custom' && (!customProvider.trim() || !customProvider.includes('.'))) {
                        setError('Please enter a valid hostname (e.g. gitlab.example.com)')
                        return
                      }
                      setAuthStep('username')
                      setError(null)
                    }}
                  >
                    Next
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

            {/* Step 2: Enter Username */}
            {authStep === 'username' && (
              <>
                <h2 className="text-xl font-bold mb-3">Connect with SSH</h2>

                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                  <span className={`w-2.5 h-2.5 rounded-full ${providerInfo.dotColor}`} />
                  <span className="text-sm text-zinc-300">{providerInfo.label}</span>
                  <span className="text-xs text-zinc-500 font-mono">{provider}</span>
                  <button
                    onClick={() => { setAuthStep('provider'); setError(null) }}
                    className="ml-auto text-xs text-zinc-500 hover:text-zinc-300"
                  >
                    Change
                  </button>
                </div>

                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-3 mb-4">
                  <p className="text-zinc-500 text-xs leading-relaxed">
                    <span className="text-zinc-400 font-medium">Prerequisites:</span>{' '}
                    An SSH key added to your {providerInfo.label} account.
                    Check with: <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">ssh -T git@{provider}</code>
                  </p>
                </div>

                <label className="block text-sm text-zinc-400 mb-1">{providerInfo.label} Username</label>
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
                  <Button variant="outline" className="flex-1" onClick={() => { setAuthStep('provider'); setError(null) }}>
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleGetChallenge}
                    disabled={isConnecting || !username.trim()}
                  >
                    {isConnecting ? 'Loading...' : 'Next'}
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Sign Challenge */}
            {authStep === 'sign' && (
              <>
                <h2 className="text-xl font-bold mb-1">Sign the Challenge</h2>
                <p className="text-zinc-500 text-xs mb-3">
                  Signing as <span className={`font-mono ${isGitHub ? 'text-purple-400' : 'text-orange-400'}`}>@{username}</span> on <span className="text-zinc-300">{providerInfo.label}</span> — challenge expires in 5 minutes
                </p>

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
                      <span className="text-zinc-300">Check {providerInfo.label} keys:</span>{' '}
                      <code className="bg-zinc-800 px-1 rounded text-zinc-300">curl https://{provider}/{username}.keys</code>
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
