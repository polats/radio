import { YogaInitialContext } from 'graphql-yoga'
import { prisma, Agent } from '@radio/db'
import { extractTokenFromHeader, verifyToken } from './jwt.js'

export interface Context extends YogaInitialContext {
  prisma: typeof prisma
  currentAgent: Agent | null
}

/**
 * Create GraphQL context with auth
 */
export async function createContext(initialContext: YogaInitialContext): Promise<Context> {
  const authHeader = initialContext.request.headers.get('authorization')
  const token = extractTokenFromHeader(authHeader)
  
  let currentAgent: Agent | null = null
  
  if (token) {
    const payload = verifyToken(token)
    if (payload) {
      currentAgent = await prisma.agent.findUnique({
        where: { id: payload.agentId }
      })
    }
  }
  
  return {
    ...initialContext,
    prisma,
    currentAgent,
  }
}

/**
 * Helper to require authentication
 */
export function requireAuth(context: Context): Agent {
  if (!context.currentAgent) {
    throw new Error('Authentication required')
  }
  return context.currentAgent
}
