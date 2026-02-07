'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Pause, Check, X, RotateCcw } from 'lucide-react'
import { NotationView } from './notation-view'

interface Track {
  id: string
  instrument: string
  description?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  durationMs?: number
  signedAudioUrl?: string
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
}

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending Review', color: 'text-yellow-400' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REVISION: { label: 'Needs Revision', color: 'text-orange-400' },
}

export function TrackDetails({ track, isCreator, onAccept, onReject, onRequestRevision }: TrackDetailsProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handlePlayPause = () => {
    if (!audioRef.current || !track?.signedAudioUrl) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
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
  const hasAudio = !!track.signedAudioUrl

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Hidden audio element */}
      {hasAudio && (
        <audio 
          ref={audioRef} 
          src={track.signedAudioUrl} 
          onEnded={() => setIsPlaying(false)}
        />
      )}
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{track.instrument}</h3>
            <p className="text-xs text-zinc-400 truncate">
              by {track.submitter.displayName || track.submitter.walletAddress.slice(0, 10)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {track.durationMs && (
              <span className="text-xs text-zinc-500">{formatDuration(durationSec)}</span>
            )}
            <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
          </div>
        </div>
      </div>
      
      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Play button */}
        <Button 
          variant={isPlaying ? "default" : "outline"} 
          size="sm" 
          className="w-full"
          onClick={handlePlayPause}
          disabled={!hasAudio}
        >
          {isPlaying ? (
            <><Pause className="w-4 h-4 mr-2" /> Playing...</>
          ) : (
            <><Play className="w-4 h-4 mr-2" /> {hasAudio ? 'Play Track' : 'No Audio'}</>
          )}
        </Button>

        {/* Description */}
        {track.description && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-1">Description</h4>
            <p className="text-sm text-zinc-300">{track.description}</p>
          </div>
        )}

        {/* Notation */}
        {track.notationAbc && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-2">Notation</h4>
            <div className="bg-zinc-800/50 rounded-lg p-3 overflow-x-auto">
              <NotationView 
                abc={track.notationAbc} 
                height={120}
                className="min-w-full"
              />
            </div>
          </div>
        )}

        {/* Creator Notes */}
        {track.creatorNotes && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 mb-1">Review Notes</h4>
            <div className="bg-zinc-800/50 rounded p-2">
              <p className="text-sm text-zinc-300 italic">"{track.creatorNotes}"</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Review Actions - for creator only */}
      {isCreator && track.status === 'PENDING' && (
        <div className="p-3 border-t border-zinc-800 flex-shrink-0">
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept?.(track.id)}
            >
              <Check className="w-4 h-4 mr-1" /> Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="px-3"
              onClick={() => onRequestRevision?.(track.id)}
              title="Request Revision"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="px-3 text-red-400 hover:text-red-300 hover:border-red-400"
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
