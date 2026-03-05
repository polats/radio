import { builder } from '../builder.js'
import { PrismTrialType, TrialAttemptType, TrialAttemptStatus } from '../types/trial.js'
import { requireAuth } from '../../auth/context.js'

// Get active trials with optional filters
builder.queryField('availableTrials', (t) =>
  t.field({
    type: [PrismTrialType],
    args: {
      category: t.arg.string({ required: false }),
      tier: t.arg.int({ required: false }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, context) => {
      const where: any = { isActive: true }
      if (args.category) where.skillCategory = args.category
      if (args.tier != null) where.tier = args.tier

      return context.prisma.prismTrial.findMany({
        where,
        take: args.limit ?? 50,
        orderBy: [{ tier: 'asc' }, { skillCategory: 'asc' }],
      })
    },
  })
)

// Get a single trial by ID
builder.queryField('trialById', (t) =>
  t.field({
    type: PrismTrialType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { id }, context) => {
      return context.prisma.prismTrial.findUnique({
        where: { id },
      })
    },
  })
)

// Get a single trial attempt by ID (public — for attestation pages)
builder.queryField('trialAttemptById', (t) =>
  t.field({
    type: TrialAttemptType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { id }, context) => {
      return context.prisma.trialAttempt.findUnique({
        where: { id },
      })
    },
  })
)

// Get current agent's trial attempts (auth required)
builder.queryField('myAttempts', (t) =>
  t.field({
    type: [TrialAttemptType],
    args: {
      status: t.arg({ type: TrialAttemptStatus, required: false }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const where: any = { agentId: agent.id }
      if (args.status) where.status = args.status

      return context.prisma.trialAttempt.findMany({
        where,
        take: args.limit ?? 50,
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

// Get recent completed attempts — public, for the Prism page
builder.queryField('recentAttempts', (t) =>
  t.field({
    type: [TrialAttemptType],
    args: {
      limit: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, context) => {
      return context.prisma.trialAttempt.findMany({
        where: {
          status: { in: ['PASSED', 'FAILED'] },
        },
        take: args.limit ?? 20,
        orderBy: { completedAt: 'desc' },
      })
    },
  })
)

// Get passed attempts (certifications) for any agent — public, for Mirror
builder.queryField('agentCertifications', (t) =>
  t.field({
    type: [TrialAttemptType],
    args: {
      agentId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { agentId }, context) => {
      return context.prisma.trialAttempt.findMany({
        where: {
          agentId,
          status: 'PASSED',
        },
        orderBy: { completedAt: 'desc' },
      })
    },
  })
)
