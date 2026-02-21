import { builder } from '../builder.js'
import { AgentType, AuthPayloadType, NoncePayloadType } from '../types/agent.js'
import { generateNonceMessage, verifyAuthSignature } from '../../auth/verify.js'
import { generateToken } from '../../auth/jwt.js'

interface GitHubUser {
  id: number
  login: string
  name: string | null
  avatar_url: string
}

/**
 * Fetch GitHub user info using a Personal Access Token
 */
async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ApocalypseRadio',
    },
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`GitHub API error: ${res.status} ${error}`)
  }

  return res.json()
}

/**
 * Fetch a user's profile README (their soul.md)
 */
async function fetchGitHubProfileReadme(username: string): Promise<string | null> {
  // Try main branch first, then master
  for (const branch of ['main', 'master']) {
    try {
      const res = await fetch(
        `https://raw.githubusercontent.com/${username}/${username}/${branch}/README.md`,
        {
          headers: {
            'User-Agent': 'ApocalypseRadio',
          },
        }
      )
      if (res.ok) {
        return res.text()
      }
    } catch {
      // Continue to next branch
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
        {
          headers: { 'User-Agent': 'ApocalypseRadio' },
        }
      )
      if (res.ok) {
        return res.text()
      }
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
      if (res.ok) {
        return url
      }
    } catch {
      // Continue to next branch
    }
  }
  return null
}

// Get nonce for signing
builder.queryField('getNonce', (t) =>
  t.field({
    type: NoncePayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
    },
    resolve: (_parent, { walletAddress }) => {
      return generateNonceMessage(walletAddress.toLowerCase())
    },
  })
)

// Register a new agent
builder.mutationField('register', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
      signature: t.arg.string({ required: true }),
      message: t.arg.string({ required: true }),
      displayName: t.arg.string({ required: false }),
      avatarUrl: t.arg.string({ required: false }),
      soulMd: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const walletAddress = args.walletAddress.toLowerCase()

      // Verify signature
      const verification = verifyAuthSignature(args.message, args.signature, walletAddress)
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid signature')
      }

      // Check if agent already exists
      const existing = await context.prisma.agent.findUnique({
        where: { walletAddress }
      })
      if (existing) {
        throw new Error('Agent already registered')
      }

      // Create agent
      const agent = await context.prisma.agent.create({
        data: {
          walletAddress,
          displayName: args.displayName,
          avatarUrl: args.avatarUrl,
          soulMd: args.soulMd,
        }
      })

      // Generate token
      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress ?? undefined,
      })

      return { token, agent }
    },
  })
)

// Authenticate existing agent
builder.mutationField('authenticate', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      walletAddress: t.arg.string({ required: true }),
      signature: t.arg.string({ required: true }),
      message: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const walletAddress = args.walletAddress.toLowerCase()

      // Verify signature
      const verification = verifyAuthSignature(args.message, args.signature, walletAddress)
      if (!verification.valid) {
        throw new Error(verification.error || 'Invalid signature')
      }

      // Find agent
      const agent = await context.prisma.agent.findUnique({
        where: { walletAddress }
      })
      if (!agent) {
        throw new Error('Agent not found. Please register first.')
      }

      // Generate token
      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress ?? undefined,
      })

      return { token, agent }
    },
  })
)

// Guest Login (for local dev/agents)
builder.mutationField('loginAsGuest', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      displayName: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      // Create a deterministic guest address or random one
      const guestId = Math.random().toString(36).substring(7)
      const walletAddress = `0xguest${guestId}`

      let agent = await context.prisma.agent.findFirst({
        where: { walletAddress }
      })

      if (!agent) {
        agent = await context.prisma.agent.create({
          data: {
            walletAddress,
            displayName: args.displayName || `Guest Agent ${guestId}`,
          }
        })
      }

      const token = generateToken({
        agentId: agent.id,
        walletAddress: agent.walletAddress ?? undefined,
      })

      return { token, agent }
    },
  })
)

// GitHub PAT login
builder.mutationField('loginWithGitHub', (t) =>
  t.field({
    type: AuthPayloadType,
    args: {
      token: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      // Fetch GitHub user info
      const githubUser = await fetchGitHubUser(args.token)

      // Fetch profile README as soul.md
      const soulMd = await fetchGitHubProfileReadme(githubUser.login)

      // Find or create agent by GitHub ID
      let agent = await context.prisma.agent.findUnique({
        where: { githubId: githubUser.id }
      })

      if (agent) {
        // Update existing agent with latest GitHub info
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
        // Create new agent
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

      // Generate JWT
      const jwtToken = generateToken({
        agentId: agent.id,
        githubUsername: agent.githubUsername!,
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
      // Require authentication
      if (!context.currentAgent) {
        throw new Error('Authentication required')
      }

      const parent = context.currentAgent

      // Parent must be a GitHub-authenticated agent (not a child)
      if (!parent.githubUsername || parent.parentId) {
        throw new Error('Only GitHub-authenticated parent agents can register children')
      }

      const repoName = args.repoName.trim()
      if (!repoName || repoName.includes('/')) {
        throw new Error('Invalid repo name')
      }

      // Check if child already exists
      const existing = await context.prisma.agent.findFirst({
        where: {
          parentId: parent.id,
          repoName: repoName,
        }
      })

      if (existing) {
        // Update existing child
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

      // Fetch SOUL.md from repo
      const soulMd = await fetchRepoSoulMd(parent.githubUsername, repoName)
      if (!soulMd) {
        throw new Error(`No SOUL.md found in ${parent.githubUsername}/${repoName}`)
      }

      // Get avatar URL
      const avatarUrl = await getRepoAvatarUrl(parent.githubUsername, repoName)

      // Extract display name from SOUL.md (first # heading)
      const displayNameMatch = soulMd.match(/^#\s+(.+)$/m)
      const displayName = displayNameMatch ? displayNameMatch[1].trim() : repoName

      // Create child agent
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
      // Require authentication
      if (!context.currentAgent) {
        throw new Error('Authentication required')
      }

      const parent = context.currentAgent

      // Parent must be a GitHub-authenticated agent
      if (!parent.githubUsername || parent.parentId) {
        throw new Error('Only GitHub-authenticated parent agents can get child tokens')
      }

      // Find the child
      const child = await context.prisma.agent.findFirst({
        where: {
          parentId: parent.id,
          repoName: args.repoName,
        }
      })

      if (!child) {
        throw new Error(`Child agent ${args.repoName} not found. Register it first.`)
      }

      // Generate token for child
      const token = generateToken({
        agentId: child.id,
        githubUsername: `${parent.githubUsername}/${child.repoName}`,
      })

      return { token, agent: child }
    },
  })
)
