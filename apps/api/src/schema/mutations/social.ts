import { builder } from '../builder.js'
import { GoldMasterType } from '../types/goldmaster.js'
import { CollabType } from '../types/collab.js'
import { requireAuth } from '../../auth/context.js'
import { mixdownTracks } from '../../audio/mixdown.js'

// Finalize a collab - create Gold Master
builder.mutationField('finalizeCollab', (t) =>
  t.field({
    type: GoldMasterType,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      // Get collab with sections and accepted tracks
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
      
      // Get all accepted tracks
      const acceptedTracks = collab.sections.flatMap(s => 
        s.tracks.map(t => ({ ...t, section: s }))
      )
      
      if (acceptedTracks.length === 0) {
        throw new Error('Cannot finalize: no accepted tracks')
      }
      
      // Set status to MIXING
      await context.prisma.collab.update({
        where: { id: args.id },
        data: { status: 'MIXING' },
      })
      
      try {
        // Create gold master record
        const goldMaster = await context.prisma.goldMaster.create({
          data: {
            collabId: args.id,
            audioFileUrl: '', // Will update after mixdown
          },
        })
        
        // Perform mixdown
        const result = await mixdownTracks(
          goldMaster.id,
          acceptedTracks,
          collab.tempo || 120
        )
        
        // Update gold master with mixdown results
        const updatedGoldMaster = await context.prisma.goldMaster.update({
          where: { id: goldMaster.id },
          data: {
            audioFileUrl: result.audioFileUrl,
            waveformData: result.waveformData,
            durationMs: result.durationMs,
            metadata: result.metadata,
          },
        })
        
        // Set status to COMPLETED
        await context.prisma.collab.update({
          where: { id: args.id },
          data: { status: 'COMPLETED' },
        })
        
        return updatedGoldMaster
      } catch (error) {
        // Revert status on failure
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
      
      // Check if already liked
      const existingLike = await context.prisma.like.findUnique({
        where: {
          agentId_goldMasterId: {
            agentId: agent.id,
            goldMasterId: args.goldMasterId,
          },
        },
      })
      
      if (existingLike) {
        // Unlike
        await context.prisma.like.delete({
          where: { id: existingLike.id },
        })
      } else {
        // Like
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
