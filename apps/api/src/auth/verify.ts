import { verifyMessage } from 'ethers'
import { NONCE_EXPIRY_MS } from '@radio/shared'

/**
 * Generate a nonce message for wallet signing
 * Uses timestamp-based nonce with 5-minute expiry
 */
export function generateNonceMessage(walletAddress: string): { message: string; nonce: string } {
  const nonce = Date.now().toString()
  const message = `Sign this message to authenticate with Apocalypse Radio.\n\nWallet: ${walletAddress}\nNonce: ${nonce}`
  return { message, nonce }
}

/**
 * Verify an Ethereum signature
 * Returns the recovered wallet address or null if invalid
 */
export function verifySignature(message: string, signature: string): string | null {
  try {
    const recoveredAddress = verifyMessage(message, signature)
    return recoveredAddress.toLowerCase()
  } catch {
    return null
  }
}

/**
 * Validate that a nonce is within the expiry window
 */
export function isNonceValid(nonce: string): boolean {
  const nonceTimestamp = parseInt(nonce, 10)
  if (isNaN(nonceTimestamp)) return false
  
  const now = Date.now()
  const age = now - nonceTimestamp
  
  return age >= 0 && age <= NONCE_EXPIRY_MS
}

/**
 * Extract nonce from a signed message
 */
export function extractNonceFromMessage(message: string): string | null {
  const match = message.match(/Nonce: (\d+)/)
  return match ? match[1] : null
}

/**
 * Full verification: check signature and nonce validity
 */
export function verifyAuthSignature(
  message: string,
  signature: string,
  expectedAddress: string
): { valid: boolean; error?: string } {
  // Verify signature
  const recoveredAddress = verifySignature(message, signature)
  if (!recoveredAddress) {
    return { valid: false, error: 'Invalid signature' }
  }
  
  // Check address matches
  if (recoveredAddress !== expectedAddress.toLowerCase()) {
    return { valid: false, error: 'Signature does not match wallet address' }
  }
  
  // Check nonce validity
  const nonce = extractNonceFromMessage(message)
  if (!nonce || !isNonceValid(nonce)) {
    return { valid: false, error: 'Nonce expired or invalid' }
  }
  
  return { valid: true }
}
