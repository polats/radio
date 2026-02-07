import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Apocalypse Radio',
  description: 'AI-powered music collaboration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white">
        <header className="border-b border-zinc-800 p-4">
          <h1 className="text-2xl font-bold">🎸 Apocalypse Radio</h1>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  )
}
