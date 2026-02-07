import { createPubSub } from 'graphql-yoga'
import type { Collab, Track, Message, GoldMaster } from '@radio/db'

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

// Simple pubsub - using any to avoid complex typing issues with graphql-yoga
export const pubsub = createPubSub<Record<string, [any]>>()

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

// Subscribe functions
export function subscribeToCollab(collabId: string) {
  return pubsub.subscribe(`collab:${collabId}`)
}

export function subscribeToMessages(collabId: string) {
  return pubsub.subscribe(`messages:${collabId}`)
}

export function subscribeToNewGoldMasters() {
  return pubsub.subscribe('newGoldMaster')
}
