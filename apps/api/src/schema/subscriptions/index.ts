import { builder } from '../builder.js'
import { 
  CollabEvent, 
  MessageEvent, 
  GoldMasterEvent,
  subscribeToCollab,
  subscribeToMessages,
  subscribeToNewGoldMasters
} from '../../pubsub.js'
import { TrackType } from '../types/track.js'
import { CollabType } from '../types/collab.js'
import { MessageType } from '../types/message.js'
import { GoldMasterType } from '../types/goldmaster.js'

// Event types for the union
interface TrackSubmittedEvent { type: 'TRACK_SUBMITTED'; track: any }
interface TrackReviewedEvent { type: 'TRACK_REVIEWED'; track: any }
interface StatusChangedEvent { type: 'STATUS_CHANGED'; collab: any }
interface SectionAddedEvent { type: 'SECTION_ADDED'; collab: any }

// Object refs for event types
const TrackSubmittedRef = builder.objectRef<TrackSubmittedEvent>('TrackSubmittedEvent')
const TrackReviewedRef = builder.objectRef<TrackReviewedEvent>('TrackReviewedEvent')
const StatusChangedRef = builder.objectRef<StatusChangedEvent>('StatusChangedEvent')
const SectionAddedRef = builder.objectRef<SectionAddedEvent>('SectionAddedEvent')

// Define the object types
builder.objectType(TrackSubmittedRef, {
  fields: (t) => ({
    type: t.exposeString('type'),
    track: t.field({ type: TrackType, resolve: (e) => e.track }),
  }),
})

builder.objectType(TrackReviewedRef, {
  fields: (t) => ({
    type: t.exposeString('type'),
    track: t.field({ type: TrackType, resolve: (e) => e.track }),
  }),
})

builder.objectType(StatusChangedRef, {
  fields: (t) => ({
    type: t.exposeString('type'),
    collab: t.field({ type: CollabType, resolve: (e) => e.collab }),
  }),
})

builder.objectType(SectionAddedRef, {
  fields: (t) => ({
    type: t.exposeString('type'),
    collab: t.field({ type: CollabType, resolve: (e) => e.collab }),
  }),
})

// CollabEvent union type
const CollabEventType = builder.unionType('CollabEvent', {
  types: [TrackSubmittedRef, TrackReviewedRef, StatusChangedRef, SectionAddedRef],
  resolveType: (event: CollabEvent) => {
    switch (event.type) {
      case 'TRACK_SUBMITTED': return TrackSubmittedRef
      case 'TRACK_REVIEWED': return TrackReviewedRef
      case 'STATUS_CHANGED': return StatusChangedRef
      case 'SECTION_ADDED': return SectionAddedRef
    }
  },
})

// Define subscription type
builder.subscriptionType({
  fields: (t) => ({
    // Subscribe to collab updates
    collabUpdated: t.field({
      type: CollabEventType,
      args: {
        collabId: t.arg.string({ required: true }),
      },
      subscribe: (_parent, { collabId }) => subscribeToCollab(collabId),
      resolve: (event: CollabEvent) => event,
    }),

    // Subscribe to new messages in a collab
    messageSent: t.field({
      type: MessageType,
      args: {
        collabId: t.arg.string({ required: true }),
      },
      subscribe: (_parent, { collabId }) => subscribeToMessages(collabId),
      resolve: (event: MessageEvent) => event.message,
    }),

    // Subscribe to new gold masters
    newGoldMaster: t.field({
      type: GoldMasterType,
      subscribe: () => subscribeToNewGoldMasters(),
      resolve: (event: GoldMasterEvent) => event.goldMaster,
    }),
  }),
})
