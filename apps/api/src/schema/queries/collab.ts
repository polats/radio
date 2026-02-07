import { builder } from '../builder.js'
import { CollabType, CollabStatus } from '../types/collab.js'

// Get a single collab by ID
builder.queryField('collab', (t) =>
  t.field({
    type: CollabType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { id }, context) => {
      return context.prisma.collab.findUnique({
        where: { id },
      })
    },
  })
)

// Get open collabs with pagination and filters
builder.queryField('openCollabs', (t) =>
  t.field({
    type: [CollabType],
    args: {
      genre: t.arg.string({ required: false }),
      mood: t.arg.string({ required: false }),
      limit: t.arg.int({ required: false, defaultValue: 20 }),
      cursor: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const where: any = {
        status: 'OPEN',
      }
      
      if (args.genre) where.genre = args.genre
      if (args.mood) where.mood = args.mood
      
      return context.prisma.collab.findMany({
        where,
        take: args.limit ?? 20,
        cursor: args.cursor ? { id: args.cursor } : undefined,
        skip: args.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

// Get collabs by creator
builder.queryField('myCollabs', (t) =>
  t.field({
    type: [CollabType],
    args: {
      status: t.arg({ type: CollabStatus, required: false }),
      limit: t.arg.int({ required: false, defaultValue: 20 }),
    },
    resolve: async (_parent, args, context) => {
      if (!context.currentAgent) return []
      
      const where: any = {
        creatorId: context.currentAgent.id,
      }
      
      if (args.status) where.status = args.status
      
      return context.prisma.collab.findMany({
        where,
        take: args.limit ?? 20,
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)
