import { builder } from '../builder.js'
import { pubsub, CollabEvent, MessageEvent, GoldMasterEvent } from '../../pubsub.js'
import { TrackType } from '../types/track.js'
import { CollabType } from '../types/collab.js'
import { MessageType } from '../types/message.js'
import { GoldMasterType } from '../types/goldmaster.js'

// CollabEvent union type
const CollabEventType = builder.unionType('CollabEvent', {
  types: [
    builder.objectRef<{ type: 'TRACK_SUBMITTED'; track: any }>('TrackSubmittedEvent'),
    builder.objectRef<{ type: 'TRACK_REVIEWED'; track: any }>('TrackReviewedEvent'),
    builder.objectRef<{ type: 'STATUS_CHANGED'; collab: any }>('StatusChangedEvent'),
    builder.objectRef<{ type: 'SECTION_ADDED'; collab: any }>('SectionAddedEvent'),
  ],
  resolveType: (event) => {
    switch (event.type) {
      case 'TRACK_SUBMITTED': return 'TrackSubmittedEvent'
      case 'TRACK_REVIEWED': return 'TrackReviewedEvent'
      case 'STATUS_CHANGED': return 'StatusChangedEvent'
      case 'SECTION_ADDED': return 'SectionAddedEvent'
    }
  },
})

// Event object types
builder.objectType(builder.objectRef<{ type: 'TRACK_SUBMITTED'; track: any }>('TrackSubmittedEvent'), {
  fields: (t) => ({
    type: t.exposeString('type'),
    track: t.field({ type: TrackType, resolve: (e) => e.track }),
  }),
})

builder.objectType(builder.objectRef<{ type: 'TRACK_REVIEWED'; track: any }>('TrackReviewedEvent'), {
  fields: (t) => ({
    type: t.exposeString('type'),
    track: t.field({ type: TrackType, resolve: (e) => e.track }),
  }),
})

builder.objectType(builder.objectRef<{ type: 'STATUS_CHANGED'; collab: any }>('StatusChangedEvent'), {
  fields: (t) => ({
    type: t.exposeString('type'),
    collab: t.field({ type: CollabType, resolve: (e) => e.collab }),
  }),
})

builder.objectType(builder.objectRef<{ type: 'SECTION_ADDED'; collab: any }>('SectionAddedEvent'), {
  fields: (t) => ({
    type: t.exposeString('type'),
    collab: t.field({ type: CollabType, resolve: (e) => e.collab }),
  }),
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
      subscribe: (_parent, { collabId }) => {
        return pubsub.subscribe(`collab:${collabId}`)
      },
      resolve: (event: CollabEvent) => event,
    }),

    // Subscribe to new messages in a collab
    messageSent: t.field({
      type: MessageType,
      args: {
        collabId: t.arg.string({ required: true }),
      },
      subscribe: (_parent, { collabId }) => {
        return pubsub.subscribe(`messages:${collabId}`)
      },
      resolve: (event: MessageEvent) => event.message,
    }),

    // Subscribe to new gold masters
    newGoldMaster: t.field({
      type: GoldMasterType,
      subscribe: () => {
        return pubsub.subscribe('newGoldMaster')
      },
      resolve: (event: GoldMasterEvent) => event.goldMaster,
    }),
  }),
})
