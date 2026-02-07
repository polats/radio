import { builder } from '../builder.js'
import { TrackType, TrackStatus } from '../types/track.js'
import { requireAuth } from '../../auth/context.js'
import { saveTrackFile, validateAudioFile, deleteTrackFile } from '../../audio/storage.js'
import { generateWaveformPeaks, probeAudioFile } from '../../audio/waveform.js'
import { TrackStatus as PrismaTrackStatus } from '@radio/db'

// Submit a track to a section
builder.mutationField('submitTrack', (t) =>
  t.field({
    type: TrackType,
    args: {
      sectionId: t.arg.string({ required: true }),
      instrument: t.arg.string({ required: true }),
      description: t.arg.string({ required: false }),
      // For now, accept base64 encoded audio - file upload will be added later
      audioBase64: t.arg.string({ required: true }),
      audioFilename: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)
      
      // Verify section exists
      const section = await context.prisma.section.findUnique({
        where: { id: args.sectionId },
        include: { collab: true },
      })
      if (!section) throw new Error('Section not found')
      if (section.collab.status !== 'OPEN' && section.collab.status !== 'IN_PROGRESS') {
        throw new Error('Collab is not accepting submissions')
      }
      
      // Decode and validate audio
      const audioBuffer = Buffer.from(args.audioBase64, 'base64')
      const validation = validateAudioFile(args.audioFilename, audioBuffer.length)
      if (!validation.valid) {
        throw new Error(validation.error)
      }
      
      // Create track record first to get ID
      const track = await context.prisma.track.create({
        data: {
          sectionId: args.sectionId,
          submitterId: agent.id,
          instrument: args.instrument,
          description: args.description,
          audioFileUrl: '', // Will update after save
          status: 'PENDING',
        },
      })
      
      try {
        // Save audio file
        const audioFileUrl = await saveTrackFile(track.id, audioBuffer, args.audioFilename)
        
        // Generate waveform
        const waveformData = await generateWaveformPeaks(audioBuffer)
        
        // Probe for metadata
        const metadata = await probeAudioFile(audioFileUrl) || { durationMs: null, sampleRate: null }
        
        // Update track with file info
        const updatedTrack = await context.prisma.track.update({
          where: { id: track.id },
          data: {
            audioFileUrl,
            waveformData,
            durationMs: metadata.durationMs,
            sampleRate: metadata.sampleRate,
          },
        })
        
        // Update collab status to IN_PROGRESS if it was OPEN
        if (section.collab.status === 'OPEN') {
          await context.prisma.collab.update({
            where: { id: section.collab.id },
            data: { status: 'IN_PROGRESS' },
          })
        }
        
        return updatedTrack
      } catch (error) {
        // Clean up on failure
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
      
      // Get track with section and collab
      const track = await context.prisma.track.findUnique({
        where: { id: args.id },
        include: {
          section: {
            include: { collab: true },
          },
        },
      })
      if (!track) throw new Error('Track not found')
      
      // Only collab creator can review
      if (track.section.collab.creatorId !== agent.id) {
        throw new Error('Only the collab creator can review tracks')
      }
      
      // Validate status transition
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
      
      // Delete file
      await deleteTrackFile(track.audioFileUrl)
      
      // Delete record
      await context.prisma.track.delete({
        where: { id: args.id },
      })
      
      return true
    },
  })
)
