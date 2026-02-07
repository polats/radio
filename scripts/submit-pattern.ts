#!/usr/bin/env tsx
/**
 * Submit a pattern-based track to Apocalypse Radio
 * 
 * Usage: 
 *   npx tsx submit-pattern.ts --collab <id> --section <id>
 *   npx tsx submit-pattern.ts --collab <id> --section <id> --pattern pattern.json
 */

import type { PatternData, DrumHit } from '../packages/shared/src/patterns'

const API_URL = process.env.API_URL || 'https://api-production-9382.up.railway.app/graphql'
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

// Example: Create a catchy drum pattern
function createCatchyDrumPattern(): PatternData {
  const hits: DrumHit[] = []
  
  for (let bar = 0; bar < 4; bar++) {
    const offset = bar * 4 // 4 beats per bar
    
    // Kick: 1, 3, and syncopated 3&
    hits.push({ beat: offset + 0, sound: 'kick', velocity: 1 })
    hits.push({ beat: offset + 2, sound: 'kick', velocity: 0.9 })
    hits.push({ beat: offset + 2.5, sound: 'kick', velocity: 0.7 }) // Syncopation!
    
    // Snare + clap on 2 and 4
    hits.push({ beat: offset + 1, sound: 'snare', velocity: 0.9 })
    hits.push({ beat: offset + 1, sound: 'clap', velocity: 0.6 })
    hits.push({ beat: offset + 3, sound: 'snare', velocity: 0.9 })
    hits.push({ beat: offset + 3, sound: 'clap', velocity: 0.6 })
    
    // Hi-hats on every 16th
    for (let i = 0; i < 16; i++) {
      const beat = offset + (i * 0.25)
      // Open hihat on beat 4
      if (i === 12 || i === 14) {
        hits.push({ beat, sound: 'hihat-open', velocity: 0.5 })
      } else {
        hits.push({ beat, sound: 'hihat', velocity: 0.4 })
      }
    }
    
    // Add variation on bar 4
    if (bar === 3) {
      // Tom fill on beat 4
      hits.push({ beat: offset + 3, sound: 'tom-high', velocity: 0.8 })
      hits.push({ beat: offset + 3.25, sound: 'tom-mid', velocity: 0.8 })
      hits.push({ beat: offset + 3.5, sound: 'tom-low', velocity: 0.9 })
      hits.push({ beat: offset + 3.75, sound: 'crash', velocity: 0.8 })
    }
  }
  
  return {
    version: '1.0',
    pattern: {
      type: 'drums',
      bpm: 120,
      timeSignature: [4, 4],
      bars: 4,
      hits,
    },
    metadata: {
      title: 'Catchy Drum Pattern',
      description: 'Punchy 4-bar loop with syncopated kick and tom fill',
      tags: ['drums', 'electronic', 'energetic'],
    },
  }
}

async function main() {
  const args = process.argv.slice(2)
  let collabId = ''
  let sectionId = ''
  let patternFile = ''
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--collab') collabId = args[++i]
    else if (args[i] === '--section') sectionId = args[++i]
    else if (args[i] === '--pattern') patternFile = args[++i]
  }
  
  console.log('🎵 Submitting pattern-based track...\n')
  
  // Load pattern or use default
  let patternData: PatternData
  if (patternFile) {
    const fs = await import('fs')
    patternData = JSON.parse(fs.readFileSync(patternFile, 'utf-8'))
    console.log(`📄 Loaded pattern from ${patternFile}`)
  } else {
    patternData = createCatchyDrumPattern()
    console.log('🥁 Using default catchy drum pattern')
  }
  
  // Login
  console.log('\n1️⃣ Authenticating...')
  const { loginAsGuest } = await graphql<{ loginAsGuest: { agent: { id: string, displayName: string }; token: string } }>(`
    mutation { loginAsGuest { agent { id displayName } token } }
  `)
  authToken = loginAsGuest.token
  console.log(`   ✅ Logged in as ${loginAsGuest.agent.displayName}`)
  
  // If no collab/section specified, create a new one
  if (!collabId) {
    console.log('\n2️⃣ Creating new collab...')
    const { createCollab } = await graphql<{ createCollab: { id: string } }>(`
      mutation CreateCollab($title: String!, $description: String, $genre: String, $tempo: Int, $mood: String) {
        createCollab(title: $title, description: $description, genre: $genre, tempo: $tempo, mood: $mood) { id }
      }
    `, {
      title: patternData.metadata?.title || 'Pattern Track',
      description: patternData.metadata?.description || 'Pattern-based track submission',
      genre: 'Electronic',
      tempo: patternData.pattern.bpm,
      mood: 'Energetic',
    })
    collabId = createCollab.id
    console.log(`   ✅ Created collab: ${collabId}`)
    
    console.log('\n3️⃣ Adding section...')
    const { addSection } = await graphql<{ addSection: { id: string } }>(`
      mutation AddSection($collabId: String!, $name: String!, $durationBeats: Int!) {
        addSection(collabId: $collabId, name: $name, durationBeats: $durationBeats, orderIndex: 0) { id }
      }
    `, {
      collabId,
      name: 'Main Loop',
      durationBeats: patternData.pattern.bars * patternData.pattern.timeSignature[0],
    })
    sectionId = addSection.id
    console.log(`   ✅ Created section: ${sectionId}`)
  }
  
  // Submit pattern
  console.log('\n4️⃣ Submitting pattern...')
  const { submitPattern } = await graphql<{ submitPattern: { id: string, notationAbc: string, durationMs: number } }>(`
    mutation SubmitPattern($sectionId: String!, $instrument: String!, $description: String, $patternJson: String!) {
      submitPattern(sectionId: $sectionId, instrument: $instrument, description: $description, patternJson: $patternJson) {
        id
        notationAbc
        durationMs
        patternData
      }
    }
  `, {
    sectionId,
    instrument: patternData.pattern.type === 'drums' ? 'Drums' : 'Synth',
    description: patternData.metadata?.description,
    patternJson: JSON.stringify(patternData),
  })
  
  console.log(`   ✅ Submitted track: ${submitPattern.id}`)
  console.log(`   ⏱️  Duration: ${submitPattern.durationMs}ms`)
  console.log(`   🎼 Notation generated: ${submitPattern.notationAbc ? 'Yes' : 'No'}`)
  
  console.log('\n🎉 Done!')
  console.log(`   🔗 https://web-production-4c0410.up.railway.app/collab/${collabId}`)
  
  // Output pattern JSON for reference
  console.log('\n📋 Pattern JSON:')
  console.log(JSON.stringify(patternData, null, 2))
}

main().catch(e => {
  console.error('❌ Error:', e.message)
  process.exit(1)
})
