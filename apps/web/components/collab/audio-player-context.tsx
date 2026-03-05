'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'
import type { PatternData } from '@radio/shared'

interface Track {
  id: string
  instrument: string
  signedAudioUrl?: string
  patternData?: PatternData
  startTimeMs: number
  durationMs: number
}

interface TrackAudio {
  audio: HTMLAudioElement
  track: Track
  loaded: boolean
}

interface AudioPlayerContextType {
  // Timeline state
  isPlaying: boolean
  currentTimeMs: number
  totalDurationMs: number
  volume: number
  
  // Track state
  playingTrackIds: string[]
  soloTrackId: string | null
  mutedTrackIds: string[]
  
  // Timeline controls
  play: () => void
  pause: () => void
  stop: () => void
  seek: (timeMs: number) => void
  setVolume: (volume: number) => void
  
  // Track controls
  setSoloTrack: (trackId: string | null) => void
  toggleMuteTrack: (trackId: string) => void
  playTrackSolo: (track: Track) => void
  
  // Setup
  setTracks: (tracks: Track[]) => void
  setTotalDuration: (durationMs: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const trackAudiosRef = useRef<Map<string, TrackAudio>>(new Map())
  const patternTracksRef = useRef<Map<string, Track>>(new Map())
  const patternSynthRef = useRef<any>(null)
  const patternPlayingRef = useRef<Set<string>>(new Set())
  const animationRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [totalDurationMs, setTotalDurationMs] = useState(180000) // 3 min default
  const [volume, setVolumeState] = useState(0.8)
  const [playingTrackIds, setPlayingTrackIds] = useState<string[]>([])
  const [soloTrackId, setSoloTrackIdState] = useState<string | null>(null)
  const [mutedTrackIds, setMutedTrackIds] = useState<string[]>([])
  const [tracks, setTracksState] = useState<Track[]>([])

  // Sync tracks with audio elements
  const setTracks = useCallback((newTracks: Track[]) => {
    setTracksState(newTracks)
    
    // Create/update audio elements for each track
    const currentMap = trackAudiosRef.current
    const newTrackIds = new Set(newTracks.map(t => t.id))
    
    // Remove old tracks
    for (const [id] of currentMap) {
      if (!newTrackIds.has(id)) {
        const ta = currentMap.get(id)
        if (ta) {
          ta.audio.pause()
          ta.audio.src = ''
        }
        currentMap.delete(id)
      }
    }
    
    // Add/update tracks
    const patternMap = patternTracksRef.current
    patternMap.clear()

    for (const track of newTracks) {
      if (track.signedAudioUrl) {
        let ta = currentMap.get(track.id)
        if (!ta) {
          const audio = new Audio()
          audio.preload = 'auto'
          audio.volume = volume
          ta = { audio, track, loaded: false }
          currentMap.set(track.id, ta)

          audio.addEventListener('canplaythrough', () => {
            const existing = currentMap.get(track.id)
            if (existing) existing.loaded = true
          })
        }

        // Update source if changed
        if (ta.audio.src !== track.signedAudioUrl) {
          ta.audio.src = track.signedAudioUrl
          ta.audio.load()
          ta.loaded = false
        }
        ta.track = track
      } else if (track.patternData) {
        // Pattern-only track — will be played via Tone.js
        patternMap.set(track.id, track)
      }
    }
  }, [volume])

  const setTotalDuration = useCallback((durationMs: number) => {
    setTotalDurationMs(durationMs)
  }, [])

  const startPatternTrack = useCallback(async (track: Track) => {
    if (!track.patternData) return
    try {
      if (!patternSynthRef.current) {
        const mod = await import('../audio/pattern-synth')
        patternSynthRef.current = mod.getPatternSynth()
      }
      await patternSynthRef.current.play(track.patternData, true)
    } catch (e) {
      console.error('Failed to start pattern synth:', e)
    }
  }, [])

  const stopPatternTrack = useCallback(() => {
    if (patternSynthRef.current) {
      patternSynthRef.current.stop()
    }
  }, [])

  const stopAllTracks = useCallback(() => {
    for (const [, ta] of trackAudiosRef.current) {
      ta.audio.pause()
    }
    stopPatternTrack()
    patternPlayingRef.current.clear()
    setPlayingTrackIds([])
  }, [stopPatternTrack])

  // Animation loop for playback
  const tick = useCallback((timestamp: number) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp
    const delta = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp
    
    setCurrentTimeMs(prev => {
      const next = prev + delta
      if (next >= totalDurationMs) {
        // Stop at end
        setIsPlaying(false)
        stopAllTracks()
        return totalDurationMs
      }
      return next
    })
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(tick)
    }
  }, [isPlaying, totalDurationMs])

  // Sync track playback with current time
  useEffect(() => {
    if (!isPlaying) return

    const playing: string[] = []

    // Sync audio tracks
    for (const [id, ta] of trackAudiosRef.current) {
      const { track, audio, loaded } = ta
      if (!loaded || !track.signedAudioUrl) continue

      // Check if track should be playing
      const trackStart = track.startTimeMs
      const trackEnd = trackStart + track.durationMs
      const shouldPlay = currentTimeMs >= trackStart && currentTimeMs < trackEnd

      // Check mute/solo
      const isMuted = mutedTrackIds.includes(id)
      const isSoloed = soloTrackId === null || soloTrackId === id
      const audible = !isMuted && isSoloed

      if (shouldPlay && audible) {
        // Calculate where in the track we should be
        const trackPosition = (currentTimeMs - trackStart) / 1000

        // Start playing if not already
        if (audio.paused) {
          audio.currentTime = trackPosition
          audio.play().catch(() => {})
        } else {
          // Sync if drifted more than 100ms
          const drift = Math.abs(audio.currentTime - trackPosition)
          if (drift > 0.1) {
            audio.currentTime = trackPosition
          }
        }
        playing.push(id)
      } else {
        // Stop if shouldn't be playing
        if (!audio.paused) {
          audio.pause()
        }
      }
    }

    // Sync pattern tracks via Tone.js
    for (const [id, track] of patternTracksRef.current) {
      const trackStart = track.startTimeMs
      const trackEnd = trackStart + track.durationMs
      const shouldPlay = currentTimeMs >= trackStart && currentTimeMs < trackEnd

      const isMuted = mutedTrackIds.includes(id)
      const isSoloed = soloTrackId === null || soloTrackId === id
      const audible = !isMuted && isSoloed

      if (shouldPlay && audible) {
        if (!patternPlayingRef.current.has(id)) {
          // Start pattern synth
          startPatternTrack(track)
          patternPlayingRef.current.add(id)
        }
        playing.push(id)
      } else {
        if (patternPlayingRef.current.has(id)) {
          stopPatternTrack()
          patternPlayingRef.current.delete(id)
        }
      }
    }

    setPlayingTrackIds(playing)
  }, [currentTimeMs, isPlaying, mutedTrackIds, soloTrackId])

  // Start animation when playing
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0
      animationRef.current = requestAnimationFrame(tick)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, tick])

  const play = useCallback(() => {
    setIsPlaying(true)
  }, [])

  const pause = useCallback(() => {
    setIsPlaying(false)
    stopAllTracks()
  }, [stopAllTracks])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentTimeMs(0)
    stopAllTracks()
  }, [stopAllTracks])

  const seek = useCallback((timeMs: number) => {
    setCurrentTimeMs(Math.max(0, Math.min(timeMs, totalDurationMs)))
    // Reset all audio track positions
    for (const [, ta] of trackAudiosRef.current) {
      const trackPos = (timeMs - ta.track.startTimeMs) / 1000
      if (trackPos >= 0 && trackPos < ta.track.durationMs / 1000) {
        ta.audio.currentTime = trackPos
      } else {
        ta.audio.pause()
        ta.audio.currentTime = 0
      }
    }
    // Reset pattern tracks — stop and let the sync effect restart them
    stopPatternTrack()
    patternPlayingRef.current.clear()
  }, [totalDurationMs, stopPatternTrack])

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol)
    for (const [, ta] of trackAudiosRef.current) {
      ta.audio.volume = vol
    }
  }, [])

  const setSoloTrack = useCallback((trackId: string | null) => {
    setSoloTrackIdState(trackId)
  }, [])

  const toggleMuteTrack = useCallback((trackId: string) => {
    setMutedTrackIds(prev => 
      prev.includes(trackId) 
        ? prev.filter(id => id !== trackId)
        : [...prev, trackId]
    )
  }, [])

  // Play a single track in isolation (solo mode)
  const playTrackSolo = useCallback((track: Track) => {
    // Stop everything
    stopAllTracks()
    setIsPlaying(false)
    
    // Seek to track start and play
    setCurrentTimeMs(track.startTimeMs)
    setSoloTrackIdState(track.id)
    
    // Small delay then play
    setTimeout(() => {
      setIsPlaying(true)
    }, 50)
  }, [stopAllTracks])

  return (
    <AudioPlayerContext.Provider value={{
      isPlaying,
      currentTimeMs,
      totalDurationMs,
      volume,
      playingTrackIds,
      soloTrackId,
      mutedTrackIds,
      play,
      pause,
      stop,
      seek,
      setVolume,
      setSoloTrack,
      toggleMuteTrack,
      playTrackSolo,
      setTracks,
      setTotalDuration,
    }}>
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (!context) {
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider')
  }
  return context
}
