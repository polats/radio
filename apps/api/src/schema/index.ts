import { builder } from './builder.js'

// Import types (order matters for dependencies)
import './types/agent.js'
import './types/collab.js'
import './types/track.js'
import './types/message.js'
import './types/goldmaster.js'

// Import queries
import './queries/agent.js'
import './queries/collab.js'
import './queries/message.js'
import './queries/feed.js'

// Import mutations
import './mutations/auth.js'
import './mutations/collab.js'
import './mutations/track.js'
import './mutations/message.js'
import './mutations/social.js'

// Build query and mutation types
builder.queryType({})
builder.mutationType({})

// Export the schema
export const schema = builder.toSchema()
