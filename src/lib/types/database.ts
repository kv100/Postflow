export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
export type ReplyStatus = 'pending' | 'auto_sent' | 'approved' | 'sent' | 'skipped'
export type Platform = 'threads' | 'instagram'
export type MediaType = 'text' | 'image' | 'video' | 'reels' | 'carousel'

export interface Post {
  id: string
  content: string
  media_urls: string[]
  scheduled_at: string | null
  published_at: string | null
  thread_id: string | null
  instagram_media_id: string | null
  platform: Platform
  media_type: MediaType
  status: PostStatus
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface Reply {
  id: string
  mention_thread_id: string
  mention_content: string | null
  mention_author: string | null
  mention_author_id: string | null
  suggested_reply: string | null
  final_reply: string | null
  confidence_score: number | null
  status: ReplyStatus
  sent_thread_id: string | null
  sent_at: string | null
  created_at: string
}

export interface Analytics {
  id: string
  date: string
  followers_count: number
  total_likes: number
  total_replies: number
  total_reposts: number
  total_views: number
  posts_count: number
  top_post_thread_id: string | null
  created_at: string
}

export interface InstagramAnalyticsRow {
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

export interface PostAnalytics {
  id: string
  post_id: string
  thread_id: string
  date: string
  likes: number
  replies: number
  reposts: number
  views: number
  created_at: string
}

export interface InstagramPostAnalyticsRow {
  id: string
  post_id: string
  instagram_media_id: string
  date: string
  impressions: number
  reach: number
  likes: number
  comments: number
  saves: number
  shares: number
  plays: number
  created_at: string
}

export interface Settings {
  key: string
  value: string
  updated_at: string
}

// Supabase Database type
export type Database = {
  public: {
    Tables: {
      posts: {
        Row: Post
        Insert: {
          id?: string
          content: string
          media_urls?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          thread_id?: string | null
          instagram_media_id?: string | null
          platform?: Platform
          media_type?: MediaType
          status?: PostStatus
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          media_urls?: string[]
          scheduled_at?: string | null
          published_at?: string | null
          thread_id?: string | null
          instagram_media_id?: string | null
          platform?: Platform
          media_type?: MediaType
          status?: PostStatus
          error_message?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      replies: {
        Row: Reply
        Insert: {
          id?: string
          mention_thread_id: string
          mention_content?: string | null
          mention_author?: string | null
          mention_author_id?: string | null
          suggested_reply?: string | null
          final_reply?: string | null
          confidence_score?: number | null
          status?: ReplyStatus
          sent_thread_id?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          mention_thread_id?: string
          mention_content?: string | null
          mention_author?: string | null
          mention_author_id?: string | null
          suggested_reply?: string | null
          final_reply?: string | null
          confidence_score?: number | null
          status?: ReplyStatus
          sent_thread_id?: string | null
          sent_at?: string | null
        }
        Relationships: []
      }
      analytics: {
        Row: Analytics
        Insert: {
          id?: string
          date: string
          followers_count?: number
          total_likes?: number
          total_replies?: number
          total_reposts?: number
          total_views?: number
          posts_count?: number
          top_post_thread_id?: string | null
          created_at?: string
        }
        Update: {
          date?: string
          followers_count?: number
          total_likes?: number
          total_replies?: number
          total_reposts?: number
          total_views?: number
          posts_count?: number
          top_post_thread_id?: string | null
        }
        Relationships: []
      }
      instagram_analytics: {
        Row: InstagramAnalyticsRow
        Insert: {
          id?: string
          date: string
          followers_count?: number
          total_likes?: number
          total_comments?: number
          total_reach?: number
          total_impressions?: number
          posts_count?: number
          created_at?: string
        }
        Update: {
          date?: string
          followers_count?: number
          total_likes?: number
          total_comments?: number
          total_reach?: number
          total_impressions?: number
          posts_count?: number
        }
        Relationships: []
      }
      post_analytics: {
        Row: PostAnalytics
        Insert: {
          id?: string
          post_id: string
          thread_id: string
          date: string
          likes?: number
          replies?: number
          reposts?: number
          views?: number
          created_at?: string
        }
        Update: {
          post_id?: string
          thread_id?: string
          date?: string
          likes?: number
          replies?: number
          reposts?: number
          views?: number
        }
        Relationships: []
      }
      instagram_post_analytics: {
        Row: InstagramPostAnalyticsRow
        Insert: {
          id?: string
          post_id: string
          instagram_media_id: string
          date: string
          impressions?: number
          reach?: number
          likes?: number
          comments?: number
          saves?: number
          shares?: number
          plays?: number
          created_at?: string
        }
        Update: {
          post_id?: string
          instagram_media_id?: string
          date?: string
          impressions?: number
          reach?: number
          likes?: number
          comments?: number
          saves?: number
          shares?: number
          plays?: number
        }
        Relationships: []
      }
      settings: {
        Row: Settings
        Insert: {
          key: string
          value: string
          updated_at?: string
        }
        Update: {
          key?: string
          value?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
