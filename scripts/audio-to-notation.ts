#!/usr/bin/env tsx
/**
 * Generate ABC notation from drum beat patterns
 * 
 * For programmatically generated beats, we can derive notation from the generation params.
 * For arbitrary audio, this would need onset detection (future feature).
 * 
 * Usage: npx tsx audio-to-notation.ts --input beat.wav --bpm 120 --output notation.abc
 */

interface DrumHit {
  time: number      // in beats (0 = downbeat)
  drum: 'kick' | 'snare' | 'hihat' | 'hihat-open' | 'tom' | 'rim' | 'clap' | 'crash'
}

interface NotationOptions {
  title?: string
  bpm?: number
  bars?: number
  timeSignature?: [number, number]
}

// ABC notation drum mapping (using standard percussion clef notes)
const DRUM_ABC: Record<string, string> = {
  'kick': 'F,',      // Bass drum (low F)
  'snare': 'c',      // Snare (middle C)
  'hihat': "g'",     // Hi-hat closed (high G)
  'hihat-open': "a'", // Hi-hat open
  'tom': 'A,',       // Tom
  'rim': 'e',        // Rim shot
  'clap': 'c',       // Clap (same as snare)
  'crash': "b'",     // Crash
}

// Catchy beat pattern (120 BPM, 4 bars)
// Each beat = 1, subdivisions: e = 0.25, & = 0.5, a = 0.75
function getCatchyBeatPattern(): DrumHit[] {
  const hits: DrumHit[] = []
  
  for (let bar = 0; bar < 4; bar++) {
    const offset = bar * 4  // 4 beats per bar
    
    // Standard pattern for bars 1-3
    // Beat 1: Kick + hihat
    hits.push({ time: offset + 0, drum: 'kick' })
    hits.push({ time: offset + 0, drum: 'hihat' })
    
    // e, &, a of beat 1: hihats
    hits.push({ time: offset + 0.25, drum: 'hihat' })
    hits.push({ time: offset + 0.5, drum: 'hihat' })
    hits.push({ time: offset + 0.75, drum: 'hihat' })
    
    // Beat 2: Snare + clap + hihat
    hits.push({ time: offset + 1, drum: 'snare' })
    hits.push({ time: offset + 1, drum: 'clap' })
    hits.push({ time: offset + 1, drum: 'hihat' })
    hits.push({ time: offset + 1.25, drum: 'hihat' })
    
    if (bar === 2) {
      // Bar 3: tom on beat 2&
      hits.push({ time: offset + 1.5, drum: 'tom' })
    } else {
      hits.push({ time: offset + 1.5, drum: 'hihat' })
    }
    hits.push({ time: offset + 1.75, drum: 'hihat' })
    
    // Beat 3: Kick + hihat, then kick on &
    hits.push({ time: offset + 2, drum: 'kick' })
    hits.push({ time: offset + 2, drum: 'hihat' })
    hits.push({ time: offset + 2.25, drum: 'hihat' })
    hits.push({ time: offset + 2.5, drum: 'kick' })  // Syncopated!
    hits.push({ time: offset + 2.5, drum: 'hihat' })
    hits.push({ time: offset + 2.75, drum: 'hihat' })
    
    // Beat 4: Snare + open hihat (or fill on bar 4)
    if (bar === 3) {
      // Bar 4: Fill - tom tom snare kick
      hits.push({ time: offset + 3, drum: 'tom' })
      hits.push({ time: offset + 3.25, drum: 'tom' })
      hits.push({ time: offset + 3.5, drum: 'snare' })
      hits.push({ time: offset + 3.5, drum: 'clap' })
      hits.push({ time: offset + 3.75, drum: 'kick' })
      hits.push({ time: offset + 3.75, drum: 'hihat-open' })
    } else {
      hits.push({ time: offset + 3, drum: 'snare' })
      hits.push({ time: offset + 3, drum: 'clap' })
      hits.push({ time: offset + 3, drum: 'hihat-open' })
      hits.push({ time: offset + 3.25, drum: 'hihat' })
      if (bar === 1) {
        // Bar 2: rim on &
        hits.push({ time: offset + 3.5, drum: 'rim' })
      } else {
        hits.push({ time: offset + 3.5, drum: 'hihat' })
      }
      hits.push({ time: offset + 3.75, drum: 'hihat' })
    }
  }
  
  return hits
}

// Convert hits to ABC notation
function hitsToABC(hits: DrumHit[], options: NotationOptions = {}): string {
  const {
    title = 'Drum Beat',
    bpm = 120,
    bars = 4,
    timeSignature = [4, 4],
  } = options
  
  // Group hits by sixteenth note position
  const [beatsPerBar] = timeSignature
  const totalSixteenths = bars * beatsPerBar * 4
  const grid: Map<number, DrumHit[]> = new Map()
  
  for (const hit of hits) {
    const sixteenth = Math.round(hit.time * 4)
    if (!grid.has(sixteenth)) grid.set(sixteenth, [])
    grid.get(sixteenth)!.push(hit)
  }
  
  // Build ABC string
  let abc = `X:1
T:${title}
M:${timeSignature[0]}/${timeSignature[1]}
L:1/16
Q:1/4=${bpm}
K:C clef=perc
%%stretchlast 1
%%percmap F, F, kick nhd
%%percmap c c snare nhd
%%percmap g' g' hihat xhd
%%percmap a' a' hihat-open xhd
%%percmap A, A, tom nhd
%%percmap e e rim xhd
%%percmap b' b' crash xhd
`
  
  let currentBar = ''
  for (let i = 0; i < totalSixteenths; i++) {
    const hitsAtPos = grid.get(i)
    
    if (hitsAtPos && hitsAtPos.length > 0) {
      if (hitsAtPos.length === 1) {
        currentBar += DRUM_ABC[hitsAtPos[0].drum] || 'z'
      } else {
        // Chord notation for simultaneous hits
        const notes = [...new Set(hitsAtPos.map(h => DRUM_ABC[h.drum]))].join('')
        currentBar += `[${notes}]`
      }
    } else {
      currentBar += 'z'  // Rest
    }
    
    // Bar line every 16 sixteenths (one bar in 4/4)
    if ((i + 1) % 16 === 0) {
      abc += currentBar + ' |'
      if ((i + 1) % 32 === 0) abc += '\n'  // New line every 2 bars
      currentBar = ''
    }
  }
  
  abc += ']'  // End bar
  
  return abc
}

// Generate JSON format for web rendering
interface NotationJSON {
  format: 'abc'
  abc: string
  meta: {
    title: string
    bpm: number
    bars: number
    timeSignature: [number, number]
    durationMs: number
  }
}

function generateNotationJSON(hits: DrumHit[], options: NotationOptions = {}): NotationJSON {
  const abc = hitsToABC(hits, options)
  const bars = options.bars || 4
  const bpm = options.bpm || 120
  const [beatsPerBar] = options.timeSignature || [4, 4]
  const durationMs = (bars * beatsPerBar * 60000) / bpm
  
  return {
    format: 'abc',
    abc,
    meta: {
      title: options.title || 'Drum Beat',
      bpm,
      bars,
      timeSignature: options.timeSignature || [4, 4],
      durationMs,
    }
  }
}

// CLI
const args = process.argv.slice(2)
let outputPath = ''
let title = 'Catchy Beat'
let bpm = 120
let format: 'abc' | 'json' = 'json'

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--output' || args[i] === '-o') outputPath = args[++i]
  else if (args[i] === '--title' || args[i] === '-t') title = args[++i]
  else if (args[i] === '--bpm' || args[i] === '-b') bpm = parseInt(args[++i])
  else if (args[i] === '--format' || args[i] === '-f') format = args[++i] as 'abc' | 'json'
}

async function main() {
  const pattern = getCatchyBeatPattern()
  const result = format === 'json' 
    ? JSON.stringify(generateNotationJSON(pattern, { title, bpm, bars: 4 }), null, 2)
    : hitsToABC(pattern, { title, bpm, bars: 4 })

  if (outputPath) {
    const fs = await import('fs')
    fs.writeFileSync(outputPath, result)
    console.log(`✅ Wrote ${format.toUpperCase()} notation to ${outputPath}`)
  } else {
    console.log(result)
  }
}

// Only run if called directly
if (process.argv[1]?.includes('audio-to-notation')) {
  main().catch(console.error)
}

export { getCatchyBeatPattern, hitsToABC, generateNotationJSON, type DrumHit, type NotationJSON }
