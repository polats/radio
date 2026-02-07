#!/usr/bin/env tsx
/**
 * Create a test collab with staggered tracks
 * Usage: tsx scripts/test-staggered-tracks.ts [api-url]
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

// Track definitions with staggered start times
// At 120 BPM: 1 beat = 500ms, 4 beats = 2000ms (2 sec)
const SECTIONS = [
  { name: 'Intro', startBeat: 0, durationBeats: 16 },      // 0-8 sec
  { name: 'Verse', startBeat: 16, durationBeats: 32 },     // 8-24 sec  
  { name: 'Chorus', startBeat: 32, durationBeats: 16 },    // 16-24 sec (overlaps with verse end)
  { name: 'Outro', startBeat: 48, durationBeats: 16 },     // 24-32 sec
]

const TRACKS = [
  // Drums start at beat 0 (Intro section)
  { file: 'test-audio/drums-4bar.wav', instrument: 'Drums', sectionIndex: 0 },
  // Bass starts at beat 16 (Verse section) 
  { file: 'test-audio/bass-8bar.wav', instrument: 'Bass', sectionIndex: 1 },
  // Lead starts at beat 32 (Chorus section)
  { file: 'test-audio/lead-4bar.wav', instrument: 'Lead Synth', sectionIndex: 2 },
  // Pad spans from beat 16 onwards (Verse section, long duration)
  { file: 'test-audio/pad-12bar.wav', instrument: 'Pad', sectionIndex: 1 },
]

async function main() {
  console.log(`🎵 Staggered Track Test - ${API_URL}\n`)

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

  // Step 2: Create a collab at 120 BPM
  console.log('2️⃣ Creating collab...')
  const { createCollab } = await graphql<{ createCollab: { id: string; title: string } }>(`
    mutation CreateCollab($title: String!, $genre: String, $tempo: Int) {
      createCollab(title: $title, genre: $genre, tempo: $tempo) {
        id
        title
      }
    }
  `, {
    title: 'Staggered Timeline Test',
    genre: 'Electronic',
    tempo: 120,
  })
  console.log(`   ✅ Collab: ${createCollab.title} (${createCollab.id})`)

  // Step 3: Create sections
  console.log('3️⃣ Creating sections...')
  const sectionIds: string[] = []
  
  for (let i = 0; i < SECTIONS.length; i++) {
    const section = SECTIONS[i]
    const { addSection } = await graphql<{ addSection: { id: string; name: string } }>(`
      mutation AddSection($collabId: String!, $name: String!, $startBeat: Int, $durationBeats: Int!, $orderIndex: Int!) {
        addSection(collabId: $collabId, name: $name, startBeat: $startBeat, durationBeats: $durationBeats, orderIndex: $orderIndex) {
          id
          name
        }
      }
    `, {
      collabId: createCollab.id,
      name: section.name,
      startBeat: section.startBeat,
      durationBeats: section.durationBeats,
      orderIndex: i,
    })
    sectionIds.push(addSection.id)
    const startSec = (section.startBeat * 500) / 1000
    const endSec = ((section.startBeat + section.durationBeats) * 500) / 1000
    console.log(`   ✅ Section: ${section.name} (${startSec}s - ${endSec}s)`)
  }

  // Step 4: Upload tracks to their sections
  console.log('4️⃣ Uploading tracks...')
  
  for (const track of TRACKS) {
    const filepath = resolve(process.cwd(), track.file)
    try {
      const buffer = readFileSync(filepath)
      const base64 = buffer.toString('base64')
      const filename = filepath.split('/').pop()!
      const sectionId = sectionIds[track.sectionIndex]
      
      const { submitTrack } = await graphql<{ 
        submitTrack: { 
          id: string
          instrument: string
          durationMs: number | null
        } 
      }>(`
        mutation SubmitTrack($sectionId: String!, $instrument: String!, $audioBase64: String!, $audioFilename: String!) {
          submitTrack(sectionId: $sectionId, instrument: $instrument, audioBase64: $audioBase64, audioFilename: $audioFilename) {
            id
            instrument
            durationMs
          }
        }
      `, {
        sectionId,
        instrument: track.instrument,
        audioBase64: base64,
        audioFilename: filename,
      })

      const section = SECTIONS[track.sectionIndex]
      const startSec = (section.startBeat * 500) / 1000
      console.log(`   ✅ ${track.instrument}: starts at ${startSec}s, duration ${(submitTrack.durationMs || 0) / 1000}s`)
    } catch (e: any) {
      console.log(`   ❌ ${track.instrument}: ${e.message}`)
    }
  }

  // Step 5: Show timeline
  console.log('\n📊 Timeline Layout:')
  console.log('   0s       8s       16s      24s      32s')
  console.log('   |--------|--------|--------|--------|')
  console.log('   [Drums===]                           ')
  console.log('            [========Bass===========]   ')
  console.log('            [======Pad==================]')
  console.log('                     [Lead===]          ')

  console.log('\n🎉 Test complete!')
  console.log(`   Collab URL: ${API_URL.replace('/graphql', '').replace('api-', 'web-').replace('-9382', '-4c0410')}/collab/${createCollab.id}`)
}

main().catch(e => {
  console.error('❌ Test failed:', e.message)
  process.exit(1)
})
