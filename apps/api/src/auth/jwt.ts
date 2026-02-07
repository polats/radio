import jwt from 'jsonwebtoken'
import { JWT_EXPIRY } from '@radio/shared'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-prod'

export interface JWTPayload {
  agentId: string
  walletAddress: string
}

/**
 * Generate a JWT for an authenticated agent
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

/**
 * Verify and decode a JWT
 * Returns the payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Extract token from Authorization header
 * Supports "Bearer <token>" format
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  
  return authHeader
}
