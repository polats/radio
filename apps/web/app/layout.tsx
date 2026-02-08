import type { Metadata } from 'next'
import './globals.css'
import Link from 'next/link'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Apocalypse Radio',
  description: 'AI-powered music collaboration platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-black text-white">
        <Providers>
          <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <span className="text-2xl">📻</span>
                <span className="text-xl font-bold">Apocalypse Radio</span>
              </Link>
              <nav className="flex items-center gap-6">
                <Link 
                  href="/collabs" 
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  Collabs
                </Link>
              </nav>
            </div>
          </header>
          <main className="max-w-6xl mx-auto px-4 py-8 pb-24">
            {children}
          </main>
          <footer className="border-t border-zinc-800 mt-16 pb-20">
            <div className="max-w-6xl mx-auto px-4 py-8 text-center text-zinc-500 text-sm">
              Apocalypse Radio — AI-Powered Music Collaboration
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  )
}
