import { builder } from '../builder.js'
import { AgentRef, CollabRef, PrismTrialRef, TrialAttemptRef } from './refs.js'

// TrialAttemptStatus enum
export const TrialAttemptStatus = builder.enumType('TrialAttemptStatus', {
  values: ['PENDING', 'EVALUATING', 'PASSED', 'FAILED'] as const,
  description: 'Status of a trial attempt',
})

// Export refs as types
export const PrismTrialType = PrismTrialRef
export const TrialAttemptType = TrialAttemptRef

// Implement PrismTrial type
builder.objectType(PrismTrialType, {
  description: 'A skill trial definition created by a prism operator',
  fields: (t) => ({
    id: t.exposeID('id'),
    skillName: t.exposeString('skillName'),
    skillCategory: t.exposeString('skillCategory'),
    tier: t.exposeInt('tier'),
    title: t.exposeString('title'),
    description: t.exposeString('description'),
    iconEmoji: t.exposeString('iconEmoji'),
    constraints: t.expose('constraints', { type: 'JSON' }),
    judgeCriteria: t.expose('judgeCriteria', { type: 'JSON' }),
    isActive: t.exposeBoolean('isActive'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    prismAgent: t.field({
      type: AgentRef,
      resolve: async (trial, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: trial.prismAgentId },
        })
        if (!agent) throw new Error('Prism agent not found')
        return agent
      },
    }),
    attempts: t.field({
      type: [TrialAttemptRef],
      resolve: async (trial, _args, context) => {
        return context.prisma.trialAttempt.findMany({
          where: { trialId: trial.id },
          orderBy: { createdAt: 'desc' },
        })
      },
    }),
  }),
})

// Implement TrialAttempt type
builder.objectType(TrialAttemptType, {
  description: 'An agent\'s attempt at completing a trial',
  fields: (t) => ({
    id: t.exposeID('id'),
    status: t.expose('status', { type: TrialAttemptStatus }),
    scores: t.expose('scores', { type: 'JSON', nullable: true }),
    attestation: t.expose('attestation', { type: 'JSON', nullable: true }),
    startedAt: t.expose('startedAt', { type: 'DateTime' }),
    completedAt: t.expose('completedAt', { type: 'DateTime', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    trial: t.field({
      type: PrismTrialRef,
      resolve: async (attempt, _args, context) => {
        const trial = await context.prisma.prismTrial.findUnique({
          where: { id: attempt.trialId },
        })
        if (!trial) throw new Error('Trial not found')
        return trial
      },
    }),
    agent: t.field({
      type: AgentRef,
      resolve: async (attempt, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: attempt.agentId },
        })
        if (!agent) throw new Error('Agent not found')
        return agent
      },
    }),
    collab: t.field({
      type: CollabRef,
      resolve: async (attempt, _args, context) => {
        const collab = await context.prisma.collab.findUnique({
          where: { id: attempt.collabId },
        })
        if (!collab) throw new Error('Collab not found')
        return collab
      },
    }),
  }),
})
