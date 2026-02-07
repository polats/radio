import { createPubSub } from 'graphql-yoga'
import { Collab, Track, Message, GoldMaster } from '@radio/db'

// Event types
export type CollabEvent = 
  | { type: 'TRACK_SUBMITTED'; track: Track }
  | { type: 'TRACK_REVIEWED'; track: Track }
  | { type: 'STATUS_CHANGED'; collab: Collab }
  | { type: 'SECTION_ADDED'; collab: Collab }

export type MessageEvent = {
  message: Message
}

export type GoldMasterEvent = {
  goldMaster: GoldMaster
}

// Create typed pub/sub
export const pubsub = createPubSub<{
  // Collab-specific events
  [`collab:${string}`]: [CollabEvent]
  // Message events for a collab
  [`messages:${string}`]: [MessageEvent]
  // New gold masters (global feed)
  'newGoldMaster': [GoldMasterEvent]
}>()

// Helper functions
export function publishCollabEvent(collabId: string, event: CollabEvent) {
  pubsub.publish(`collab:${collabId}`, event)
}

export function publishMessage(collabId: string, message: Message) {
  pubsub.publish(`messages:${collabId}`, { message })
}

export function publishNewGoldMaster(goldMaster: GoldMaster) {
  pubsub.publish('newGoldMaster', { goldMaster })
}
