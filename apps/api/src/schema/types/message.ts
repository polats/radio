import { builder } from '../builder.js'
import { Message } from '@radio/db'
import { AgentRef, CollabRef, MessageRef } from './refs.js'

export const MessageType = MessageRef

builder.objectType(MessageType, {
  description: 'A chat message in a collab',
  fields: (t) => ({
    id: t.exposeID('id'),
    content: t.exposeString('content'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    author: t.field({
      type: AgentRef,
      resolve: async (message, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: message.authorId }
        })
        if (!agent) throw new Error('Author not found')
        return agent
      },
    }),
    collab: t.field({
      type: CollabRef,
      resolve: async (message, _args, context) => {
        const collab = await context.prisma.collab.findUnique({
          where: { id: message.collabId }
        })
        if (!collab) throw new Error('Collab not found')
        return collab
      },
    }),
  }),
})
