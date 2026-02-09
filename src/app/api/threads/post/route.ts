import { NextRequest, NextResponse } from 'next/server'
import { postToThreads, postImageToThreads, replyToThread } from '@/lib/threads/client'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, content, image_url, reply_to_id } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    if (content.length > 500) {
      return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 })
    }

    // If reply_to_id provided, post as reply
    let result
    if (reply_to_id) {
      result = await replyToThread(reply_to_id, content)
    } else {
      // Post to Threads (with image if provided)
      result = image_url
        ? await postImageToThreads(content, image_url)
        : await postToThreads(content)
    }

    if (!result.success) {
      // Update post status to failed if postId provided
      if (postId) {
        const supabase = createAdminClient()
        await supabase
          .from('posts')
          .update({
            status: 'failed',
            error_message: result.error || 'Failed to post to Threads'
          })
          .eq('id', postId)
      }

      return NextResponse.json({
        error: result.error || 'Failed to post to Threads'
      }, { status: 500 })
    }

    // Update post status to published if postId provided
    if (postId) {
      const supabase = createAdminClient()
      await supabase
        .from('posts')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', postId)
    }

    return NextResponse.json({
      success: true,
      thread_id: result.threadId
    })
  } catch (error) {
    console.error('POST /api/threads/post error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
