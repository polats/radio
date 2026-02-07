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
  totalBeats?: number
}

// Sample drum notation if none provided (no title)
const SAMPLE_DRUM_ABC = `X:1
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
  totalBeats = 16,
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
    if (!containerRef.current) return
    
    clearHighlight()
    
    // Find all note elements
    const notes = containerRef.current.querySelectorAll('.abcjs-note, .abcjs-rest, .abcjs-chord')
    if (notes.length === 0) return
    
    // Calculate which note index based on beat position relative to total beats
    // Use the passed totalBeats prop for accurate sync
    const progress = Math.max(0, Math.min(1, beatPosition / totalBeats))
    const noteIndex = Math.floor(progress * notes.length)
    const clampedIndex = Math.min(Math.max(0, noteIndex), notes.length - 1)
    
    const noteEl = notes[clampedIndex]
    if (noteEl) {
      noteEl.classList.add('abcjs-note-playing')
      lastHighlightedRef.current = [noteEl]
      
      // Scroll into view if needed (smooth can be jerky, use auto for faster updates)
      noteEl.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
    }
  }, [clearHighlight, totalBeats])

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
      
      // Strip title from ABC notation to avoid rendering it
      const notationWithoutTitle = notation.replace(/^T:.*$/gm, '')
      
      // Calculate width - ensure minimum of 300px
      const containerWidth = containerRef.current.clientWidth
      const calculatedWidth = width || Math.max(300, containerWidth - 20)
      
      // Render ABC notation to SVG
      const tuneObjects = ABCJS.renderAbc(containerRef.current, notationWithoutTitle, {
        responsive: responsive ? 'resize' : undefined,
        staffwidth: calculatedWidth,
        paddingleft: 5,
        paddingright: 5,
        paddingtop: 5,
        paddingbottom: 5,
        scale: 0.7,
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
    <div 
      ref={containerRef}
      className={`notation-container overflow-x-auto ${className}`}
      style={{ 
        minHeight: height,
      }}
    />
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
