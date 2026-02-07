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
  compact?: boolean
  labelWidth?: number
  statusWidth?: number
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

export function TrackLane({ 
  track, 
  pixelsPerSecond, 
  isSelected, 
  onSelect,
  compact = false,
  labelWidth = 128,
  statusWidth = 40,
}: TrackLaneProps) {
  const left = (track.startTimeMs / 1000) * pixelsPerSecond
  const width = (track.durationMs / 1000) * pixelsPerSecond
  const height = compact ? 48 : 56
  const waveformHeight = compact ? 36 : 44

  return (
    <div 
      className={`flex items-center border-b border-zinc-800 cursor-pointer transition-colors ${
        isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/50'
      }`}
      style={{ height }}
      onClick={onSelect}
    >
      {/* Track label */}
      <div 
        className="flex-shrink-0 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 border-r border-zinc-800 overflow-hidden"
        style={{ width: labelWidth }}
      >
        <span className={compact ? 'text-sm' : 'text-lg'}>🎵</span>
        <div className="min-w-0 flex-1">
          <div className={`font-medium truncate ${compact ? 'text-xs' : 'text-sm'}`}>
            {track.instrument}
          </div>
          <div className={`text-zinc-500 truncate ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
            {track.submitter.displayName || track.submitter.walletAddress.slice(0, 6)}
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
            height={waveformHeight}
            color={waveformColors[track.status]}
            className="mx-1"
          />
        </div>
      </div>
      
      {/* Status */}
      <div 
        className={`flex-shrink-0 text-center ${statusColors[track.status]} ${compact ? 'text-sm' : ''}`}
        style={{ width: statusWidth }}
      >
        {statusIcons[track.status]}
      </div>
    </div>
  )
}
