'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchAnalytics, syncAnalytics, type AnalyticsResponse, type SyncAnalyticsResponse } from '@/lib/api/analytics'
import { RefreshCw, Users, Heart, MessageSquare, Repeat2, TrendingUp, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, Eye, Bookmark, Share2, Play } from 'lucide-react'
import { format } from 'date-fns'

type PlatformTab = 'threads' | 'instagram'

export function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncAnalyticsResponse | null>(null)
  const [platformTab, setPlatformTab] = useState<PlatformTab>('threads')
  const [postSort, setPostSort] = useState<{ field: string; dir: 'asc' | 'desc' }>({ field: 'views', dir: 'desc' })
  const [postDateFilter, setPostDateFilter] = useState<'all' | '7d' | '30d'>('all')

  const loadAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAnalytics(30)
      setData(result)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const result = await syncAnalytics()
      setSyncResult(result)
      await loadAnalytics()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const formatChange = (change: number | null) => {
    if (change === null) return null
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  return (
    <div className="space-y-6">
      {/* Header with platform tabs and sync button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setPlatformTab('threads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platformTab === 'threads'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Threads
          </button>
          <button
            onClick={() => setPlatformTab('instagram')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platformTab === 'instagram'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Instagram
          </button>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Analytics'}
        </button>
      </div>

      {/* Sync result notification */}
      {syncResult?.success !== undefined && (
        <div className={`p-4 rounded-lg border ${
          syncResult.success
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
        }`}>
          <p className="text-sm text-green-700 dark:text-green-300">
            {syncResult.threads?.success && syncResult.threads.data && (
              <>Threads: {syncResult.threads.data.followersCount} followers. </>
            )}
            {syncResult.instagram?.success && syncResult.instagram.data && (
              <>Instagram: {syncResult.instagram.data.followersCount} followers. </>
            )}
            {/* Legacy format fallback */}
            {syncResult.data && !syncResult.threads && (
              <>Synced: {syncResult.data.followersCount} followers.</>
            )}
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : platformTab === 'threads' ? (
        <ThreadsAnalytics
          data={data}
          formatNumber={formatNumber}
          formatChange={formatChange}
          postSort={postSort}
          setPostSort={setPostSort}
          postDateFilter={postDateFilter}
          setPostDateFilter={setPostDateFilter}
        />
      ) : (
        <InstagramAnalytics
          data={data}
          formatNumber={formatNumber}
          formatChange={formatChange}
          postSort={postSort}
          setPostSort={setPostSort}
          postDateFilter={postDateFilter}
          setPostDateFilter={setPostDateFilter}
        />
      )}
    </div>
  )
}

// ─── Threads Analytics Tab ───

function ThreadsAnalytics({
  data,
  formatNumber,
  formatChange,
  postSort,
  setPostSort,
  postDateFilter,
  setPostDateFilter,
}: {
  data: AnalyticsResponse | null
  formatNumber: (n: number) => string
  formatChange: (n: number | null) => string | null
  postSort: { field: string; dir: 'asc' | 'desc' }
  setPostSort: (s: { field: string; dir: 'asc' | 'desc' }) => void
  postDateFilter: 'all' | '7d' | '30d'
  setPostDateFilter: (f: 'all' | '7d' | '30d') => void
}) {
  return (
    <>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Followers"
          value={formatNumber(data?.summary.followers || 0)}
          change={formatChange(data?.summary.followersChange || null)}
          icon={Users}
          color="text-blue-500"
          bgColor="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="Total Engagement"
          value={formatNumber(
            (data?.summary.totalLikes || 0) +
            (data?.summary.totalReplies || 0) +
            (data?.summary.totalReposts || 0)
          )}
          subtext={`${formatNumber(data?.summary.totalLikes || 0)} likes, ${formatNumber(data?.summary.totalReplies || 0)} replies`}
          icon={Heart}
          color="text-pink-500"
          bgColor="bg-pink-50 dark:bg-pink-950"
        />
        <StatCard
          title="Engagement Rate"
          value={`${data?.summary.engagementRate?.toFixed(2) || '0.00'}%`}
          subtext="Based on followers"
          icon={TrendingUp}
          color="text-green-500"
          bgColor="bg-green-50 dark:bg-green-950"
        />
      </div>

      {/* Engagement breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MiniStatCard title="Likes" value={formatNumber(data?.summary.totalLikes || 0)} icon={Heart} color="text-red-500" />
        <MiniStatCard title="Replies" value={formatNumber(data?.summary.totalReplies || 0)} icon={MessageSquare} color="text-blue-500" />
        <MiniStatCard title="Reposts" value={formatNumber(data?.summary.totalReposts || 0)} icon={Repeat2} color="text-green-500" />
        <MiniStatCard title="Posts" value={formatNumber(data?.summary.postsCount || 0)} icon={BarChart3} color="text-purple-500" />
      </div>

      {/* History table */}
      {data?.history && data.history.length > 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Daily History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Followers</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Likes</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Replies</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Reposts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.history.slice().reverse().map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {(() => {
                        const daily = (entry as unknown as Record<string, number>).daily_followers ?? 0
                        const total = entry.followers_count
                        return (
                          <span className="text-zinc-900 dark:text-zinc-100">
                            {daily > 0 ? `+${daily}` : daily === 0 ? '0' : daily}
                            <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-1">({total})</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_likes ?? entry.total_likes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_replies ?? entry.total_replies)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_reposts ?? entry.total_reposts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <BarChart3 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            No analytics data yet
          </h3>
          <p className="text-zinc-500 dark:text-zinc-400">
            Click &quot;Sync Analytics&quot; to fetch data from Threads.
          </p>
        </div>
      )}

      {/* Post Performance table */}
      {data?.postPerformance && data.postPerformance.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Post Performance</h3>
            <div className="flex gap-1">
              {(['all', '7d', '30d'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPostDateFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    postDateFilter === f
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Post</th>
                  <SortableHeader field="date" label="Date" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="views" label="Views" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="likes" label="Likes" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="replies" label="Replies" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="reposts" label="Reposts" currentSort={postSort} onSort={setPostSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {data.postPerformance
                  .filter(post => {
                    if (postDateFilter === 'all') return true
                    if (!post.published_at) return true
                    const days = postDateFilter === '7d' ? 7 : 30
                    const cutoff = new Date()
                    cutoff.setDate(cutoff.getDate() - days)
                    return new Date(post.published_at) >= cutoff
                  })
                  .slice()
                  .sort((a, b) => {
                    const dir = postSort.dir === 'desc' ? -1 : 1
                    if (postSort.field === 'date') {
                      const da = a.published_at ? new Date(a.published_at).getTime() : 0
                      const db = b.published_at ? new Date(b.published_at).getTime() : 0
                      return (da - db) * dir
                    }
                    return (((a as unknown as Record<string, number>)[postSort.field] || 0) - ((b as unknown as Record<string, number>)[postSort.field] || 0)) * dir
                  })
                  .map(post => (
                  <tr key={post.thread_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 max-w-xs truncate">
                      {post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 text-right whitespace-nowrap">
                      {post.published_at ? format(new Date(post.published_at), 'MMM d') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.views)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.likes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.replies)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.reposts)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Instagram Analytics Tab ───

function InstagramAnalytics({
  data,
  formatNumber,
  formatChange,
  postSort,
  setPostSort,
  postDateFilter,
  setPostDateFilter,
}: {
  data: AnalyticsResponse | null
  formatNumber: (n: number) => string
  formatChange: (n: number | null) => string | null
  postSort: { field: string; dir: 'asc' | 'desc' }
  setPostSort: (s: { field: string; dir: 'asc' | 'desc' }) => void
  postDateFilter: 'all' | '7d' | '30d'
  setPostDateFilter: (f: 'all' | '7d' | '30d') => void
}) {
  const ig = data?.instagram

  if (!ig || (ig.history.length === 0 && !ig.summary.followers)) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-8 text-center">
        <BarChart3 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
          No Instagram analytics yet
        </h3>
        <p className="text-zinc-500 dark:text-zinc-400">
          Click &quot;Sync Analytics&quot; to fetch data from Instagram.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Followers"
          value={formatNumber(ig.summary.followers)}
          change={formatChange(ig.summary.followersChange)}
          icon={Users}
          color="text-purple-500"
          bgColor="bg-purple-50 dark:bg-purple-950"
        />
        <StatCard
          title="Views"
          value={formatNumber(ig.summary.totalReach)}
          subtext="Unique accounts reached"
          icon={Eye}
          color="text-blue-500"
          bgColor="bg-blue-50 dark:bg-blue-950"
        />
        <StatCard
          title="Engagement Rate"
          value={`${ig.summary.engagementRate?.toFixed(2) || '0.00'}%`}
          subtext="Likes + comments / followers"
          icon={TrendingUp}
          color="text-pink-500"
          bgColor="bg-pink-50 dark:bg-pink-950"
        />
      </div>

      {/* Engagement breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniStatCard title="Likes" value={formatNumber(ig.summary.totalLikes)} icon={Heart} color="text-red-500" />
        <MiniStatCard title="Comments" value={formatNumber(ig.summary.totalComments)} icon={MessageSquare} color="text-blue-500" />
        <MiniStatCard title="Views" value={formatNumber(ig.summary.totalReach)} icon={Eye} color="text-blue-500" />
        <MiniStatCard title="Posts" value={formatNumber(ig.summary.postsCount)} icon={BarChart3} color="text-purple-500" />
      </div>

      {/* History table */}
      {ig.history.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Daily History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Date</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Followers</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Likes</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Comments</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Views</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Impressions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ig.history.slice().reverse().map(entry => (
                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {(() => {
                        const daily = (entry as unknown as Record<string, number>).daily_followers ?? 0
                        const total = entry.followers_count
                        return (
                          <span className="text-zinc-900 dark:text-zinc-100">
                            {daily > 0 ? `+${daily}` : daily === 0 ? '0' : daily}
                            <span className="text-zinc-400 dark:text-zinc-500 text-xs ml-1">({total})</span>
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_likes ?? entry.total_likes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_comments ?? entry.total_comments)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_reach ?? entry.total_reach)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber((entry as unknown as Record<string, number>).daily_impressions ?? entry.total_impressions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Post Performance table */}
      {ig.postPerformance && ig.postPerformance.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-medium text-zinc-900 dark:text-zinc-100">Post Performance</h3>
            <div className="flex gap-1">
              {(['all', '7d', '30d'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPostDateFilter(f)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    postDateFilter === f
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f === 'all' ? 'All' : f === '7d' ? '7 days' : '30 days'}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Post</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">Type</th>
                  <SortableHeader field="date" label="Date" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="reach" label="Views" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="plays" label="Plays" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="likes" label="Likes" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="comments" label="Comments" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="saves" label="Saves" currentSort={postSort} onSort={setPostSort} />
                  <SortableHeader field="shares" label="Shares" currentSort={postSort} onSort={setPostSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ig.postPerformance
                  .filter(post => {
                    if (postDateFilter === 'all') return true
                    if (!post.published_at) return true
                    const days = postDateFilter === '7d' ? 7 : 30
                    const cutoff = new Date()
                    cutoff.setDate(cutoff.getDate() - days)
                    return new Date(post.published_at) >= cutoff
                  })
                  .slice()
                  .sort((a, b) => {
                    const dir = postSort.dir === 'desc' ? -1 : 1
                    if (postSort.field === 'date') {
                      const da = a.published_at ? new Date(a.published_at).getTime() : 0
                      const db = b.published_at ? new Date(b.published_at).getTime() : 0
                      return (da - db) * dir
                    }
                    return (((a as unknown as Record<string, number>)[postSort.field] || 0) - ((b as unknown as Record<string, number>)[postSort.field] || 0)) * dir
                  })
                  .map(post => (
                  <tr key={post.instagram_media_id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 max-w-[200px] truncate">
                      {post.content.length > 60 ? post.content.slice(0, 60) + '...' : post.content || '(no caption)'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        post.media_type === 'reels'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        {post.media_type === 'reels' && <Play className="w-3 h-3" />}
                        {post.media_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400 text-right whitespace-nowrap">
                      {post.published_at ? format(new Date(post.published_at), 'MMM d') : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.reach)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.plays)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.likes)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.comments)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.saves)}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 text-right">
                      {formatNumber(post.shares)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Shared Components ───

function StatCard({
  title,
  value,
  change,
  subtext,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string
  value: string
  change?: string | null
  subtext?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{title}</span>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
        {value}
      </p>
      {change && (
        <p className={`text-sm mt-1 ${change.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
          {change} from previous
        </p>
      )}
      {subtext && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
          {subtext}
        </p>
      )}
    </div>
  )
}

type SortField = string
type SortState = { field: SortField; dir: 'asc' | 'desc' }

function SortableHeader({
  field,
  label,
  currentSort,
  onSort,
}: {
  field: SortField
  label: string
  currentSort: SortState
  onSort: (s: SortState) => void
}) {
  const active = currentSort.field === field
  return (
    <th
      className="px-4 py-2 text-right text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase cursor-pointer select-none hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
      onClick={() => {
        if (active) {
          onSort({ field, dir: currentSort.dir === 'desc' ? 'asc' : 'desc' })
        } else {
          onSort({ field, dir: 'desc' })
        }
      }}
    >
      <span className="inline-flex items-center gap-1 justify-end">
        {label}
        {active ? (
          currentSort.dir === 'desc' ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </span>
    </th>
  )
}

function MiniStatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{title}</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
        </div>
      </div>
    </div>
  )
}
