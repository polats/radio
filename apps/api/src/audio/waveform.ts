import { spawn } from 'node:child_process'
import { writeFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { WAVEFORM_PEAKS_COUNT } from '@radio/shared'

/**
 * Generate waveform peaks from audio buffer using FFmpeg
 * Falls back to simplified analysis if FFmpeg not available
 */
export async function generateWaveformPeaks(audioBuffer: Buffer): Promise<number[]> {
  try {
    // Write buffer to temp file
    const tempPath = join(tmpdir(), `audio-${randomBytes(8).toString('hex')}.wav`)
    await writeFile(tempPath, audioBuffer)
    
    // Use FFmpeg to get audio peaks via astats filter
    const peaks = await extractPeaksWithFFmpeg(tempPath, WAVEFORM_PEAKS_COUNT)
    
    // Clean up temp file
    await unlink(tempPath).catch(() => {})
    
    return peaks
  } catch (e) {
    console.warn('FFmpeg waveform generation failed, using fallback:', e)
    return generateSimplePeaks(audioBuffer)
  }
}

/**
 * Extract peaks using FFmpeg
 */
async function extractPeaksWithFFmpeg(filepath: string, numPeaks: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    // First, get the duration
    const probe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filepath
    ])
    
    let duration = 0
    let probeOutput = ''
    
    probe.stdout.on('data', (data) => {
      probeOutput += data.toString()
    })
    
    probe.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error('FFprobe failed'))
      }
      
      duration = parseFloat(probeOutput.trim()) || 0
      if (duration <= 0) {
        return reject(new Error('Invalid duration'))
      }
      
      // Now extract peaks using ffmpeg with showwaves filter
      // We use astats to get RMS values for each segment
      const segmentDuration = duration / numPeaks
      const peaks: number[] = []
      let completed = 0
      
      // Process in parallel batches
      const processSegment = (index: number): Promise<number> => {
        return new Promise((res, rej) => {
          const startTime = index * segmentDuration
          
          const ff = spawn('ffmpeg', [
            '-ss', startTime.toString(),
            '-t', segmentDuration.toString(),
            '-i', filepath,
            '-af', 'astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level',
            '-f', 'null',
            '-'
          ])
          
          let stderr = ''
          ff.stderr.on('data', (data) => {
            stderr += data.toString()
          })
          
          ff.on('close', () => {
            // Parse RMS level from output
            const match = stderr.match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+\.?\d*)/i)
            if (match) {
              // Convert dB to 0-1 range (-60dB = 0, 0dB = 1)
              const db = parseFloat(match[1])
              const normalized = Math.max(0, Math.min(1, (db + 60) / 60))
              res(normalized)
            } else {
              // Fallback: calculate based on peak
              const peakMatch = stderr.match(/lavfi\.astats\.Overall\.Peak_level=(-?\d+\.?\d*)/i)
              if (peakMatch) {
                const db = parseFloat(peakMatch[1])
                res(Math.max(0, Math.min(1, (db + 60) / 60)))
              } else {
                res(0.1) // Minimum visible level
              }
            }
          })
          
          ff.on('error', () => res(0.1))
        })
      }
      
      // Simpler approach: use showwavespic to generate a simple analysis
      const ff = spawn('ffmpeg', [
        '-i', filepath,
        '-filter_complex', `[0:a]showwavespic=s=${numPeaks}x1:colors=white[v]`,
        '-map', '[v]',
        '-frames:v', '1',
        '-f', 'rawvideo',
        '-pix_fmt', 'gray',
        '-'
      ])
      
      const chunks: Buffer[] = []
      ff.stdout.on('data', (chunk) => chunks.push(chunk))
      
      ff.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const data = Buffer.concat(chunks)
          const result: number[] = []
          for (let i = 0; i < Math.min(numPeaks, data.length); i++) {
            result.push(data[i] / 255) // Normalize to 0-1
          }
          // Pad if needed
          while (result.length < numPeaks) {
            result.push(0)
          }
          resolve(result)
        } else {
          reject(new Error('FFmpeg waveform extraction failed'))
        }
      })
      
      ff.on('error', reject)
    })
    
    probe.on('error', reject)
  })
}

/**
 * Simple fallback peak generation (no FFmpeg)
 */
function generateSimplePeaks(audioBuffer: Buffer): number[] {
  const peaks: number[] = []
  const numPeaks = WAVEFORM_PEAKS_COUNT
  const chunkSize = Math.max(1, Math.floor(audioBuffer.length / numPeaks))
  
  for (let i = 0; i < numPeaks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, audioBuffer.length)
    
    // Find max absolute value in chunk
    let max = 0
    for (let j = start; j < end; j++) {
      // Assuming 8-bit samples centered at 128
      const value = Math.abs(audioBuffer[j] - 128) / 128
      if (value > max) max = value
    }
    
    peaks.push(max)
  }
  
  return peaks
}

/**
 * Probe audio file for metadata using FFprobe
 */
export async function probeAudioFile(audioFileUrl: string): Promise<{ durationMs: number; sampleRate: number } | null> {
  // For S3 URLs, we can't probe directly - would need to download first
  // For local files, strip the URL prefix
  if (audioFileUrl.startsWith('s3://')) {
    // For now, return null for S3 files - we could implement downloading later
    return null
  }
  
  const filename = audioFileUrl.split('/').pop()
  if (!filename) return null
  
  const AUDIO_DIR = process.env.AUDIO_DIR || '/data/audio'
  const filepath = audioFileUrl.includes('/tracks/') 
    ? `${AUDIO_DIR}/tracks/${filename}`
    : `${AUDIO_DIR}/masters/${filename}`
  
  return probeFile(filepath)
}

/**
 * Probe a file path for audio metadata
 */
export async function probeFile(filepath: string): Promise<{ durationMs: number; sampleRate: number } | null> {
  return new Promise((resolve) => {
    const ff = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration:stream=sample_rate',
      '-of', 'json',
      filepath
    ])
    
    let output = ''
    ff.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    ff.on('close', (code) => {
      if (code !== 0) {
        resolve(null)
        return
      }
      
      try {
        const data = JSON.parse(output)
        const duration = parseFloat(data.format?.duration) || 0
        const sampleRate = parseInt(data.streams?.[0]?.sample_rate) || 44100
        
        resolve({
          durationMs: Math.round(duration * 1000),
          sampleRate,
        })
      } catch (e) {
        resolve(null)
      }
    })
    
    ff.on('error', () => resolve(null))
  })
}

/**
 * Probe audio buffer for metadata
 */
export async function probeBuffer(buffer: Buffer): Promise<{ durationMs: number; sampleRate: number } | null> {
  const tempPath = join(tmpdir(), `probe-${randomBytes(8).toString('hex')}.wav`)
  await writeFile(tempPath, buffer)
  
  try {
    const result = await probeFile(tempPath)
    await unlink(tempPath).catch(() => {})
    return result
  } catch (e) {
    await unlink(tempPath).catch(() => {})
    return null
  }
}
