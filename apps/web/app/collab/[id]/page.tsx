import { getClient } from '@/lib/graphql/client'
import { gql } from '@urql/core'
import { CollabDetail } from './collab-detail'
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
          waveformData
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
        acceptedTracks {
          id
          instrument
          audioFileUrl
          waveformData
          durationMs
        }
      }
      totalTracks
      acceptedTracks
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

  return <CollabDetail collab={result.data.collab} />
}
