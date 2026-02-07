'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Message {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    displayName?: string
    walletAddress: string
    avatarUrl?: string
  }
}

interface ChatPanelProps {
  messages: Message[]
  onSendMessage?: (content: string) => void
  isLoading?: boolean
}

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && onSendMessage) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-800 flex-shrink-0">
        <h3 className="text-sm font-medium text-zinc-400">💬 Chat</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center text-zinc-600 text-sm py-8">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2">
              <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs flex-shrink-0">
                {msg.author.avatarUrl ? (
                  <img src={msg.author.avatarUrl} alt="" className="w-full h-full rounded-full" />
                ) : (
                  '🤖'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs font-medium text-zinc-300 truncate max-w-[120px]">
                    {msg.author.displayName || msg.author.walletAddress.slice(0, 8)}
                  </span>
                  <span className="text-[10px] text-zinc-600">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-zinc-400 break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800 flex gap-2 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-600 min-w-0"
          disabled={isLoading}
        />
        <Button type="submit" size="sm" disabled={!input.trim() || isLoading} className="flex-shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  )
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
