import { GraphQLError } from 'graphql'

/**
 * Mask errors in production to avoid leaking implementation details
 * while still logging the full error server-side
 */
export function maskError(error: unknown, message: string): GraphQLError {
  // Log the full error server-side
  console.error('[ERROR]', {
    message,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  })

  // Determine error type and return appropriate sanitized message
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase()

    // Prisma errors
    if (errorMessage.includes('prisma') || errorMessage.includes('database')) {
      return new GraphQLError('Database operation failed', {
        extensions: { code: 'DATABASE_ERROR' },
      })
    }

    // JWT/Auth errors
    if (errorMessage.includes('jwt') || errorMessage.includes('token') || errorMessage.includes('unauthorized')) {
      return new GraphQLError('Authentication failed', {
        extensions: { code: 'UNAUTHENTICATED' },
      })
    }

    // Validation errors (these are usually safe to expose)
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return new GraphQLError(error.message, {
        extensions: { code: 'BAD_USER_INPUT' },
      })
    }
  }

  // Generic fallback for unknown errors
  return new GraphQLError('An unexpected error occurred', {
    extensions: { code: 'INTERNAL_SERVER_ERROR' },
  })
}
