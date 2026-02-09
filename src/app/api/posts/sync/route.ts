import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserThreads, getUserReplies } from '@/lib/threads/client'

// POST /api/posts/sync - Sync existing Threads posts into Supabase
export async function POST() {
  try {
    const supabase = createAdminClient()

    // Fetch top-level threads + user's own replies (thread chains)
    const [threads, replies] = await Promise.all([
      getUserThreads(100),
      getUserReplies(50),
    ])

    // Combine: threads first, then replies
    const allPosts = [
      ...threads.map(t => ({ ...t, isReply: false })),
      ...replies.map(r => ({ ...r, isReply: true })),
    ]

    if (allPosts.length === 0) {
      return NextResponse.json({
        message: 'No threads found on your account',
        synced: 0,
        skipped: 0,
        updated: 0,
      })
    }

    let synced = 0
    let skipped = 0
    let updated = 0

    for (const thread of allPosts) {
      // Skip posts without text
      if (!thread.text) {
        skipped++
        continue
      }

      // Check if already exists by thread_id
      const { data: existingByThreadId } = await supabase
        .from('posts')
        .select('id')
        .eq('thread_id', thread.id)
        .maybeSingle()

      if (existingByThreadId) {
        skipped++
        continue
      }

      // Check if a matching post exists without thread_id (created by cron/manual)
      // Match by content prefix to handle posts published via API that didn't save thread_id
      const contentPrefix = thread.text.substring(0, 100)
      const { data: existingByContent } = await supabase
        .from('posts')
        .select('id')
        .is('thread_id', null)
        .eq('status', 'published')
        .like('content', `${contentPrefix}%`)
        .maybeSingle()

      if (existingByContent) {
        // Update existing post with thread_id instead of creating duplicate
        await supabase
          .from('posts')
          .update({
            thread_id: thread.id,
            published_at: thread.timestamp,
          })
          .eq('id', existingByContent.id)
        updated++
        continue
      }

      // Insert as new published post
      const { error } = await supabase.from('posts').insert({
        content: thread.text,
        thread_id: thread.id,
        status: 'published' as const,
        published_at: thread.timestamp,
        platform: 'threads',
        media_urls: [],
      })

      if (error) {
        console.error(`Failed to sync thread ${thread.id}:`, error.message)
        skipped++
      } else {
        synced++
      }
    }

    return NextResponse.json({
      message: `Synced ${synced} new, updated ${updated} existing, skipped ${skipped}`,
      synced,
      updated,
      skipped,
      total_from_api: allPosts.length,
    })
  } catch (error) {
    console.error('POST /api/posts/sync error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
