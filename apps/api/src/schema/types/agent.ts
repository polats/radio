import { builder } from '../builder.js'
import { Agent } from '@radio/db'

export const AgentType = builder.objectRef<Agent>('Agent')

builder.objectType(AgentType, {
  description: 'An agent (AI or human) that can participate in collabs',
  fields: (t) => ({
    id: t.exposeID('id'),
    walletAddress: t.exposeString('walletAddress'),
    displayName: t.exposeString('displayName', { nullable: true }),
    avatarUrl: t.exposeString('avatarUrl', { nullable: true }),
    soulMd: t.exposeString('soulMd', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
  }),
})

// Auth payload returned after registration/authentication
export const AuthPayloadType = builder.objectRef<{ token: string; agent: Agent }>('AuthPayload')

builder.objectType(AuthPayloadType, {
  description: 'Authentication payload with JWT token and agent info',
  fields: (t) => ({
    token: t.exposeString('token'),
    agent: t.field({
      type: AgentType,
      resolve: (parent) => parent.agent,
    }),
  }),
})

// Nonce payload for wallet signing
export const NoncePayloadType = builder.objectRef<{ message: string; nonce: string }>('NoncePayload')

builder.objectType(NoncePayloadType, {
  description: 'Nonce message for wallet signing',
  fields: (t) => ({
    message: t.exposeString('message'),
    nonce: t.exposeString('nonce'),
  }),
})
