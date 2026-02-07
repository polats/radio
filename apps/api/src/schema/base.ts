import { builder } from './builder.js'

// Initialize query and mutation types FIRST
builder.queryType({
  fields: (t) => ({
    health: t.string({
      resolve: () => 'ok',
    }),
  }),
})

builder.mutationType({})
