'use client'

import { useEffect, useState, useCallback } from 'react'
import { fetchPosts } from '@/lib/api/posts'
import type { Post } from '@/lib/types/database'
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns'
import { ChevronLeft, ChevronRight, Clock, RefreshCw } from 'lucide-react'

export default function SchedulePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const loadPosts = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchPosts({ status: 'scheduled', limit: 100 })
      setPosts(data.posts)
    } catch (error) {
      console.error('Failed to load posts:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getPostsForDay = (day: Date) => {
    return posts.filter(post => {
      if (!post.scheduled_at) return false
      return isSameDay(parseISO(post.scheduled_at), day)
    })
  }

  const goToPreviousWeek = () => setWeekStart(prev => addDays(prev, -7))
  const goToNextWeek = () => setWeekStart(prev => addDays(prev, 7))
  const goToToday = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Schedule
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Calendar view of scheduled posts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadPosts}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-zinc-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-500" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>

        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {format(weekStart, 'MMMM d')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </h2>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dayPosts = getPostsForDay(day)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={day.toISOString()}
              className={`
                min-h-[200px] rounded-xl border p-3
                ${isToday
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                  : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                }
              `}
            >
              {/* Day Header */}
              <div className="mb-3">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  {format(day, 'EEE')}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {format(day, 'd')}
                </p>
              </div>

              {/* Posts */}
              <div className="space-y-2">
                {dayPosts.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-600">
                    No posts
                  </p>
                ) : (
                  dayPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs"
                    >
                      <div className="flex items-center gap-1 mb-1">
                        <Clock className="w-3 h-3 text-blue-500" />
                        <span className="text-blue-500">{format(parseISO(post.scheduled_at!), 'h:mm a')}</span>
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                          post.platform === 'instagram'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                            : 'bg-zinc-900 text-white dark:bg-zinc-600'
                        }`}>
                          {post.platform === 'instagram' ? 'IG' : '@'}
                        </span>
                      </div>
                      <p className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                        {post.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scheduled Posts List */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Upcoming Posts ({posts.length})
        </h3>

        {posts.length === 0 ? (
          <div className="text-center py-8 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <p className="text-zinc-500 dark:text-zinc-400">
              No scheduled posts. Create a post and set a schedule time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts
              .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime())
              .map((post) => (
                <div
                  key={post.id}
                  className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800"
                >
                  <div className="flex-shrink-0 text-center">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                      {format(parseISO(post.scheduled_at!), 'd')}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase">
                      {format(parseISO(post.scheduled_at!), 'MMM')}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <Clock className="w-4 h-4 text-blue-500" />
                      <span className="text-blue-500">{format(parseISO(post.scheduled_at!), 'EEEE, h:mm a')}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        post.platform === 'instagram'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                          : 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      }`}>
                        {post.platform === 'instagram' ? 'Instagram' : 'Threads'}
                      </span>
                    </div>
                    <p className="text-zinc-700 dark:text-zinc-300 line-clamp-2">
                      {post.content}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Cron Info */}
      <div className="mt-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <strong>Auto-publish:</strong> Scheduled posts are automatically published every 5 minutes via Vercel Cron.
        </p>
      </div>
    </div>
  )
}
