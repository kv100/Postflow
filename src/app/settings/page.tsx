'use client'

import { useEffect, useState } from 'react'
import { testThreadsConnection, clearThreadsSession, ThreadsTestResponse } from '@/lib/api/threads'
import { RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react'

export default function SettingsPage() {
  const [threadsStatus, setThreadsStatus] = useState<ThreadsTestResponse | null>(null)
  const [loading, setLoading] = useState(true)

  async function checkConnection() {
    setLoading(true)
    try {
      const status = await testThreadsConnection()
      setThreadsStatus(status)
    } catch (error) {
      setThreadsStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed'
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleClearSession() {
    if (!confirm('Clear Threads session? You will need to re-authenticate.')) return

    try {
      await clearThreadsSession()
      setThreadsStatus({ connected: false, message: 'Session cleared' })
    } catch (error) {
      alert('Failed to clear session')
    }
  }

  useEffect(() => {
    checkConnection()
  }, [])

  return (
    <div>
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
        Settings
      </h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8">
        Configure your Threads Tool
      </p>

      <div className="space-y-6">
        {/* Threads Connection Status */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Threads Connection
            </h2>
            <button
              onClick={checkConnection}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Refresh status"
            >
              <RefreshCw className={`w-5 h-5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-700 dark:text-zinc-300">Connection Status</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {threadsStatus?.username ? `@${threadsStatus.username}` : 'Browser automation'}
              </p>
            </div>

            {loading ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm">
                <Loader className="w-4 h-4 animate-spin" />
                Checking...
              </span>
            ) : threadsStatus?.connected ? (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                Not Connected
              </span>
            )}
          </div>

          {threadsStatus?.error && (
            <p className="mt-4 text-sm text-red-500">
              Error: {threadsStatus.error}
            </p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={checkConnection}
              disabled={loading}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              Test Connection
            </button>
            {threadsStatus?.connected && (
              <button
                onClick={handleClearSession}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-sm font-medium transition-colors"
              >
                Clear Session
              </button>
            )}
          </div>
        </section>

        {/* AI Reply Settings */}
        <section className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            AI Reply Assistant
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-zinc-700 dark:text-zinc-300">Auto-reply for high confidence</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Automatically send replies when confidence &gt; 85%
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 mb-2">
                Confidence Threshold
              </label>
              <input
                type="range"
                min="50"
                max="100"
                defaultValue="85"
                className="w-full"
              />
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                85% - Higher = more manual review
              </p>
            </div>

            <div>
              <label className="block text-zinc-700 dark:text-zinc-300 mb-2">
                Brand Voice
              </label>
              <textarea
                rows={3}
                defaultValue="Friendly, calm, helpful. Focus on stress relief and breathing. Short responses, max 2 sentences."
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        {/* Info */}
        <section className="bg-blue-50 dark:bg-blue-950 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            How it works
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            This tool uses browser automation (Playwright) to post to Threads.
            Your credentials are stored locally in .env.local and never sent to external servers.
            The first post may take longer as it establishes the session.
          </p>
        </section>
      </div>
    </div>
  )
}
