// Initialize base types first
import './base.js'

import { builder } from './builder.js'

// Import refs first (creates object refs)
import './types/refs.js'

// Import types (implements the refs)
import './types/agent.js'
import './types/collab.js'
import './types/track.js'
import './types/message.js'
import './types/goldmaster.js'

// Import queries (these add fields to queryType)
import './queries/agent.js'
import './queries/collab.js'
import './queries/message.js'
import './queries/feed.js'

// Import mutations (these add fields to mutationType)
import './mutations/auth.js'
import './mutations/collab.js'
import './mutations/track.js'
import './mutations/message.js'
import './mutations/social.js'

// Import subscriptions
import './subscriptions/index.js'

// Export the schema
export const schema = builder.toSchema()
