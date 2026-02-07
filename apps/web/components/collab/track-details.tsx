'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, RotateCcw } from 'lucide-react'
import { NotationView } from './notation-view'
import { useAudioPlayer } from './audio-player-context'
import type { PatternData } from '@radio/shared'

interface Track {
  id: string
  instrument: string
  description?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  startTimeMs?: number
  durationMs?: number
  signedAudioUrl?: string
  patternData?: PatternData
  creatorNotes?: string
  notationAbc?: string
  waveformData?: number[]
  submitter: {
    id: string
    displayName?: string
    walletAddress: string
    avatarUrl?: string
  }
}

interface TrackDetailsProps {
  track: Track | null
  isCreator: boolean
  onAccept?: (trackId: string) => void
  onReject?: (trackId: string) => void
  onRequestRevision?: (trackId: string) => void
  tempo?: number
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REVISION: { label: 'Revision', color: 'text-orange-400' },
}

export function TrackDetails({ track, isCreator, onAccept, onReject, onRequestRevision, tempo = 120 }: TrackDetailsProps) {
  const { currentTimeMs, isPlaying, playingTrackIds } = useAudioPlayer()
  
  // Calculate current beat position relative to this track
  const trackStartMs = track?.startTimeMs || 0
  const trackDurationMs = track?.durationMs || 16000 // default 16 beats at 120bpm
  const msPerBeat = 60000 / tempo
  const totalBeats = trackDurationMs / msPerBeat
  
  // Calculate how far into this track we are (in beats)
  const timeIntoTrack = currentTimeMs - trackStartMs
  const isTrackPlaying = isPlaying && timeIntoTrack >= 0 && timeIntoTrack < trackDurationMs
  const currentBeat = isTrackPlaying ? timeIntoTrack / msPerBeat : 0
  
  // Also check if this track is in the playingTrackIds list
  const isTrackActive = track ? playingTrackIds.includes(track.id) : false

  if (!track) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm bg-zinc-900/50 rounded-lg border border-zinc-800 p-4">
        <p>Select a track to view details</p>
      </div>
    )
  }

  const status = statusLabels[track.status]
  const durationSec = track.durationMs ? track.durationMs / 1000 : 0

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
      {/* NOTATION SECTION - Top, no title, synced with timeline */}
      {track.notationAbc && (
        <div className="flex-shrink-0 border-b border-zinc-800">
          {/* Notation display - no play button, syncs with timeline */}
          <div className="overflow-x-auto bg-zinc-900/80 px-2 py-1">
            <NotationView 
              abc={track.notationAbc} 
              height={80}
              className="min-w-full"
              isPlaying={isTrackPlaying || isTrackActive}
              currentBeat={currentBeat}
              bpm={tempo}
              totalBeats={totalBeats}
            />
          </div>
        </div>
      )}
      
      {/* DETAILS SECTION - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Header info */}
        <div className="px-3 py-2 border-b border-zinc-800/50 bg-zinc-800/20">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm truncate">{track.instrument}</h3>
              <p className="text-xs text-zinc-500 truncate">
                by {track.submitter.displayName || track.submitter.walletAddress.slice(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {track.durationMs && (
                <span className="text-xs text-zinc-500">{formatDuration(durationSec)}</span>
              )}
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${status.color} bg-zinc-800`}>
                {status.label}
              </span>
            </div>
          </div>
        </div>
        
        {/* Additional details */}
        <div className="p-3 space-y-3">
          {/* Description */}
          {track.description && (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Description</h4>
              <p className="text-sm text-zinc-300">{track.description}</p>
            </div>
          )}

          {/* Creator Notes */}
          {track.creatorNotes && (
            <div>
              <h4 className="text-xs font-medium text-zinc-500 mb-1">Review Notes</h4>
              <div className="bg-zinc-800/50 rounded px-2 py-1.5">
                <p className="text-sm text-zinc-300 italic">"{track.creatorNotes}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Review Actions - for creator only */}
      {isCreator && track.status === 'PENDING' && (
        <div className="p-2 border-t border-zinc-800 flex-shrink-0">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 h-8 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept?.(track.id)}
            >
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 px-2"
              onClick={() => onRequestRevision?.(track.id)}
              title="Request Revision"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 px-2 text-red-400 hover:text-red-300 hover:border-red-400"
              onClick={() => onReject?.(track.id)}
              title="Reject"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
