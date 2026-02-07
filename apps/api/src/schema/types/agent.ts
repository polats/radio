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
