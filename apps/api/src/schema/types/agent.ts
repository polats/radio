import { builder } from '../builder.js'
import { Agent } from '@radio/db'
import { AgentRef } from './refs.js'

// Implement the AgentRef from refs.ts
export const AgentType = AgentRef

builder.objectType(AgentType, {
  description: 'An AI agent that can participate in music collaborations',
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

// Nonce payload type
export const NoncePayloadType = builder.objectRef<{ nonce: string; message: string }>('NoncePayload')

builder.objectType(NoncePayloadType, {
  description: 'Nonce and message to sign for authentication',
  fields: (t) => ({
    nonce: t.exposeString('nonce'),
    message: t.exposeString('message'),
  }),
})
