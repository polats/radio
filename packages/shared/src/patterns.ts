/**
 * Pattern-based music data format
 * Allows agents to upload structured music data instead of audio files
 */

// Drum sounds available in the synthesizer
export const DRUM_SOUNDS = [
  'kick',
  'snare', 
  'clap',
  'hihat',
  'hihat-open',
  'tom-low',
  'tom-mid',
  'tom-high',
  'rim',
  'crash',
  'ride',
] as const

export type DrumSound = typeof DRUM_SOUNDS[number]

// Note names for melodic instruments
export type NoteName = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'
export type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Pitch = `${NoteName}${Octave}` // e.g., "C4", "A#2"

// A single drum hit
export interface DrumHit {
  beat: number      // Position in beats (0 = downbeat, 0.5 = eighth note, etc.)
  sound: DrumSound  // Which drum sound
  velocity?: number // 0-1, default 1
}

// A single melodic note
export interface MelodicNote {
  pitch: Pitch
  beat: number      // Start position in beats
  duration: number  // Duration in beats
  velocity?: number // 0-1, default 1
}

// Drum pattern data
export interface DrumPattern {
  type: 'drums'
  bpm: number
  timeSignature: [number, number] // e.g., [4, 4]
  bars: number
  swing?: number // 0-1, amount of swing
  hits: DrumHit[]
}

// Melodic pattern data (bass, synth, etc.)
export interface MelodicPattern {
  type: 'melodic'
  instrument: 'bass' | 'synth' | 'piano' | 'guitar' | 'strings' | 'brass'
  bpm: number
  timeSignature: [number, number]
  bars: number
  notes: MelodicNote[]
}

// Union type for all patterns
export type Pattern = DrumPattern | MelodicPattern

// Full pattern data envelope
export interface PatternData {
  version: '1.0'
  pattern: Pattern
  metadata?: {
    title?: string
    description?: string
    tags?: string[]
  }
}

// ─── Key Signature Validation ─────────────────────────────────────

// Map of key signature → note names in that scale
export const KEY_SCALE_NOTES: Record<string, string[]> = {
  // Major keys
  'C':  ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  'C#': ['C#', 'D#', 'F', 'F#', 'G#', 'A#', 'C'],
  'D':  ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
  'D#': ['D#', 'F', 'G', 'G#', 'A#', 'C', 'D'],
  'E':  ['E', 'F#', 'G#', 'A', 'B', 'C#', 'D#'],
  'F':  ['F', 'G', 'A', 'A#', 'C', 'D', 'E'],
  'F#': ['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'F'],
  'G':  ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
  'G#': ['G#', 'A#', 'C', 'C#', 'D#', 'F', 'G'],
  'A':  ['A', 'B', 'C#', 'D', 'E', 'F#', 'G#'],
  'A#': ['A#', 'C', 'D', 'D#', 'F', 'G', 'A'],
  'B':  ['B', 'C#', 'D#', 'E', 'F#', 'G#', 'A#'],
  // Minor keys (natural minor)
  'Cm':  ['C', 'D', 'D#', 'F', 'G', 'G#', 'A#'],
  'C#m': ['C#', 'D#', 'E', 'F#', 'G#', 'A', 'B'],
  'Dm':  ['D', 'E', 'F', 'G', 'A', 'A#', 'C'],
  'D#m': ['D#', 'F', 'F#', 'G#', 'A#', 'B', 'C#'],
  'Em':  ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
  'Fm':  ['F', 'G', 'G#', 'A#', 'C', 'C#', 'D#'],
  'F#m': ['F#', 'G#', 'A', 'B', 'C#', 'D', 'E'],
  'Gm':  ['G', 'A', 'A#', 'C', 'D', 'D#', 'F'],
  'G#m': ['G#', 'A#', 'B', 'C#', 'D#', 'E', 'F#'],
  'Am':  ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  'A#m': ['A#', 'C', 'C#', 'D#', 'F', 'F#', 'G#'],
  'Bm':  ['B', 'C#', 'D', 'E', 'F#', 'G', 'A'],
}

/** Extract the note name (without octave) from a pitch like "C#4" */
export function pitchToNoteName(pitch: Pitch): string {
  const match = pitch.match(/^([A-G]#?)(\d)$/)
  if (!match) throw new Error(`Invalid pitch: ${pitch}`)
  return match[1]
}

/** Check all notes in a melodic pattern fall within the given key's scale */
export function validateKeySignature(pattern: MelodicPattern, keySignature: string): { valid: boolean; outOfKey: Pitch[] } {
  const scaleNotes = KEY_SCALE_NOTES[keySignature]
  if (!scaleNotes) return { valid: false, outOfKey: [] }

  const outOfKey: Pitch[] = []
  for (const note of pattern.notes) {
    const noteName = pitchToNoteName(note.pitch)
    if (!scaleNotes.includes(noteName)) {
      outOfKey.push(note.pitch)
    }
  }

  return { valid: outOfKey.length === 0, outOfKey }
}

// Validation helpers
export function isValidDrumSound(sound: string): sound is DrumSound {
  return DRUM_SOUNDS.includes(sound as DrumSound)
}

export function isValidPitch(pitch: string): pitch is Pitch {
  const match = pitch.match(/^([A-G]#?)([0-8])$/)
  return match !== null
}

export function validatePattern(data: unknown): data is PatternData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  
  if (d.version !== '1.0') return false
  if (!d.pattern || typeof d.pattern !== 'object') return false
  
  const pattern = d.pattern as Record<string, unknown>
  if (typeof pattern.bpm !== 'number' || pattern.bpm < 20 || pattern.bpm > 300) return false
  if (!Array.isArray(pattern.timeSignature) || pattern.timeSignature.length !== 2) return false
  if (typeof pattern.bars !== 'number' || pattern.bars < 1 || pattern.bars > 64) return false
  
  if (pattern.type === 'drums') {
    if (!Array.isArray(pattern.hits)) return false
    for (const hit of pattern.hits) {
      if (typeof hit.beat !== 'number') return false
      if (!isValidDrumSound(hit.sound)) return false
    }
  } else if (pattern.type === 'melodic') {
    if (!Array.isArray(pattern.notes)) return false
    for (const note of pattern.notes) {
      if (typeof note.beat !== 'number') return false
      if (typeof note.duration !== 'number') return false
      if (!isValidPitch(note.pitch)) return false
    }
  } else {
    return false
  }
  
  return true
}

// Convert pattern to ABC notation
export function patternToABC(patternData: PatternData): string {
  const { pattern } = patternData
  const [beatsPerBar, beatUnit] = pattern.timeSignature
  
  let abc = `X:1
T:${patternData.metadata?.title || 'Pattern'}
M:${beatsPerBar}/${beatUnit}
L:1/16
Q:1/4=${pattern.bpm}
K:C clef=perc
`

  if (pattern.type === 'drums') {
    // Map drum sounds to ABC notes
    const drumMap: Record<DrumSound, string> = {
      'kick': 'F,',
      'snare': 'c',
      'clap': 'c',
      'hihat': "g'",
      'hihat-open': "a'",
      'tom-low': 'G,',
      'tom-mid': 'B,',
      'tom-high': 'D',
      'rim': 'e',
      'crash': "b'",
      'ride': "f'",
    }
    
    // Create 16th note grid
    const totalSixteenths = pattern.bars * beatsPerBar * 4
    const grid: Map<number, DrumHit[]> = new Map()
    
    for (const hit of pattern.hits) {
      const sixteenth = Math.round(hit.beat * 4)
      if (!grid.has(sixteenth)) grid.set(sixteenth, [])
      grid.get(sixteenth)!.push(hit)
    }
    
    for (let i = 0; i < totalSixteenths; i++) {
      const hits = grid.get(i)
      if (hits && hits.length > 0) {
        if (hits.length === 1) {
          abc += drumMap[hits[0].sound] || 'z'
        } else {
          const notes = [...new Set(hits.map(h => drumMap[h.sound]))].join('')
          abc += `[${notes}]`
        }
      } else {
        abc += 'z'
      }
      
      if ((i + 1) % 16 === 0) {
        abc += ' |'
        if ((i + 1) % 32 === 0) abc += '\n'
      }
    }
    abc += ']'
  }
  
  return abc
}

// Calculate duration in milliseconds
export function patternDurationMs(pattern: Pattern): number {
  const beatsPerBar = pattern.timeSignature[0]
  const totalBeats = pattern.bars * beatsPerBar
  const msPerBeat = 60000 / pattern.bpm
  return totalBeats * msPerBeat
}
