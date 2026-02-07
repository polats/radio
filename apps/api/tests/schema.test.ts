/**
 * Schema Validation Tests
 * Tests that the GraphQL schema has all expected types, queries, mutations, and subscriptions
 */

const API_URL = process.env.API_URL || 'http://localhost:4000'

async function graphql(query: string) {
  const res = await fetch(`${API_URL}/graphql`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return res.json()
}

async function runSchemaTests() {
  console.log(`\n🔍 Schema Validation at ${API_URL}\n`)

  // Get full schema introspection
  const schemaQuery = `{
    __schema {
      types { name kind }
      queryType { fields { name } }
      mutationType { fields { name } }
      subscriptionType { fields { name } }
    }
  }`

  const res = await graphql(schemaQuery)
  const schema = res.data?.__schema

  if (!schema) {
    console.error('❌ Failed to fetch schema')
    process.exit(1)
  }

  let passed = 0
  let failed = 0

  function check(name: string, condition: boolean) {
    if (condition) {
      console.log(`✅ ${name}`)
      passed++
    } else {
      console.log(`❌ ${name}`)
      failed++
    }
  }

  // Types
  const types = schema.types.map((t: any) => t.name)
  
  console.log('\n📦 Types:')
  check('Agent type exists', types.includes('Agent'))
  check('Collab type exists', types.includes('Collab'))
  check('Section type exists', types.includes('Section'))
  check('Track type exists', types.includes('Track'))
  check('Message type exists', types.includes('Message'))
  check('GoldMaster type exists', types.includes('GoldMaster'))
  check('Like type exists', types.includes('Like'))
  check('AuthPayload type exists', types.includes('AuthPayload'))
  check('NoncePayload type exists', types.includes('NoncePayload'))
  check('CollabStatus enum exists', types.includes('CollabStatus'))
  check('TrackStatus enum exists', types.includes('TrackStatus'))

  // Queries
  const queries = schema.queryType?.fields?.map((f: any) => f.name) || []
  
  console.log('\n🔎 Queries:')
  check('health query exists', queries.includes('health'))
  check('getNonce query exists', queries.includes('getNonce'))
  check('me query exists', queries.includes('me'))
  check('agent query exists', queries.includes('agent'))
  check('collab query exists', queries.includes('collab'))
  check('openCollabs query exists', queries.includes('openCollabs'))
  check('myCollabs query exists', queries.includes('myCollabs'))
  check('feed query exists', queries.includes('feed'))
  check('messages query exists', queries.includes('messages'))
  check('goldMaster query exists', queries.includes('goldMaster'))

  // Mutations
  const mutations = schema.mutationType?.fields?.map((f: any) => f.name) || []
  
  console.log('\n✏️ Mutations:')
  check('register mutation exists', mutations.includes('register'))
  check('loginAsGuest mutation exists', mutations.includes('loginAsGuest'))
  check('authenticate mutation exists', mutations.includes('authenticate'))
  check('createCollab mutation exists', mutations.includes('createCollab'))
  check('updateCollab mutation exists', mutations.includes('updateCollab'))
  check('submitTrack mutation exists', mutations.includes('submitTrack'))
  check('reviewTrack mutation exists', mutations.includes('reviewTrack'))
  check('sendMessage mutation exists', mutations.includes('sendMessage'))
  check('likeGoldMaster mutation exists', mutations.includes('likeGoldMaster'))
  check('unlikeGoldMaster mutation exists', mutations.includes('unlikeGoldMaster'))

  // Subscriptions
  const subscriptions = schema.subscriptionType?.fields?.map((f: any) => f.name) || []
  
  console.log('\n📡 Subscriptions:')
  check('newMessage subscription exists', subscriptions.includes('newMessage'))
  check('trackSubmitted subscription exists', subscriptions.includes('trackSubmitted'))
  check('collabUpdated subscription exists', subscriptions.includes('collabUpdated'))

  // Summary
  console.log('\n' + '='.repeat(50))
  console.log(`\n📊 Schema: ${passed}/${passed + failed} checks passed`)
  
  if (failed > 0) {
    process.exit(1)
  }
}

runSchemaTests().catch(console.error)
