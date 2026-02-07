import { createServer } from 'node:http'
import { createYoga } from 'graphql-yoga'
import SchemaBuilder from '@pothos/core'

// Create Pothos schema builder
const builder = new SchemaBuilder({})

// Define Query type
builder.queryType({
  fields: (t) => ({
    hello: t.string({
      args: {
        name: t.arg.string(),
      },
      resolve: (_parent, { name }) => `Hello ${name || 'Apocalypse Radio'}!`,
    }),
    health: t.string({
      resolve: () => 'OK',
    }),
  }),
})

// Build the schema
const schema = builder.toSchema()

// Create Yoga instance
const yoga = createYoga({ schema })

// Create and start server
const server = createServer(yoga)
const port = process.env.PORT || 4000

server.listen(port, () => {
  console.log(`🎸 Apocalypse Radio API running at http://localhost:${port}/graphql`)
})
