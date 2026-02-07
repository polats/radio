'use client'

import { Waveform } from './waveform'

interface Track {
  id: string
  instrument: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  startTimeMs: number
  durationMs: number
  waveformData?: number[]
  submitter: {
    displayName?: string
    walletAddress: string
  }
}

interface TrackLaneProps {
  track: Track
  pixelsPerSecond: number
  isSelected: boolean
  onSelect: () => void
}

const statusIcons: Record<string, string> = {
  PENDING: '⏳',
  ACCEPTED: '✓',
  REJECTED: '✗',
  REVISION: '↻',
}

const statusColors: Record<string, string> = {
  PENDING: 'text-yellow-400',
  ACCEPTED: 'text-green-400',
  REJECTED: 'text-red-400',
  REVISION: 'text-orange-400',
}

const waveformColors: Record<string, string> = {
  PENDING: '#eab308',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  REVISION: '#f97316',
}

export function TrackLane({ track, pixelsPerSecond, isSelected, onSelect }: TrackLaneProps) {
  const left = (track.startTimeMs / 1000) * pixelsPerSecond
  const width = (track.durationMs / 1000) * pixelsPerSecond

  return (
    <div 
      className={`h-14 flex items-center border-b border-zinc-800 cursor-pointer transition-colors ${
        isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/50'
      }`}
      onClick={onSelect}
    >
      {/* Track label */}
      <div className="w-32 flex-shrink-0 px-3 flex items-center gap-2 border-r border-zinc-800">
        <span className="text-lg">🎵</span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{track.instrument}</div>
          <div className="text-[10px] text-zinc-500 truncate">
            {track.submitter.displayName || track.submitter.walletAddress.slice(0, 8)}
          </div>
        </div>
      </div>
      
      {/* Waveform area */}
      <div className="flex-1 relative h-full">
        <div
          className="absolute top-1 bottom-1 rounded bg-zinc-800/50"
          style={{ left, width: Math.max(width, 20) }}
        >
          <Waveform 
            data={track.waveformData} 
            width={Math.max(width - 8, 20)} 
            height={44}
            color={waveformColors[track.status]}
            className="mx-1"
          />
        </div>
      </div>
      
      {/* Status */}
      <div className={`w-10 flex-shrink-0 text-center ${statusColors[track.status]}`}>
        {statusIcons[track.status]}
      </div>
    </div>
  )
}
