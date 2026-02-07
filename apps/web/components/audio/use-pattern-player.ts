'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PatternData } from '@radio/shared'

// Dynamic import to avoid SSR issues with Tone.js
let synthModule: typeof import('./pattern-synth') | null = null

export function usePatternPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const currentPatternRef = useRef<PatternData | null>(null)
  
  // Load synth module on client
  useEffect(() => {
    if (typeof window !== 'undefined' && !synthModule) {
      import('./pattern-synth').then(mod => {
        synthModule = mod
      })
    }
  }, [])
  
  const play = useCallback(async (patternData: PatternData, loop = true) => {
    if (!synthModule) {
      setIsLoading(true)
      synthModule = await import('./pattern-synth')
      setIsLoading(false)
    }
    
    const synth = synthModule.getPatternSynth()
    currentPatternRef.current = patternData
    
    await synth.play(patternData, loop)
    setIsPlaying(true)
  }, [])
  
  const stop = useCallback(() => {
    if (!synthModule) return
    
    const synth = synthModule.getPatternSynth()
    synth.stop()
    setIsPlaying(false)
  }, [])
  
  const toggle = useCallback(async (patternData: PatternData, loop = true) => {
    if (isPlaying) {
      stop()
    } else {
      await play(patternData, loop)
    }
  }, [isPlaying, play, stop])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (synthModule) {
        synthModule.getPatternSynth().stop()
      }
    }
  }, [])
  
  return {
    isPlaying,
    isLoading,
    play,
    stop,
    toggle,
  }
}
