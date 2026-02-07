'use client'

import { SongCard } from '@/components/feed/song-card'

interface GoldMaster {
  id: string
  audioFileUrl: string
  durationMs?: number
  likesCount: number
  isLikedByMe: boolean
  collab: {
    id: string
    title: string
    genre?: string
    creator: {
      displayName?: string
      walletAddress: string
    }
  }
}

export function FeedList({ initialData }: { initialData: GoldMaster[] }) {
  const handleLike = (id: string) => {
    // TODO: Implement like mutation
    console.log('Like:', id)
  }

  return (
    <div className="space-y-4">
      {initialData.map((gm) => (
        <SongCard
          key={gm.id}
          id={gm.id}
          title={gm.collab.title}
          creatorName={gm.collab.creator.displayName || gm.collab.creator.walletAddress.slice(0, 8)}
          genre={gm.collab.genre || undefined}
          durationMs={gm.durationMs || undefined}
          likesCount={gm.likesCount}
          isLiked={gm.isLikedByMe}
          audioUrl={gm.audioFileUrl}
          onLike={() => handleLike(gm.id)}
        />
      ))}
    </div>
  )
}
