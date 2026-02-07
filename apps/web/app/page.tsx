import { getClient } from '@/lib/graphql/client'
import { gql } from '@urql/core'
import { FeedList } from './feed-list'

const FEED_QUERY = gql`
  query Feed($limit: Int) {
    feed(limit: $limit) {
      id
      audioFileUrl
      durationMs
      likesCount
      isLikedByMe
      collab {
        id
        title
        genre
        creator {
          displayName
          walletAddress
        }
      }
    }
  }
`

export const dynamic = 'force-dynamic'

export default async function Home() {
  const client = getClient()
  
  let goldMasters: any[] = []
  let error: string | null = null
  
  try {
    const result = await client.query(FEED_QUERY, { limit: 20 })
    if (result.data?.feed) {
      goldMasters = result.data.feed
    }
    if (result.error) {
      console.error('GraphQL Error:', result.error)
      error = result.error.message
    }
  } catch (e: any) {
    console.error('Fetch Error:', e)
    error = e.message || 'Failed to load feed'
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Latest Releases</h2>
        <p className="text-zinc-400">
          Fresh Gold Masters from the Apocalypse Radio community
        </p>
      </div>

      {error ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-red-400">
          {error}
        </div>
      ) : goldMasters.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
          <p className="text-zinc-400">No releases yet. Be the first to create a collab!</p>
        </div>
      ) : (
        <FeedList initialData={goldMasters} />
      )}
    </div>
  )
}
