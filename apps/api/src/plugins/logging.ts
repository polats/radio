import type { Plugin } from 'graphql-yoga'

const MAX_RESPONSE_SIZE = parseInt(process.env.MAX_RESPONSE_SIZE || '5242880', 10) // 5MB default

/**
 * Request logging plugin for tracking API usage patterns
 * Outputs structured JSON logs for analysis
 * Also tracks response sizes to catch large payloads
 */
export function useLogging(): Plugin {
  return {
    onRequest({ request, url }) {
      const startTime = Date.now()
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                 request.headers.get('x-real-ip') ||
                 'unknown'

      // Store in request for later use
      ;(request as any).__startTime = startTime
      ;(request as any).__ip = ip
    },

    onExecute({ args }) {
      const operationType = args.document.definitions[0]?.kind === 'OperationDefinition'
        ? (args.document.definitions[0] as any).operation
        : 'unknown'

      const operationName = args.operationName || 'anonymous'

      console.log(JSON.stringify({
        type: 'graphql_operation',
        operation: operationType,
        name: operationName,
        timestamp: new Date().toISOString(),
      }))
    },

    onResultProcess({ request, result }) {
      const startTime = (request as any).__startTime || Date.now()
      const ip = (request as any).__ip || 'unknown'
      const duration = Date.now() - startTime

      // Calculate response size
      let responseSize = 0
      try {
        responseSize = JSON.stringify(result).length
      } catch {
        // If we can't stringify (e.g., circular refs), estimate
        responseSize = -1
      }

      // Log the request with size info
      console.log(JSON.stringify({
        type: 'request_complete',
        ip,
        duration,
        responseSize,
        responseSizeMB: responseSize > 0 ? (responseSize / 1024 / 1024).toFixed(2) : 'unknown',
        timestamp: new Date().toISOString(),
      }))

      // Warn on large responses
      if (responseSize > MAX_RESPONSE_SIZE) {
        console.log(JSON.stringify({
          type: 'large_response_warning',
          ip,
          responseSize,
          responseSizeMB: (responseSize / 1024 / 1024).toFixed(2),
          maxResponseSize: MAX_RESPONSE_SIZE,
          timestamp: new Date().toISOString(),
        }))
      }
    },
  }
}
