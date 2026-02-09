// Threads Insights API for analytics
// Official docs: https://developers.facebook.com/docs/threads/insights

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserThreads } from '@/lib/threads/client'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

export interface ThreadsAnalytics {
  followersCount: number
  postsCount: number
  recentEngagement: {
    likes: number
    replies: number
    reposts: number
  }
  totalViews?: number
  dailyViews?: Array<{ date: string; value: number }>
}

export interface PostEngagement {
  threadId: string
  likes: number
  replies: number
  reposts: number
  views: number
}

/**
 * Helper for Threads API calls with access token
 */
async function threadsApiFetch(endpoint: string): Promise<Response> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('THREADS_ACCESS_TOKEN not configured')
  }

  const url = `${THREADS_API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
      `Threads API error: ${response.status} ${response.statusText}`
    )
  }

  return response
}

/**
 * Fetch user-level insights for a date range
 * Metrics: views, likes, replies, reposts, quotes, followers_count
 * Note: Some metrics return `values` (daily array), others return `total_value` (aggregate)
 */
async function fetchUserInsights(
  days: number = 30
): Promise<{
  daily_views: Array<{ date: string; value: number }>
  total_likes: number
  total_replies: number
  total_reposts: number
  total_quotes: number
  followers_count: number
}> {
  const defaults = {
    daily_views: [] as Array<{ date: string; value: number }>,
    total_likes: 0,
    total_replies: 0,
    total_reposts: 0,
    total_quotes: 0,
    followers_count: 0,
  }

  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      throw new Error('THREADS_USER_ID not configured')
    }

    const metrics = 'views,likes,replies,reposts,quotes,followers_count'
    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
    const until = Math.floor(Date.now() / 1000)

    const endpoint = `/${userId}/threads_insights?metric=${metrics}&period=day&since=${since}&until=${until}`
    const response = await threadsApiFetch(endpoint)
    const data = await response.json()

    if (!data.data || !Array.isArray(data.data)) {
      return defaults
    }

    const result = { ...defaults }

    for (const insight of data.data) {
      const name = insight.name

      // "views" returns daily values array
      if (name === 'views' && insight.values) {
        result.daily_views = insight.values.map((v: { value: number; end_time: string }) => ({
          date: v.end_time.split('T')[0],
          value: v.value || 0,
        }))
      }

      // likes, replies, reposts, quotes return total_value
      if (name === 'likes') result.total_likes = insight.total_value?.value || 0
      if (name === 'replies') result.total_replies = insight.total_value?.value || 0
      if (name === 'reposts') result.total_reposts = insight.total_value?.value || 0
      if (name === 'quotes') result.total_quotes = insight.total_value?.value || 0
      if (name === 'followers_count') result.followers_count = insight.total_value?.value || 0
    }

    return result
  } catch (error) {
    console.error('Failed to fetch user insights:', error)
    return defaults
  }
}

/**
 * Fetch media-level insights for specific thread
 */
export async function fetchMediaInsights(mediaId: string): Promise<PostEngagement> {
  try {
    const metrics = ['views', 'likes', 'replies', 'reposts', 'quotes'].join(',')
    const endpoint = `/${mediaId}/insights?metric=${metrics}`

    const response = await threadsApiFetch(endpoint)
    const data = await response.json()

    const engagement: PostEngagement = {
      threadId: mediaId,
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
    }

    if (data.data && Array.isArray(data.data)) {
      for (const insight of data.data) {
        const metricName = insight.name
        const values = insight.values || []

        if (values.length > 0) {
          const value = values[0].value || 0

          if (metricName === 'views') engagement.views = value
          if (metricName === 'likes') engagement.likes = value
          if (metricName === 'replies') engagement.replies = value
          if (metricName === 'reposts') engagement.reposts = value
        }
      }
    }

    return engagement
  } catch (error) {
    console.error(`Failed to fetch media insights for ${mediaId}:`, error)
    return {
      threadId: mediaId,
      views: 0,
      likes: 0,
      replies: 0,
      reposts: 0,
    }
  }
}

/**
 * Fetch profile analytics using Threads Insights API
 */
export async function fetchProfileAnalytics(): Promise<ThreadsAnalytics> {
  try {
    const userInsights = await fetchUserInsights(30)

    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      throw new Error('THREADS_USER_ID not configured')
    }

    const threadsResponse = await threadsApiFetch(
      `/${userId}/threads?fields=id&limit=100`
    )
    const threadsData = await threadsResponse.json()
    const postsCount = threadsData.data?.length || 0

    // Sum total views from daily data
    const totalViews = userInsights.daily_views.reduce((sum, d) => sum + d.value, 0)

    return {
      followersCount: userInsights.followers_count,
      postsCount,
      recentEngagement: {
        likes: userInsights.total_likes,
        replies: userInsights.total_replies,
        reposts: userInsights.total_reposts,
      },
      totalViews,
      dailyViews: userInsights.daily_views,
    }
  } catch (error) {
    console.error('Failed to fetch profile analytics:', error)
    return {
      followersCount: 0,
      postsCount: 0,
      recentEngagement: { likes: 0, replies: 0, reposts: 0 },
    }
  }
}

/**
 * Sync analytics to database
 * Same interface as before, now using REST API instead of scraping
 */
export async function syncAnalytics(): Promise<{
  success: boolean
  data?: ThreadsAnalytics
  postsSynced?: number
  error?: string
}> {
  try {
    const analytics = await fetchProfileAnalytics()
    const supabase = createAdminClient()
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' })

    // Upsert today's analytics
    const { error } = await supabase
      .from('analytics')
      .upsert(
        {
          date: today,
          followers_count: analytics.followersCount,
          total_likes: analytics.recentEngagement.likes,
          total_replies: analytics.recentEngagement.replies,
          total_reposts: analytics.recentEngagement.reposts,
          total_views: analytics.totalViews || 0,
          posts_count: analytics.postsCount,
        },
        {
          onConflict: 'date',
        }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    // --- Sync new posts from Threads API into posts table ---
    try {
      const threads = await getUserThreads(100)
      for (const thread of threads) {
        if (!thread.text) continue
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('thread_id', thread.id)
          .maybeSingle()
        if (existing) continue
        await supabase.from('posts').insert({
          content: thread.text,
          thread_id: thread.id,
          status: 'published' as const,
          published_at: thread.timestamp,
          media_urls: [],
        })
      }
    } catch (err) {
      console.error('Failed to sync posts from Threads:', err)
    }

    // --- Sync per-post analytics ---
    let postsSynced = 0

    // Fetch all published posts with thread_id
    const { data: publishedPosts } = await supabase
      .from('posts')
      .select('id, thread_id, content')
      .eq('status', 'published')
      .not('thread_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50)  // last 50 posts (API rate limit safety)

    if (publishedPosts && publishedPosts.length > 0) {
      for (const post of publishedPosts) {
        try {
          const engagement = await fetchMediaInsights(post.thread_id!)

          await supabase
            .from('post_analytics')
            .upsert(
              {
                post_id: post.id,
                thread_id: post.thread_id!,
                date: today,
                likes: engagement.likes,
                replies: engagement.replies,
                reposts: engagement.reposts,
                views: engagement.views,
              },
              { onConflict: 'thread_id,date' }
            )

          postsSynced++

          // Small delay to avoid Threads API rate limiting
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err) {
          console.error(`Failed to sync analytics for post ${post.id}:`, err)
          // Continue with next post
        }
      }
    }

    return { success: true, data: analytics, postsSynced }
  } catch (error) {
    console.error('Sync analytics error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get analytics history from database
 * Unchanged - still reads from Supabase
 */
export async function getAnalyticsHistory(days: number = 30): Promise<{
  data: Array<{
    date: string
    followers_count: number
    total_likes: number
    total_replies: number
    total_reposts: number
    total_views: number
    posts_count: number
  }>
  error?: string
}> {
  const supabase = createAdminClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('analytics')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [] }
}

/**
 * Get detailed engagement for specific posts
 * Use this to track individual thread performance
 */
export async function getPostEngagement(threadIds: string[]): Promise<PostEngagement[]> {
  const engagements = await Promise.all(
    threadIds.map((id) => fetchMediaInsights(id))
  )
  return engagements
}
