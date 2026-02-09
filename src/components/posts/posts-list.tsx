'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchPosts, deletePost } from '@/lib/api/posts'
import type { Post } from '@/lib/types/database'
import { PostCard } from './post-card'
import { RefreshCw } from 'lucide-react'

export function PostsList() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [error, setError] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await fetchPosts({
        status: filter === 'all' ? undefined : filter,
        platform: platformFilter === 'all' ? undefined : platformFilter,
      })

      // Deduplicate by content (first 80 chars) — keep the one with thread_id
      const seen = new Map<string, Post>()
      for (const post of data.posts) {
        const key = post.content.substring(0, 80)
        const existing = seen.get(key)
        if (!existing) {
          seen.set(key, post)
        } else {
          // Keep the one with thread_id (synced from API)
          if (post.thread_id && !existing.thread_id) {
            seen.set(key, post)
          }
        }
      }
      const uniquePosts = Array.from(seen.values())

      // Sort: scheduled/draft first (by scheduled_at ASC), then published by date DESC
      const sorted = uniquePosts.sort((a, b) => {
        const isPendingA = a.status === 'scheduled' || a.status === 'draft'
        const isPendingB = b.status === 'scheduled' || b.status === 'draft'
        if (isPendingA && !isPendingB) return -1
        if (!isPendingA && isPendingB) return 1
        if (isPendingA && isPendingB) {
          // Both scheduled — soonest first
          return new Date(a.scheduled_at || a.created_at).getTime() - new Date(b.scheduled_at || b.created_at).getTime()
        }
        // Both published — newest first
        const dateA = new Date(a.published_at || a.created_at).getTime()
        const dateB = new Date(b.published_at || b.created_at).getTime()
        return dateB - dateA
      })

      setPosts(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
    } finally {
      setLoading(false)
    }
  }, [filter, platformFilter])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return

    try {
      await deletePost(id)
      setPosts(posts.filter(p => p.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  const statusFilters = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Drafts' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'published', label: 'Published' },
    { value: 'failed', label: 'Failed' },
  ]

  const platformFilters = [
    { value: 'all', label: 'All Platforms' },
    { value: 'threads', label: 'Threads' },
    { value: 'instagram', label: 'Instagram' },
  ]

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-6">
        {/* Platform filter */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {platformFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setPlatformFilter(f.value)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                  ${platformFilter === f.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadPosts}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status filter */}
        <div className="flex gap-2">
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                ${filter === f.value
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }
              `}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && posts.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <p className="text-zinc-500 dark:text-zinc-400">
            No posts yet. Create your first post!
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={() => handleDelete(post.id)}
              onUpdate={loadPosts}
            />
          ))}
        </div>
      )}
    </div>
  )
}
