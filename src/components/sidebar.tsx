'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  Calendar
} from 'lucide-react'

const navigation = [
  { name: 'Posts', href: '/', icon: FileText },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Replies', href: '/replies', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
]

type ConnectionStatus = 'checking' | 'connected' | 'disconnected'

export function Sidebar() {
  const pathname = usePathname()
  const [threadsStatus, setThreadsStatus] = useState<ConnectionStatus>('checking')
  const [instagramStatus, setInstagramStatus] = useState<ConnectionStatus>('checking')

  useEffect(() => {
    async function checkThreads() {
      try {
        const res = await fetch('/api/threads/test')
        const data = await res.json()
        setThreadsStatus(data.connected ? 'connected' : 'disconnected')
      } catch {
        setThreadsStatus('disconnected')
      }
    }

    async function checkInstagram() {
      try {
        const res = await fetch('/api/instagram/test')
        const data = await res.json()
        setInstagramStatus(data.connected ? 'connected' : 'disconnected')
      } catch {
        setInstagramStatus('disconnected')
      }
    }

    checkThreads()
    checkInstagram()
  }, [])

  const statusConfig = {
    checking: { color: 'bg-yellow-500', text: 'Checking...' },
    connected: { color: 'bg-green-500', text: 'Connected' },
    disconnected: { color: 'bg-red-500', text: 'Not connected' },
  }

  const threadsStatusInfo = statusConfig[threadsStatus]
  const instagramStatusInfo = statusConfig[instagramStatus]

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 relative">
      <div className="p-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          PostFlow
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Social Media Manager
        </p>
      </div>

      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }
              `}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${threadsStatusInfo.color}`} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Threads: {threadsStatusInfo.text}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${instagramStatusInfo.color}`} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Instagram: {instagramStatusInfo.text}
          </span>
        </div>
      </div>
    </aside>
  )
}
