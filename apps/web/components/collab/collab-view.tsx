'use client'

import { useState } from 'react'
import { Timeline } from './timeline'
import { ChatPanel } from './chat-panel'
import { TrackDetails } from './track-details'
import { AudioPlayerProvider } from './audio-player-context'
import { Button } from '@/components/ui/button'
import { MessageSquare, Layers } from 'lucide-react'

interface Track {
  id: string
  instrument: string
  description?: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
  startTimeMs: number
  durationMs: number
  waveformData?: number[]
  signedAudioUrl?: string
  notationAbc?: string
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
  tempo?: number
  onSendMessage?: (content: string) => void
  onAcceptTrack?: (trackId: string) => void
  onRejectTrack?: (trackId: string) => void
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
  tempo = 120,
  onSendMessage,
  onAcceptTrack,
  onRejectTrack,
}: CollabViewProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  const [mobilePanel, setMobilePanel] = useState<'timeline' | 'chat'>('timeline')
  
  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || null
  
  // Calculate total duration from tracks and sections
  const maxTrackEnd = Math.max(...tracks.map(t => t.startTimeMs + t.durationMs), 0)
  const maxSectionEnd = Math.max(...sections.map(s => s.endTimeMs), 0)
  const contentDurationMs = Math.max(maxTrackEnd, maxSectionEnd)
  // Add 2 second buffer after content, or 30 seconds minimum if no content
  const durationMs = contentDurationMs > 0 ? contentDurationMs + 2000 : 30000

  return (
    <AudioPlayerProvider>
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{collab.title}</h1>
          <p className="text-sm text-zinc-400 mt-1 truncate">
            by {collab.creator.displayName || collab.creator.walletAddress.slice(0, 8)}
            {collab.genre && <span className="mx-2 hidden sm:inline">•</span>}
            {collab.genre && <span className="hidden sm:inline">{collab.genre}</span>}
            {collab.tempo && <span className="mx-2 hidden sm:inline">•</span>}
            {collab.tempo && <span className="hidden sm:inline">{collab.tempo} BPM</span>}
          </p>
          {/* Mobile meta */}
          <div className="flex gap-2 mt-1 sm:hidden text-xs text-zinc-500">
            {collab.genre && <span>{collab.genre}</span>}
            {collab.tempo && <span>{collab.tempo} BPM</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-full border ${statusColors[collab.status]}`}>
            {collab.status}
          </span>
          {isCreator && collab.status !== 'COMPLETED' && (
            <Button size="sm" className="hidden sm:flex">Finalize</Button>
          )}
        </div>
      </div>

      {/* Mobile panel toggle */}
      <div className="flex gap-2 mb-3 lg:hidden">
        <Button
          variant={mobilePanel === 'timeline' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setMobilePanel('timeline')}
        >
          <Layers className="w-4 h-4 mr-2" />
          Tracks
        </Button>
        <Button
          variant={mobilePanel === 'chat' ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
          onClick={() => setMobilePanel('chat')}
        >
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat
          {messages.length > 0 && (
            <span className="ml-2 bg-zinc-700 px-1.5 py-0.5 rounded text-xs">
              {messages.length}
            </span>
          )}
        </Button>
      </div>

      {/* Main content - responsive layout */}
      <div className="flex-1 min-h-0">
        {/* Desktop: side by side */}
        <div className="hidden lg:grid lg:grid-cols-[1fr,380px] gap-4 h-full">
          {/* Timeline */}
          <div className="min-h-0">
            <Timeline
              tracks={tracks}
              sections={sections}
              durationMs={durationMs}
              selectedTrackId={selectedTrackId}
              onSelectTrack={setSelectedTrackId}
            />
          </div>

          {/* Side panel - Track Details takes priority */}
          <div className="flex flex-col gap-3 min-h-0">
            {/* Track Details - takes most space */}
            <div className="flex-1 min-h-0">
              <TrackDetails
                track={selectedTrack}
                isCreator={isCreator}
                tempo={tempo}
                onAccept={onAcceptTrack}
                onReject={onRejectTrack}
              />
            </div>
            {/* Chat - collapsible/smaller */}
            <div className="h-48 flex-shrink-0">
              <ChatPanel 
                messages={messages} 
                onSendMessage={onSendMessage}
              />
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: tabbed panels */}
        <div className="lg:hidden h-full flex flex-col">
          {mobilePanel === 'timeline' ? (
            <>
              {/* Timeline - smaller when track selected */}
              <div className={`min-h-0 overflow-hidden ${selectedTrack ? 'h-1/2' : 'flex-1'}`}>
                <Timeline
                  tracks={tracks}
                  sections={sections}
                  durationMs={durationMs}
                  selectedTrackId={selectedTrackId}
                  onSelectTrack={setSelectedTrackId}
                />
              </div>
              {/* Track Details - takes remaining space */}
              {selectedTrack && (
                <div className="flex-1 mt-3 min-h-0">
                  <TrackDetails
                    track={selectedTrack}
                    isCreator={isCreator}
                    tempo={tempo}
                    onAccept={onAcceptTrack}
                    onReject={onRejectTrack}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 min-h-0">
              <ChatPanel 
                messages={messages} 
                onSendMessage={onSendMessage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
    </AudioPlayerProvider>
  )
}
