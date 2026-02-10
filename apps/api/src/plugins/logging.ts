import type { Plugin } from 'graphql-yoga'

/**
 * Request logging plugin for tracking API usage patterns
 * Outputs structured JSON logs for analysis
 */
export function useLogging(): Plugin {
  return {
    onRequest({ request, url }) {
      const startTime = Date.now()
      const ip = request.headers.get('x-forwarded-for') ||
                 request.headers.get('x-real-ip') ||
                 'unknown'

      return () => {
        const duration = Date.now() - startTime
        console.log(JSON.stringify({
          type: 'request',
          ip,
          method: request.method,
          url: url.pathname,
          duration,
          timestamp: new Date().toISOString(),
        }))
      }
    },

    onExecute({ args }) {
      const operationType = args.document.definitions[0]?.kind === 'OperationDefinition'
        ? args.document.definitions[0].operation
        : 'unknown'

      const operationName = args.operationName || 'anonymous'

      console.log(JSON.stringify({
        type: 'graphql_operation',
        operation: operationType,
        name: operationName,
        timestamp: new Date().toISOString(),
      }))
    },
  }
}
