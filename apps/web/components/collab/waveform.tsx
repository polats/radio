'use client'

import { useMemo } from 'react'

interface WaveformProps {
  data?: number[]
  width: number
  height: number
  color?: string
  className?: string
}

export function Waveform({ data, width, height, color = '#22c55e', className }: WaveformProps) {
  const bars = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate placeholder waveform
      const count = Math.floor(width / 3)
      return Array.from({ length: count }, () => Math.random() * 0.3 + 0.1)
    }
    
    // Resample data to fit width
    const targetBars = Math.floor(width / 3)
    const step = data.length / targetBars
    const resampled: number[] = []
    
    for (let i = 0; i < targetBars; i++) {
      const start = Math.floor(i * step)
      const end = Math.floor((i + 1) * step)
      const slice = data.slice(start, end)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      resampled.push(avg)
    }
    
    return resampled
  }, [data, width])

  return (
    <div 
      className={`flex items-center gap-px ${className}`}
      style={{ width, height }}
    >
      {bars.map((peak, i) => (
        <div
          key={i}
          className="w-0.5 rounded-sm"
          style={{ 
            height: `${Math.max(10, peak * 100)}%`,
            backgroundColor: color,
            opacity: data ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  )
}
