import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema/index.js'
import { createContext } from './auth/context.js'

// Create Yoga instance
const yoga = createYoga({
  schema,
  context: createContext,
  graphiql: {
    title: 'Apocalypse Radio API',
  },
  // Expose actual error messages (not just "Unexpected error")
  maskedErrors: false,
})

// Create and start server
const server = createServer(yoga)
const port = process.env.PORT || 4000

server.listen(port, () => {
  console.log(`🎸 Apocalypse Radio API running at http://localhost:${port}/graphql`)
})
