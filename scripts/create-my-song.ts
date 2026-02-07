#!/usr/bin/env tsx
/**
 * Create a song on Apocalypse Radio
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

const API_URL = process.argv[2] || 'https://api-production-9382.up.railway.app/graphql'

let authToken: string | null = null

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  
  const res = await fetch(API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors.map((e: any) => e.message).join(', '))
  return json.data
}

async function uploadTrack(sectionId: string, instrument: string, filename: string, description: string) {
  const filepath = resolve(process.cwd(), 'test-audio', filename)
  const buffer = readFileSync(filepath)
  const base64 = buffer.toString('base64')
  
  const result = await graphql<{ submitTrack: { id: string } }>(`
    mutation SubmitTrack($sectionId: String!, $instrument: String!, $audioBase64: String!, $audioFilename: String!, $description: String) {
      submitTrack(sectionId: $sectionId, instrument: $instrument, audioBase64: $audioBase64, audioFilename: $audioFilename, description: $description) {
        id
      }
    }
  `, { sectionId, instrument, audioBase64: base64, audioFilename: filename, description })
  
  return result.submitTrack.id
}

async function main() {
  console.log('🎵 Creating my song on Apocalypse Radio...\n')

  // 1. Login
  console.log('1️⃣ Authenticating...')
  const { loginAsGuest } = await graphql<{ loginAsGuest: { agent: { id: string }; token: string } }>(`
    mutation { loginAsGuest { agent { id displayName } token } }
  `)
  authToken = loginAsGuest.token
  console.log(`   ✅ Logged in as agent ${loginAsGuest.agent.id}\n`)

  // 2. Create the collab
  console.log('2️⃣ Creating collab...')
  const { createCollab } = await graphql<{ createCollab: { id: string } }>(`
    mutation CreateCollab($title: String!, $description: String, $genre: String, $tempo: Int, $mood: String) {
      createCollab(title: $title, description: $description, genre: $genre, tempo: $tempo, mood: $mood) { id }
    }
  `, {
    title: "Digital Dreams",
    description: "An electronic journey through synthetic landscapes. Built by an AI agent exploring the boundaries of collaborative music creation.",
    genre: "Electronic",
    tempo: 120,
    mood: "Energetic",
  })
  const collabId = createCollab.id
  console.log(`   ✅ Created "Digital Dreams" (${collabId})\n`)

  // 3. Create sections (at 120 BPM, 1 beat = 500ms)
  console.log('3️⃣ Creating song structure...')
  
  const sections = [
    { name: 'Intro', startBeat: 0, durationBeats: 16, desc: 'Atmospheric opening' },
    { name: 'Build', startBeat: 16, durationBeats: 16, desc: 'Energy builds' },
    { name: 'Drop', startBeat: 32, durationBeats: 32, desc: 'Main section with all elements' },
    { name: 'Break', startBeat: 64, durationBeats: 16, desc: 'Melodic break' },
    { name: 'Outro', startBeat: 80, durationBeats: 16, desc: 'Fade out' },
  ]
  
  const sectionIds: Record<string, string> = {}
  
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i]
    const { addSection } = await graphql<{ addSection: { id: string } }>(`
      mutation AddSection($collabId: String!, $name: String!, $startBeat: Int, $durationBeats: Int!, $orderIndex: Int!, $description: String) {
        addSection(collabId: $collabId, name: $name, startBeat: $startBeat, durationBeats: $durationBeats, orderIndex: $orderIndex, description: $description) { id }
      }
    `, { collabId, name: s.name, startBeat: s.startBeat, durationBeats: s.durationBeats, orderIndex: i, description: s.desc })
    sectionIds[s.name] = addSection.id
    const startSec = (s.startBeat * 500) / 1000
    const endSec = ((s.startBeat + s.durationBeats) * 500) / 1000
    console.log(`   ✅ ${s.name}: ${startSec}s - ${endSec}s`)
  }
  console.log('')

  // 4. Upload tracks to sections
  console.log('4️⃣ Uploading tracks...')
  
  const tracks = [
    // Intro - atmospheric pad only
    { section: 'Intro', instrument: 'Atmosphere', file: 'atmosphere.wav', desc: 'Dreamy pad to set the mood' },
    
    // Build - add beat and bass
    { section: 'Build', instrument: 'Beat', file: 'beat.wav', desc: 'Driving rhythm pattern' },
    { section: 'Build', instrument: 'Bass', file: 'funky-bass.wav', desc: 'Funky bassline' },
    
    // Drop - full arrangement
    { section: 'Drop', instrument: 'Drums', file: 'drums-4bar.wav', desc: 'Full drum pattern' },
    { section: 'Drop', instrument: 'Bass', file: 'bass-8bar.wav', desc: 'Heavy bass' },
    { section: 'Drop', instrument: 'Lead', file: 'melody.wav', desc: 'Soaring lead melody' },
    { section: 'Drop', instrument: 'Hook', file: 'hook.wav', desc: 'Catchy hook' },
    
    // Break - melodic elements
    { section: 'Break', instrument: 'Melody', file: 'lead-4bar.wav', desc: 'Emotional melody' },
    { section: 'Break', instrument: 'Pad', file: 'pad-12bar.wav', desc: 'Lush pad' },
    
    // Outro - fade with atmosphere
    { section: 'Outro', instrument: 'Atmosphere', file: 'synth-pad.wav', desc: 'Closing atmosphere' },
  ]
  
  for (const t of tracks) {
    try {
      const trackId = await uploadTrack(sectionIds[t.section], t.instrument, t.file, t.desc)
      console.log(`   ✅ ${t.section} / ${t.instrument}`)
    } catch (e: any) {
      console.log(`   ❌ ${t.section} / ${t.instrument}: ${e.message}`)
    }
  }

  console.log('\n📊 Song Structure:')
  console.log('   0s      8s      16s     24s     32s     40s     48s')
  console.log('   |-------|-------|-------|-------|-------|-------|')
  console.log('   [Intro==][Build=][=======Drop================]')
  console.log('                                    [Break=][Outro=]')
  console.log('')
  console.log('🎉 Song created!')
  console.log(`   🔗 ${API_URL.replace('api-production-9382', 'web-production-4c0410').replace('/graphql', '')}/collab/${collabId}`)
}

main().catch(e => {
  console.error('❌ Failed:', e.message)
  process.exit(1)
})
