'use client'

import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react'

interface Track {
  id: string
  instrument: string
  signedAudioUrl?: string
  durationMs?: number
}

interface AudioPlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  currentTimeMs: number
  durationMs: number
  volume: number
  playTrack: (track: Track) => void
  pause: () => void
  resume: () => void
  stop: () => void
  seek: (timeMs: number) => void
  setVolume: (volume: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [volume, setVolumeState] = useState(0.8)

  // Create audio element on mount
  useEffect(() => {
    audioRef.current = new Audio()
    audioRef.current.volume = volume
    
    const audio = audioRef.current
    
    const handleTimeUpdate = () => {
      setCurrentTimeMs(audio.currentTime * 1000)
    }
    
    const handleLoadedMetadata = () => {
      setDurationMs(audio.duration * 1000)
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTimeMs(0)
    }
    
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.pause()
    }
  }, [])

  const playTrack = useCallback((track: Track) => {
    if (!audioRef.current || !track.signedAudioUrl) return
    
    // If same track, just resume
    if (currentTrack?.id === track.id && audioRef.current.src) {
      audioRef.current.play()
      return
    }
    
    // Load new track
    audioRef.current.src = track.signedAudioUrl
    audioRef.current.load()
    setCurrentTrack(track)
    setCurrentTimeMs(0)
    
    // Set duration from track if available
    if (track.durationMs) {
      setDurationMs(track.durationMs)
    }
    
    audioRef.current.play()
  }, [currentTrack])

  const pause = useCallback(() => {
    audioRef.current?.pause()
  }, [])

  const resume = useCallback(() => {
    audioRef.current?.play()
  }, [])

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setCurrentTimeMs(0)
    setIsPlaying(false)
  }, [])

  const seek = useCallback((timeMs: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeMs / 1000
      setCurrentTimeMs(timeMs)
    }
  }, [])

  const setVolume = useCallback((vol: number) => {
    setVolumeState(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }, [])

  return (
    <AudioPlayerContext.Provider value={{
      currentTrack,
      isPlaying,
      currentTimeMs,
      durationMs,
      volume,
      playTrack,
      pause,
      resume,
      stop,
      seek,
      setVolume,
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
