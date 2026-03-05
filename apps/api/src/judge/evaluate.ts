import { prisma } from '@radio/db'
import { validatePattern, validateKeySignature, type PatternData, type MelodicPattern, type DrumPattern } from '@radio/shared'
import { createHmac } from 'crypto'

interface CheckResult {
  name: string
  passed: boolean
  details: string
}

interface EvaluationResult {
  passed: boolean
  scores: {
    checks: CheckResult[]
    overallScore: number
  }
  attestation: object | null
}

/**
 * Evaluate a trial attempt against its trial constraints.
 * Runs synchronous checks — pure CPU, no queue needed for MVP.
 */
export async function evaluateAttempt(attemptId: string): Promise<EvaluationResult> {
  const attempt = await prisma.trialAttempt.findUnique({
    where: { id: attemptId },
    include: {
      trial: true,
      agent: true,
      collab: {
        include: {
          sections: {
            include: {
              tracks: true,
            },
          },
        },
      },
    },
  })

  if (!attempt) throw new Error('Attempt not found')
  if (attempt.status !== 'PENDING' && attempt.status !== 'EVALUATING') {
    throw new Error('Attempt already evaluated')
  }

  // Mark as evaluating
  await prisma.trialAttempt.update({
    where: { id: attemptId },
    data: { status: 'EVALUATING' },
  })

  const constraints = attempt.trial.constraints as Record<string, unknown>
  const judgeCriteria = attempt.trial.judgeCriteria as Record<string, unknown>
  const checks: CheckResult[] = []

  // Collect all tracks across all sections
  const allTracks = attempt.collab.sections.flatMap((s) => s.tracks)

  // ── Check: Has tracks submitted ──
  checks.push({
    name: 'has_tracks',
    passed: allTracks.length > 0,
    details: allTracks.length > 0
      ? `${allTracks.length} track(s) submitted`
      : 'No tracks submitted',
  })

  // ── Check: All patterns valid ──
  const patternTracks = allTracks.filter((t) => t.patternData != null)
  let allPatternsValid = true
  const invalidPatterns: string[] = []

  for (const track of patternTracks) {
    if (!validatePattern(track.patternData)) {
      allPatternsValid = false
      invalidPatterns.push(track.id)
    }
  }

  checks.push({
    name: 'patterns_valid',
    passed: allPatternsValid,
    details: allPatternsValid
      ? `${patternTracks.length} pattern(s) valid`
      : `Invalid patterns: ${invalidPatterns.join(', ')}`,
  })

  // ── Check: BPM matches constraint ──
  if (constraints.bpm != null) {
    const targetBpm = constraints.bpm as number
    let bpmMatch = true
    const mismatches: string[] = []

    for (const track of patternTracks) {
      const pd = track.patternData as unknown as PatternData
      if (pd.pattern.bpm !== targetBpm) {
        bpmMatch = false
        mismatches.push(`${track.instrument}: ${pd.pattern.bpm} BPM`)
      }
    }

    checks.push({
      name: 'bpm_match',
      passed: bpmMatch,
      details: bpmMatch
        ? `All tracks at ${targetBpm} BPM`
        : `BPM mismatches: ${mismatches.join(', ')} (expected ${targetBpm})`,
    })
  }

  // ── Check: Key signature adherence (melodic patterns) ──
  if (constraints.keySignature != null) {
    const key = constraints.keySignature as string
    let keyMatch = true
    const outOfKeyNotes: string[] = []

    for (const track of patternTracks) {
      const pd = track.patternData as unknown as PatternData
      if (pd.pattern.type === 'melodic') {
        const result = validateKeySignature(pd.pattern as MelodicPattern, key)
        if (!result.valid) {
          keyMatch = false
          outOfKeyNotes.push(`${track.instrument}: ${result.outOfKey.join(', ')}`)
        }
      }
    }

    checks.push({
      name: 'key_signature',
      passed: keyMatch,
      details: keyMatch
        ? `All melodic patterns in key of ${key}`
        : `Out-of-key notes: ${outOfKeyNotes.join('; ')}`,
    })
  }

  // ── Check: Required instruments present ──
  if (Array.isArray(constraints.requiredInstruments)) {
    const required = constraints.requiredInstruments as string[]
    const present = new Set(allTracks.map((t) => t.instrument.toLowerCase()))
    const missing = required.filter((i) => !present.has(i.toLowerCase()))

    checks.push({
      name: 'required_instruments',
      passed: missing.length === 0,
      details: missing.length === 0
        ? `All required instruments present: ${required.join(', ')}`
        : `Missing instruments: ${missing.join(', ')}`,
    })
  }

  // ── Check: Required drum sounds used ──
  if (Array.isArray(constraints.requiredDrumSounds)) {
    const required = constraints.requiredDrumSounds as string[]
    const usedSounds = new Set<string>()

    for (const track of patternTracks) {
      const pd = track.patternData as unknown as PatternData
      if (pd.pattern.type === 'drums') {
        for (const hit of (pd.pattern as DrumPattern).hits) {
          usedSounds.add(hit.sound)
        }
      }
    }

    const missing = required.filter((s) => !usedSounds.has(s))

    checks.push({
      name: 'required_drum_sounds',
      passed: missing.length === 0,
      details: missing.length === 0
        ? `All required drum sounds used: ${required.join(', ')}`
        : `Missing drum sounds: ${missing.join(', ')}`,
    })
  }

  // ── Check: Minimum bars met ──
  if (constraints.minBars != null) {
    const minBars = constraints.minBars as number
    let meetsMinBars = true
    const shortTracks: string[] = []

    for (const track of patternTracks) {
      const pd = track.patternData as unknown as PatternData
      if (pd.pattern.bars < minBars) {
        meetsMinBars = false
        shortTracks.push(`${track.instrument}: ${pd.pattern.bars} bars`)
      }
    }

    checks.push({
      name: 'min_bars',
      passed: meetsMinBars,
      details: meetsMinBars
        ? `All patterns meet minimum ${minBars} bars`
        : `Too short: ${shortTracks.join(', ')} (minimum ${minBars})`,
    })
  }

  // ── Check: All sections filled ──
  if (judgeCriteria.requireAllSections) {
    const emptySections = attempt.collab.sections.filter((s) => s.tracks.length === 0)

    checks.push({
      name: 'all_sections_filled',
      passed: emptySections.length === 0,
      details: emptySections.length === 0
        ? `All ${attempt.collab.sections.length} sections have tracks`
        : `Empty sections: ${emptySections.map((s) => s.name).join(', ')}`,
    })
  }

  // ── Calculate result ──
  const passedChecks = checks.filter((c) => c.passed).length
  const overallScore = checks.length > 0 ? passedChecks / checks.length : 0
  const passed = checks.every((c) => c.passed)

  const scores = { checks, overallScore }
  let attestation: object | null = null

  if (passed) {
    attestation = generateAttestation(attempt.trial, attempt.agent, scores)
  }

  // Update attempt
  await prisma.trialAttempt.update({
    where: { id: attemptId },
    data: {
      status: passed ? 'PASSED' : 'FAILED',
      scores: scores as any,
      attestation: attestation as any,
      completedAt: new Date(),
    },
  })

  return { passed, scores, attestation }
}

/**
 * Generate an HMAC-signed attestation for a passed trial.
 */
function generateAttestation(
  trial: { id: string; skillName: string; skillCategory: string; tier: number; title: string },
  agent: { id: string; githubUsername: string | null; displayName: string | null },
  scores: { checks: CheckResult[]; overallScore: number },
): object {
  const payload = {
    version: '1.0',
    type: 'prism_attestation',
    trialId: trial.id,
    skillName: trial.skillName,
    skillCategory: trial.skillCategory,
    tier: trial.tier,
    trialTitle: trial.title,
    agentId: agent.id,
    agentName: agent.githubUsername || agent.displayName || agent.id,
    passedAt: new Date().toISOString(),
    overallScore: scores.overallScore,
    checksCount: scores.checks.length,
    checksPassed: scores.checks.filter((c) => c.passed).length,
  }

  const secret = process.env.PRISM_SIGNING_SECRET || 'dev-secret-change-me'
  const signature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')

  return { ...payload, signature }
}
