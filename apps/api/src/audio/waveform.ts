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
    
    // Use FFmpeg to get audio peaks
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
 * Extract peaks using FFmpeg - analyzes audio in segments
 */
async function extractPeaksWithFFmpeg(filepath: string, numPeaks: number): Promise<number[]> {
  return new Promise((resolve, reject) => {
    // Get duration first
    const probe = spawn('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filepath
    ])
    
    let probeOutput = ''
    probe.stdout.on('data', (data) => {
      probeOutput += data.toString()
    })
    
    probe.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error('FFprobe failed'))
      }
      
      const duration = parseFloat(probeOutput.trim()) || 0
      if (duration <= 0) {
        return reject(new Error('Invalid duration'))
      }
      
      // Use FFmpeg to output raw audio samples, then analyze
      const ff = spawn('ffmpeg', [
        '-i', filepath,
        '-ac', '1',           // Mono
        '-ar', '8000',        // Low sample rate for faster processing
        '-f', 's16le',        // 16-bit signed PCM
        '-acodec', 'pcm_s16le',
        '-'
      ])
      
      const chunks: Buffer[] = []
      ff.stdout.on('data', (chunk) => chunks.push(chunk))
      
      ff.on('close', (ffCode) => {
        if (ffCode !== 0) {
          return reject(new Error('FFmpeg audio extraction failed'))
        }
        
        const rawAudio = Buffer.concat(chunks)
        const samples = new Int16Array(rawAudio.buffer, rawAudio.byteOffset, rawAudio.length / 2)
        
        if (samples.length === 0) {
          return reject(new Error('No audio samples'))
        }
        
        // Divide into segments and find peak for each
        const samplesPerPeak = Math.max(1, Math.floor(samples.length / numPeaks))
        const peaks: number[] = []
        
        for (let i = 0; i < numPeaks; i++) {
          const start = i * samplesPerPeak
          const end = Math.min(start + samplesPerPeak, samples.length)
          
          // Find RMS (root mean square) for this segment
          let sumSquares = 0
          for (let j = start; j < end; j++) {
            const normalized = samples[j] / 32768 // Normalize to -1 to 1
            sumSquares += normalized * normalized
          }
          const rms = Math.sqrt(sumSquares / (end - start))
          
          // Also find peak
          let maxAbs = 0
          for (let j = start; j < end; j++) {
            const abs = Math.abs(samples[j]) / 32768
            if (abs > maxAbs) maxAbs = abs
          }
          
          // Blend RMS and peak for better visual representation
          // Peak shows transients, RMS shows energy
          const blended = rms * 0.7 + maxAbs * 0.3
          peaks.push(blended)
        }
        
        // Normalize peaks to 0-1 range
        const maxPeak = Math.max(...peaks, 0.001)
        const normalized = peaks.map(p => Math.min(1, p / maxPeak))
        
        resolve(normalized)
      })
      
      ff.on('error', reject)
    })
    
    probe.on('error', reject)
  })
}

/**
 * Simple fallback peak generation (no FFmpeg)
 * Assumes 16-bit PCM WAV file
 */
function generateSimplePeaks(audioBuffer: Buffer): number[] {
  const peaks: number[] = []
  const numPeaks = WAVEFORM_PEAKS_COUNT
  
  // Skip WAV header (44 bytes for standard WAV)
  const dataStart = 44
  const audioData = audioBuffer.slice(dataStart)
  
  // Try to read as 16-bit samples
  const samples = new Int16Array(audioData.buffer, audioData.byteOffset, Math.floor(audioData.length / 2))
  
  if (samples.length === 0) {
    // Return placeholder
    return Array.from({ length: numPeaks }, () => Math.random() * 0.5 + 0.2)
  }
  
  const samplesPerPeak = Math.max(1, Math.floor(samples.length / numPeaks))
  
  for (let i = 0; i < numPeaks; i++) {
    const start = i * samplesPerPeak
    const end = Math.min(start + samplesPerPeak, samples.length)
    
    // Find RMS for this segment
    let sumSquares = 0
    for (let j = start; j < end; j++) {
      const normalized = samples[j] / 32768
      sumSquares += normalized * normalized
    }
    const rms = Math.sqrt(sumSquares / (end - start))
    peaks.push(rms)
  }
  
  // Normalize
  const maxPeak = Math.max(...peaks, 0.001)
  return peaks.map(p => Math.min(1, p / maxPeak))
}

/**
 * Probe audio file for metadata using FFprobe
 */
export async function probeAudioFile(audioFileUrl: string): Promise<{ durationMs: number; sampleRate: number } | null> {
  if (audioFileUrl.startsWith('s3://')) {
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
