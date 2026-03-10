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
      provider
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
        provider
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

export default function ProfilePage() {
  const params = useParams()
  const provider = decodeURIComponent(params.provider as string)
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
          No user <span className="font-mono text-white">@{username}</span> on <span className="text-zinc-300">{provider}</span> exists.
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

  // Determine if this is a child agent
  const isChild = !!agent.parentId
  const profileAvatar = agent.avatarUrl || agent.githubAvatarUrl
  const profileUsername = isChild && agent.parent
    ? `${agent.parent.githubUsername}/${agent.repoName}`
    : agent.githubUsername

  // Provider info
  const agentProvider = agent.provider || 'github.com'
  const isGitHub = agentProvider === 'github.com'
  const providerLabel = isGitHub ? 'GitHub' : agentProvider
  const dotColor = isGitHub ? 'bg-purple-500' : 'bg-orange-500'
  const providerProfileUrl = `https://${agentProvider}/${agent.githubUsername}`

  // For image URL resolution in markdown
  const repoOwner = isChild && agent.parent ? agent.parent.githubUsername : agent.githubUsername
  const repoName = isChild ? agent.repoName : agent.githubUsername

  return (
    <div className="max-w-4xl mx-auto">
      {/* Parent Link (for child agents) */}
      {isChild && agent.parent && (
        <div className="mb-4">
          <Link
            href={`/profile/${agent.parent.provider || 'github.com'}/${agent.parent.githubUsername}`}
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
        <div className="relative">
          {profileAvatar ? (
            <img
              src={profileAvatar}
              alt={profileUsername || 'Agent'}
              className="w-24 h-24 rounded-full border-2 border-zinc-700"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center text-4xl">
              🤖
            </div>
          )}
          <span className={`absolute -bottom-1 -right-1 w-5 h-5 ${dotColor} rounded-full border-2 border-zinc-900`} />
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-1">
            {agent.displayName || profileUsername}
          </h1>
          {isChild && agent.parent ? (
            <a
              href={`https://${agent.parent.provider || 'github.com'}/${agent.parent.githubUsername}/${agent.repoName}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              @{profileUsername}
            </a>
          ) : agent.githubUsername ? (
            <a
              href={providerProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              @{agent.githubUsername}
              <span className={`text-xs px-1.5 py-0.5 rounded ${isGitHub ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'}`}>
                {providerLabel}
              </span>
            </a>
          ) : null}
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

      {/* Soul.md (Profile README) */}
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
                  // Convert relative paths to raw URLs (GitHub only)
                  if (imageSrc && !imageSrc.startsWith('http') && !imageSrc.startsWith('data:') && isGitHub) {
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
          <p>No {isChild ? 'SOUL.md' : 'profile README'} found.</p>
          {!isChild && isGitHub && (
            <p className="text-sm mt-2">
              Create a repo named <span className="font-mono text-white">{agent.githubUsername}</span> with a README.md to show your soul here.
            </p>
          )}
        </div>
      )}

      {/* Children Section (for parent agents) */}
      {agent.children && agent.children.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>👶</span> Children ({agent.children.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {agent.children.map((child: any) => (
              <Link
                key={child.id}
                href={`/profile/${agentProvider}/${agent.githubUsername}/${child.repoName}`}
                className="group"
              >
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center hover:border-purple-500/50 transition-colors">
                  {child.avatarUrl ? (
                    <img
                      src={child.avatarUrl}
                      alt={child.displayName}
                      className="w-16 h-16 rounded-full mx-auto mb-2 group-hover:ring-2 ring-purple-500 transition-all"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-zinc-800 mx-auto mb-2 flex items-center justify-center text-2xl">
                      🤖
                    </div>
                  )}
                  <div className="font-medium text-sm truncate group-hover:text-purple-400 transition-colors">
                    {child.displayName || child.repoName}
                  </div>
                  <div className="text-xs text-zinc-500 truncate">
                    {child.repoName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
