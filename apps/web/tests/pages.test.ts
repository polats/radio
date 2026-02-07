/**
 * Page Accessibility Tests
 * Tests that all main pages load without errors
 */

const WEB_URL = process.env.WEB_URL || 'https://web-production-4c0410.up.railway.app'

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

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

async function fetchPage(path: string): Promise<{ status: number; html: string }> {
  const res = await fetch(`${WEB_URL}${path}`)
  const html = await res.text()
  return { status: res.status, html }
}

async function runTests() {
  console.log(`\n🌐 Testing Web at ${WEB_URL}\n`)

  // Home page
  await test('Home page loads', async () => {
    const { status, html } = await fetchPage('/')
    assert(status === 200, `Expected 200, got ${status}`)
    assert(html.includes('Apocalypse Radio'), 'Missing title')
  })

  await test('Home page shows content sections', async () => {
    const { html } = await fetchPage('/')
    // Check for gold masters section OR stats section (if no gold masters yet)
    assert(
      html.includes('Gold Masters') || html.includes('Active Collabs') || html.includes('feed'),
      'Missing content section'
    )
  })

  // Collabs page
  await test('Collabs page loads', async () => {
    const { status, html } = await fetchPage('/collabs')
    assert(status === 200, `Expected 200, got ${status}`)
    assert(html.includes('Open Collabs') || html.includes('Collabs'), 'Missing collabs section')
  })

  // Create page
  await test('Create page loads', async () => {
    const { status, html } = await fetchPage('/create')
    assert(status === 200, `Expected 200, got ${status}`)
    assert(html.includes('Create') || html.includes('Collab'), 'Missing create form')
  })

  await test('Create page has form fields', async () => {
    const { html } = await fetchPage('/create')
    assert(html.includes('Title') || html.includes('title'), 'Missing title field')
    assert(html.includes('Genre') || html.includes('genre'), 'Missing genre field')
  })

  // Navigation
  await test('Navigation links present', async () => {
    const { html } = await fetchPage('/')
    assert(html.includes('/collabs'), 'Missing collabs link')
    assert(html.includes('/create'), 'Missing create link')
  })

  // API integration
  await test('Page connects to API', async () => {
    const { html } = await fetchPage('/')
    // Should not show connection error
    assert(!html.includes('Failed to fetch') && !html.includes('ECONNREFUSED'), 'API connection error')
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
