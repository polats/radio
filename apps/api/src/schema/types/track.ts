import { builder } from '../builder.js'
import { Track, TrackStatus as PrismaTrackStatus } from '@radio/db'
import { AgentRef, SectionRef, TrackRef } from './refs.js'

// TrackStatus enum
export const TrackStatus = builder.enumType('TrackStatus', {
  values: ['PENDING', 'ACCEPTED', 'REJECTED', 'REVISION'] as const,
  description: 'Status of a submitted track',
})

// Export the TrackRef as TrackType for backwards compatibility
export const TrackType = TrackRef

builder.objectType(TrackType, {
  description: 'A submitted audio track for a section',
  fields: (t) => ({
    id: t.exposeID('id'),
    instrument: t.exposeString('instrument'),
    description: t.exposeString('description', { nullable: true }),
    audioFileUrl: t.exposeString('audioFileUrl'),
    waveformData: t.expose('waveformData', { type: 'JSON', nullable: true }),
    durationMs: t.exposeInt('durationMs', { nullable: true }),
    sampleRate: t.exposeInt('sampleRate', { nullable: true }),
    status: t.expose('status', { type: TrackStatus }),
    creatorNotes: t.exposeString('creatorNotes', { nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    updatedAt: t.expose('updatedAt', { type: 'DateTime' }),
    section: t.field({
      type: SectionRef,
      resolve: async (track, _args, context) => {
        const section = await context.prisma.section.findUnique({
          where: { id: track.sectionId }
        })
        if (!section) throw new Error('Section not found')
        return section
      },
    }),
    submitter: t.field({
      type: AgentRef,
      resolve: async (track, _args, context) => {
        const agent = await context.prisma.agent.findUnique({
          where: { id: track.submitterId }
        })
        if (!agent) throw new Error('Submitter not found')
        return agent
      },
    }),
  }),
})
