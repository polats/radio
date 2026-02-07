import { builder } from '../builder.js'
import { MessageType } from '../types/message.js'

// Get messages for a collab with pagination
builder.queryField('messages', (t) =>
  t.field({
    type: [MessageType],
    args: {
      collabId: t.arg.string({ required: true }),
      limit: t.arg.int({ required: false, defaultValue: 50 }),
      cursor: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      return context.prisma.message.findMany({
        where: { collabId: args.collabId },
        take: args.limit ?? 50,
        cursor: args.cursor ? { id: args.cursor } : undefined,
        skip: args.cursor ? 1 : 0,
        orderBy: { createdAt: 'desc' },
      })
    },
  })
)
