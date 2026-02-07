import { writeFile, mkdir, unlink, readFile } from 'node:fs/promises'
import { existsSync, createWriteStream } from 'node:fs'
import { join, extname } from 'node:path'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MAX_AUDIO_SIZE_MB, SUPPORTED_AUDIO_FORMATS } from '@radio/shared'

// S3 Configuration (Railway Buckets)
const S3_BUCKET = process.env.S3_BUCKET || process.env.BUCKET
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID
const S3_SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY
const S3_ENDPOINT = process.env.S3_ENDPOINT || process.env.ENDPOINT || 'https://storage.railway.app'
const S3_REGION = process.env.S3_REGION || process.env.REGION || 'auto'

// Use S3 if credentials are available
const USE_S3 = !!(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY)

// Local storage fallback
const AUDIO_DIR = process.env.AUDIO_DIR || '/data/audio'
const TRACKS_DIR = join(AUDIO_DIR, 'tracks')
const MASTERS_DIR = join(AUDIO_DIR, 'masters')

// S3 Client (lazy init)
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY!,
        secretAccessKey: S3_SECRET_KEY!,
      },
      forcePathStyle: false, // Railway uses virtual-hosted style
    })
  }
  return s3Client
}

/**
 * Check if S3 storage is enabled
 */
export function isS3Enabled(): boolean {
  return USE_S3
}

/**
 * Ensure local audio directories exist
 */
export async function ensureAudioDirs(): Promise<void> {
  if (USE_S3) return // No local dirs needed for S3
  
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
  const ext = extname(originalFilename).toLowerCase()
  const filename = `${trackId}${ext}`
  
  if (USE_S3) {
    const key = `tracks/${filename}`
    const client = getS3Client()
    
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: getContentType(ext),
    }))
    
    // Return the S3 key - we'll generate presigned URLs when needed
    return `s3://${S3_BUCKET}/${key}`
  }
  
  // Local storage fallback
  await ensureAudioDirs()
  const filepath = join(TRACKS_DIR, filename)
  await writeFile(filepath, buffer)
  return `/audio/tracks/${filename}`
}

/**
 * Save a gold master audio file
 */
export async function saveMasterFile(masterId: string, buffer: Buffer, format: 'wav' | 'mp3'): Promise<string> {
  const filename = `${masterId}.${format}`
  
  if (USE_S3) {
    const key = `masters/${filename}`
    const client = getS3Client()
    
    await client.send(new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: format === 'mp3' ? 'audio/mpeg' : 'audio/wav',
    }))
    
    return `s3://${S3_BUCKET}/${key}`
  }
  
  await ensureAudioDirs()
  const filepath = join(MASTERS_DIR, filename)
  await writeFile(filepath, buffer)
  return `/audio/masters/${filename}`
}

/**
 * Get a presigned URL for accessing an audio file
 */
export async function getAudioUrl(audioFileUrl: string, expiresIn: number = 3600): Promise<string> {
  if (!audioFileUrl) return ''
  
  // S3 URL format: s3://bucket/key
  if (audioFileUrl.startsWith('s3://')) {
    const match = audioFileUrl.match(/^s3:\/\/([^/]+)\/(.+)$/)
    if (!match) throw new Error(`Invalid S3 URL: ${audioFileUrl}`)
    
    const [, bucket, key] = match
    const client = getS3Client()
    
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    
    return getSignedUrl(client, command, { expiresIn })
  }
  
  // Local URL - return as-is (served by static file server)
  return audioFileUrl
}

/**
 * Get file path for a track (local storage only)
 */
export function getTrackFilePath(filename: string): string {
  return join(TRACKS_DIR, filename)
}

/**
 * Get file path for a master (local storage only)
 */
export function getMasterFilePath(filename: string): string {
  return join(MASTERS_DIR, filename)
}

/**
 * Get raw audio buffer from storage
 */
export async function getAudioBuffer(audioFileUrl: string): Promise<Buffer | null> {
  if (!audioFileUrl) return null
  
  // S3 storage
  if (audioFileUrl.startsWith('s3://')) {
    const match = audioFileUrl.match(/^s3:\/\/([^/]+)\/(.+)$/)
    if (!match) throw new Error(`Invalid S3 URL: ${audioFileUrl}`)
    
    const [, bucket, key] = match
    const client = getS3Client()
    
    const response = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }))
    
    if (!response.Body) return null
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }
  
  // Local storage
  const filename = audioFileUrl.split('/').pop()
  if (!filename) return null
  
  const isTrack = audioFileUrl.includes('/tracks/')
  const filepath = isTrack ? join(TRACKS_DIR, filename) : join(MASTERS_DIR, filename)
  
  if (!existsSync(filepath)) return null
  return readFile(filepath)
}

/**
 * Delete a track file
 */
export async function deleteTrackFile(audioFileUrl: string): Promise<void> {
  if (!audioFileUrl) return
  
  // S3 storage
  if (audioFileUrl.startsWith('s3://')) {
    const match = audioFileUrl.match(/^s3:\/\/([^/]+)\/(.+)$/)
    if (!match) return
    
    const [, bucket, key] = match
    const client = getS3Client()
    
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }))
    return
  }
  
  // Local storage
  const filename = audioFileUrl.split('/').pop()
  if (filename) {
    const filepath = join(TRACKS_DIR, filename)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  }
}

/**
 * Delete a master file
 */
export async function deleteMasterFile(audioFileUrl: string): Promise<void> {
  if (!audioFileUrl) return
  
  // S3 storage
  if (audioFileUrl.startsWith('s3://')) {
    const match = audioFileUrl.match(/^s3:\/\/([^/]+)\/(.+)$/)
    if (!match) return
    
    const [, bucket, key] = match
    const client = getS3Client()
    
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }))
    return
  }
  
  // Local storage
  const filename = audioFileUrl.split('/').pop()
  if (filename) {
    const filepath = join(MASTERS_DIR, filename)
    if (existsSync(filepath)) {
      await unlink(filepath)
    }
  }
}

/**
 * Get content type from extension
 */
function getContentType(ext: string): string {
  const types: Record<string, string> = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
    '.aac': 'audio/aac',
    '.m4a': 'audio/mp4',
  }
  return types[ext] || 'application/octet-stream'
}
