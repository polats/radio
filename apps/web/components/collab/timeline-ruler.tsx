'use client'

import { useMemo } from 'react'

interface TimelineRulerProps {
  durationMs: number
  pixelsPerSecond: number
}

export function TimelineRuler({ durationMs, pixelsPerSecond }: TimelineRulerProps) {
  const markers = useMemo(() => {
    const durationSec = durationMs / 1000
    const interval = durationSec > 120 ? 30 : durationSec > 60 ? 15 : 5
    const marks = []
    
    for (let sec = 0; sec <= durationSec; sec += interval) {
      marks.push({
        sec,
        label: formatTime(sec),
        x: sec * pixelsPerSecond,
      })
    }
    return marks
  }, [durationMs, pixelsPerSecond])

  const width = (durationMs / 1000) * pixelsPerSecond

  return (
    <div 
      className="h-6 bg-zinc-900 border-b border-zinc-700 relative select-none"
      style={{ width }}
    >
      {markers.map(({ sec, label, x }) => (
        <div
          key={sec}
          className="absolute top-0 h-full flex flex-col justify-end"
          style={{ left: x }}
        >
          <div className="w-px h-2 bg-zinc-500" />
          <span className="text-[10px] text-zinc-500 ml-1">{label}</span>
        </div>
      ))}
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
