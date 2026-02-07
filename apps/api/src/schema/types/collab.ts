import { builder } from '../builder.js'
import { Collab, Section, CollabStatus as PrismaCollabStatus } from '@radio/db'
import { AgentType } from './agent.js'

// CollabStatus enum
export const CollabStatus = builder.enumType('CollabStatus', {
  values: ['OPEN', 'IN_PROGRESS', 'MIXING', 'COMPLETED', 'ABANDONED'] as const,
  description: 'Status of a collaboration',
})

// Forward declare TrackType for circular reference
const TrackTypeRef = builder.objectRef<any>('Track')

// Section type
export const SectionType = builder.objectRef<Section>('Section')

builder.objectType(SectionType, {
  description: 'A section within a collab (e.g., intro, verse, chorus)',
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    orderIndex: t.exposeInt('orderIndex'),
    startBeat: t.exposeInt('startBeat'),
    durationBeats: t.exposeInt('durationBeats'),
    description: t.exposeString('description', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    collab: t.field({
      type: CollabType,
      resolve: async (section, _args, context) => {
        const collab = await context.prisma.collab.findUnique({
          where: { id: section.collabId }
        })
        if (!collab) throw new Error('Collab not found')
        return collab
      },
    }),
    tracks: t.field({
      type: [TrackTypeRef],
      resolve: async (section, _args, context) => {
        return context.prisma.track.findMany({
          where: { sectionId: section.id },
          orderBy: { createdAt: 'desc' },
        })
      },
    }),
    acceptedTracks: t.field({
      type: [TrackTypeRef],
      resolve: async (section, _args, context) => {
        return context.prisma.track.findMany({
          where: { sectionId: section.id, status: 'ACCEPTED' },
          orderBy: { createdAt: 'asc' },
        })
      },
    }),
  }),
})

// Collab type
export const CollabType = builder.objectRef<Collab>('Collab')

builder.objectType(CollabType, {
  description: 'A music collaboration project',
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    genre: t.exposeString('genre', { nullable: true }),
    tempo: t.exposeInt('tempo', { nullable: true }),
    mood: t.exposeString('mood', { nullable: true }),
    keySignature: t.exposeString('keySignature', { nullable: true }),
    status: t.expose('status', { type: CollabStatus }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    creator: t.field({
      type: AgentType,
      resolve: async (collab, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: collab.creatorId }
        })
        if (!agent) throw new Error('Creator not found')
        return agent
      },
    }),
    sections: t.field({
      type: [SectionType],
      resolve: async (collab, _args, context) => {
        return context.prisma.section.findMany({
          where: { collabId: collab.id },
          orderBy: { orderIndex: 'asc' },
        })
      },
    }),
    totalTracks: t.int({
      resolve: async (collab, _args, context) => {
        return context.prisma.track.count({
          where: { section: { collabId: collab.id } },
        })
      },
    }),
    acceptedTracks: t.int({
      resolve: async (collab, _args, context) => {
        return context.prisma.track.count({
          where: { 
            section: { collabId: collab.id },
            status: 'ACCEPTED',
          },
        })
      },
    }),
  }),
})

// Section input for creating collabs with initial sections
export const SectionInput = builder.inputType('SectionInput', {
  fields: (t) => ({
    name: t.string({ required: true }),
    orderIndex: t.int({ required: true }),
    startBeat: t.int({ required: false, defaultValue: 0 }),
    durationBeats: t.int({ required: true }),
    description: t.string({ required: false }),
  }),
})
