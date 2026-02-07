'use client'

import { useState } from 'react'
import { Timeline } from './timeline'
import { ChatPanel } from './chat-panel'
import { TrackDetails } from './track-details'
import { Button } from '@/components/ui/button'

interface Track {
  id: string
  instrument: string
  description?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  startTimeMs: number
  durationMs: number
  waveformData?: number[]
  creatorNotes?: string
  submitter: {
    id: string
    displayName?: string
    walletAddress: string
    avatarUrl?: string
  }
}

interface Section {
  id: string
  name: string
  startTimeMs: number
  endTimeMs: number
}

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    displayName?: string
    walletAddress: string
    avatarUrl?: string
  }
}

interface Collab {
  id: string
  title: string
  description?: string
  genre?: string
  tempo?: number
  status: string
  creator: {
    id: string
    displayName?: string
    walletAddress: string
  }
}

interface CollabViewProps {
  collab: Collab
  tracks: Track[]
  sections: Section[]
  messages: Message[]
  isCreator: boolean
  onSendMessage?: (content: string) => void
  onAcceptTrack?: (trackId: string) => void
  onRejectTrack?: (trackId: string) => void
  onAddTrack?: () => void
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-green-500/20 text-green-400 border-green-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  MIXING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COMPLETED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  ABANDONED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export function CollabView({
  collab,
  tracks,
  sections,
  messages,
  isCreator,
  onSendMessage,
  onAcceptTrack,
  onRejectTrack,
  onAddTrack,
}: CollabViewProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || null
  
  // Calculate total duration from tracks and sections
  const maxTrackEnd = Math.max(...tracks.map(t => t.startTimeMs + t.durationMs), 0)
  const maxSectionEnd = Math.max(...sections.map(s => s.endTimeMs), 0)
  const durationMs = Math.max(maxTrackEnd, maxSectionEnd, 180000) // At least 3 minutes

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{collab.title}</h1>
          <p className="text-sm text-zinc-400 mt-1">
            by {collab.creator.displayName || collab.creator.walletAddress.slice(0, 8)}
            {collab.genre && <span className="mx-2">•</span>}
            {collab.genre}
            {collab.tempo && <span className="mx-2">•</span>}
            {collab.tempo && `${collab.tempo} BPM`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm rounded-full border ${statusColors[collab.status]}`}>
            {collab.status}
          </span>
          {isCreator && collab.status !== 'COMPLETED' && (
            <Button size="sm">Finalize</Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-[1fr,320px] gap-4 min-h-0">
        {/* Timeline */}
        <div className="min-h-0">
          <Timeline
            tracks={tracks}
            sections={sections}
            durationMs={durationMs}
            selectedTrackId={selectedTrackId}
            onSelectTrack={setSelectedTrackId}
            onAddTrack={onAddTrack}
          />
        </div>

        {/* Side panels */}
        <div className="flex flex-col gap-4 min-h-0">
          {/* Chat */}
          <div className="flex-1 min-h-0">
            <ChatPanel 
              messages={messages} 
              onSendMessage={onSendMessage}
            />
          </div>
          
          {/* Track details */}
          <div className="h-64">
            <TrackDetails
              track={selectedTrack}
              isCreator={isCreator}
              onAccept={onAcceptTrack}
              onReject={onRejectTrack}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
