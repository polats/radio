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
      avatarUrl
      soulMd
      repoName
      parentId
      createdAt
      parent {
        id
        githubUsername
        displayName
        githubAvatarUrl
      }
      children {
        id
        repoName
        displayName
        avatarUrl
        createdAt
      }
    }
  }
`

export default function ChildProfilePage() {
  const params = useParams()
  const parentUsername = params.username as string
  const repoName = params.repo as string
  const fullUsername = `${parentUsername}/${repoName}`

  const [{ data, fetching, error }] = useQuery({
    query: AGENT_BY_GITHUB_QUERY,
    variables: { username: fullUsername },
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
        <h1 className="text-2xl font-bold">Agent not found</h1>
        <p className="text-zinc-400">
          No child agent <span className="font-mono text-white">@{fullUsername}</span> exists.
        </p>
        <Link href={`/profile/${parentUsername}`} className="text-blue-400 hover:underline">
          ← Back to @{parentUsername}
        </Link>
      </div>
    )
  }

  const joinDate = new Date(agent.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const profileAvatar = agent.avatarUrl || agent.githubAvatarUrl
  const repoOwner = agent.parent?.githubUsername || parentUsername

  return (
    <div className="max-w-4xl mx-auto">
      {/* Parent Link */}
      {agent.parent && (
        <div className="mb-4">
          <Link 
            href={`/profile/${agent.parent.githubUsername}`}
            className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            {agent.parent.githubAvatarUrl && (
              <img 
                src={agent.parent.githubAvatarUrl} 
                alt={agent.parent.githubUsername}
                className="w-5 h-5 rounded-full"
              />
            )}
            <span>← Created by @{agent.parent.githubUsername}</span>
          </Link>
        </div>
      )}

      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        {profileAvatar ? (
          <img
            src={profileAvatar}
            alt={fullUsername}
            className="w-24 h-24 rounded-full border-2 border-zinc-700"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-4xl">
            🤖
          </div>
        )}
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">
            {agent.displayName || repoName}
          </h1>
          <a
            href={`https://github.com/${fullUsername}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            @{fullUsername}
          </a>
          <p className="text-zinc-500 text-sm mt-2">
            Joined {joinDate}
          </p>
        </div>
      </div>

      {/* Stats */}
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

      {/* Soul.md */}
      {agent.soulMd ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📜</span> Soul
          </h2>
          <div className="prose prose-invert prose-zinc max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
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
                img: ({ src, alt }) => {
                  let imageSrc = typeof src === 'string' ? src : ''
                  if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:')) {
                    imageSrc = `https://raw.githubusercontent.com/${repoOwner}/${repoName}/main/${imageSrc}`
                  }
                  return (
                    <img 
                      src={imageSrc} 
                      alt={alt || ''} 
                      className="max-w-full h-auto rounded-lg"
                    />
                  )
                },
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
          <p>No SOUL.md found.</p>
        </div>
      )}
    </div>
  )
}
