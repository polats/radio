'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface Track {
  id: string
  title: string
  artist: string
  audioUrl: string
}

interface PlayerContextType {
  currentTrack: Track | null
  isPlaying: boolean
  playTrack: (track: Track) => void
  pause: () => void
  resume: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const playTrack = (track: Track) => {
    setCurrentTrack(track)
    setIsPlaying(true)
  }

  const pause = () => setIsPlaying(false)
  const resume = () => setIsPlaying(true)

  return (
    <PlayerContext.Provider value={{ currentTrack, isPlaying, playTrack, pause, resume }}>
      {children}
    </PlayerContext.Provider>
  )
}

export function usePlayer() {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider')
  }
  return context
}
