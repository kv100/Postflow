const API_URL = '/api/analytics'

export interface AnalyticsSummary {
  followers: number
  followersChange: number | null
  totalLikes: number
  totalReplies: number
  totalReposts: number
  totalViews: number
  postsCount: number
  engagementRate: number
}

export interface AnalyticsEntry {
  id: string
  date: string
  followers_count: number
  total_likes: number
  total_replies: number
  total_reposts: number
  total_views: number
  posts_count: number
  created_at: string
}

export interface PostPerformanceEntry {
  thread_id: string
  content: string
  published_at: string | null
  date: string
  likes: number
  replies: number
  reposts: number
  views: number
}

// Instagram types
export interface InstagramAnalyticsSummary {
  followers: number
  followersChange: number | null
  totalLikes: number
  totalComments: number
  totalReach: number
  totalImpressions: number
  postsCount: number
  engagementRate: number
}

export interface InstagramAnalyticsEntry {
  id: string
  date: string
  followers_count: number
  total_likes: number
  total_comments: number
  total_reach: number
  total_impressions: number
  posts_count: number
  created_at: string
}

export interface InstagramPostPerformanceEntry {
  instagram_media_id: string
  content: string
  published_at: string | null
  media_type: string
  date: string
  impressions: number
  reach: number
  likes: number
  comments: number
  saves: number
  shares: number
  plays: number
}

export interface AnalyticsResponse {
  // Threads
  history: AnalyticsEntry[]
  summary: AnalyticsSummary
  postPerformance?: PostPerformanceEntry[]
  // Instagram
  instagram?: {
    history: InstagramAnalyticsEntry[]
    summary: InstagramAnalyticsSummary
    postPerformance?: InstagramPostPerformanceEntry[]
  }
}

export interface SyncAnalyticsResponse {
  success: boolean
  threads?: {
    success: boolean
    data?: {
      followersCount: number
      postsCount: number
      recentEngagement: {
        likes: number
        replies: number
        reposts: number
      }
    }
    error?: string
  }
  instagram?: {
    success: boolean
    data?: {
      followersCount: number
      postsCount: number
      totalReach: number
      totalImpressions: number
      totalLikes: number
      totalComments: number
    }
    error?: string
  }
  // Legacy fields for backward compatibility
  data?: {
    followersCount: number
    postsCount: number
    recentEngagement: {
      likes: number
      replies: number
      reposts: number
    }
  }
  error?: string
}

export async function fetchAnalytics(days: number = 30): Promise<AnalyticsResponse> {
  const res = await fetch(`${API_URL}?days=${days}`)

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to fetch analytics')
  }

  return res.json()
}

export async function syncAnalytics(): Promise<SyncAnalyticsResponse> {
  const res = await fetch(`${API_URL}/sync`)

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to sync analytics')
  }

  return res.json()
}
