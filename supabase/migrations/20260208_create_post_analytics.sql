-- Create post_analytics table for per-post performance tracking
CREATE TABLE IF NOT EXISTS post_analytics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid REFERENCES posts(id),
  thread_id text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  likes integer DEFAULT 0,
  replies integer DEFAULT 0,
  reposts integer DEFAULT 0,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Upsert key: one row per thread_id per date
CREATE UNIQUE INDEX IF NOT EXISTS post_analytics_thread_date_idx ON post_analytics(thread_id, date);

-- Index for faster queries by post_id
CREATE INDEX IF NOT EXISTS post_analytics_post_id_idx ON post_analytics(post_id);

-- Index for sorting by date and views
CREATE INDEX IF NOT EXISTS post_analytics_date_views_idx ON post_analytics(date DESC, views DESC);
