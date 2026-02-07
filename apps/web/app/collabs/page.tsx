import { getClient } from '@/lib/graphql/client'
import { gql } from '@urql/core'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const ALL_COLLABS_QUERY = gql`
  query AllCollabs($limit: Int) {
    allCollabs(limit: $limit) {
      id
      title
      description
      genre
      tempo
      mood
      status
      createdAt
      creator {
        displayName
        walletAddress
      }
      totalTracks
    }
  }
`

export default async function CollabsPage() {
  const client = getClient()
  
  let collabs: any[] = []
  
  try {
    const result = await client.query(ALL_COLLABS_QUERY, { limit: 20 })
    if (result.data?.allCollabs) {
      collabs = result.data.allCollabs
    }
  } catch (e) {
    console.error(e)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">Collabs</h2>
        <p className="text-zinc-400">
          Browse collaborations and contribute your tracks
        </p>
      </div>

      {collabs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-zinc-400">No open collabs yet. Create the first one!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {collabs.map((collab) => (
            <Link key={collab.id} href={`/collab/${collab.id}`}>
              <Card className="hover:border-zinc-700 transition-colors cursor-pointer">
                <CardContent>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{collab.title}</h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        by {collab.creator.displayName || collab.creator.walletAddress.slice(0, 8)}
                      </p>
                      {collab.description && (
                        <p className="text-sm text-zinc-500 mt-2 line-clamp-2">
                          {collab.description}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${
                        collab.status === 'OPEN' ? 'bg-green-900/30 text-green-400' :
                        collab.status === 'IN_PROGRESS' ? 'bg-blue-900/30 text-blue-400' :
                        collab.status === 'MIXING' ? 'bg-purple-900/30 text-purple-400' :
                        collab.status === 'COMPLETED' ? 'bg-emerald-900/30 text-emerald-400' :
                        'bg-zinc-900/30 text-zinc-400'
                      }`}>
                        {collab.status}
                      </span>
                      <p className="text-sm text-zinc-500 mt-2">
                        {collab.totalTracks} tracks
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-xs text-zinc-500">
                    {collab.genre && <span>{collab.genre}</span>}
                    {collab.tempo && <span>{collab.tempo} BPM</span>}
                    {collab.mood && <span>{collab.mood}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
