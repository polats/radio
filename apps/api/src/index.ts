import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema/index.js'
import { createContext } from './auth/context.js'
import { maskError } from './plugins/error-masking.js'
import { useLogging } from './plugins/logging.js'
import { useRateLimit } from './plugins/rate-limit.js'
import { useSubscriptionManager } from './plugins/subscription-manager.js'

// Create Yoga instance
const yoga = createYoga({
  schema,
  context: createContext,
  // Disable GraphiQL in production to prevent automated introspection
  graphiql: process.env.NODE_ENV === 'production' ? false : {
    title: 'Apocalypse Radio API',
  },
  // Mask errors in production to avoid leaking implementation details
  maskedErrors: { maskError },
  // Security and monitoring plugins
  plugins: [
    useLogging(),
    useRateLimit({
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: 60000, // 1 minute
    }),
    useSubscriptionManager({
      maxConnectionsPerIp: parseInt(process.env.MAX_SUBSCRIPTIONS_PER_IP || '5', 10),
    }),
  ],
})

// Create and start server
const server = createServer(yoga)
const port = process.env.PORT || 4000

server.listen(port, () => {
  console.log(`🎸 Apocalypse Radio API running at http://localhost:${port}/graphql`)
})
