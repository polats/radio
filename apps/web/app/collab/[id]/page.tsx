import { getClient } from '@/lib/graphql/client'
import { gql } from '@urql/core'
import { CollabPageClient } from './collab-page-client'
import { notFound } from 'next/navigation'

const COLLAB_QUERY = gql`
  query Collab($id: String!) {
    collab(id: $id) {
      id
      title
      description
      genre
      tempo
      mood
      keySignature
      status
      createdAt
      creator {
        id
        displayName
        walletAddress
        avatarUrl
      }
      sections {
        id
        name
        orderIndex
        startBeat
        durationBeats
        description
        tracks {
          id
          instrument
          description
          audioFileUrl
          signedAudioUrl
          waveformData
          notationAbc
          durationMs
          status
          creatorNotes
          submitter {
            id
            displayName
            walletAddress
            avatarUrl
          }
        }
      }
      totalTracks
      acceptedTracks
    }
    messages(collabId: $id, limit: 50) {
      id
      content
      createdAt
      author {
        id
        displayName
        walletAddress
        avatarUrl
      }
    }
  }
`

export default async function CollabPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = getClient()
  
  const result = await client.query(COLLAB_QUERY, { id })
  
  if (!result.data?.collab) {
    notFound()
  }

  const collab = result.data.collab
  const messages = result.data.messages || []
  
  // Transform sections to timeline format with startTimeMs/endTimeMs
  const tempo = collab.tempo || 120
  const msPerBeat = 60000 / tempo
  
  const sections = collab.sections.map((s: any) => ({
    id: s.id,
    name: s.name,
    startTimeMs: s.startBeat * msPerBeat,
    endTimeMs: (s.startBeat + s.durationBeats) * msPerBeat,
  }))
  
  // Flatten tracks and add startTimeMs
  const tracks = collab.sections.flatMap((section: any) => 
    section.tracks.map((track: any) => ({
      ...track,
      startTimeMs: section.startBeat * msPerBeat,
      durationMs: track.durationMs || section.durationBeats * msPerBeat,
    }))
  )

  return (
    <CollabPageClient 
      collab={collab}
      tracks={tracks}
      sections={sections}
      messages={messages}
    />
  )
}
