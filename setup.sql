-- ============================================
-- PostFlow — Database Setup
-- ============================================
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard)
-- Project → SQL Editor → New Query → Paste & Run
-- ============================================

-- 1. POSTS TABLE (core — scheduling and publishing)
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  thread_id TEXT,                    -- Threads API post ID (after publish)
  instagram_media_id TEXT,           -- Instagram API media ID (after publish)
  platform TEXT NOT NULL DEFAULT 'threads',   -- 'threads' | 'instagram'
  media_type TEXT NOT NULL DEFAULT 'text',    -- 'text' | 'image' | 'video' | 'reels' | 'carousel'
  status TEXT NOT NULL DEFAULT 'draft',       -- 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. REPLIES TABLE (mention tracking and AI reply management)
CREATE TABLE IF NOT EXISTS replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mention_thread_id TEXT NOT NULL UNIQUE,  -- Threads reply/mention ID (dedup key)
  mention_content TEXT,
  mention_author TEXT,
  mention_author_id TEXT,
  suggested_reply TEXT,              -- AI-generated suggestion
  final_reply TEXT,                  -- What was actually sent (after editing)
  confidence_score FLOAT,           -- AI confidence 0.0-1.0
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'auto_sent' | 'approved' | 'sent' | 'skipped'
  sent_thread_id TEXT,              -- ID of our reply post
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ANALYTICS TABLE (Threads — daily profile metrics)
CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  followers_count INTEGER NOT NULL DEFAULT 0,
  total_likes INTEGER NOT NULL DEFAULT 0,
  total_replies INTEGER NOT NULL DEFAULT 0,
  total_reposts INTEGER NOT NULL DEFAULT 0,
  total_views INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  top_post_thread_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. POST ANALYTICS TABLE (Threads — per-post engagement)
CREATE TABLE IF NOT EXISTS post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  likes INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  reposts INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(thread_id, date)
);

-- 5. INSTAGRAM ANALYTICS TABLE (daily profile metrics)
CREATE TABLE IF NOT EXISTS instagram_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  followers_count INTEGER NOT NULL DEFAULT 0,
  total_likes INTEGER NOT NULL DEFAULT 0,
  total_comments INTEGER NOT NULL DEFAULT 0,
  total_reach INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  posts_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. INSTAGRAM POST ANALYTICS TABLE (per-post metrics)
CREATE TABLE IF NOT EXISTS instagram_post_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  instagram_media_id TEXT NOT NULL,
  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  reach INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(instagram_media_id, date)
);

-- 7. SETTINGS TABLE (app configuration)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES (performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_posts_thread_id ON posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_posts_instagram_media_id ON posts(instagram_media_id);

CREATE INDEX IF NOT EXISTS idx_replies_status ON replies(status);
CREATE INDEX IF NOT EXISTS idx_replies_mention_thread_id ON replies(mention_thread_id);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics(date);

CREATE INDEX IF NOT EXISTS idx_post_analytics_post_id ON post_analytics(post_id);
CREATE INDEX IF NOT EXISTS idx_post_analytics_date ON post_analytics(date DESC, views DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_analytics_date ON instagram_analytics(date);
CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_date ON instagram_post_analytics(date);
CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_post_id ON instagram_post_analytics(post_id);

-- ============================================
-- ROW LEVEL SECURITY (recommended)
-- ============================================
-- PostFlow is a single-user tool, but RLS is good practice.
-- These policies allow full access via service_role key (server-side)
-- and read-only via anon key (client-side dashboard).

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (server-side API routes)
-- Supabase service_role key bypasses RLS by default, so no explicit policy needed.

-- Allow anon key read access (client-side dashboard)
CREATE POLICY "anon_read_posts" ON posts FOR SELECT USING (true);
CREATE POLICY "anon_read_replies" ON replies FOR SELECT USING (true);
CREATE POLICY "anon_read_analytics" ON analytics FOR SELECT USING (true);
CREATE POLICY "anon_read_post_analytics" ON post_analytics FOR SELECT USING (true);
CREATE POLICY "anon_read_instagram_analytics" ON instagram_analytics FOR SELECT USING (true);
CREATE POLICY "anon_read_instagram_post_analytics" ON instagram_post_analytics FOR SELECT USING (true);
CREATE POLICY "anon_read_settings" ON settings FOR SELECT USING (true);

-- ============================================
-- DONE! Your database is ready.
-- ============================================
