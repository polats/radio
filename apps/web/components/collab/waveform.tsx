'use client'

import { useMemo } from 'react'

interface WaveformProps {
  data?: number[]
  width: number
  height: number
  color?: string
  className?: string
  mirrored?: boolean
}

export function Waveform({ 
  data, 
  width, 
  height, 
  color = '#22c55e', 
  className,
  mirrored = true,
}: WaveformProps) {
  const bars = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate placeholder waveform with some variation
      const count = Math.floor(width / 3)
      return Array.from({ length: count }, (_, i) => {
        // Create a wave-like pattern for placeholder
        const wave = Math.sin(i * 0.3) * 0.15 + 0.25
        const noise = Math.random() * 0.1
        return wave + noise
      })
    }
    
    // Check if data is all the same (broken waveform)
    const allSame = data.every(v => v === data[0])
    if (allSame) {
      // Generate a drum-like pattern as fallback
      const count = Math.floor(width / 3)
      return Array.from({ length: count }, (_, i) => {
        // Simulate drum hits with periodic spikes
        const beat = (i % 8 === 0 || i % 8 === 4) ? 0.9 : 0.3
        const variation = Math.random() * 0.2
        return beat * (0.8 + variation)
      })
    }
    
    // Normalize data - find actual range
    const minVal = Math.min(...data)
    const maxVal = Math.max(...data)
    const range = maxVal - minVal || 1
    
    // Resample data to fit width
    const targetBars = Math.floor(width / 3)
    const step = data.length / targetBars
    const resampled: number[] = []
    
    for (let i = 0; i < targetBars; i++) {
      const start = Math.floor(i * step)
      const end = Math.floor((i + 1) * step)
      const slice = data.slice(start, Math.max(end, start + 1))
      
      // Use max value in slice for peaks (better for transients)
      const max = Math.max(...slice)
      // Normalize to 0-1 range
      const normalized = (max - minVal) / range
      
      resampled.push(normalized)
    }
    
    return resampled
  }, [data, width])

  // Calculate if we have real data
  const hasRealData = data && data.length > 0 && !data.every(v => v === data[0])

  if (mirrored) {
    // Mirrored waveform (like audio editors)
    return (
      <div 
        className={`flex items-center gap-px ${className}`}
        style={{ width, height }}
      >
        {bars.map((peak, i) => {
          // Scale height: minimum 5%, maximum 95%
          const barHeight = Math.max(5, Math.min(95, peak * 90 + 5))
          return (
            <div
              key={i}
              className="w-0.5 rounded-full"
              style={{ 
                height: `${barHeight}%`,
                backgroundColor: color,
                opacity: hasRealData ? 0.9 : 0.5,
              }}
            />
          )
        })}
      </div>
    )
  }

  // Bottom-aligned bars
  return (
    <div 
      className={`flex items-end gap-px ${className}`}
      style={{ width, height }}
    >
      {bars.map((peak, i) => {
        const barHeight = Math.max(8, Math.min(100, peak * 92 + 8))
        return (
          <div
            key={i}
            className="w-0.5 rounded-t-sm"
            style={{ 
              height: `${barHeight}%`,
              backgroundColor: color,
              opacity: hasRealData ? 0.9 : 0.5,
            }}
          />
        )
      })}
    </div>
  )
}
