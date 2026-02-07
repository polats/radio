/**
 * Apocalypse Radio API Integration Tests
 * 
 * Run with: API_URL=<url> npx tsx tests/api.test.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:4000'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

async function graphql(query: string, variables?: Record<string, any>, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  })
  return res.json()
}

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✅ ${name}`)
    })
    .catch((err: Error) => {
      results.push({ name, passed: false, error: err.message })
      console.log(`❌ ${name}: ${err.message}`)
    })
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

// Helper to generate a random wallet address
function randomWallet(): string {
  const chars = '0123456789abcdef'
  let addr = '0x'
  for (let i = 0; i < 40; i++) {
    addr += chars[Math.floor(Math.random() * chars.length)]
  }
  return addr
}

async function runTests() {
  console.log(`\n🧪 Testing API at ${API_URL}\n`)

  // Health & Basic Queries
  await test('Health endpoint returns ok', async () => {
    const res = await graphql('{ health }')
    assert(res.data?.health === 'ok', 'Expected health to be ok')
  })

  await test('API responds to introspection', async () => {
    const res = await graphql('{ __schema { queryType { name } } }')
    assert(res.data?.__schema?.queryType?.name === 'Query', 'Expected Query type')
  })

  // Nonce & Auth
  const testWallet = randomWallet()
  let nonce: string
  let message: string

  await test('getNonce returns nonce for wallet', async () => {
    const res = await graphql(`{ getNonce(walletAddress: "${testWallet}") { nonce message } }`)
    assert(res.data?.getNonce?.nonce, 'Expected nonce')
    assert(res.data?.getNonce?.message, 'Expected message')
    nonce = res.data.getNonce.nonce
    message = res.data.getNonce.message
  })

  await test('getNonce message contains wallet address', async () => {
    assert(message.toLowerCase().includes(testWallet.toLowerCase()), 'Message should contain wallet')
  })

  // Feed & Collabs
  await test('feed query returns array', async () => {
    const res = await graphql('{ feed(limit: 10) { id } }')
    assert(Array.isArray(res.data?.feed), 'Expected feed array')
  })

  await test('openCollabs query returns array', async () => {
    const res = await graphql('{ openCollabs(limit: 10) { id title status } }')
    assert(Array.isArray(res.data?.openCollabs), 'Expected collabs array')
  })

  // Unauthenticated access
  await test('me query returns null when unauthenticated', async () => {
    const res = await graphql('{ me { id } }')
    assert(res.data?.me === null, 'Expected null for unauthenticated me')
  })

  await test('createCollab requires authentication', async () => {
    const res = await graphql(`
      mutation {
        createCollab(input: {
          title: "Test Collab"
          sections: [{ name: "Intro", orderIndex: 0, durationBeats: 16 }]
        }) { id }
      }
    `)
    assert(res.errors?.length > 0, 'Expected auth error')
  })

  // Schema validation
  await test('Collab type has required fields', async () => {
    const res = await graphql(`{
      __type(name: "Collab") {
        fields { name }
      }
    }`)
    const fields = res.data?.__type?.fields?.map((f: any) => f.name) || []
    assert(fields.includes('id'), 'Missing id field')
    assert(fields.includes('title'), 'Missing title field')
    assert(fields.includes('status'), 'Missing status field')
    assert(fields.includes('creator'), 'Missing creator field')
    assert(fields.includes('sections'), 'Missing sections field')
  })

  await test('Agent type has required fields', async () => {
    const res = await graphql(`{
      __type(name: "Agent") {
        fields { name }
      }
    }`)
    const fields = res.data?.__type?.fields?.map((f: any) => f.name) || []
    assert(fields.includes('id'), 'Missing id field')
    assert(fields.includes('walletAddress'), 'Missing walletAddress field')
    assert(fields.includes('displayName'), 'Missing displayName field')
  })

  await test('Track type has required fields', async () => {
    const res = await graphql(`{
      __type(name: "Track") {
        fields { name }
      }
    }`)
    const fields = res.data?.__type?.fields?.map((f: any) => f.name) || []
    assert(fields.includes('id'), 'Missing id field')
    assert(fields.includes('instrument'), 'Missing instrument field')
    assert(fields.includes('audioFileUrl'), 'Missing audioFileUrl field')
    assert(fields.includes('status'), 'Missing status field')
  })

  await test('GoldMaster type has required fields', async () => {
    const res = await graphql(`{
      __type(name: "GoldMaster") {
        fields { name }
      }
    }`)
    const fields = res.data?.__type?.fields?.map((f: any) => f.name) || []
    assert(fields.includes('id'), 'Missing id field')
    assert(fields.includes('audioFileUrl'), 'Missing audioFileUrl field')
    assert(fields.includes('collab'), 'Missing collab field')
    assert(fields.includes('likesCount'), 'Missing likesCount field')
  })

  // Mutations exist
  await test('Required mutations exist', async () => {
    const res = await graphql(`{
      __schema {
        mutationType {
          fields { name }
        }
      }
    }`)
    const mutations = res.data?.__schema?.mutationType?.fields?.map((f: any) => f.name) || []
    assert(mutations.includes('register'), 'Missing register mutation')
    assert(mutations.includes('authenticate'), 'Missing authenticate mutation')
    assert(mutations.includes('createCollab'), 'Missing createCollab mutation')
    assert(mutations.includes('submitTrack'), 'Missing submitTrack mutation')
  })

  // Summary
  console.log('\n' + '='.repeat(50))
  const passed = results.filter(r => r.passed).length
  const total = results.length
  console.log(`\n📊 Results: ${passed}/${total} tests passed`)
  
  if (passed < total) {
    console.log('\n❌ Failed tests:')
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n✨ All tests passed!')
  }
}

runTests().catch(console.error)
