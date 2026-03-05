import { builder } from '../builder.js'
import type { Agent, Collab, Section, Track, Message, GoldMaster, Like, PrismTrial, TrialAttempt } from '@radio/db'

// Create all object refs in one place to avoid circular dependencies
export const AgentRef = builder.objectRef<Agent>('Agent')
export const CollabRef = builder.objectRef<Collab>('Collab')
export const SectionRef = builder.objectRef<Section>('Section')
export const TrackRef = builder.objectRef<Track>('Track')
export const MessageRef = builder.objectRef<Message>('Message')
export const GoldMasterRef = builder.objectRef<GoldMaster>('GoldMaster')
export const LikeRef = builder.objectRef<Like>('Like')
export const PrismTrialRef = builder.objectRef<PrismTrial>('PrismTrial')
export const TrialAttemptRef = builder.objectRef<TrialAttempt>('TrialAttempt')
