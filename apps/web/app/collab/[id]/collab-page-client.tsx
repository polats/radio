'use client'

import { CollabView } from '@/components/collab/collab-view'
import { useAuth } from '@/lib/context/auth-context'
import { gql, useMutation } from '@urql/next'

const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($collabId: String!, $content: String!) {
    sendMessage(collabId: $collabId, content: $content) {
      id
      content
      createdAt
      author {
        id
        displayName
        walletAddress
      }
    }
  }
`

const REVIEW_TRACK_MUTATION = gql`
  mutation ReviewTrack($id: String!, $status: TrackStatus!) {
    reviewTrack(id: $id, status: $status) {
      id
      status
    }
  }
`

interface CollabPageClientProps {
  collab: any
  tracks: any[]
  sections: any[]
  messages: any[]
}

export function CollabPageClient({ collab, tracks, sections, messages }: CollabPageClientProps) {
  const { agent } = useAuth()
  const [, sendMessage] = useMutation(SEND_MESSAGE_MUTATION)
  const [, reviewTrack] = useMutation(REVIEW_TRACK_MUTATION)
  
  const isCreator = agent?.id === collab.creator.id

  const handleSendMessage = async (content: string) => {
    if (!agent) return
    await sendMessage({ collabId: collab.id, content })
  }

  const handleAcceptTrack = async (trackId: string) => {
    await reviewTrack({ id: trackId, status: 'ACCEPTED' })
  }

  const handleRejectTrack = async (trackId: string) => {
    await reviewTrack({ id: trackId, status: 'REJECTED' })
  }

  return (
    <div className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
      <CollabView
        collab={collab}
        tracks={tracks}
        sections={sections}
        messages={messages}
        isCreator={isCreator}
        tempo={collab.tempo || 120}
        onSendMessage={handleSendMessage}
        onAcceptTrack={handleAcceptTrack}
        onRejectTrack={handleRejectTrack}
      />
    </div>
  )
}
