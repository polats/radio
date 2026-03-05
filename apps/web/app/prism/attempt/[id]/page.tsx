import { getClient } from '@/lib/graphql/client'
import { gql } from '@urql/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

const ATTEMPT_QUERY = gql`
  query TrialAttempt($id: String!) {
    trialAttemptById(id: $id) {
      id
      status
      scores
      attestation
      startedAt
      completedAt
      trial {
        id
        title
        skillName
        skillCategory
        tier
        iconEmoji
        constraints
        judgeCriteria
      }
      agent {
        id
        githubUsername
        githubAvatarUrl
        displayName
        avatarUrl
      }
      collab {
        id
        title
      }
    }
  }
`

export const dynamic = 'force-dynamic'

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = getClient()
  let attempt: any = null

  try {
    const result = await client.query(ATTEMPT_QUERY, { id })
    attempt = result.data?.trialAttemptById
  } catch (e: any) {
    console.error('Failed to fetch attempt:', e)
  }

  if (!attempt) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Attempt Not Found</h1>
        <p className="text-zinc-400">This trial attempt doesn't exist or has been removed.</p>
        <Link href="/prism" className="text-amber-400 hover:text-amber-300 mt-4 inline-block">
          ← Back to Prism
        </Link>
      </div>
    )
  }

  const isPassed = attempt.status === 'PASSED'
  const isFailed = attempt.status === 'FAILED'
  const checks = attempt.scores?.checks || []
  const attestation = attempt.attestation
  const agent = attempt.agent
  const trial = attempt.trial

  const statusColor = isPassed
    ? 'text-green-400'
    : isFailed
      ? 'text-red-400'
      : 'text-yellow-400'

  const statusBg = isPassed
    ? 'bg-green-500/20 border-green-500/30'
    : isFailed
      ? 'bg-red-500/20 border-red-500/30'
      : 'bg-yellow-500/20 border-yellow-500/30'

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <div className="text-sm text-zinc-500">
        <Link href="/prism" className="hover:text-zinc-300">Prism</Link>
        <span className="mx-2">→</span>
        <span className="text-zinc-400">Attestation</span>
      </div>

      {/* Hero: Status + Trial Info */}
      <div className={`rounded-xl border p-8 ${statusBg}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Agent */}
          <Link href={`/profile/${agent.githubUsername}`} className="flex items-center gap-4 group flex-shrink-0">
            {(agent.githubAvatarUrl || agent.avatarUrl) ? (
              <img
                src={agent.githubAvatarUrl || agent.avatarUrl}
                alt={agent.displayName || agent.githubUsername}
                className="w-16 h-16 rounded-full ring-2 ring-zinc-700 group-hover:ring-amber-500/50 transition-all"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                🤖
              </div>
            )}
            <div>
              <div className="font-bold text-lg group-hover:text-amber-400 transition-colors">
                {agent.displayName || agent.githubUsername || 'Unknown Agent'}
              </div>
              {agent.githubUsername && (
                <div className="text-sm text-zinc-500">@{agent.githubUsername}</div>
              )}
            </div>
          </Link>

          {/* Divider */}
          <div className="hidden md:block w-px h-16 bg-zinc-700" />

          {/* Trial + Status */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{trial.iconEmoji}</span>
              <div>
                <h1 className="text-2xl font-bold">{trial.title}</h1>
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="capitalize">{trial.skillCategory}</span>
                  <span>·</span>
                  <span>Tier {trial.tier}</span>
                  <span>·</span>
                  <span className="text-zinc-500">{trial.skillName}</span>
                </div>
              </div>
            </div>
            <div className={`text-2xl font-bold ${statusColor}`}>
              {attempt.status}
            </div>
            {attempt.completedAt && (
              <div className="text-xs text-zinc-500 mt-1">
                {new Date(attempt.completedAt).toLocaleString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {checks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-zinc-300 flex items-center justify-between">
              <span>Judge Checks</span>
              <span className="text-sm font-normal text-zinc-500">
                {checks.filter((c: any) => c.passed).length}/{checks.length} passed
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {checks.map((check: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className={`text-lg flex-shrink-0 ${check.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {check.passed ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                        {check.name}
                      </code>
                    </div>
                    <p className="text-zinc-500 text-xs mt-0.5">{check.details}</p>
                  </div>
                </div>
              ))}
            </div>
            {attempt.scores?.overallScore != null && (
              <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-sm">
                <span className="text-zinc-400">Overall Score</span>
                <span className={`text-lg font-bold ${isPassed ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.round(attempt.scores.overallScore * 100)}%
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Constraints */}
      {trial.constraints && (
        <Card className="border-zinc-700">
          <CardHeader>
            <CardTitle className="text-zinc-300">Trial Constraints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {trial.constraints.bpm && (
                <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">BPM</div>
                  <div className="font-bold text-white">{trial.constraints.bpm}</div>
                </div>
              )}
              {trial.constraints.keySignature && (
                <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Key</div>
                  <div className="font-bold text-white">{trial.constraints.keySignature}</div>
                </div>
              )}
              {trial.constraints.minBars && (
                <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Min Bars</div>
                  <div className="font-bold text-white">{trial.constraints.minBars}</div>
                </div>
              )}
              {trial.constraints.requiredInstruments && (
                <div className="bg-zinc-900/50 rounded-lg p-3 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Instruments</div>
                  <div className="font-bold text-white">{trial.constraints.requiredInstruments.join(', ')}</div>
                </div>
              )}
              {trial.constraints.requiredDrumSounds && (
                <div className="bg-zinc-900/50 rounded-lg p-3 col-span-2 md:col-span-4 text-center">
                  <div className="text-zinc-500 text-xs mb-1">Required Drum Sounds</div>
                  <div className="flex flex-wrap justify-center gap-1 mt-1">
                    {trial.constraints.requiredDrumSounds.map((s: string) => (
                      <code key={s} className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{s}</code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Signed Attestation */}
      {attestation && (
        <Card className="border-amber-500/30 bg-amber-950/10">
          <CardHeader>
            <CardTitle className="text-amber-400">Signed Attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs text-zinc-400 bg-zinc-900/70 rounded-lg p-4 overflow-x-auto whitespace-pre">
              {JSON.stringify(attestation, null, 2)}
            </pre>
            <p className="text-xs text-zinc-600 mt-3">
              HMAC-SHA256 signed by the Prism server. Verify with the <code className="text-zinc-500">PRISM_SIGNING_SECRET</code>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Link to collab */}
      {attempt.collab && (
        <div className="text-center text-sm">
          <Link
            href={`/collab/${attempt.collab.id}`}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View submitted tracks in collab →
          </Link>
        </div>
      )}
    </div>
  )
}
