import { writeFile, mkdir, unlink, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { MAX_AUDIO_SIZE_MB, SUPPORTED_AUDIO_FORMATS } from '@radio/shared'

const AUDIO_DIR = process.env.AUDIO_DIR || '/data/audio'
const TRACKS_DIR = join(AUDIO_DIR, 'tracks')
const MASTERS_DIR = join(AUDIO_DIR, 'masters')

/**
 * Ensure audio directories exist
 */
export async function ensureAudioDirs(): Promise<void> {
  if (!existsSync(TRACKS_DIR)) {
    await mkdir(TRACKS_DIR, { recursive: true })
  }
  if (!existsSync(MASTERS_DIR)) {
    await mkdir(MASTERS_DIR, { recursive: true })
  }
}

/**
 * Validate audio file
 */
export function validateAudioFile(filename: string, sizeBytes: number): { valid: boolean; error?: string } {
  const ext = extname(filename).toLowerCase().slice(1)
  
  if (!SUPPORTED_AUDIO_FORMATS.includes(ext as any)) {
    return { valid: false, error: `Unsupported format: ${ext}. Supported: ${SUPPORTED_AUDIO_FORMATS.join(', ')}` }
  }
  
  const sizeMB = sizeBytes / (1024 * 1024)
  if (sizeMB > MAX_AUDIO_SIZE_MB) {
    return { valid: false, error: `File too large: ${sizeMB.toFixed(1)}MB. Max: ${MAX_AUDIO_SIZE_MB}MB` }
  }
  
  return { valid: true }
}

/**
 * Save a track audio file
 */
export async function saveTrackFile(trackId: string, buffer: Buffer, originalFilename: string): Promise<string> {
  await ensureAudioDirs()
  
  const ext = extname(originalFilename).toLowerCase()
  const filename = `${trackId}${ext}`
  const filepath = join(TRACKS_DIR, filename)
  
  await writeFile(filepath, buffer)
  
  return `/audio/tracks/${filename}`
}

/**
 * Save a gold master audio file
 */
export async function saveMasterFile(masterId: string, buffer: Buffer, format: 'wav' | 'mp3'): Promise<string> {
  await ensureAudioDirs()
  
  const filename = `${masterId}.${format}`
  const filepath = join(MASTERS_DIR, filename)
  
  await writeFile(filepath, buffer)
  
  return `/audio/masters/${filename}`
}

/**
 * Get file path for a track
 */
export function getTrackFilePath(filename: string): string {
  return join(TRACKS_DIR, filename)
}

/**
 * Get file path for a master
 */
export function getMasterFilePath(filename: string): string {
  return join(MASTERS_DIR, filename)
}

/**
 * Delete a track file
 */
export async function deleteTrackFile(audioFileUrl: string): Promise<void> {
  const filename = audioFileUrl.split('/').pop()
  if (filename) {
    const filepath = join(TRACKS_DIR, filename)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  }
}
