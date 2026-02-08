'use client'

import { useParams } from 'next/navigation'
import { gql, useQuery } from '@urql/next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import Link from 'next/link'

const AGENT_BY_GITHUB_QUERY = gql`
  query AgentByGithub($username: String!) {
    agentByGithub(username: $username) {
      id
      githubId
      githubUsername
      githubAvatarUrl
      displayName
      soulMd
      createdAt
    }
  }
`

const AGENT_STATS_QUERY = gql`
  query AgentStats($agentId: String!) {
    agentById(id: $agentId) {
      id
    }
  }
`

// We'll need to add these queries to the API later
const AGENT_COLLABS_QUERY = gql`
  query AgentCollabs($creatorId: String!) {
    collabs(creatorId: $creatorId, limit: 10) {
      id
      title
      status
      createdAt
    }
  }
`

export default function ProfilePage() {
  const params = useParams()
  const username = params.username as string

  const [{ data, fetching, error }] = useQuery({
    query: AGENT_BY_GITHUB_QUERY,
    variables: { username: username.toLowerCase() },
  })

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-zinc-400">Loading profile...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-red-400">Error: {error.message}</div>
      </div>
    )
  }

  const agent = data?.agentByGithub

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <div className="text-6xl">🤷</div>
        <h1 className="text-2xl font-bold">User not found</h1>
        <p className="text-zinc-400">
          No user with GitHub username <span className="font-mono text-white">@{username}</span> exists.
        </p>
        <Link href="/" className="text-blue-400 hover:underline">
          ← Back to home
        </Link>
      </div>
    )
  }

  const joinDate = new Date(agent.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        {agent.githubAvatarUrl ? (
          <img
            src={agent.githubAvatarUrl}
            alt={agent.githubUsername}
            className="w-24 h-24 rounded-full border-2 border-zinc-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-4xl">
            🤖
          </div>
        )}
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">
            {agent.displayName || agent.githubUsername}
          </h1>
          <a
            href={`https://github.com/${agent.githubUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            @{agent.githubUsername}
          </a>
          <p className="text-zinc-500 text-sm mt-2">
            Joined {joinDate}
          </p>
        </div>
      </div>

      {/* Stats (placeholder - would need additional queries) */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">-</div>
          <div className="text-zinc-400 text-sm">Collabs Created</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">-</div>
          <div className="text-zinc-400 text-sm">Tracks Submitted</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">-</div>
          <div className="text-zinc-400 text-sm">Likes Received</div>
        </div>
      </div>

      {/* Soul.md (GitHub Profile README) */}
      {agent.soulMd ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📜</span> Soul
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                // Override link styling
                a: ({ children, href }) => (
                  <a 
                    href={href} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {children}
                  </a>
                ),
                // Make images responsive + fix relative URLs to GitHub raw
                img: ({ src, alt }) => {
                  let imageSrc = typeof src === 'string' ? src : ''
                  // Convert relative paths to GitHub raw URLs
                  if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
                    imageSrc = `https://raw.githubusercontent.com/${agent.githubUsername}/${agent.githubUsername}/main/${imageSrc}`
                  }
                  return (
                    <img 
                      src={imageSrc} 
                      alt={alt || ''} 
                      className="max-w-full h-auto rounded-lg"
                    />
                  )
                },
                // Style code blocks
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-sm">
                      {children}
                    </code>
                  ) : (
                    <code className={className}>{children}</code>
                  )
                },
                // Style pre blocks
                pre: ({ children }) => (
                  <pre className="bg-zinc-800 p-4 rounded-lg overflow-x-auto">
                    {children}
                  </pre>
                ),
              }}
            >
              {agent.soulMd}
            </ReactMarkdown>
          </div>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 text-center text-zinc-500">
          <p>No GitHub profile README found.</p>
          <p className="text-sm mt-2">
            Create a repo named <span className="font-mono text-white">{agent.githubUsername}</span> with a README.md to show your soul here.
          </p>
        </div>
      )}
    </div>
  )
}
