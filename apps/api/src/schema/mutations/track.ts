import { builder } from '../builder.js'
import { TrackType, TrackStatus } from '../types/track.js'
import { requireAuth } from '../../auth/context.js'
import { saveTrackFile, validateAudioFile, deleteTrackFile } from '../../audio/storage.js'
import { generateWaveformPeaks, probeBuffer } from '../../audio/waveform.js'
import { publishCollabEvent } from '../../pubsub.js'
import { TrackStatus as PrismaTrackStatus } from '@radio/db'

// Submit a track to a section
builder.mutationField('submitTrack', (t) =>
  t.field({
    type: TrackType,
    args: {
      sectionId: t.arg.string({ required: true }),
      instrument: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      audioBase64: t.arg.string({ required: true }),
      audioFilename: t.arg.string({ required: true }),
      notationAbc: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const section = await context.prisma.section.findUnique({
        where: { id: args.sectionId },
        include: { collab: true },
      })
      if (!section) throw new Error('Section not found')
      if (section.collab.status !== 'OPEN' && section.collab.status !== 'IN_PROGRESS') {
        throw new Error('Collab is not accepting submissions')
      }
      
      const audioBuffer = Buffer.from(args.audioBase64, 'base64')
      const validation = validateAudioFile(args.audioFilename, audioBuffer.length)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      const track = await context.prisma.track.create({
        data: {
          sectionId: args.sectionId,
          submitterId: agent.id,
          instrument: args.instrument,
          description: args.description,
          notationAbc: args.notationAbc,
          audioFileUrl: '',
          status: 'PENDING',
        },
      })
      
      try {
        const audioFileUrl = await saveTrackFile(track.id, audioBuffer, args.audioFilename)
        const waveformData = await generateWaveformPeaks(audioBuffer)
        const metadata = await probeBuffer(audioBuffer) || { durationMs: null, sampleRate: null }
        
        const updatedTrack = await context.prisma.track.update({
          where: { id: track.id },
          data: {
            audioFileUrl,
            waveformData,
            durationMs: metadata.durationMs,
            sampleRate: metadata.sampleRate,
          },
        })
        
        if (section.collab.status === 'OPEN') {
          const updatedCollab = await context.prisma.collab.update({
            where: { id: section.collab.id },
            data: { status: 'IN_PROGRESS' },
          })
          publishCollabEvent(section.collab.id, { type: 'STATUS_CHANGED', collab: updatedCollab })
        }
        
        // Publish track submitted event
        publishCollabEvent(section.collab.id, { type: 'TRACK_SUBMITTED', track: updatedTrack })
        
        return updatedTrack
      } catch (error) {
        await context.prisma.track.delete({ where: { id: track.id } })
        throw error
      }
    },
  })
)

// Review a track (accept/reject)
builder.mutationField('reviewTrack', (t) =>
  t.field({
    type: TrackType,
    args: {
      id: t.arg.string({ required: true }),
      status: t.arg({ type: TrackStatus, required: true }),
      notes: t.arg.string({ required: false }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const track = await context.prisma.track.findUnique({
        where: { id: args.id },
        include: {
          section: {
            include: { collab: true },
          },
        },
      })
      if (!track) throw new Error('Track not found')
      
      if (track.section.collab.creatorId !== agent.id) {
        throw new Error('Only the collab creator can review tracks')
      }
      
      if (args.status === 'PENDING') {
        throw new Error('Cannot set status back to PENDING')
      }
      
      const updated = await context.prisma.track.update({
        where: { id: args.id },
        data: {
          status: args.status as PrismaTrackStatus,
          creatorNotes: args.notes,
        },
      })
      
      // Publish track reviewed event
      publishCollabEvent(track.section.collab.id, { type: 'TRACK_REVIEWED', track: updated })
      
      return updated
    },
  })
)

// Delete a track (submitter only, while pending)
builder.mutationField('deleteTrack', (t) =>
  t.field({
    type: 'Boolean',
    args: {
      id: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      const track = await context.prisma.track.findUnique({
        where: { id: args.id },
      })
      if (!track) throw new Error('Track not found')
      if (track.submitterId !== agent.id) throw new Error('Only the submitter can delete their track')
      if (track.status !== 'PENDING') throw new Error('Can only delete pending tracks')
      
      await deleteTrackFile(track.audioFileUrl)
      await context.prisma.track.delete({
        where: { id: args.id },
      })
      
      return true
    },
  })
)
