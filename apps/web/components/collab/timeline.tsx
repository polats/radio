'use client'

import { useState, useRef } from 'react'
import { TimelineRuler } from './timeline-ruler'
import { SectionMarkers } from './section-markers'
import { TrackLane } from './track-lane'
import { TransportControls } from './transport-controls'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

const PIXELS_PER_SECOND = 50

export function Timeline({ 
  tracks, 
  sections, 
  durationMs, 
  selectedTrackId, 
  onSelectTrack,
  onAddTrack,
}: TimelineProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const timelineWidth = (durationMs / 1000) * PIXELS_PER_SECOND
  const trackAreaHeight = Math.max(tracks.length * 56 + 56, 200) // 56px per track + add button

  const handlePlay = () => setIsPlaying(true)
  const handlePause = () => setIsPlaying(false)
  const handleStop = () => {
    setIsPlaying(false)
    setCurrentTimeMs(0)
  }
  const handleSeek = (timeMs: number) => setCurrentTimeMs(timeMs)

  return (
    <div className="flex flex-col bg-zinc-950 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Scrollable timeline area */}
      <div 
        ref={scrollRef}
        className="overflow-x-auto overflow-y-hidden"
      >
        <div style={{ minWidth: timelineWidth + 142 }}> {/* 142 = label width + status width */}
          {/* Ruler */}
          <div className="flex">
            <div className="w-32 flex-shrink-0 bg-zinc-900 border-b border-r border-zinc-700" />
            <TimelineRuler durationMs={durationMs} pixelsPerSecond={PIXELS_PER_SECOND} />
            <div className="w-10 flex-shrink-0 bg-zinc-900 border-b border-zinc-700" />
          </div>
          
          {/* Tracks with section overlay */}
          <div className="relative" style={{ height: trackAreaHeight }}>
            {/* Section markers behind tracks */}
            <div className="absolute left-32 right-10 top-0 bottom-0">
              <SectionMarkers 
                sections={sections} 
                pixelsPerSecond={PIXELS_PER_SECOND} 
                height={trackAreaHeight}
              />
            </div>
            
            {/* Playhead */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: 128 + (currentTimeMs / 1000) * PIXELS_PER_SECOND }}
            />
            
            {/* Track lanes */}
            {tracks.map((track) => (
              <TrackLane
                key={track.id}
                track={track}
                pixelsPerSecond={PIXELS_PER_SECOND}
                isSelected={track.id === selectedTrackId}
                onSelect={() => onSelectTrack(track.id)}
              />
            ))}
            
            {/* Add track row */}
            <div className="h-14 flex items-center border-b border-zinc-800">
              <div className="w-32 flex-shrink-0 px-3 border-r border-zinc-800">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-zinc-500 hover:text-zinc-300"
                  onClick={onAddTrack}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Track
                </Button>
              </div>
              <div className="flex-1" />
              <div className="w-10 flex-shrink-0" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Transport controls */}
      <TransportControls
        isPlaying={isPlaying}
        currentTimeMs={currentTimeMs}
        durationMs={durationMs}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onSeek={handleSeek}
      />
    </div>
  )
}
