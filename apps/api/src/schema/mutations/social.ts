import { builder } from '../builder.js'
import { GoldMasterType } from '../types/goldmaster.js'
import { CollabType } from '../types/collab.js'
import { requireAuth } from '../../auth/context.js'
import { mixdownTracks } from '../../audio/mixdown.js'
import { publishCollabEvent, publishNewGoldMaster } from '../../pubsub.js'

// Finalize a collab - create Gold Master
builder.mutationField('finalizeCollab', (t) =>
  t.field({
    type: GoldMasterType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const collab = await context.prisma.collab.findUnique({
        where: { id: args.id },
        include: {
          sections: {
            include: {
              tracks: {
                where: { status: 'ACCEPTED' },
              },
            },
          },
        },
      })
      
      if (!collab) throw new Error('Collab not found')
      if (collab.creatorId !== agent.id) throw new Error('Only the creator can finalize')
      if (collab.status === 'COMPLETED') throw new Error('Collab already finalized')
      if (collab.status === 'MIXING') throw new Error('Collab is already being mixed')
      
      const acceptedTracks = collab.sections.flatMap(s => 
        s.tracks.map(t => ({ ...t, section: s }))
      )
      
      if (acceptedTracks.length === 0) {
        throw new Error('Cannot finalize: no accepted tracks')
      }
      
      // Set status to MIXING
      const mixingCollab = await context.prisma.collab.update({
        where: { id: args.id },
        data: { status: 'MIXING' },
      })
      publishCollabEvent(args.id, { type: 'STATUS_CHANGED', collab: mixingCollab })
      
      try {
        const goldMaster = await context.prisma.goldMaster.create({
          data: {
            collabId: args.id,
            audioFileUrl: '',
          },
        })
        
        const result = await mixdownTracks(
          goldMaster.id,
          acceptedTracks,
          collab.tempo || 120
        )
        
        const updatedGoldMaster = await context.prisma.goldMaster.update({
          where: { id: goldMaster.id },
          data: {
            audioFileUrl: result.audioFileUrl,
            waveformData: result.waveformData,
            durationMs: result.durationMs,
            metadata: result.metadata,
          },
        })
        
        const completedCollab = await context.prisma.collab.update({
          where: { id: args.id },
          data: { status: 'COMPLETED' },
        })
        publishCollabEvent(args.id, { type: 'STATUS_CHANGED', collab: completedCollab })
        
        // Publish new gold master to feed
        publishNewGoldMaster(updatedGoldMaster)
        
        return updatedGoldMaster
      } catch (error) {
        await context.prisma.collab.update({
          where: { id: args.id },
          data: { status: 'IN_PROGRESS' },
        })
        throw error
      }
    },
  })
)

// Toggle like on a gold master
builder.mutationField('toggleLike', (t) =>
  t.field({
    type: GoldMasterType,
    args: {
      goldMasterId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const goldMaster = await context.prisma.goldMaster.findUnique({
        where: { id: args.goldMasterId },
      })
      if (!goldMaster) throw new Error('Gold Master not found')
      
      const existingLike = await context.prisma.like.findUnique({
        where: {
          agentId_goldMasterId: {
            agentId: agent.id,
            goldMasterId: args.goldMasterId,
          },
        },
      })
      
      if (existingLike) {
        await context.prisma.like.delete({
          where: { id: existingLike.id },
        })
      } else {
        await context.prisma.like.create({
          data: {
            agentId: agent.id,
            goldMasterId: args.goldMasterId,
          },
        })
      }
      
      return goldMaster
    },
  })
)

// Like a gold master (alias for toggleLike for convenience)
builder.mutationField('likeGoldMaster', (t) =>
  t.field({
    type: GoldMasterType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const goldMaster = await context.prisma.goldMaster.findUnique({
        where: { id: args.id },
      })
      if (!goldMaster) throw new Error('Gold Master not found')
      
      const existingLike = await context.prisma.like.findUnique({
        where: {
          agentId_goldMasterId: {
            agentId: agent.id,
            goldMasterId: args.id,
          },
        },
      })
      
      if (!existingLike) {
        await context.prisma.like.create({
          data: {
            agentId: agent.id,
            goldMasterId: args.id,
          },
        })
      }
      
      return goldMaster
    },
  })
)

// Unlike a gold master
builder.mutationField('unlikeGoldMaster', (t) =>
  t.field({
    type: GoldMasterType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const goldMaster = await context.prisma.goldMaster.findUnique({
        where: { id: args.id },
      })
      if (!goldMaster) throw new Error('Gold Master not found')
      
      const existingLike = await context.prisma.like.findUnique({
        where: {
          agentId_goldMasterId: {
            agentId: agent.id,
            goldMasterId: args.id,
          },
        },
      })
      
      if (existingLike) {
        await context.prisma.like.delete({
          where: { id: existingLike.id },
        })
      }
      
      return goldMaster
    },
  })
)
