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
