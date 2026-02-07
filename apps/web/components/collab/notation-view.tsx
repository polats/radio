'use client'

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import ABCJS from 'abcjs'

export interface NotationViewHandle {
  highlightNote: (beatPosition: number) => void
  clearHighlight: () => void
}

interface NotationViewProps {
  abc?: string
  width?: number
  height?: number
  className?: string
  responsive?: boolean
  currentBeat?: number
  isPlaying?: boolean
  bpm?: number
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

export const NotationView = forwardRef<NotationViewHandle, NotationViewProps>(function NotationView({ 
  abc, 
  width, 
  height = 100,
  className = '',
  responsive = true,
  currentBeat,
  isPlaying = false,
  bpm = 120,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [tuneObject, setTuneObject] = useState<any>(null)
  const lastHighlightedRef = useRef<Element[]>([])

  // Clear any highlighted notes
  const clearHighlight = useCallback(() => {
    lastHighlightedRef.current.forEach(el => {
      el.classList.remove('abcjs-note-playing')
    })
    lastHighlightedRef.current = []
  }, [])

  // Highlight note at beat position
  const highlightNote = useCallback((beatPosition: number) => {
    if (!containerRef.current || !tuneObject) return
    
    clearHighlight()
    
    // Find notes near this beat position
    const notes = containerRef.current.querySelectorAll('.abcjs-note, .abcjs-rest, .abcjs-chord')
    if (notes.length === 0) return
    
    // Calculate which note index based on beat position
    // This is approximate - ABCJS doesn't expose exact timing for each element
    const totalBeats = 16 // Assume 4 bars of 4/4
    const noteIndex = Math.floor((beatPosition / totalBeats) * notes.length)
    const clampedIndex = Math.min(Math.max(0, noteIndex), notes.length - 1)
    
    const noteEl = notes[clampedIndex]
    if (noteEl) {
      noteEl.classList.add('abcjs-note-playing')
      lastHighlightedRef.current = [noteEl]
      
      // Scroll into view if needed
      noteEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [tuneObject, clearHighlight])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    highlightNote,
    clearHighlight,
  }), [highlightNote, clearHighlight])

  // Clear highlight when stopped
  useEffect(() => {
    if (!isPlaying) {
      clearHighlight()
    }
  }, [isPlaying, clearHighlight])

  // Highlight based on currentBeat prop
  useEffect(() => {
    if (isPlaying && currentBeat !== undefined) {
      highlightNote(currentBeat)
    }
  }, [currentBeat, isPlaying, highlightNote])

  useEffect(() => {
    if (!containerRef.current) return
    
    const notation = abc || SAMPLE_DRUM_ABC
    
    try {
      // Clear previous
      containerRef.current.innerHTML = ''
      
      // Render ABC notation to SVG
      const tuneObjects = ABCJS.renderAbc(containerRef.current, notation, {
        responsive: responsive ? 'resize' : undefined,
        staffwidth: width || containerRef.current.clientWidth - 20,
        paddingleft: 5,
        paddingright: 5,
        paddingtop: 5,
        paddingbottom: 5,
        scale: 0.75,
        add_classes: true,
        // Drum-friendly colors
        foregroundColor: '#a1a1aa',  // zinc-400 (dimmer for non-playing notes)
      })
      
      if (tuneObjects && tuneObjects[0]) {
        setTuneObject(tuneObjects[0])
      }
      
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
    <>
      <style jsx global>{`
        .notation-container svg {
          max-width: 100%;
        }
        .notation-container .abcjs-note-playing path,
        .notation-container .abcjs-note-playing ellipse,
        .notation-container .abcjs-note-playing circle {
          fill: #22c55e !important;
          stroke: #22c55e !important;
        }
        .notation-container .abcjs-note path,
        .notation-container .abcjs-rest path,
        .notation-container .abcjs-chord path {
          transition: fill 0.1s ease, stroke 0.1s ease;
        }
      `}</style>
      <div 
        ref={containerRef}
        className={`notation-container overflow-x-auto ${className}`}
        style={{ 
          minHeight: height,
        }}
      />
    </>
  )
})

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
