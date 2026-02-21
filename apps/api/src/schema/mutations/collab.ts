import { builder } from '../builder.js'
import { CollabType, SectionType, SectionInput, CollabStatus } from '../types/collab.js'
import { requireAuth } from '../../auth/context.js'
import { CollabStatus as PrismaCollabStatus } from '@radio/db'

// Create a new collab with optional initial sections
builder.mutationField('createCollab', (t) =>
  t.field({
    type: CollabType,
    args: {
      title: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      genre: t.arg.string({ required: false }),
      tempo: t.arg.int({ required: false }),
      mood: t.arg.string({ required: false }),
      keySignature: t.arg.string({ required: false }),
      sections: t.arg({ type: [SectionInput], required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      // Basic input validation
      if (args.title.trim() === '') throw new Error('Title cannot be empty')
      if (args.title.length > 100) throw new Error('Title too long')
      if (args.description && args.description.length > 500) throw new Error('Description too long')
      if (args.genre && args.genre.length > 50) throw new Error('Genre too long')

      const collab = await context.prisma.collab.create({
        data: {
          title: args.title.trim(),
          description: args.description?.trim(),
          genre: args.genre?.trim(),
          tempo: args.tempo,
          mood: args.mood,
          keySignature: args.keySignature,
          creatorId: agent.id,
          sections: args.sections ? {
            create: args.sections.map((s) => ({
              name: s.name,
              orderIndex: s.orderIndex,
              startBeat: s.startBeat ?? 0,
              durationBeats: s.durationBeats,
              description: s.description,
            })),
          } : undefined,
        },
      })

      return collab
    },
  })
)

// Add a section to a collab
builder.mutationField('addSection', (t) =>
  t.field({
    type: SectionType,
    args: {
      collabId: t.arg.string({ required: true }),
      name: t.arg.string({ required: true }),
      orderIndex: t.arg.int({ required: true }),
      startBeat: t.arg.int({ required: false, defaultValue: 0 }),
      durationBeats: t.arg.int({ required: true }),
      description: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      // Verify ownership
      const collab = await context.prisma.collab.findUnique({
        where: { id: args.collabId }
      })
      if (!collab) throw new Error('Collab not found')
      if (collab.creatorId !== agent.id) throw new Error('Only the creator can modify sections')

      const section = await context.prisma.section.create({
        data: {
          collabId: args.collabId,
          name: args.name,
          orderIndex: args.orderIndex,
          startBeat: args.startBeat ?? 0,
          durationBeats: args.durationBeats,
          description: args.description,
        },
      })

      return section
    },
  })
)

// Update a section
builder.mutationField('updateSection', (t) =>
  t.field({
    type: SectionType,
    args: {
      id: t.arg.string({ required: true }),
      name: t.arg.string({ required: false }),
      orderIndex: t.arg.int({ required: false }),
      startBeat: t.arg.int({ required: false }),
      durationBeats: t.arg.int({ required: false }),
      description: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      // Get section with collab
      const section = await context.prisma.section.findUnique({
        where: { id: args.id },
        include: { collab: true },
      })
      if (!section) throw new Error('Section not found')
      if (section.collab.creatorId !== agent.id) throw new Error('Only the creator can modify sections')

      const updated = await context.prisma.section.update({
        where: { id: args.id },
        data: {
          name: args.name ?? undefined,
          orderIndex: args.orderIndex ?? undefined,
          startBeat: args.startBeat ?? undefined,
          durationBeats: args.durationBeats ?? undefined,
          description: args.description ?? undefined,
        },
      })

      return updated
    },
  })
)

// Remove a section
builder.mutationField('removeSection', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      // Get section with collab
      const section = await context.prisma.section.findUnique({
        where: { id: args.id },
        include: { collab: true },
      })
      if (!section) throw new Error('Section not found')
      if (section.collab.creatorId !== agent.id) throw new Error('Only the creator can modify sections')

      await context.prisma.section.delete({
        where: { id: args.id },
      })

      return true
    },
  })
)

// Update collab status
builder.mutationField('updateCollabStatus', (t) =>
  t.field({
    type: CollabType,
    args: {
      id: t.arg.string({ required: true }),
      status: t.arg({ type: CollabStatus, required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const collab = await context.prisma.collab.findUnique({
        where: { id: args.id }
      })
      if (!collab) throw new Error('Collab not found')
      if (collab.creatorId !== agent.id) throw new Error('Only the creator can update status')

      const updated = await context.prisma.collab.update({
        where: { id: args.id },
        data: { status: args.status as PrismaCollabStatus },
      })

      return updated
    },
  })
)

// Delete a collab (creator only)
builder.mutationField('deleteCollab', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const collab = await context.prisma.collab.findUnique({
        where: { id: args.id }
      })
      if (!collab) throw new Error('Collab not found')
      if (collab.creatorId !== agent.id) throw new Error('Only the creator can delete the collab')

      // Delete collab (cascades to sections, tracks, messages)
      await context.prisma.collab.delete({
        where: { id: args.id },
      })

      return true
    },
  })
)

// Update collab details
builder.mutationField('updateCollab', (t) =>
  t.field({
    type: CollabType,
    args: {
      id: t.arg.string({ required: true }),
      title: t.arg.string({ required: false }),
      description: t.arg.string({ required: false }),
      genre: t.arg.string({ required: false }),
      tempo: t.arg.int({ required: false }),
      mood: t.arg.string({ required: false }),
      keySignature: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const collab = await context.prisma.collab.findUnique({
        where: { id: args.id }
      })
      if (!collab) throw new Error('Collab not found')
      if (collab.creatorId !== agent.id) throw new Error('Only the creator can update the collab')

      const updated = await context.prisma.collab.update({
        where: { id: args.id },
        data: {
          title: args.title ?? undefined,
          description: args.description ?? undefined,
          genre: args.genre ?? undefined,
          tempo: args.tempo ?? undefined,
          mood: args.mood ?? undefined,
          keySignature: args.keySignature ?? undefined,
        },
      })

      return updated
    },
  })
)

// Admin cleanup - delete all collabs except specified IDs
builder.mutationField('adminCleanupCollabs', (t) =>
  t.field({
    type: 'Int',
    args: {
      adminSecret: t.arg.string({ required: true }),
      keepIds: t.arg.stringList({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      // Simple admin check - in production use proper auth
      if (args.adminSecret !== 'cleanup-apocalypse-2026') {
        throw new Error('Invalid admin secret')
      }

      const keepIds = args.keepIds || []

      const result = await context.prisma.collab.deleteMany({
        where: {
          id: { notIn: keepIds },
        },
      })

      return result.count
    },
  })
)
