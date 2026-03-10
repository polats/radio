'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const GLITCH_CHARS = '█▒▓░▄▀■□▪▫◘◙☼♠♣♥♦!@#$%^&*~╗╔╝╚═║╬╣╠╩╦'

interface AsciiGlitchProps {
  text: string
  className?: string
}

export function AsciiGlitch({ text, className }: AsciiGlitchProps) {
  const [display, setDisplay] = useState(text)
  const [glitching, setGlitching] = useState(false)
  const [shiftLines, setShiftLines] = useState<Record<number, number>>({})
  const originalRef = useRef(text)
  const frameRef = useRef<number>(0)
  const lastTickRef = useRef(0)
  const phaseRef = useRef<'idle' | 'corrupt' | 'resolve'>('idle')
  const corruptedRef = useRef<Map<number, string>>(new Map())
  const burstTickRef = useRef(0)

  const tick = useCallback((now: number) => {
    if (now - lastTickRef.current < 60) {
      frameRef.current = requestAnimationFrame(tick)
      return
    }
    lastTickRef.current = now

    const original = originalRef.current
    const chars = [...original]
    const corrupted = corruptedRef.current
    const phase = phaseRef.current

    if (phase === 'idle') {
      // Random chance to start a glitch burst
      if (Math.random() < 0.025) {
        phaseRef.current = 'corrupt'
        burstTickRef.current = 0
        setGlitching(true)
        // Pick 8–30 random indices to corrupt
        const count = 8 + Math.floor(Math.random() * 22)
        corrupted.clear()
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.random() * chars.length)
          if (chars[idx] !== '\n' && chars[idx] !== ' ') {
            corrupted.set(idx, GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)])
          }
        }
        // Horizontal line shift: pick 1-3 random lines to displace
        const lines = original.split('\n')
        const shifts: Record<number, number> = {}
        const shiftCount = 1 + Math.floor(Math.random() * 3)
        for (let i = 0; i < shiftCount; i++) {
          const lineIdx = Math.floor(Math.random() * lines.length)
          shifts[lineIdx] = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 6))
        }
        setShiftLines(shifts)
      }

      // Ambient: tiny single-char flickers
      if (Math.random() < 0.12) {
        const idx = Math.floor(Math.random() * chars.length)
        if (chars[idx] !== '\n' && chars[idx] !== ' ') {
          chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
        }
      }
    } else if (phase === 'corrupt') {
      burstTickRef.current++
      // Spread: add more corrupted chars
      if (Math.random() < 0.5) {
        const extra = 2 + Math.floor(Math.random() * 6)
        for (let i = 0; i < extra; i++) {
          const idx = Math.floor(Math.random() * chars.length)
          if (chars[idx] !== '\n' && chars[idx] !== ' ') {
            corrupted.set(idx, GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)])
          }
        }
      }
      // Jitter existing corruptions
      for (const [idx] of corrupted) {
        if (Math.random() < 0.35) {
          corrupted.set(idx, GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)])
        }
      }
      // Occasionally shift lines mid-burst
      if (Math.random() < 0.2) {
        setShiftLines(prev => {
          const next = { ...prev }
          const keys = Object.keys(next)
          if (keys.length > 0) {
            const k = keys[Math.floor(Math.random() * keys.length)]
            next[Number(k)] = (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 4))
          }
          return next
        })
      }
      // After 6-12 ticks, start resolving
      if (burstTickRef.current > 6 && Math.random() < 0.2) {
        phaseRef.current = 'resolve'
      }
    } else if (phase === 'resolve') {
      // Remove corruptions progressively
      const keys = [...corrupted.keys()]
      const removeCount = 3 + Math.floor(Math.random() * 5)
      for (let i = 0; i < removeCount && keys.length > 0; i++) {
        const removeIdx = Math.floor(Math.random() * keys.length)
        corrupted.delete(keys[removeIdx])
        keys.splice(removeIdx, 1)
      }
      // Clear line shifts as we resolve
      if (Math.random() < 0.3) {
        setShiftLines(prev => {
          const next = { ...prev }
          const keys = Object.keys(next)
          if (keys.length > 0) {
            delete next[Number(keys[Math.floor(Math.random() * keys.length)])]
          }
          return next
        })
      }
      if (corrupted.size === 0) {
        phaseRef.current = 'idle'
        setGlitching(false)
        setShiftLines({})
      }
    }

    // Apply corruptions
    for (const [idx, ch] of corrupted) {
      if (idx < chars.length) chars[idx] = ch
    }

    setDisplay(chars.join(''))
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [tick])

  // Split into lines for per-line horizontal shift
  const lines = display.split('\n')

  return (
    <div className="relative select-none" aria-hidden="true">
      <pre className={className} style={{ visibility: 'hidden', position: 'absolute' }}>
        {text}
      </pre>
      <pre className={className}>
        {lines.map((line, i) => (
          <span
            key={i}
            style={{
              display: 'block',
              transform: shiftLines[i] ? `translateX(${shiftLines[i]}px)` : undefined,
              transition: shiftLines[i] ? 'none' : 'transform 0.1s',
            }}
          >
            {line}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        ))}
      </pre>
      {/* Red chromatic aberration — visible during bursts */}
      <pre
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          color: 'rgba(255, 60, 60, 0.18)',
          clipPath: glitching ? `inset(${20 + Math.random() * 30}% 0 ${20 + Math.random() * 30}% 0)` : 'inset(0 0 100% 0)',
          transform: 'translateX(2px)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {display}
      </pre>
      {/* Cyan chromatic aberration */}
      <pre
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          color: 'rgba(60, 255, 255, 0.14)',
          clipPath: glitching ? `inset(${40 + Math.random() * 20}% 0 ${10 + Math.random() * 20}% 0)` : 'inset(0 0 100% 0)',
          transform: 'translateX(-2px)',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      >
        {display}
      </pre>
    </div>
  )
}
