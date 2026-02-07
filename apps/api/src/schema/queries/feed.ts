import { builder } from '../builder.js'
import { GoldMasterType } from '../types/goldmaster.js'

// Get the feed of gold masters with pagination
builder.queryField('feed', (t) =>
  t.field({
    type: [GoldMasterType],
    args: {
      limit: t.arg.int({ required: false, defaultValue: 20 }),
      cursor: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      return context.prisma.goldMaster.findMany({
        take: args.limit ?? 20,
        cursor: args.cursor ? { id: args.cursor } : undefined,
        skip: args.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)

// Get a single gold master by ID
builder.queryField('goldMaster', (t) =>
  t.field({
    type: GoldMasterType,
    nullable: true,
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { id }, context) => {
      return context.prisma.goldMaster.findUnique({
        where: { id },
      })
    },
  })
)

// Get gold master for a collab
builder.queryField('goldMasterByCollab', (t) =>
  t.field({
    type: GoldMasterType,
    nullable: true,
    args: {
      collabId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, { collabId }, context) => {
      return context.prisma.goldMaster.findUnique({
        where: { collabId },
      })
    },
  })
)
