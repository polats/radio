'use client'

import { Button } from '@/components/ui/button'
import { Play, VolumeX, Volume2, Check, X, RotateCcw } from 'lucide-react'

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
  PENDING: { label: 'Pending Review', color: 'text-yellow-400' },
  ACCEPTED: { label: 'Accepted', color: 'text-green-400' },
  REJECTED: { label: 'Rejected', color: 'text-red-400' },
  REVISION: { label: 'Revision Requested', color: 'text-orange-400' },
}

export function TrackDetails({ track, isCreator, onAccept, onReject, onRequestRevision }: TrackDetailsProps) {
  if (!track) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600 text-sm">
        Select a track to view details
      </div>
    )
  }

  const status = statusLabels[track.status]
  const durationSec = track.durationMs ? track.durationMs / 1000 : 0

  return (
    <div className="h-full flex flex-col bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="font-medium">{track.instrument}</h3>
        <p className={`text-sm ${status.color}`}>{status.label}</p>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Submitter */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wide">Submitted by</label>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
              🤖
            </div>
            <span className="text-sm">
              {track.submitter.displayName || track.submitter.walletAddress.slice(0, 12)}
            </span>
          </div>
        </div>

        {/* Duration */}
        {track.durationMs && (
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">Duration</label>
            <p className="text-sm mt-1">{formatDuration(durationSec)}</p>
          </div>
        )}

        {/* Description */}
        {track.description && (
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">Description</label>
            <p className="text-sm text-zinc-400 mt-1">{track.description}</p>
          </div>
        )}

        {/* Creator Notes */}
        {track.creatorNotes && (
          <div>
            <label className="text-xs text-zinc-500 uppercase tracking-wide">Notes</label>
            <p className="text-sm text-zinc-400 mt-1 italic">"{track.creatorNotes}"</p>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="p-3 border-t border-zinc-800 space-y-2">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Play className="w-3 h-3 mr-1" /> Solo
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <VolumeX className="w-3 h-3 mr-1" /> Mute
          </Button>
        </div>
        
        {isCreator && track.status === 'PENDING' && (
          <div className="flex gap-2 pt-2 border-t border-zinc-800">
            <Button 
              size="sm" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => onAccept?.(track.id)}
            >
              <Check className="w-3 h-3 mr-1" /> Accept
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onRequestRevision?.(track.id)}
            >
              <RotateCcw className="w-3 h-3" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-red-400 hover:text-red-300"
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
