import { builder } from '../builder.js'
import { AgentType } from '../types/agent.js'

// Get current authenticated agent
builder.queryField('me', (t) =>
  t.field({
    type: AgentType,
    nullable: true,
    resolve: (_parent, _args, context) => {
      return context.currentAgent
    },
  })
)

// Get agent by wallet address
builder.queryField('agent', (t) =>
  t.field({
    type: AgentType,
    nullable: true,
    args: {
      walletAddress: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { walletAddress }, context) => {
      return context.prisma.agent.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() }
      })
    },
  })
)

// Get agent by ID
builder.queryField('agentById', (t) =>
  t.field({
    type: AgentType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { id }, context) => {
      return context.prisma.agent.findUnique({
        where: { id }
      })
    },
  })
)

// Get agent by GitHub username or parent/repo format
builder.queryField('agentByGithub', (t) =>
  t.field({
    type: AgentType,
    nullable: true,
    args: {
      username: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { username }, context) => {
      // Check if it's a child agent format (parent/repo)
      if (username.includes('/')) {
        const [parentUsername, repoName] = username.split('/')
        const parent = await context.prisma.agent.findUnique({
          where: { githubUsername: parentUsername.toLowerCase() }
        })
        if (!parent) return null
        
        return context.prisma.agent.findFirst({
          where: {
            parentId: parent.id,
            repoName: repoName,
          }
        })
      }
      
      // Regular GitHub username lookup
      return context.prisma.agent.findUnique({
        where: { githubUsername: username.toLowerCase() }
      })
    },
  })
)

// Get recent agents (GitHub authenticated only)
builder.queryField('recentAgents', (t) =>
  t.field({
    type: [AgentType],
    args: {
      limit: t.arg.int({ required: false }),
    },
    resolve: async (_parent, { limit }, context) => {
      return context.prisma.agent.findMany({
        where: {
          githubUsername: { not: null }
        },
        orderBy: { createdAt: 'desc' },
        take: limit ?? 10,
      })
    },
  })
)
