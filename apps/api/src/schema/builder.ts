import SchemaBuilder from '@pothos/core'
import { prisma } from '@radio/db'
import type { Context } from '../auth/context.js'

export const builder = new SchemaBuilder<{
  Context: Context
  Scalars: {
    DateTime: {
      Input: Date
      Output: Date
    }
    JSON: {
      Input: unknown
      Output: unknown
    }
  }
}>({})

// DateTime scalar
builder.scalarType('DateTime', {
  serialize: (value) => value.toISOString(),
  parseValue: (value) => new Date(value as string),
})

// JSON scalar
builder.scalarType('JSON', {
  serialize: (value) => value,
  parseValue: (value) => value,
})
