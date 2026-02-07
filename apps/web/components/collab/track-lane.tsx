'use client'

import { Play, Pause, Volume2, VolumeX } from 'lucide-react'
import { Waveform } from './waveform'
import { useAudioPlayer } from './audio-player-context'

interface Track {
  id: string
  instrument: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  startTimeMs: number
  durationMs: number
  waveformData?: number[]
  signedAudioUrl?: string
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
  labelWidth = 140,
  statusWidth = 40,
}: TrackLaneProps) {
  const { 
    playingTrackIds, 
    mutedTrackIds, 
    soloTrackId,
    playTrackSolo, 
    toggleMuteTrack,
    isPlaying: timelinePlaying,
  } = useAudioPlayer()
  
  const left = (track.startTimeMs / 1000) * pixelsPerSecond
  const width = (track.durationMs / 1000) * pixelsPerSecond
  const height = compact ? 48 : 56
  const waveformHeight = compact ? 36 : 44
  
  const isThisPlaying = playingTrackIds.includes(track.id)
  const isMuted = mutedTrackIds.includes(track.id)
  const isSoloed = soloTrackId === track.id
  const hasAudio = !!track.signedAudioUrl

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!hasAudio) return
    playTrackSolo(track)
  }

  const handleMuteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleMuteTrack(track.id)
  }

  return (
    <div 
      className={`flex items-center border-b border-zinc-800 cursor-pointer transition-colors ${
        isSelected ? 'bg-zinc-800/50' : 'hover:bg-zinc-900/50'
      } ${isThisPlaying ? 'ring-1 ring-inset ring-green-500/50' : ''}`}
      style={{ height }}
      onClick={onSelect}
    >
      {/* Track label */}
      <div 
        className="flex-shrink-0 px-2 sm:px-3 flex items-center gap-1 sm:gap-2 border-r border-zinc-800 overflow-hidden"
        style={{ width: labelWidth }}
      >
        {/* Play button */}
        <button
          onClick={handlePlayClick}
          disabled={!hasAudio}
          className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-colors ${
            hasAudio 
              ? isThisPlaying 
                ? 'bg-green-500 text-white' 
                : isSoloed
                  ? 'bg-green-700 text-white'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-white'
              : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
          }`}
          title={isThisPlaying ? 'Playing' : 'Solo this track'}
        >
          {isThisPlaying && timelinePlaying ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3 ml-0.5" />
          )}
        </button>
        
        {/* Mute button */}
        <button
          onClick={handleMuteClick}
          disabled={!hasAudio}
          className={`flex-shrink-0 w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-colors ${
            hasAudio 
              ? isMuted
                ? 'bg-red-600 text-white'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              : 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-3 h-3" />
          ) : (
            <Volume2 className="w-3 h-3" />
          )}
        </button>
        
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
          className={`absolute top-1 bottom-1 rounded transition-colors ${
            isThisPlaying 
              ? 'bg-green-900/40' 
              : isMuted 
                ? 'bg-zinc-900/50' 
                : 'bg-zinc-800/50'
          }`}
          style={{ left, width: Math.max(width, 20) }}
        >
          <Waveform 
            data={track.waveformData} 
            width={Math.max(width - 8, 20)} 
            height={waveformHeight}
            color={isMuted ? '#52525b' : isThisPlaying ? '#22c55e' : waveformColors[track.status]}
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
