'use client'

import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Volume2, VolumeX, SkipBack } from 'lucide-react'
import { useAudioPlayer } from './audio-player-context'

interface TransportControlsProps {
  compact?: boolean
}

export function TransportControls({ compact = false }: TransportControlsProps) {
  const { 
    isPlaying, 
    currentTimeMs, 
    totalDurationMs, 
    volume,
    playingTrackIds,
    soloTrackId,
    play, 
    pause, 
    stop, 
    seek,
    setVolume,
    setSoloTrack,
  } = useAudioPlayer()
  
  const progress = totalDurationMs > 0 ? (currentTimeMs / totalDurationMs) * 100 : 0
  const currentTime = formatTime(currentTimeMs / 1000)
  const totalTime = formatTime(totalDurationMs / 1000)
  const isMuted = volume === 0
  const trackCount = playingTrackIds.length

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percent = x / rect.width
    seek(percent * totalDurationMs)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value) / 100)
  }

  const toggleMute = () => {
    setVolume(isMuted ? 0.8 : 0)
  }

  const handleClearSolo = () => {
    setSoloTrack(null)
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2 sm:py-3 bg-zinc-900 border-t border-zinc-800 ${compact ? 'flex-wrap' : ''}`}>
      {/* Play/Pause/Stop */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={compact ? 'w-8 h-8' : 'w-10 h-10 rounded-full'}
          onClick={() => seek(0)}
          title="Back to start"
        >
          <SkipBack className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`${compact ? 'w-8 h-8' : 'w-10 h-10 rounded-full'} ${isPlaying ? 'bg-green-600 hover:bg-green-700' : ''}`}
          onClick={isPlaying ? pause : play}
        >
          {isPlaying ? (
            <Pause className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          ) : (
            <Play className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ml-0.5`} />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? 'w-8 h-8' : 'w-8 h-8'}
          onClick={stop}
        >
          <Square className={compact ? 'w-3 h-3' : 'w-4 h-4'} />
        </Button>
      </div>

      {/* Playing info */}
      <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'}`}>
        {trackCount > 0 && (
          <span className="text-green-400">
            🎵 {trackCount} track{trackCount !== 1 ? 's' : ''}
          </span>
        )}
        {soloTrackId && (
          <button 
            onClick={handleClearSolo}
            className="text-yellow-400 hover:text-yellow-300 text-xs"
          >
            [Solo] ✕
          </button>
        )}
      </div>

      {/* Time display */}
      <div className={`font-mono text-zinc-400 ${compact ? 'text-xs w-20' : 'text-sm w-24'}`}>
        {currentTime} / {totalTime}
      </div>

      {/* Progress bar */}
      <div 
        className="flex-1 h-2 bg-zinc-800 rounded-full cursor-pointer group min-w-[100px]"
        onClick={handleProgressClick}
      >
        <div 
          className={`h-full rounded-full relative transition-all ${
            isPlaying ? 'bg-green-500' : 'bg-white'
          } group-hover:bg-green-400`}
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
        </div>
      </div>

      {/* Volume - hide on mobile */}
      <div className="hidden sm:flex items-center gap-2 w-28">
        <button onClick={toggleMute} className="text-zinc-400 hover:text-white">
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={volume * 100}
          onChange={handleVolumeChange}
          className="flex-1 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
        />
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
