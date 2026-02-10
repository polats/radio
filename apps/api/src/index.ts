import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import { schema } from './schema/index.js'
import { createContext } from './auth/context.js'
import { maskError } from './plugins/error-masking.js'
import { useLogging } from './plugins/logging.js'
import { useRateLimit } from './plugins/rate-limit.js'
import { useDepthLimit } from './plugins/depth-limit.js'
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
    useDepthLimit({
      maxDepth: parseInt(process.env.MAX_QUERY_DEPTH || '10', 10),
    }),
    useSubscriptionManager({
      maxConnectionsPerIp: parseInt(process.env.MAX_SUBSCRIPTIONS_PER_IP || '5', 10),
      idleTimeoutMs: parseInt(process.env.SUBSCRIPTION_IDLE_TIMEOUT_MS || '1800000', 10), // 30 min default
    }),
  ],
})

// Create and start server
const server = createServer(yoga)
const port = process.env.PORT || 4000

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
})

server.listen(port, () => {
  console.log(`🎸 Apocalypse Radio API running at http://localhost:${port}/graphql`)
  console.log(`   Rate limit: ${process.env.RATE_LIMIT_MAX || '100'} req/min`)
  console.log(`   Max query depth: ${process.env.MAX_QUERY_DEPTH || '10'}`)
  console.log(`   Max subscriptions/IP: ${process.env.MAX_SUBSCRIPTIONS_PER_IP || '5'}`)
  console.log(`   Subscription idle timeout: ${(parseInt(process.env.SUBSCRIPTION_IDLE_TIMEOUT_MS || '1800000', 10) / 60000).toFixed(0)} min`)
})
