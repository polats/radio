'use client'

import { useEffect, useRef, useState } from 'react'
import { TimelineRuler } from './timeline-ruler'
import { SectionMarkers } from './section-markers'
import { TrackLane } from './track-lane'
import { TransportControls } from './transport-controls'
import { useAudioPlayer } from './audio-player-context'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface Section {
  id: string
  name: string
  startTimeMs: number
  endTimeMs: number
  color?: string
}

interface TimelineProps {
  tracks: Track[]
  sections: Section[]
  durationMs: number
  selectedTrackId: string | null
  onSelectTrack: (trackId: string) => void
  onAddTrack?: () => void
}

// Responsive pixels per second
const PIXELS_PER_SECOND_DESKTOP = 50
const PIXELS_PER_SECOND_MOBILE = 30

export function Timeline({ 
  tracks, 
  sections, 
  durationMs, 
  selectedTrackId, 
  onSelectTrack,
  onAddTrack,
}: TimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { setTracks, setTotalDuration, currentTimeMs, isPlaying } = useAudioPlayer()
  
  // Use smaller scale on mobile
  const [isMobile, setIsMobile] = useState(false)
  
  // Check on mount (client-side only)
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsMobile(true)
    }
  }, [])
  
  // Sync tracks with audio player
  useEffect(() => {
    setTracks(tracks)
    setTotalDuration(durationMs)
  }, [tracks, durationMs, setTracks, setTotalDuration])
  
  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!isPlaying || !scrollRef.current) return
    
    const pixelsPerSecond = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP
    const labelWidth = isMobile ? 100 : 140
    const playheadX = labelWidth + (currentTimeMs / 1000) * pixelsPerSecond
    
    const container = scrollRef.current
    const containerWidth = container.clientWidth
    const scrollLeft = container.scrollLeft
    
    // If playhead is near right edge, scroll to keep it visible
    if (playheadX > scrollLeft + containerWidth - 100) {
      container.scrollLeft = playheadX - containerWidth / 2
    }
  }, [currentTimeMs, isPlaying, isMobile])
  
  const pixelsPerSecond = isMobile ? PIXELS_PER_SECOND_MOBILE : PIXELS_PER_SECOND_DESKTOP
  const labelWidth = isMobile ? 100 : 140
  const statusWidth = isMobile ? 32 : 40

  const timelineWidth = (durationMs / 1000) * pixelsPerSecond
  const trackHeight = isMobile ? 48 : 56
  const trackAreaHeight = Math.max(tracks.length * trackHeight + trackHeight, 150)
  
  // Playhead position
  const playheadX = labelWidth + (currentTimeMs / 1000) * pixelsPerSecond

  return (
    <div className="flex flex-col bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden h-full">
      {/* Scrollable timeline area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-auto"
      >
        <div style={{ minWidth: timelineWidth + labelWidth + statusWidth }}>
          {/* Ruler */}
          <div className="flex sticky top-0 z-10 bg-zinc-950">
            <div 
              className="flex-shrink-0 bg-zinc-900 border-b border-r border-zinc-700" 
              style={{ width: labelWidth }}
            />
            <TimelineRuler durationMs={durationMs} pixelsPerSecond={pixelsPerSecond} />
            <div 
              className="flex-shrink-0 bg-zinc-900 border-b border-zinc-700" 
              style={{ width: statusWidth }}
            />
          </div>
          
          {/* Tracks with section overlay */}
          <div className="relative" style={{ minHeight: trackAreaHeight }}>
            {/* Section markers behind tracks */}
            <div 
              className="absolute top-0 bottom-0"
              style={{ left: labelWidth, right: statusWidth }}
            >
              <SectionMarkers 
                sections={sections} 
                pixelsPerSecond={pixelsPerSecond} 
                height={trackAreaHeight}
              />
            </div>
            
            {/* Playhead */}
            <div 
              className={`absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none transition-colors ${
                isPlaying ? 'bg-red-500' : 'bg-red-500/50'
              }`}
              style={{ left: playheadX }}
            >
              {/* Playhead handle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
            </div>
            
            {/* Track lanes */}
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                pixelsPerSecond={pixelsPerSecond}
                isSelected={track.id === selectedTrackId}
                onSelect={() => onSelectTrack(track.id)}
                compact={isMobile}
                labelWidth={labelWidth}
                statusWidth={statusWidth}
              />
            ))}
            
            {/* Add track row */}
            <div 
              className="flex items-center border-b border-zinc-800"
              style={{ height: trackHeight }}
            >
              <div 
                className="flex-shrink-0 px-2 sm:px-3 border-r border-zinc-800"
                style={{ width: labelWidth }}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-zinc-500 hover:text-zinc-300 text-xs sm:text-sm"
                  onClick={onAddTrack}
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> 
                  <span className="hidden sm:inline">Add Track</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
              <div className="flex-1" />
              <div style={{ width: statusWidth }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Transport controls */}
      <TransportControls compact={isMobile} />
    </div>
  )
}
