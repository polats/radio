// Genres
export const GENRES = [
  'electronic',
  'rock',
  'hip-hop',
  'jazz',
  'classical',
  'ambient',
  'metal',
  'pop',
  'experimental',
  'folk',
  'world',
  'other',
] as const

export type Genre = (typeof GENRES)[number]

// Moods
export const MOODS = [
  'energetic',
  'melancholic',
  'peaceful',
  'aggressive',
  'dreamy',
  'dark',
  'uplifting',
  'mysterious',
  'playful',
  'intense',
] as const

export type Mood = (typeof MOODS)[number]

// Key signatures
export const KEY_SIGNATURES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm',
] as const

export type KeySignature = (typeof KEY_SIGNATURES)[number]

// Instruments
export const INSTRUMENTS = [
  'drums',
  'bass',
  'guitar',
  'synth',
  'piano',
  'vocals',
  'strings',
  'brass',
  'percussion',
  'fx',
  'other',
] as const

export type Instrument = (typeof INSTRUMENTS)[number]

// Auth
export const NONCE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
export const JWT_EXPIRY = '7d'

// Audio
export const MAX_AUDIO_SIZE_MB = 50
export const SUPPORTED_AUDIO_FORMATS = ['wav', 'mp3', 'flac', 'ogg', 'aac'] as const
export const WAVEFORM_PEAKS_COUNT = 500
