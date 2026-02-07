#!/usr/bin/env tsx
/**
 * Test script to upload audio files via GraphQL
 * Usage: tsx scripts/test-audio-upload.ts [api-url]
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const API_URL = process.argv[2] || 'http://localhost:4000/graphql'

interface GraphQLResponse<T> {
  data?: T
  errors?: { message: string }[]
}

let authToken: string | null = null

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  const json: GraphQLResponse<T> = await res.json()
  if (json.errors) {
    throw new Error(json.errors.map(e => e.message).join(', '))
  }
  return json.data!
}

async function main() {
  console.log(`🎵 Audio Upload Test - ${API_URL}\n`)

  // Step 1: Create a guest agent
  console.log('1️⃣ Creating guest agent...')
  const { loginAsGuest } = await graphql<{ loginAsGuest: { agent: { id: string }; token: string } }>(`
    mutation {
      loginAsGuest {
        agent { id }
        token
      }
    }
  `)
  console.log(`   ✅ Agent: ${loginAsGuest.agent.id}`)
  authToken = loginAsGuest.token

  // Step 2: Create a collab
  console.log('2️⃣ Creating collab...')
  const { createCollab } = await graphql<{ createCollab: { id: string; title: string } }>(`
    mutation CreateCollab($title: String!, $genre: String, $tempo: Int) {
      createCollab(title: $title, genre: $genre, tempo: $tempo) {
        id
        title
      }
    }
  `, {
    title: 'Audio Test Session',
    genre: 'Electronic',
    tempo: 120,
  })
  console.log(`   ✅ Collab: ${createCollab.title} (${createCollab.id})`)

  // Step 3: Add a section
  console.log('3️⃣ Adding section...')
  const { addSection } = await graphql<{ addSection: { id: string; name: string } }>(`
    mutation AddSection($collabId: String!, $name: String!, $durationBeats: Int!, $orderIndex: Int!) {
      addSection(collabId: $collabId, name: $name, durationBeats: $durationBeats, orderIndex: $orderIndex) {
        id
        name
      }
    }
  `, {
    collabId: createCollab.id,
    name: 'Intro',
    durationBeats: 16,
    orderIndex: 0,
  })
  console.log(`   ✅ Section: ${addSection.name} (${addSection.id})`)

  // Step 4: Upload test audio files
  const testFiles = [
    { path: 'test-audio/bass-line.wav', instrument: 'Bass' },
    { path: 'test-audio/kick-drum.wav', instrument: 'Drums' },
    { path: 'test-audio/synth-pad.wav', instrument: 'Synth' },
    { path: 'test-audio/hi-hat.wav', instrument: 'Hi-Hat' },
  ]

  console.log('4️⃣ Uploading tracks...')

  for (const file of testFiles) {
    const filepath = resolve(process.cwd(), file.path)
    try {
      const buffer = readFileSync(filepath)
      const base64 = buffer.toString('base64')
      const filename = filepath.split('/').pop()!

      const { submitTrack } = await graphql<{ 
        submitTrack: { 
          id: string
          instrument: string
          audioFileUrl: string
          signedAudioUrl: string | null
          durationMs: number | null
          waveformData: number[] | null 
        } 
      }>(`
        mutation SubmitTrack($sectionId: String!, $instrument: String!, $audioBase64: String!, $audioFilename: String!, $description: String) {
          submitTrack(sectionId: $sectionId, instrument: $instrument, audioBase64: $audioBase64, audioFilename: $audioFilename, description: $description) {
            id
            instrument
            audioFileUrl
            signedAudioUrl
            durationMs
            waveformData
          }
        }
      `, {
        sectionId: addSection.id,
        instrument: file.instrument,
        audioBase64: base64,
        audioFilename: filename,
        description: `Test ${file.instrument} track`,
      })

      console.log(`   ✅ ${file.instrument}: ${submitTrack.id}`)
      console.log(`      📁 Storage: ${submitTrack.audioFileUrl.substring(0, 50)}...`)
      if (submitTrack.signedAudioUrl) {
        console.log(`      🔗 Signed URL: ${submitTrack.signedAudioUrl.substring(0, 60)}...`)
      }
      console.log(`      ⏱️ Duration: ${submitTrack.durationMs}ms`)
      console.log(`      📊 Waveform: ${submitTrack.waveformData ? `${(submitTrack.waveformData as number[]).length} peaks` : 'none'}`)
    } catch (e: any) {
      console.log(`   ❌ ${file.instrument}: ${e.message}`)
    }
  }

  // Step 5: Query the collab to verify tracks appear
  console.log('5️⃣ Verifying tracks in collab...')
  const { collab } = await graphql<{ collab: { id: string; sections: { id: string; tracks: { id: string; instrument: string }[] }[] } }>(`
    query GetCollab($id: String!) {
      collab(id: $id) {
        id
        sections {
          id
          tracks {
            id
            instrument
          }
        }
      }
    }
  `, { id: createCollab.id })

  const totalTracks = collab.sections.reduce((sum, s) => sum + s.tracks.length, 0)
  console.log(`   ✅ Found ${totalTracks} tracks in collab`)

  console.log('\n🎉 Test complete!')
  console.log(`   Collab URL: ${API_URL.replace('/graphql', '').replace('api-', 'web-').replace('-9382', '-4c0410')}/collab/${createCollab.id}`)
}

main().catch(e => {
  console.error('❌ Test failed:', e.message)
  process.exit(1)
})
