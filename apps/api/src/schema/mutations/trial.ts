import { builder } from '../builder.js'
import { PrismTrialType, TrialAttemptType } from '../types/trial.js'
import { requireAuth } from '../../auth/context.js'
import { evaluateAttempt } from '../../judge/index.js'

// Create a trial definition (prism operator)
builder.mutationField('createTrial', (t) =>
  t.field({
    type: PrismTrialType,
    args: {
      skillName: t.arg.string({ required: true }),
      skillCategory: t.arg.string({ required: true }),
      tier: t.arg.int({ required: false, defaultValue: 1 }),
      title: t.arg.string({ required: true }),
      description: t.arg.string({ required: true }),
      iconEmoji: t.arg.string({ required: false, defaultValue: '🎵' }),
      constraintsJson: t.arg.string({ required: true }),   // JSON string
      judgeCriteriaJson: t.arg.string({ required: true }),  // JSON string
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      // Parse JSON args
      let constraints: object
      let judgeCriteria: object
      try {
        constraints = JSON.parse(args.constraintsJson)
      } catch {
        throw new Error('Invalid JSON in constraintsJson')
      }
      try {
        judgeCriteria = JSON.parse(args.judgeCriteriaJson)
      } catch {
        throw new Error('Invalid JSON in judgeCriteriaJson')
      }

      if (args.title.trim() === '') throw new Error('Title cannot be empty')
      if (args.skillName.trim() === '') throw new Error('Skill name cannot be empty')

      return context.prisma.prismTrial.create({
        data: {
          skillName: args.skillName.trim(),
          skillCategory: args.skillCategory.trim(),
          tier: args.tier ?? 1,
          title: args.title.trim(),
          description: args.description.trim(),
          iconEmoji: args.iconEmoji ?? '🎵',
          constraints: constraints as any,
          judgeCriteria: judgeCriteria as any,
          prismAgentId: agent.id,
        },
      })
    },
  })
)

// Request a trial — scaffolds a private collab from trial constraints
builder.mutationField('requestTrial', (t) =>
  t.field({
    type: TrialAttemptType,
    args: {
      trialId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const trial = await context.prisma.prismTrial.findUnique({
        where: { id: args.trialId },
      })
      if (!trial) throw new Error('Trial not found')
      if (!trial.isActive) throw new Error('Trial is not active')

      const constraints = trial.constraints as Record<string, unknown>

      // Scaffold a collab from trial constraints
      const sectionDefs = (constraints.sections as Array<{ name: string; durationBeats: number }>) || [
        { name: 'main', durationBeats: constraints.minBars ? (constraints.minBars as number) * 4 : 16 },
      ]

      const collab = await context.prisma.collab.create({
        data: {
          title: `Trial: ${trial.title}`,
          description: `Prism trial attempt — ${trial.description}`,
          genre: (constraints.genre as string) || null,
          tempo: (constraints.bpm as number) || null,
          keySignature: (constraints.keySignature as string) || null,
          creatorId: agent.id,
          status: 'OPEN',
          sections: {
            create: sectionDefs.map((s, i) => ({
              name: s.name,
              orderIndex: i,
              startBeat: 0,
              durationBeats: s.durationBeats,
            })),
          },
        },
      })

      // Create the attempt
      const attempt = await context.prisma.trialAttempt.create({
        data: {
          trialId: trial.id,
          agentId: agent.id,
          collabId: collab.id,
          status: 'PENDING',
        },
      })

      return attempt
    },
  })
)

// Submit a trial attempt for evaluation
builder.mutationField('submitTrialAttempt', (t) =>
  t.field({
    type: TrialAttemptType,
    args: {
      attemptId: t.arg.string({ required: true }),
    },
    resolve: async (_parent, args, context) => {
      const agent = requireAuth(context)

      const attempt = await context.prisma.trialAttempt.findUnique({
        where: { id: args.attemptId },
      })
      if (!attempt) throw new Error('Attempt not found')
      if (attempt.agentId !== agent.id) throw new Error('Not your attempt')
      if (attempt.status !== 'PENDING') throw new Error('Attempt already submitted')

      // Run evaluation (synchronous — ms-level for pattern checks)
      await evaluateAttempt(args.attemptId)

      // Return updated attempt
      return context.prisma.trialAttempt.findUniqueOrThrow({
        where: { id: args.attemptId },
      })
    },
  })
)
