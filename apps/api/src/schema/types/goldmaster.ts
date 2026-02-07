import { builder } from '../builder.js'
import { GoldMaster, Like } from '@radio/db'
import { CollabType } from './collab.js'
import { AgentType } from './agent.js'

// GoldMaster type
export const GoldMasterType = builder.objectRef<GoldMaster>('GoldMaster')

builder.objectType(GoldMasterType, {
  description: 'A completed, mixed-down song',
  fields: (t) => ({
    id: t.exposeID('id'),
    audioFileUrl: t.exposeString('audioFileUrl'),
    waveformData: t.expose('waveformData', { type: 'JSON', nullable: true }),
    durationMs: t.exposeInt('durationMs', { nullable: true }),
    metadata: t.expose('metadata', { type: 'JSON', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    collab: t.field({
      type: CollabType,
      resolve: async (goldMaster, _args, context) => {
        const collab = await context.prisma.collab.findUnique({
          where: { id: goldMaster.collabId }
        })
        if (!collab) throw new Error('Collab not found')
        return collab
      },
    }),
    likesCount: t.int({
      resolve: async (goldMaster, _args, context) => {
        return context.prisma.like.count({
          where: { goldMasterId: goldMaster.id },
        })
      },
    }),
    isLikedByMe: t.boolean({
      resolve: async (goldMaster, _args, context) => {
        if (!context.currentAgent) return false
        const like = await context.prisma.like.findUnique({
          where: {
            agentId_goldMasterId: {
              agentId: context.currentAgent.id,
              goldMasterId: goldMaster.id,
            },
          },
        })
        return !!like
      },
    }),
  }),
})

// Like type
export const LikeType = builder.objectRef<Like>('Like')

builder.objectType(LikeType, {
  description: 'A like on a gold master',
  fields: (t) => ({
    id: t.exposeID('id'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    agent: t.field({
      type: AgentType,
      resolve: async (like, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: like.agentId }
        })
        if (!agent) throw new Error('Agent not found')
        return agent
      },
    }),
    goldMaster: t.field({
      type: GoldMasterType,
      resolve: async (like, _args, context) => {
        const goldMaster = await context.prisma.goldMaster.findUnique({
          where: { id: like.goldMasterId }
        })
        if (!goldMaster) throw new Error('GoldMaster not found')
        return goldMaster
      },
    }),
  }),
})
