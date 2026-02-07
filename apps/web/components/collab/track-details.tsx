'use client'

import { Button } from '@/components/ui/button'
import { Play, VolumeX, Check, X, RotateCcw } from 'lucide-react'

interface Track {
  id: string
  instrument: string
  description?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  durationMs?: number
  creatorNotes?: string
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
  PENDING: { label: 'Pending', color: 'text-yellow-400' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REVISION: { label: 'Revision', color: 'text-orange-400' },
}

export function TrackDetails({ track, isCreator, onAccept, onReject, onRequestRevision }: TrackDetailsProps) {
  if (!track) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 text-sm bg-zinc-900/50 rounded-lg border border-zinc-800">
        Select a track to view details
      </div>
    )
  }

  const status = statusLabels[track.status]
  const durationSec = track.durationMs ? track.durationMs / 1000 : 0

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800 overflow-hidden">
      <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm truncate">{track.instrument}</h3>
          <span className={`text-xs ${status.color}`}>{status.label}</span>
        </div>
        <p className="text-xs text-zinc-500 truncate mt-0.5">
          by {track.submitter.displayName || track.submitter.walletAddress.slice(0, 10)}
        </p>
      </div>
      
      <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-0">
        {/* Duration */}
        {track.durationMs && (
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Duration</span>
            <span>{formatDuration(durationSec)}</span>
          </div>
        )}

        {/* Description */}
        {track.description && (
          <div>
            <p className="text-xs text-zinc-400 line-clamp-2">{track.description}</p>
          </div>
        )}

        {/* Creator Notes */}
        {track.creatorNotes && (
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-400 italic line-clamp-2">"{track.creatorNotes}"</p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-2 border-t border-zinc-800 space-y-2 flex-shrink-0">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
            <Play className="w-3 h-3 mr-1" /> Solo
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs h-8">
            <VolumeX className="w-3 h-3 mr-1" /> Mute
          </Button>
        </div>
        
        {isCreator && track.status === 'PENDING' && (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-8"
              onClick={() => onAccept?.(track.id)}
            >
              <Check className="w-3 h-3 mr-1" /> Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => onRequestRevision?.(track.id)}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-400 hover:text-red-300"
              onClick={() => onReject?.(track.id)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
