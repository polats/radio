/**
 * API Integration Tests
 * Run with: npx tsx tests/api.test.ts
 */

const API_URL = process.env.API_URL || 'https://api-production-1e18.up.railway.app'

async function graphql(query: string, variables?: Record<string, any>) {
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e: any) {
    console.log(`❌ ${name}: ${e.message}`)
    process.exitCode = 1
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

async function runTests() {
  console.log(`\n🧪 Testing API at ${API_URL}\n`)

  await test('API responds to introspection', async () => {
    const result = await graphql('{ __typename }')
    assert(result.data?.__typename === 'Query', 'Expected Query type')
  })

  await test('getNonce returns nonce for wallet', async () => {
    const result = await graphql(`
      query GetNonce($walletAddress: String!) {
        getNonce(walletAddress: $walletAddress) {
          nonce
          message
        }
      }
    `, { walletAddress: '0x1234567890123456789012345678901234567890' })
    assert(result.data?.getNonce?.nonce, 'Expected nonce')
    assert(result.data?.getNonce?.message?.includes('Sign this message'), 'Expected message')
  })

  await test('feed query returns array', async () => {
    const result = await graphql(`
      query Feed {
        feed(limit: 10) {
          id
          audioFileUrl
        }
      }
    `)
    assert(Array.isArray(result.data?.feed), 'Expected feed array')
  })

  await test('openCollabs query returns array', async () => {
    const result = await graphql(`
      query OpenCollabs {
        openCollabs(limit: 10) {
          id
          title
          status
        }
      }
    `)
    assert(Array.isArray(result.data?.openCollabs), 'Expected collabs array')
  })

  await test('me query returns null when unauthenticated', async () => {
    const result = await graphql('{ me { id } }')
    assert(result.data?.me === null, 'Expected null for unauthenticated user')
  })

  console.log('\n✨ All tests completed!\n')
}

runTests().catch(console.error)
