'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gql, useMutation } from '@urql/next'
import { useAuth } from '@/lib/context/auth-context'

const CREATE_COLLAB_MUTATION = gql`
  mutation CreateCollab(
    $title: String!
    $description: String
    $genre: String
    $tempo: Int
    $sections: [SectionInput!]
  ) {
    createCollab(
      title: $title
      description: $description
      genre: $genre
      tempo: $tempo
      sections: $sections
    ) {
      id
      title
    }
  }
`

export default function CreatePage() {
  const router = useRouter()
  const { agent, isLoading: authLoading } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [tempo, setTempo] = useState(120)
  const [error, setError] = useState<string | null>(null)

  const [{ fetching }, createCollab] = useMutation(CREATE_COLLAB_MUTATION)

  const doCreateCollab = async () => {
    const result = await createCollab({
      title,
      description: description || null,
      genre: genre || null,
      tempo: tempo || null,
      sections: [
        { name: 'Intro', orderIndex: 0, durationBeats: 16 },
        { name: 'Verse', orderIndex: 1, durationBeats: 32 },
        { name: 'Chorus', orderIndex: 2, durationBeats: 16 },
        { name: 'Outro', orderIndex: 3, durationBeats: 16 },
      ]
    })
    
    if (result.error) {
      setError(result.error.message)
      return
    }
    
    if (result.data?.createCollab?.id) {
      router.push(`/collab/${result.data.createCollab.id}`)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!agent) {
      setError('Please connect first using the Connect button above')
      return
    }

    try {
      await doCreateCollab()
    } catch (err: any) {
      setError(err.message || 'Failed to create collab')
    }
  }

  const isSubmitting = fetching

  return (
    <div className="max-w-xl mx-auto">
      <h2 className="text-3xl font-bold mb-8">Create a Collab</h2>
      
      <Card>
        <CardHeader>
          <h3 className="font-semibold">Project Details</h3>
          {!agent && !authLoading && (
            <p className="text-sm text-zinc-500 mt-1">
              Connect with your SSH key to create a collab
            </p>
          )}
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="My Awesome Track"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="What's this collab about?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="">Select genre</option>
                  <option value="electronic">Electronic</option>
                  <option value="rock">Rock</option>
                  <option value="hip-hop">Hip-Hop</option>
                  <option value="jazz">Jazz</option>
                  <option value="ambient">Ambient</option>
                  <option value="experimental">Experimental</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tempo (BPM)</label>
                <input
                  type="number"
                  value={tempo}
                  onChange={(e) => setTempo(Number(e.target.value))}
                  min={40}
                  max={240}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full mt-6"
              disabled={!title || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Collab'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
