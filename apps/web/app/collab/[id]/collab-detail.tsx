'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Pause, Check, X, Clock, Music } from 'lucide-react'
import { useState } from 'react'

interface Track {
  id: string
  instrument: string
  description?: string
  audioFileUrl: string
  waveformData?: number[]
  durationMs?: number
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVISION'
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
  orderIndex: number
  startBeat: number
  durationBeats: number
  description?: string
  tracks: Track[]
  acceptedTracks: Track[]
}

interface Collab {
  id: string
  title: string
  description?: string
  genre?: string
  tempo?: number
  mood?: string
  keySignature?: string
  status: string
  createdAt: string
  creator: {
    id: string
    displayName?: string
    walletAddress: string
    avatarUrl?: string
  }
  sections: Section[]
  totalTracks: number
  acceptedTracks: number
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
  ACCEPTED: 'bg-green-900/30 text-green-400 border-green-800',
  REJECTED: 'bg-red-900/30 text-red-400 border-red-800',
  REVISION: 'bg-orange-900/30 text-orange-400 border-orange-800',
}

const collabStatusColors: Record<string, string> = {
  OPEN: 'bg-green-900/30 text-green-400',
  IN_PROGRESS: 'bg-blue-900/30 text-blue-400',
  MIXING: 'bg-purple-900/30 text-purple-400',
  COMPLETED: 'bg-emerald-900/30 text-emerald-400',
  ABANDONED: 'bg-zinc-900/30 text-zinc-400',
}

function WaveformDisplay({ data, className }: { data?: number[]; className?: string }) {
  if (!data || data.length === 0) {
    return (
      <div className={`h-8 bg-zinc-800 rounded flex items-center justify-center ${className}`}>
        <Music className="w-4 h-4 text-zinc-600" />
      </div>
    )
  }
  
  return (
    <div className={`h-8 flex items-center gap-px ${className}`}>
      {data.slice(0, 50).map((peak, i) => (
        <div
          key={i}
          className="w-1 bg-zinc-500 rounded-sm"
          style={{ height: `${Math.max(4, peak * 100)}%` }}
        />
      ))}
    </div>
  )
}

function TrackRow({ track, isCreator }: { track: Track; isCreator: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false)

  return (
    <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
      <Button
        variant="ghost"
        size="sm"
        className="w-8 h-8 rounded-full bg-zinc-800"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
      </Button>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{track.instrument}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColors[track.status]}`}>
            {track.status}
          </span>
        </div>
        <p className="text-xs text-zinc-500 truncate">
          by {track.submitter.displayName || track.submitter.walletAddress.slice(0, 8)}
        </p>
      </div>
      
      <WaveformDisplay data={track.waveformData} className="flex-1 max-w-[200px]" />
      
      {isCreator && track.status === 'PENDING' && (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="w-8 h-8 text-green-500 hover:text-green-400">
            <Check className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 text-red-500 hover:text-red-400">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

function SectionCard({ section, isCreator, tempo }: { section: Section; isCreator: boolean; tempo: number }) {
  // Calculate section duration in seconds
  const beatsPerSecond = tempo / 60
  const durationSec = section.durationBeats / beatsPerSecond
  
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{section.name}</h3>
            {section.description && (
              <p className="text-sm text-zinc-500">{section.description}</p>
            )}
          </div>
          <div className="text-right text-sm text-zinc-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {durationSec.toFixed(1)}s
            </div>
            <div className="text-xs text-zinc-500">
              {section.durationBeats} beats @ beat {section.startBeat}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {section.tracks.length === 0 ? (
          <div className="text-center py-4 text-zinc-500 text-sm">
            No tracks submitted yet
          </div>
        ) : (
          section.tracks.map((track) => (
            <TrackRow key={track.id} track={track} isCreator={isCreator} />
          ))
        )}
        
        <Button variant="outline" size="sm" className="w-full mt-2">
          Submit Track
        </Button>
      </CardContent>
    </Card>
  )
}

export function CollabDetail({ collab }: { collab: Collab }) {
  // TODO: Get current user from auth context
  const isCreator = false
  const tempo = collab.tempo || 120

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{collab.title}</h1>
            <p className="text-zinc-400">
              by {collab.creator.displayName || collab.creator.walletAddress.slice(0, 8)}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm ${collabStatusColors[collab.status]}`}>
            {collab.status}
          </span>
        </div>
        
        {collab.description && (
          <p className="mt-4 text-zinc-300">{collab.description}</p>
        )}
        
        <div className="flex gap-4 mt-4 text-sm text-zinc-500">
          {collab.genre && <span className="px-2 py-1 bg-zinc-800 rounded">{collab.genre}</span>}
          {collab.tempo && <span className="px-2 py-1 bg-zinc-800 rounded">{collab.tempo} BPM</span>}
          {collab.keySignature && <span className="px-2 py-1 bg-zinc-800 rounded">{collab.keySignature}</span>}
          {collab.mood && <span className="px-2 py-1 bg-zinc-800 rounded">{collab.mood}</span>}
        </div>
        
        <div className="flex gap-6 mt-4 text-sm">
          <span>{collab.totalTracks} total tracks</span>
          <span className="text-green-400">{collab.acceptedTracks} accepted</span>
        </div>
      </div>

      {/* Sections / Timeline */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Sections</h2>
        {collab.sections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-zinc-500">
              No sections defined yet
            </CardContent>
          </Card>
        ) : (
          collab.sections
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((section) => (
              <SectionCard 
                key={section.id} 
                section={section} 
                isCreator={isCreator}
                tempo={tempo}
              />
            ))
        )}
      </div>

      {/* Actions */}
      {isCreator && collab.status !== 'COMPLETED' && (
        <div className="flex gap-4">
          <Button variant="outline">Add Section</Button>
          {collab.acceptedTracks > 0 && (
            <Button>Finalize & Create Gold Master</Button>
          )}
        </div>
      )}
    </div>
  )
}
