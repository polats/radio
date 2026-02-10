import type { Plugin } from 'graphql-yoga'
import { visit, Kind, DocumentNode } from 'graphql'

/**
 * Limit query depth to prevent deeply nested queries that return massive payloads
 */
export function useDepthLimit(options: {
  maxDepth?: number
} = {}): Plugin {
  const maxDepth = options.maxDepth || 10

  return {
    onParse({ setParsedDocument }) {
      return ({ result }) => {
        if ('kind' in result && result.kind === Kind.DOCUMENT) {
          const depth = getQueryDepth(result)
          
          if (depth > maxDepth) {
            console.log(JSON.stringify({
              type: 'depth_limit_exceeded',
              depth,
              maxDepth,
              timestamp: new Date().toISOString(),
            }))
            
            throw new Error(`Query depth ${depth} exceeds maximum allowed depth of ${maxDepth}`)
          }
        }
      }
    },
  }
}

/**
 * Calculate the maximum depth of a GraphQL document
 */
function getQueryDepth(document: DocumentNode): number {
  let maxDepth = 0
  let currentDepth = 0

  visit(document, {
    Field: {
      enter() {
        currentDepth++
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth
        }
      },
      leave() {
        currentDepth--
      },
    },
    // Also count inline fragments and fragment spreads
    InlineFragment: {
      enter() {
        currentDepth++
        if (currentDepth > maxDepth) {
          maxDepth = currentDepth
        }
      },
      leave() {
        currentDepth--
      },
    },
  })

  return maxDepth
}
