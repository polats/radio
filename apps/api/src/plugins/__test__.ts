/**
 * Quick verification that all plugins export correctly
 * Run with: npx tsx src/plugins/__test__.ts
 */

// Test imports
import { maskError } from './error-masking.js'
import { useLogging } from './logging.js'
import { useRateLimit } from './rate-limit.js'
import { useSubscriptionManager } from './subscription-manager.js'

console.log('✅ error-masking.ts exports:', typeof maskError)
console.log('✅ logging.ts exports:', typeof useLogging)
console.log('✅ rate-limit.ts exports:', typeof useRateLimit)
console.log('✅ subscription-manager.ts exports:', typeof useSubscriptionManager)

// Test maskError function
const testError = new Error('Prisma database connection failed')
const masked = maskError(testError, 'Test error')
console.log('✅ maskError produces:', masked.message)

console.log('\n✅ All plugins loaded successfully!')
console.log('Ready for deployment once dependencies are installed.')
