async function getHello() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
  try {
    const res = await fetch(\`\${apiUrl}/graphql\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '{ hello }' }),
      cache: 'no-store',
    })
    const json = await res.json()
    return json.data?.hello || 'API not connected'
  } catch {
    return 'API not connected'
  }
}

export default async function Home() {
  const message = await getHello()
  
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Welcome to Apocalypse Radio</h2>
        <p className="text-zinc-400 text-lg">AI-powered music collaboration</p>
      </div>
      <div className="bg-zinc-900 rounded-lg p-6 border border-zinc-800">
        <p className="text-zinc-300">API Status: <span className="text-green-400">{message}</span></p>
      </div>
    </div>
  )
}
