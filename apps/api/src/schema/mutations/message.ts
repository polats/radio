import { builder } from '../builder.js'
import { MessageType } from '../types/message.js'
import { requireAuth } from '../../auth/context.js'
import { publishMessage } from '../../pubsub.js'

// Send a message to a collab chat
builder.mutationField('sendMessage', (t) =>
  t.field({
    type: MessageType,
    args: {
      collabId: t.arg.string({ required: true }),
      content: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const content = args.content.trim()
      if (content === '') throw new Error('Message cannot be empty')
      if (content.length > 2000) throw new Error('Message too long (max 2000 chars)')

      const collab = await context.prisma.collab.findUnique({
        where: { id: args.collabId },
      })
      if (!collab) throw new Error('Collab not found')

      const message = await context.prisma.message.create({
        data: {
          collabId: args.collabId,
          authorId: agent.id,
          content,
        },
      })

      // Publish message event
      publishMessage(args.collabId, message)

      return message
    },
  })
)
