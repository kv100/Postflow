import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/analytics - Get analytics data (Threads + Instagram)
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

    // ─── Threads Analytics ───
    const { data, error } = await supabase
      .from('analytics')
      .select('*')
      .gte('date', startDateStr)
      .order('date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate summary stats
    // IMPORTANT: total_likes/replies/reposts from Threads API are CUMULATIVE 30-day totals,
    // not daily deltas. Use the LATEST value, not sum across days.
    const latest = data?.[data.length - 1]
    const previous = data?.[data.length - 2]

    const summary = {
      followers: latest?.followers_count || 0,
      followersChange: previous?.followers_count
        ? ((latest?.followers_count || 0) - previous.followers_count) / previous.followers_count * 100
        : null,
      totalLikes: latest?.total_likes || 0,
      totalReplies: latest?.total_replies || 0,
      totalReposts: latest?.total_reposts || 0,
      totalViews: latest?.total_views || 0,
      postsCount: latest?.posts_count || 0,
    }

    // Calculate engagement rate based on latest cumulative totals
    const totalEngagement = summary.totalLikes + summary.totalReplies + summary.totalReposts
    const engagementRate = summary.followers > 0
      ? (totalEngagement / summary.followers * 100).toFixed(2)
      : '0.00'

    // Build daily history with deltas (daily change between consecutive syncs)
    const historyWithDeltas = data?.map((entry, i) => {
      const prev = i > 0 ? data[i - 1] : null
      return {
        ...entry,
        daily_followers: prev ? entry.followers_count - prev.followers_count : 0,
        daily_likes: prev ? Math.max(0, entry.total_likes - prev.total_likes) : entry.total_likes,
        daily_replies: prev ? Math.max(0, entry.total_replies - prev.total_replies) : entry.total_replies,
        daily_reposts: prev ? Math.max(0, entry.total_reposts - prev.total_reposts) : entry.total_reposts,
      }
    }) || []

    // Fetch per-post analytics (latest snapshot per post)
    const { data: postAnalytics } = await supabase
      .from('post_analytics')
      .select('*')
      .order('date', { ascending: false })
      .order('views', { ascending: false })
      .limit(50)

    // Fetch associated post content for the post IDs we got
    let postsData: Array<{ id: string; content: string; published_at: string | null; thread_id: string | null }> = []
    if (postAnalytics && postAnalytics.length > 0) {
      const postIds = [...new Set(postAnalytics.map(pa => pa.post_id))]
      const { data } = await supabase
        .from('posts')
        .select('id, content, published_at, thread_id')
        .in('id', postIds)
      postsData = data || []
    }

    // Build per-post response: deduplicate to latest date per thread_id
    type PostAnalyticsRow = NonNullable<typeof postAnalytics>[number]
    const latestByThread = new Map<string, PostAnalyticsRow>()
    for (const pa of (postAnalytics || [])) {
      if (!latestByThread.has(pa.thread_id)) {
        latestByThread.set(pa.thread_id, pa)
      }
    }

    const postPerformance = Array.from(latestByThread.values()).map(pa => {
      const post = postsData.find(p => p.id === pa.post_id)
      return {
        thread_id: pa.thread_id,
        content: post?.content || '',
        published_at: post?.published_at || null,
        date: pa.date,
        likes: pa.likes,
        replies: pa.replies,
        reposts: pa.reposts,
        views: pa.views,
      }
    })

    // ─── Instagram Analytics ───
    const { data: igData } = await supabase
      .from('instagram_analytics')
      .select('*')
      .gte('date', startDateStr)
      .order('date', { ascending: true })

    const igLatest = igData?.[igData.length - 1]
    const igPrevious = igData?.[igData.length - 2]

    const igSummary = {
      followers: igLatest?.followers_count || 0,
      followersChange: igPrevious?.followers_count
        ? ((igLatest?.followers_count || 0) - igPrevious.followers_count) / igPrevious.followers_count * 100
        : null,
      totalLikes: igLatest?.total_likes || 0,
      totalComments: igLatest?.total_comments || 0,
      totalReach: igLatest?.total_reach || 0,
      totalImpressions: igLatest?.total_impressions || 0,
      postsCount: igLatest?.posts_count || 0,
    }

    const igTotalEngagement = igSummary.totalLikes + igSummary.totalComments
    const igEngagementRate = igSummary.followers > 0
      ? (igTotalEngagement / igSummary.followers * 100).toFixed(2)
      : '0.00'

    const igHistoryWithDeltas = igData?.map((entry, i) => {
      const prev = i > 0 ? igData[i - 1] : null
      return {
        ...entry,
        daily_followers: prev ? entry.followers_count - prev.followers_count : 0,
        daily_likes: prev ? Math.max(0, entry.total_likes - prev.total_likes) : entry.total_likes,
        daily_comments: prev ? Math.max(0, entry.total_comments - prev.total_comments) : entry.total_comments,
        daily_reach: prev ? Math.max(0, entry.total_reach - prev.total_reach) : entry.total_reach,
        daily_impressions: prev ? Math.max(0, entry.total_impressions - prev.total_impressions) : entry.total_impressions,
      }
    }) || []

    // Fetch Instagram per-post analytics
    const { data: igPostAnalytics } = await supabase
      .from('instagram_post_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(50)

    let igPostsData: Array<{ id: string; content: string; published_at: string | null; instagram_media_id: string | null; media_type: string }> = []
    if (igPostAnalytics && igPostAnalytics.length > 0) {
      const igPostIds = [...new Set(igPostAnalytics.map(pa => pa.post_id))]
      const { data: ipd } = await supabase
        .from('posts')
        .select('id, content, published_at, instagram_media_id, media_type')
        .in('id', igPostIds)
      igPostsData = ipd || []
    }

    type IgPostAnalyticsRow = NonNullable<typeof igPostAnalytics>[number]
    const latestByMedia = new Map<string, IgPostAnalyticsRow>()
    for (const pa of (igPostAnalytics || [])) {
      if (!latestByMedia.has(pa.instagram_media_id)) {
        latestByMedia.set(pa.instagram_media_id, pa)
      }
    }

    const igPostPerformance = Array.from(latestByMedia.values()).map(pa => {
      const post = igPostsData.find(p => p.id === pa.post_id)
      return {
        instagram_media_id: pa.instagram_media_id,
        content: post?.content || '',
        published_at: post?.published_at || null,
        media_type: post?.media_type || 'image',
        date: pa.date,
        impressions: pa.impressions,
        reach: pa.reach,
        likes: pa.likes,
        comments: pa.comments,
        saves: pa.saves,
        shares: pa.shares,
        plays: pa.plays,
      }
    })

    return NextResponse.json({
      // Threads
      history: historyWithDeltas,
      summary: {
        ...summary,
        engagementRate: parseFloat(engagementRate),
      },
      postPerformance,
      // Instagram
      instagram: {
        history: igHistoryWithDeltas,
        summary: {
          ...igSummary,
          engagementRate: parseFloat(igEngagementRate),
        },
        postPerformance: igPostPerformance,
      },
    })
  } catch (error) {
    console.error('GET /api/analytics error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
