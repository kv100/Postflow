-- Migration: Add Instagram Reels support
-- Run this in Supabase SQL Editor for the threads-tool database (lkdubtulmsdyzdtntobk)

-- 1. Add platform and media_type columns to posts table
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'threads',
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS instagram_media_id TEXT;

-- 2. Create instagram_analytics table (profile-level daily metrics)
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

-- 3. Create instagram_post_analytics table (per-post metrics)
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

-- 4. Add index for platform filtering
CREATE INDEX IF NOT EXISTS idx_posts_platform ON posts(platform);
CREATE INDEX IF NOT EXISTS idx_posts_instagram_media_id ON posts(instagram_media_id);
CREATE INDEX IF NOT EXISTS idx_instagram_analytics_date ON instagram_analytics(date);
CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_date ON instagram_post_analytics(date);
CREATE INDEX IF NOT EXISTS idx_instagram_post_analytics_post_id ON instagram_post_analytics(post_id);
