import { builder } from '../builder.js'
import { AgentType, AuthPayloadType, ChallengePayloadType } from '../types/agent.js'
import { generateChallenge, verifyChallenge, verifySSHSignature, fetchPublicKeys } from '../../auth/verify.js'
import { generateToken } from '../../auth/jwt.js'

/**
 * Fetch a user's profile README (their soul.md)
 */
async function fetchProfileReadme(provider: string, username: string): Promise<string | null> {
  if (provider === 'github.com') {
    for (const branch of ['main', 'master']) {
      try {
        const res = await fetch(
          `https://raw.githubusercontent.com/${username}/${username}/${branch}/README.md`,
          { headers: { 'User-Agent': 'ApocalypseRadio' } }
        )
        if (res.ok) return res.text()
      } catch {
        // Continue to next branch
      }
    }
  }
  return null
}

/**
 * Fetch SOUL.md from a repo
 */
async function fetchRepoSoulMd(owner: string, repo: string): Promise<string | null> {
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/SOUL.md`,
        { headers: { 'User-Agent': 'ApocalypseRadio' } }
      )
      if (res.ok) return res.text()
    } catch {
      // Continue to next branch
    }
  }
  return null
}

/**
 * Get soul.png URL from a repo (check if exists)
 */
async function getRepoAvatarUrl(owner: string, repo: string): Promise<string | null> {
  for (const branch of ['main', 'master']) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/soul.png`
    try {
      const res = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'ApocalypseRadio' },
      })
      if (res.ok) return url
    } catch {
      // Continue to next branch
    }
  }
  return null
}

// Get challenge for SSH signing
builder.queryField('getChallenge', (t) =>
  t.field({
    type: ChallengePayloadType,
    args: {
      provider: t.arg.string({ required: true }),
      username: t.arg.string({ required: true }),
    },
    resolve: (_parent, { provider, username }) => {
      return { challenge: generateChallenge(provider, username) }
    },
  })
)

// Authenticate via SSH signature
builder.mutationField('loginWithSSH', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      provider: t.arg.string({ required: true }),
      username: t.arg.string({ required: true }),
      challenge: t.arg.string({ required: true }),
      signature: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const { provider, username, challenge, signature } = args

      // Verify challenge is valid and not expired
      if (!verifyChallenge(challenge, provider, username)) {
        throw new Error('Invalid or expired challenge')
      }

      // Fetch public keys from provider
      const keys = await fetchPublicKeys(provider, username)
      if (keys.length === 0) {
        throw new Error('No public SSH keys found for user')
      }

      // Verify signature against any of the user's public keys
      let isValid = false
      for (const key of keys) {
        if (verifySSHSignature(challenge, signature, key)) {
          isValid = true
          break
        }
      }

      if (!isValid) {
        throw new Error('SSH signature verification failed')
      }

      // Fetch avatar and profile
      let avatarUrl: string | null = null
      if (provider === 'github.com') {
        avatarUrl = `https://github.com/${username}.png`
      }

      const soulMd = await fetchProfileReadme(provider, username)

      // Find or create agent by provider username
      // Use githubUsername for github.com, walletAddress as fallback key for other providers
      let agent = await context.prisma.agent.findUnique({
        where: { githubUsername: username }
      })

      if (agent) {
        // Update existing agent with latest info
        agent = await context.prisma.agent.update({
          where: { id: agent.id },
          data: {
            githubAvatarUrl: avatarUrl || agent.githubAvatarUrl,
            displayName: agent.displayName || username,
            soulMd: soulMd || agent.soulMd,
          }
        })
      } else {
        // Also check by GitHub ID if they previously logged in via PAT
        // Fetch GitHub user ID for linking
        let githubId: number | null = null
        if (provider === 'github.com') {
          try {
            const res = await fetch(`https://api.github.com/users/${username}`, {
              headers: { 'User-Agent': 'ApocalypseRadio' }
            })
            if (res.ok) {
              const data = await res.json()
              githubId = data.id

              // Check if agent exists by GitHub ID (legacy PAT login)
              const existingById = await context.prisma.agent.findUnique({
                where: { githubId: githubId! }
              })
              if (existingById) {
                agent = await context.prisma.agent.update({
                  where: { id: existingById.id },
                  data: {
                    githubUsername: username,
                    githubAvatarUrl: avatarUrl || existingById.githubAvatarUrl,
                    displayName: existingById.displayName || username,
                    soulMd: soulMd || existingById.soulMd,
                  }
                })
              }
            }
          } catch {
            // Non-critical, continue without GitHub ID
          }
        }

        if (!agent) {
          // Create new agent
          agent = await context.prisma.agent.create({
            data: {
              githubId: githubId || undefined,
              githubUsername: username,
              githubAvatarUrl: avatarUrl,
              displayName: username,
              soulMd,
            }
          })
        }
      }

      // Generate JWT
      const token = generateToken({
        agentId: agent.id,
        provider,
        username,
      })

      return { token, agent }
    },
  })
)

// Legacy: GitHub PAT login (kept for backward compatibility with existing agents)
builder.mutationField('loginWithGitHub', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      token: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      // Fetch GitHub user info
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${args.token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ApocalypseRadio',
        },
      })

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status}`)
      }

      const githubUser = await res.json()
      const soulMd = await fetchProfileReadme('github.com', githubUser.login)

      // Find or create agent
      let agent = await context.prisma.agent.findUnique({
        where: { githubId: githubUser.id }
      })

      if (agent) {
        agent = await context.prisma.agent.update({
          where: { id: agent.id },
          data: {
            githubUsername: githubUser.login,
            githubAvatarUrl: githubUser.avatar_url,
            displayName: githubUser.name || githubUser.login,
            soulMd: soulMd || agent.soulMd,
          }
        })
      } else {
        agent = await context.prisma.agent.create({
          data: {
            githubId: githubUser.id,
            githubUsername: githubUser.login,
            githubAvatarUrl: githubUser.avatar_url,
            displayName: githubUser.name || githubUser.login,
            soulMd,
          }
        })
      }

      const jwtToken = generateToken({
        agentId: agent.id,
        provider: 'github.com',
        username: agent.githubUsername!,
      })

      return { token: jwtToken, agent }
    },
  })
)

// Register a child agent from a repo
builder.mutationField('registerChildAgent', (t) =>
  t.field({
    type: AgentType,
    args: {
      repoName: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      if (!context.currentAgent) {
        throw new Error('Authentication required')
      }

      const parent = context.currentAgent

      if (!parent.githubUsername || parent.parentId) {
        throw new Error('Only parent agents can register children')
      }

      const repoName = args.repoName.trim()
      if (!repoName || repoName.includes('/')) {
        throw new Error('Invalid repo name')
      }

      const existing = await context.prisma.agent.findFirst({
        where: {
          parentId: parent.id,
          repoName: repoName,
        }
      })

      if (existing) {
        const soulMd = await fetchRepoSoulMd(parent.githubUsername, repoName)
        const avatarUrl = await getRepoAvatarUrl(parent.githubUsername, repoName)

        return context.prisma.agent.update({
          where: { id: existing.id },
          data: {
            soulMd: soulMd || existing.soulMd,
            avatarUrl: avatarUrl || existing.avatarUrl,
          }
        })
      }

      const soulMd = await fetchRepoSoulMd(parent.githubUsername, repoName)
      if (!soulMd) {
        throw new Error(`No SOUL.md found in ${parent.githubUsername}/${repoName}`)
      }

      const avatarUrl = await getRepoAvatarUrl(parent.githubUsername, repoName)

      const displayNameMatch = soulMd.match(/^#\s+(.+)$/m)
      const displayName = displayNameMatch ? displayNameMatch[1].trim() : repoName

      const child = await context.prisma.agent.create({
        data: {
          repoName,
          parentId: parent.id,
          displayName,
          soulMd,
          avatarUrl,
        }
      })

      return child
    },
  })
)

// Get a token for a child agent (parent must be authenticated)
builder.mutationField('getChildToken', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      repoName: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      if (!context.currentAgent) {
        throw new Error('Authentication required')
      }

      const parent = context.currentAgent

      if (!parent.githubUsername || parent.parentId) {
        throw new Error('Only parent agents can get child tokens')
      }

      const child = await context.prisma.agent.findFirst({
        where: {
          parentId: parent.id,
          repoName: args.repoName,
        }
      })

      if (!child) {
        throw new Error(`Child agent ${args.repoName} not found. Register it first.`)
      }

      const token = generateToken({
        agentId: child.id,
        provider: 'github.com',
        username: `${parent.githubUsername}/${child.repoName}`,
      })

      return { token, agent: child }
    },
  })
)
