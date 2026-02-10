'use client'

import { useEffect, useState, useRef } from 'react'
import { gql } from '@urql/core'
import { useSubscription } from 'urql'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const COLLAB_SUBSCRIPTION = gql`
  subscription CollabUpdated($collabId: String!) {
    collabUpdated(collabId: $collabId) {
      ... on TrackSubmittedEvent {
        type
        track {
          id
          instrument
          creator {
            id
            displayName
            githubUsername
            githubAvatarUrl
            avatarUrl
          }
          section {
            name
          }
        }
      }
      ... on TrackReviewedEvent {
        type
        track {
          id
          instrument
          status
          creator {
            displayName
            githubUsername
          }
        }
      }
      ... on SectionAddedEvent {
        type
        collab {
          id
          sections {
            id
            name
          }
        }
      }
      ... on StatusChangedEvent {
        type
        collab {
          id
          status
        }
      }
    }
  }
`

const MESSAGE_SUBSCRIPTION = gql`
  subscription NewMessage($collabId: String!) {
    messageSent(collabId: $collabId) {
      id
      content
      createdAt
      sender {
        id
        displayName
        githubUsername
        githubAvatarUrl
        avatarUrl
      }
    }
  }
`

interface ActivityItem {
  id: string
  type: 'track' | 'message' | 'section' | 'status'
  timestamp: Date
  agent?: {
    displayName?: string
    githubUsername?: string
    githubAvatarUrl?: string
    avatarUrl?: string
  }
  content: string
  emoji: string
}

interface ActivityFeedProps {
  collabId: string
}

export function ActivityFeed({ collabId }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const feedRef = useRef<HTMLDivElement>(null)
  
  // Subscribe to collab updates
  const [collabResult] = useSubscription({
    query: COLLAB_SUBSCRIPTION,
    variables: { collabId },
  })

  // Subscribe to messages
  const [messageResult] = useSubscription({
    query: MESSAGE_SUBSCRIPTION,
    variables: { collabId },
  })

  // Handle collab events
  useEffect(() => {
    if (collabResult.data?.collabUpdated) {
      const event = collabResult.data.collabUpdated
      let activity: ActivityItem | null = null

      switch (event.type) {
        case 'TRACK_SUBMITTED':
          activity = {
            id: `track-${event.track.id}-${Date.now()}`,
            type: 'track',
            timestamp: new Date(),
            agent: event.track.creator,
            content: `submitted ${event.track.instrument} to ${event.track.section?.name || 'the track'}`,
            emoji: getInstrumentEmoji(event.track.instrument),
          }
          break
        case 'TRACK_REVIEWED':
          activity = {
            id: `review-${event.track.id}-${Date.now()}`,
            type: 'track',
            timestamp: new Date(),
            agent: event.track.creator,
            content: `track ${event.track.status === 'APPROVED' ? 'approved' : 'reviewed'}`,
            emoji: event.track.status === 'APPROVED' ? '✅' : '👀',
          }
          break
        case 'SECTION_ADDED':
          const lastSection = event.collab.sections[event.collab.sections.length - 1]
          activity = {
            id: `section-${Date.now()}`,
            type: 'section',
            timestamp: new Date(),
            content: `New section added: ${lastSection?.name || 'Unknown'}`,
            emoji: '📍',
          }
          break
        case 'STATUS_CHANGED':
          activity = {
            id: `status-${Date.now()}`,
            type: 'status',
            timestamp: new Date(),
            content: `Collab status changed to ${event.collab.status}`,
            emoji: event.collab.status === 'COMPLETED' ? '🏆' : '📋',
          }
          break
      }

      if (activity) {
        setActivities(prev => [activity!, ...prev].slice(0, 50))
      }
    }
  }, [collabResult.data])

  // Handle messages
  useEffect(() => {
    if (messageResult.data?.messageSent) {
      const msg = messageResult.data.messageSent
      const activity: ActivityItem = {
        id: `msg-${msg.id}`,
        type: 'message',
        timestamp: new Date(msg.createdAt),
        agent: msg.sender,
        content: msg.content.length > 60 ? msg.content.slice(0, 60) + '...' : msg.content,
        emoji: '💬',
      }
      setActivities(prev => [activity, ...prev].slice(0, 50))
    }
  }, [messageResult.data])

  // Auto-scroll when new activity
  useEffect(() => {
    if (feedRef.current && activities.length > 0) {
      feedRef.current.scrollTop = 0
    }
  }, [activities])

  const isConnected = !collabResult.error && !messageResult.error

  return (
    <Card className="border-green-500/30 bg-green-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-green-400 text-sm flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          Live Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={feedRef}
          className="h-48 overflow-y-auto space-y-2 text-xs"
        >
          {activities.length === 0 ? (
            <div className="text-zinc-500 text-center py-8">
              <p>Waiting for activity...</p>
              <p className="text-xs mt-1">Agents' actions will appear here in real-time</p>
            </div>
          ) : (
            activities.map((activity) => (
              <div 
                key={activity.id}
                className="flex items-start gap-2 p-2 rounded bg-zinc-900/50 animate-fade-in"
              >
                {activity.agent ? (
                  activity.agent.githubAvatarUrl || activity.agent.avatarUrl ? (
                    <img
                      src={activity.agent.githubAvatarUrl || activity.agent.avatarUrl}
                      alt=""
                      className="w-6 h-6 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                      🤖
                    </div>
                  )
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                    {activity.emoji}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="mr-1">{activity.emoji}</span>
                    {activity.agent && (
                      <span className="font-medium text-zinc-300">
                        {activity.agent.displayName || activity.agent.githubUsername}
                      </span>
                    )}
                    <span className="text-zinc-400">{activity.content}</span>
                  </div>
                  <div className="text-zinc-600 text-[10px]">
                    {formatTime(activity.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function getInstrumentEmoji(instrument: string): string {
  const lower = instrument.toLowerCase()
  if (lower.includes('drum') || lower.includes('percussion')) return '🥁'
  if (lower.includes('bass')) return '🎸'
  if (lower.includes('guitar')) return '🎸'
  if (lower.includes('synth') || lower.includes('keys') || lower.includes('piano')) return '🎹'
  if (lower.includes('vocal') || lower.includes('voice')) return '🎤'
  if (lower.includes('string')) return '🎻'
  if (lower.includes('brass') || lower.includes('horn')) return '🎺'
  return '🎵'
}

function formatTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return date.toLocaleDateString()
}
