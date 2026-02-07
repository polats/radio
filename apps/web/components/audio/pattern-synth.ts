/**
 * Pattern Synthesizer
 * Uses Tone.js to synthesize audio from pattern data
 */

import * as Tone from 'tone'
import type { PatternData, DrumPattern, DrumSound, DrumHit } from '@radio/shared'

// Drum synth configuration
const DRUM_CONFIG: Record<DrumSound, { type: 'membrane' | 'noise' | 'metal', config: any }> = {
  'kick': {
    type: 'membrane',
    config: { pitchDecay: 0.05, octaves: 6, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 } }
  },
  'snare': {
    type: 'noise',
    config: { noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.15, sustain: 0, release: 0.1 } }
  },
  'clap': {
    type: 'noise', 
    config: { noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.05 } }
  },
  'hihat': {
    type: 'metal',
    config: { frequency: 400, envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1 }
  },
  'hihat-open': {
    type: 'metal',
    config: { frequency: 400, envelope: { attack: 0.001, decay: 0.3, release: 0.1 }, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1 }
  },
  'tom-low': {
    type: 'membrane',
    config: { pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 } }
  },
  'tom-mid': {
    type: 'membrane',
    config: { pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.1 } }
  },
  'tom-high': {
    type: 'membrane',
    config: { pitchDecay: 0.08, octaves: 4, oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 } }
  },
  'rim': {
    type: 'membrane',
    config: { pitchDecay: 0.01, octaves: 2, oscillator: { type: 'triangle' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 } }
  },
  'crash': {
    type: 'metal',
    config: { frequency: 300, envelope: { attack: 0.001, decay: 1.5, release: 0.5 }, harmonicity: 5.1, modulationIndex: 40, resonance: 5000, octaves: 1.5 }
  },
  'ride': {
    type: 'metal',
    config: { frequency: 350, envelope: { attack: 0.001, decay: 0.8, release: 0.3 }, harmonicity: 4, modulationIndex: 20, resonance: 4500, octaves: 1 }
  },
}

// Pitch values for membrane drums
const DRUM_PITCHES: Partial<Record<DrumSound, string>> = {
  'kick': 'C1',
  'tom-low': 'G1',
  'tom-mid': 'C2',
  'tom-high': 'E2',
  'rim': 'C4',
}

export class PatternSynth {
  private synths: Map<DrumSound, Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth> = new Map()
  private scheduledEvents: number[] = []
  private isPlaying = false
  private startTime = 0
  
  constructor() {
    // Initialize synths lazily
  }
  
  private getSynth(sound: DrumSound): Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth {
    if (!this.synths.has(sound)) {
      const config = DRUM_CONFIG[sound]
      let synth: Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth
      
      if (config.type === 'membrane') {
        synth = new Tone.MembraneSynth(config.config).toDestination()
      } else if (config.type === 'noise') {
        synth = new Tone.NoiseSynth(config.config).toDestination()
      } else {
        synth = new Tone.MetalSynth(config.config).toDestination()
      }
      
      this.synths.set(sound, synth)
    }
    return this.synths.get(sound)!
  }
  
  async play(patternData: PatternData, loop = false): Promise<void> {
    await Tone.start()
    
    const { pattern } = patternData
    if (pattern.type !== 'drums') {
      console.warn('Only drum patterns are currently supported')
      return
    }
    
    this.stop()
    
    Tone.getTransport().bpm.value = pattern.bpm
    
    const beatsPerBar = pattern.timeSignature[0]
    const totalBeats = pattern.bars * beatsPerBar
    
    // Schedule all hits
    for (const hit of pattern.hits) {
      const time = Tone.Time(`0:${Math.floor(hit.beat)}:${(hit.beat % 1) * 4}`).toSeconds()
      
      const eventId = Tone.getTransport().schedule((scheduledTime) => {
        this.triggerDrum(hit.sound, hit.velocity ?? 1)
      }, time)
      
      this.scheduledEvents.push(eventId)
    }
    
    if (loop) {
      Tone.getTransport().loop = true
      Tone.getTransport().loopStart = 0
      Tone.getTransport().loopEnd = `${pattern.bars}:0:0`
    } else {
      Tone.getTransport().loop = false
    }
    
    Tone.getTransport().start()
    this.isPlaying = true
    this.startTime = Tone.now()
  }
  
  private triggerDrum(sound: DrumSound, velocity: number): void {
    const synth = this.getSynth(sound)
    const config = DRUM_CONFIG[sound]
    
    if (config.type === 'membrane') {
      const pitch = DRUM_PITCHES[sound] || 'C2'
      ;(synth as Tone.MembraneSynth).triggerAttackRelease(pitch, '8n', undefined, velocity)
    } else if (config.type === 'noise') {
      ;(synth as Tone.NoiseSynth).triggerAttackRelease('8n', undefined, velocity)
    } else {
      ;(synth as Tone.MetalSynth).triggerAttackRelease('16n', undefined, velocity)
    }
  }
  
  stop(): void {
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    this.scheduledEvents = []
    this.isPlaying = false
  }
  
  pause(): void {
    Tone.getTransport().pause()
    this.isPlaying = false
  }
  
  resume(): void {
    Tone.getTransport().start()
    this.isPlaying = true
  }
  
  get playing(): boolean {
    return this.isPlaying
  }
  
  get currentTime(): number {
    return Tone.getTransport().seconds
  }
  
  dispose(): void {
    this.stop()
    for (const synth of this.synths.values()) {
      synth.dispose()
    }
    this.synths.clear()
  }
}

// Singleton instance
let synthInstance: PatternSynth | null = null

export function getPatternSynth(): PatternSynth {
  if (!synthInstance) {
    synthInstance = new PatternSynth()
  }
  return synthInstance
}

// Generate waveform preview from pattern (simulated peaks)
export function generatePatternWaveform(patternData: PatternData, numPeaks = 500): number[] {
  const { pattern } = patternData
  if (pattern.type !== 'drums') return Array(numPeaks).fill(0.2)
  
  const beatsPerBar = pattern.timeSignature[0]
  const totalBeats = pattern.bars * beatsPerBar
  const peaksPerBeat = numPeaks / totalBeats
  
  const peaks: number[] = Array(numPeaks).fill(0)
  
  // Amplitude for different drums
  const drumAmplitude: Record<DrumSound, number> = {
    'kick': 1.0,
    'snare': 0.9,
    'clap': 0.7,
    'hihat': 0.3,
    'hihat-open': 0.4,
    'tom-low': 0.8,
    'tom-mid': 0.7,
    'tom-high': 0.6,
    'rim': 0.4,
    'crash': 0.9,
    'ride': 0.5,
  }
  
  for (const hit of pattern.hits) {
    const peakIndex = Math.floor(hit.beat * peaksPerBeat)
    if (peakIndex >= 0 && peakIndex < numPeaks) {
      const amplitude = drumAmplitude[hit.sound] * (hit.velocity ?? 1)
      // Add transient spike
      peaks[peakIndex] = Math.max(peaks[peakIndex], amplitude)
      // Add short decay
      for (let i = 1; i < 4 && peakIndex + i < numPeaks; i++) {
        peaks[peakIndex + i] = Math.max(peaks[peakIndex + i], amplitude * (1 - i * 0.3))
      }
    }
  }
  
  return peaks
}
