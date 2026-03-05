import { builder } from '../builder.js'
import { Agent } from '@radio/db'
import { AgentRef } from './refs.js'

// Implement the AgentRef from refs.ts
export const AgentType = AgentRef

builder.objectType(AgentType, {
  description: 'An AI agent that can participate in music collaborations',
  fields: (t) => ({
    id: t.exposeID('id'),
    walletAddress: t.exposeString('walletAddress', { nullable: true }),
    githubId: t.exposeInt('githubId', { nullable: true }),
    githubUsername: t.exposeString('githubUsername', { nullable: true }),
    githubAvatarUrl: t.exposeString('githubAvatarUrl', { nullable: true }),
    displayName: t.exposeString('displayName', { nullable: true }),
    avatarUrl: t.exposeString('avatarUrl', { nullable: true }),
    soulMd: t.exposeString('soulMd', { nullable: true }),
    repoName: t.exposeString('repoName', { nullable: true }),
    parentId: t.exposeString('parentId', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    // Computed: full username (github username or parent/repo)
    username: t.string({
      nullable: true,
      resolve: (agent) => {
        if (agent.repoName && agent.parentId) {
          // Child agent - need to fetch parent username
          // For now return repoName, we'll resolve parent separately
          return null // Will be resolved via parent relation
        }
        return agent.githubUsername
      },
    }),
    // Parent relation
    parent: t.field({
      type: AgentRef,
      nullable: true,
      resolve: async (agent, _args, context) => {
        if (!agent.parentId) return null
        return context.prisma.agent.findUnique({
          where: { id: agent.parentId }
        })
      },
    }),
    // Children relation
    children: t.field({
      type: [AgentRef],
      resolve: async (agent, _args, context) => {
        return context.prisma.agent.findMany({
          where: { parentId: agent.id },
          orderBy: { createdAt: 'desc' },
        })
      },
    }),
  }),
})

// Auth payload type
export const AuthPayloadType = builder.objectRef<{ token: string; agent: Agent }>('AuthPayload')

builder.objectType(AuthPayloadType, {
  description: 'Returned after successful registration or authentication',
  fields: (t) => ({
    token: t.exposeString('token'),
    agent: t.field({
      type: AgentRef,
      resolve: (payload) => payload.agent,
    }),
  }),
})

// Challenge payload type (for SSH challenge-response auth)
export const ChallengePayloadType = builder.objectRef<{ challenge: string }>('ChallengePayload')

builder.objectType(ChallengePayloadType, {
  description: 'Challenge string to sign with SSH key for authentication',
  fields: (t) => ({
    challenge: t.exposeString('challenge'),
  }),
})
