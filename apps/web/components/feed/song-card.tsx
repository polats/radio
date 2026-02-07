'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Play, Pause } from 'lucide-react'
import { useState } from 'react'

interface SongCardProps {
  id: string
  title: string
  creatorName?: string
  genre?: string
  durationMs?: number
  likesCount: number
  isLiked: boolean
  audioUrl: string
  onLike: () => void
}

function formatDuration(ms?: number): string {
  if (!ms) return '--:--'
  const seconds = Math.floor(ms / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function SongCard({
  id,
  title,
  creatorName,
  genre,
  durationMs,
  likesCount,
  isLiked,
  audioUrl,
  onLike,
}: SongCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <Card className="hover:border-zinc-700 transition-colors">
      <CardContent className="flex items-center gap-4">
        {/* Play button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700"
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </Button>

        {/* Song info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate">{title}</h3>
          <p className="text-sm text-zinc-400 truncate">
            {creatorName || 'Unknown'} {genre && `• ${genre}`}
          </p>
        </div>

        {/* Duration */}
        <span className="text-sm text-zinc-500 font-mono">
          {formatDuration(durationMs)}
        </span>

        {/* Like button */}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={onLike}
        >
          <Heart
            className={`w-4 h-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
          />
          <span className="text-sm">{likesCount}</span>
        </Button>
      </CardContent>
    </Card>
  )
}
