'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Check, X, RotateCcw, Music } from 'lucide-react'
import { NotationView, NotationViewHandle } from './notation-view'
import { usePatternPlayer } from '../audio/use-pattern-player'
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
  tempo?: number
  onAccept?: (trackId: string) => void
  onReject?: (trackId: string) => void
  onRequestRevision?: (trackId: string) => void
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REVISION: { label: 'Revision', color: 'text-orange-400' },
}

export function TrackDetails({ track, isCreator, tempo = 120, onAccept, onReject, onRequestRevision }: TrackDetailsProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const notationRef = useRef<NotationViewHandle>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const patternPlayer = usePatternPlayer()
  
  // Get timeline state for syncing notation
  const { currentTimeMs, isPlaying: timelinePlaying, playingTrackIds } = useAudioPlayer()
  
  const hasPattern = !!track?.patternData
  const hasAudio = !!track?.signedAudioUrl
  const canPlay = hasPattern || hasAudio
  const isPlaying = hasPattern ? patternPlayer.isPlaying : isPlayingAudio

  // Calculate current beat position relative to this track (synced with timeline)
  const trackStartMs = track?.startTimeMs || 0
  const trackDurationMs = track?.durationMs || 8000
  const msPerBeat = 60000 / tempo
  const timeIntoTrack = currentTimeMs - trackStartMs
  const isTrackInRange = timeIntoTrack >= 0 && timeIntoTrack < trackDurationMs
  const currentBeat = isTrackInRange ? timeIntoTrack / msPerBeat : 0
  
  // Track is playing if timeline is playing and we're in this track's time range
  const isTrackPlayingOnTimeline = timelinePlaying && isTrackInRange

  const handlePlayPause = async () => {
    if (!track) return
    
    if (hasPattern && track.patternData) {
      // Use pattern synth
      await patternPlayer.toggle(track.patternData as PatternData, true)
    } else if (hasAudio && audioRef.current) {
      // Use audio element
      if (isPlayingAudio) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlayingAudio(!isPlayingAudio)
    }
  }

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
      {/* Hidden audio element for non-pattern tracks */}
      {hasAudio && !hasPattern && (
        <audio 
          ref={audioRef} 
          src={track.signedAudioUrl} 
          onEnded={() => setIsPlayingAudio(false)}
        />
      )}
      
      {/* NOTATION SECTION - Top, no title, highlighted playback */}
      {track.notationAbc && (
        <div className="flex-shrink-0 border-b border-zinc-800">
          {/* Play controls inline with notation */}
          <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800/30">
            <Button 
              variant={isPlaying ? "default" : "ghost"} 
              size="sm" 
              className="h-7 w-7 p-0"
              onClick={handlePlayPause}
              disabled={!canPlay}
            >
              {patternPlayer.isLoading ? (
                <Music className="w-4 h-4 animate-pulse" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
            <span className="text-xs text-zinc-400">
              {isPlaying ? 'Playing...' : hasPattern ? 'Pattern' : 'Audio'}
            </span>
            {hasPattern && (
              <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                <Music className="w-3 h-3" /> Synth
              </span>
            )}
          </div>
          {/* Notation display - syncs with timeline */}
          <div className="overflow-x-auto bg-zinc-900/80 px-2">
            <NotationView 
              ref={notationRef}
              abc={track.notationAbc} 
              height={90}
              className="min-w-full"
              isPlaying={isPlaying || isTrackPlayingOnTimeline}
              currentBeat={currentBeat}
            />
          </div>
        </div>
      )}
      
      {/* If no notation but has pattern, show compact play button */}
      {!track.notationAbc && canPlay && (
        <div className="flex-shrink-0 px-3 py-2 border-b border-zinc-800">
          <Button 
            variant={isPlaying ? "default" : "outline"} 
            size="sm" 
            className="w-full h-8"
            onClick={handlePlayPause}
            disabled={!canPlay}
          >
            {patternPlayer.isLoading ? (
              <><Music className="w-4 h-4 mr-2 animate-pulse" /> Loading...</>
            ) : isPlaying ? (
              <><Pause className="w-4 h-4 mr-2" /> Playing...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> {hasPattern ? 'Play Pattern' : 'Play Track'}</>
            )}
          </Button>
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
