import { builder } from './builder.js'

// Import types
import './types/agent.js'

// Import queries
import './queries/agent.js'

// Import mutations
import './mutations/auth.js'

// Build query and mutation types
builder.queryType({})
builder.mutationType({})

// Export the schema
export const schema = builder.toSchema()
