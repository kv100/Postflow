// Instagram Insights API for analytics
// Official docs: https://developers.facebook.com/docs/instagram-api/guides/insights

import { createAdminClient } from '@/lib/supabase/admin'
import { getUserMedia } from '@/lib/instagram/client'

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0'

export interface InstagramAnalytics {
  followersCount: number
  postsCount: number
  totalReach: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
}

export interface InstagramPostEngagement {
  mediaId: string
  impressions: number
  reach: number
  likes: number
  comments: number
  saves: number
  shares: number
  plays?: number // For Reels/videos
}

/**
 * Helper for Instagram Graph API calls
 */
async function instagramApiFetch(endpoint: string): Promise<Response> {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('FACEBOOK_ACCESS_TOKEN not configured')
  }

  const separator = endpoint.includes('?') ? '&' : '?'
  const url = `${GRAPH_API_BASE}${endpoint}${separator}access_token=${accessToken}`

  const response = await fetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
      `Instagram API error: ${response.status} ${response.statusText}`
    )
  }

  return response
}

/**
 * Fetch profile-level insights
 * Metrics: impressions, reach, follower_count, profile_views
 * Period: day (returns daily breakdown for last 30 days)
 */
async function fetchProfileInsights(
  days: number = 30
): Promise<{
  total_reach: number
  total_impressions: number
  followers_count: number
}> {
  const defaults = {
    total_reach: 0,
    total_impressions: 0,
    followers_count: 0,
  }

  try {
    const userId = process.env.INSTAGRAM_USER_ID
    if (!userId) throw new Error('INSTAGRAM_USER_ID not configured')

    const since = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000)
    const until = Math.floor(Date.now() / 1000)

    // Fetch reach and impressions (time-series metrics)
    const metricsEndpoint = `/${userId}/insights?metric=impressions,reach&period=day&since=${since}&until=${until}`
    const response = await instagramApiFetch(metricsEndpoint)
    const data = await response.json()

    const result = { ...defaults }

    if (data.data && Array.isArray(data.data)) {
      for (const insight of data.data) {
        if (insight.name === 'reach' && insight.values) {
          result.total_reach = insight.values.reduce(
            (sum: number, v: { value: number }) => sum + (v.value || 0), 0
          )
        }
        if (insight.name === 'impressions' && insight.values) {
          result.total_impressions = insight.values.reduce(
            (sum: number, v: { value: number }) => sum + (v.value || 0), 0
          )
        }
      }
    }

    // Fetch follower count separately
    try {
      const profileResponse = await instagramApiFetch(
        `/${userId}?fields=followers_count`
      )
      const profileData = await profileResponse.json()
      result.followers_count = profileData.followers_count || 0
    } catch {
      // followers_count may require 100+ followers
    }

    return result
  } catch (error) {
    console.error('Failed to fetch profile insights:', error)
    return defaults
  }
}

/**
 * Fetch media-level insights for a specific post/reel
 */
export async function fetchMediaInsights(mediaId: string): Promise<InstagramPostEngagement> {
  const engagement: InstagramPostEngagement = {
    mediaId,
    impressions: 0,
    reach: 0,
    likes: 0,
    comments: 0,
    saves: 0,
    shares: 0,
  }

  try {
    // Different metrics available for different media types
    // Reels: impressions, reach, likes, comments, saves, shares, plays, total_interactions
    // Images: impressions, reach, likes, comments, saves, total_interactions
    const metrics = 'impressions,reach,likes,comments,saved,shares,plays,total_interactions'
    const response = await instagramApiFetch(
      `/${mediaId}/insights?metric=${metrics}`
    )
    const data = await response.json()

    if (data.data && Array.isArray(data.data)) {
      for (const insight of data.data) {
        const value = insight.values?.[0]?.value || 0
        switch (insight.name) {
          case 'impressions': engagement.impressions = value; break
          case 'reach': engagement.reach = value; break
          case 'likes': engagement.likes = value; break
          case 'comments': engagement.comments = value; break
          case 'saved': engagement.saves = value; break
          case 'shares': engagement.shares = value; break
          case 'plays': engagement.plays = value; break
        }
      }
    }

    return engagement
  } catch (error) {
    console.error(`Failed to fetch media insights for ${mediaId}:`, error)
    return engagement
  }
}

/**
 * Sync Instagram analytics to database
 */
export async function syncInstagramAnalytics(): Promise<{
  success: boolean
  data?: InstagramAnalytics
  postsSynced?: number
  error?: string
}> {
  try {
    const supabase = createAdminClient()
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' })

    // Fetch profile insights
    const profileInsights = await fetchProfileInsights(30)

    // Count total posts
    const userId = process.env.INSTAGRAM_USER_ID
    if (!userId) throw new Error('INSTAGRAM_USER_ID not configured')

    let postsCount = 0
    try {
      const profileResponse = await instagramApiFetch(`/${userId}?fields=media_count`)
      const profileData = await profileResponse.json()
      postsCount = profileData.media_count || 0
    } catch {
      // Non-critical
    }

    // Aggregate likes and comments from recent media
    const recentMedia = await getUserMedia(50)
    const totalLikes = recentMedia.reduce((sum, m) => sum + (m.like_count || 0), 0)
    const totalComments = recentMedia.reduce((sum, m) => sum + (m.comments_count || 0), 0)

    const analytics: InstagramAnalytics = {
      followersCount: profileInsights.followers_count,
      postsCount,
      totalReach: profileInsights.total_reach,
      totalImpressions: profileInsights.total_impressions,
      totalLikes,
      totalComments,
    }

    // Upsert today's analytics
    const { error } = await supabase
      .from('instagram_analytics')
      .upsert(
        {
          date: today,
          followers_count: analytics.followersCount,
          total_likes: analytics.totalLikes,
          total_comments: analytics.totalComments,
          total_reach: analytics.totalReach,
          total_impressions: analytics.totalImpressions,
          posts_count: analytics.postsCount,
        },
        { onConflict: 'date' }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    // --- Sync posts from Instagram API into posts table ---
    try {
      for (const media of recentMedia) {
        const { data: existing } = await supabase
          .from('posts')
          .select('id')
          .eq('instagram_media_id', media.id)
          .maybeSingle()

        if (existing) continue

        await supabase.from('posts').insert({
          content: media.caption || '',
          instagram_media_id: media.id,
          platform: 'instagram',
          media_type: media.media_type === 'VIDEO' ? 'reels' : 'image',
          status: 'published' as const,
          published_at: media.timestamp,
          media_urls: media.media_url ? [media.media_url] : [],
        })
      }
    } catch (err) {
      console.error('Failed to sync posts from Instagram:', err)
    }

    // --- Sync per-post analytics ---
    let postsSynced = 0

    const { data: publishedPosts } = await supabase
      .from('posts')
      .select('id, instagram_media_id')
      .eq('status', 'published')
      .eq('platform', 'instagram')
      .not('instagram_media_id', 'is', null)
      .order('published_at', { ascending: false })
      .limit(50)

    if (publishedPosts && publishedPosts.length > 0) {
      for (const post of publishedPosts) {
        try {
          const engagement = await fetchMediaInsights(post.instagram_media_id!)

          await supabase
            .from('instagram_post_analytics')
            .upsert(
              {
                post_id: post.id,
                instagram_media_id: post.instagram_media_id!,
                date: today,
                impressions: engagement.impressions,
                reach: engagement.reach,
                likes: engagement.likes,
                comments: engagement.comments,
                saves: engagement.saves,
                shares: engagement.shares,
                plays: engagement.plays || 0,
              },
              { onConflict: 'instagram_media_id,date' }
            )

          postsSynced++
          await new Promise(resolve => setTimeout(resolve, 200))
        } catch (err) {
          console.error(`Failed to sync analytics for Instagram post ${post.id}:`, err)
        }
      }
    }

    return { success: true, data: analytics, postsSynced }
  } catch (error) {
    console.error('Instagram analytics sync error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get Instagram analytics history from database
 */
export async function getInstagramAnalyticsHistory(days: number = 30): Promise<{
  data: Array<{
    date: string
    followers_count: number
    total_likes: number
    total_comments: number
    total_reach: number
    total_impressions: number
    posts_count: number
  }>
  error?: string
}> {
  const supabase = createAdminClient()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const { data, error } = await supabase
    .from('instagram_analytics')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .order('date', { ascending: true })

  if (error) {
    return { data: [], error: error.message }
  }

  return { data: data || [] }
}
