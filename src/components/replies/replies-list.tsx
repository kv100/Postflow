'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Reply, ReplyStatus } from '@/lib/types/database'
import { fetchReplies, syncMentions, type SyncResponse } from '@/lib/api/replies'
import { ReplyCard } from './reply-card'
import { RefreshCw, Inbox, Filter } from 'lucide-react'

const statusTabs: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'auto_sent', label: 'Auto-sent' },
  { value: 'skipped', label: 'Skipped' },
]

export function RepliesList() {
  const [replies, setReplies] = useState<Reply[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null)

  const loadReplies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchReplies({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      })
      setReplies(data.replies)
      setTotal(data.total)
    } catch (error) {
      console.error('Failed to fetch replies:', error)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadReplies()
  }, [loadReplies])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncMentions(false)
      setSyncResult(result)
      // Reload replies after sync
      await loadReplies()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const pendingCount = replies.filter(r => r.status === 'pending').length

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status tabs */}
          <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            {statusTabs.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
                {tab.value === 'pending' && pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Mentions'}
        </button>
      </div>

      {/* Sync result notification */}
      {syncResult && (
        <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Found {syncResult.sync.found} mentions, {syncResult.sync.new} new.
            Generated {syncResult.ai.generated} AI replies
            {syncResult.ai.autoSent > 0 && `, auto-sent ${syncResult.ai.autoSent}`}.
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="text-sm text-zinc-500 dark:text-zinc-400">
        {total} {total === 1 ? 'reply' : 'replies'}
        {statusFilter !== 'all' && ` (${statusFilter})`}
      </div>

      {/* Replies list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : replies.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-12 text-center">
          <Inbox className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No replies yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            {statusFilter === 'pending'
              ? 'No pending replies to review.'
              : 'Click "Sync Mentions" to fetch new mentions from Threads.'}
          </p>
          {statusFilter !== 'all' && (
            <button
              onClick={() => setStatusFilter('all')}
              className="text-blue-500 hover:text-blue-600 text-sm font-medium"
            >
              Show all replies
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {replies.map(reply => (
            <ReplyCard
              key={reply.id}
              reply={reply}
              onUpdate={loadReplies}
            />
          ))}
        </div>
      )}
    </div>
  )
}
