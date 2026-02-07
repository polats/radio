'use client'

import { useEffect, useRef, useState } from 'react'
import ABCJS from 'abcjs'

interface NotationViewProps {
  abc?: string
  width?: number
  height?: number
  className?: string
  responsive?: boolean
}

// Sample drum notation if none provided
const SAMPLE_DRUM_ABC = `X:1
T:Drum Pattern
M:4/4
L:1/16
Q:1/4=120
K:C clef=perc
[F,g']zg'g' [cg']zg'g' [F,g']z[F,g']g' [cg'a']zg'g' |
[F,g']zg'g' [cg']zg'g' [F,g']z[F,g']g' [cg'a']zg'[eg'] |
[F,g']zg'g' [cg']z[A,g']g' [F,g']z[F,g']g' [cg'a']zg'g' |
[F,g']zg'g' [cg']zg'g' [F,g']z[A,g'][A,g'] [cg'][F,a'] |]`

export function NotationView({ 
  abc, 
  width, 
  height = 120,
  className = '',
  responsive = true,
}: NotationViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    
    const notation = abc || SAMPLE_DRUM_ABC
    
    try {
      // Clear previous
      containerRef.current.innerHTML = ''
      
      // Render ABC notation to SVG
      ABCJS.renderAbc(containerRef.current, notation, {
        responsive: responsive ? 'resize' : undefined,
        staffwidth: width || containerRef.current.clientWidth - 20,
        paddingleft: 10,
        paddingright: 10,
        paddingtop: 10,
        paddingbottom: 10,
        scale: 0.8,
        add_classes: true,
        // Drum-friendly colors
        foregroundColor: '#e4e4e7',  // zinc-200
      })
      
      setError(null)
    } catch (e) {
      setError('Failed to render notation')
      console.error('Notation render error:', e)
    }
  }, [abc, width, responsive])

  if (error) {
    return (
      <div className={`flex items-center justify-center text-red-400 text-sm ${className}`}>
        {error}
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className={`notation-container overflow-x-auto ${className}`}
      style={{ 
        minHeight: height,
        // Dark theme overrides for ABC SVG
        ['--abc-foreground' as string]: '#e4e4e7',
      }}
    />
  )
}

// Utility to parse notation from track metadata
export function parseTrackNotation(track: { notation?: string; notationAbc?: string }): string | undefined {
  if (track.notationAbc) return track.notationAbc
  if (track.notation) {
    try {
      const parsed = JSON.parse(track.notation)
      return parsed.abc || parsed.notation
    } catch {
      // Might already be raw ABC
      if (track.notation.startsWith('X:')) return track.notation
    }
  }
  return undefined
}
