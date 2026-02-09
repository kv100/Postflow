import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postToThreads, postImageToThreads } from '@/lib/threads/client'
import { publishReel, publishImage } from '@/lib/instagram/client'

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  // In production, require secret
  if (!cronSecret) {
    console.warn('CRON_SECRET not set, rejecting request')
    return false
  }

  // Accept secret via header or query param
  return authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret
}

/**
 * Publish a post to Threads
 */
async function publishToThreads(post: {
  id: string
  content: string
  media_urls: string[]
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const imageUrl = post.media_urls?.[0]
  const result = imageUrl
    ? await postImageToThreads(post.content, imageUrl)
    : await postToThreads(post.content)

  return {
    success: result.success,
    externalId: result.threadId,
    error: result.error,
  }
}

/**
 * Publish a post to Instagram (Reels or Image)
 */
async function publishToInstagram(post: {
  id: string
  content: string
  media_urls: string[]
  media_type: string
}): Promise<{ success: boolean; externalId?: string; error?: string }> {
  const mediaUrl = post.media_urls?.[0]

  if (!mediaUrl) {
    return { success: false, error: 'Instagram posts require media (image or video URL)' }
  }

  const isReel = post.media_type === 'reels' || post.media_type === 'video'
  const result = isReel
    ? await publishReel(mediaUrl, post.content)
    : await publishImage(mediaUrl, post.content)

  return {
    success: result.success,
    externalId: result.mediaId,
    error: result.error,
  }
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry_run') === 'true'
  const platformFilter = request.nextUrl.searchParams.get('platform') // optional: 'threads' | 'instagram'

  try {
    const supabase = createAdminClient()
    const now = new Date().toISOString()

    // Find posts ready to publish
    let query = supabase
      .from('posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(5) // Process max 5 at a time to avoid timeouts

    if (platformFilter) {
      query = query.eq('platform', platformFilter)
    }

    const { data: posts, error: fetchError } = await query

    if (fetchError) {
      console.error('Failed to fetch scheduled posts:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!posts || posts.length === 0) {
      return NextResponse.json({
        message: 'No posts to publish',
        processed: 0
      })
    }

    const results: Array<{
      id: string
      platform: string
      status: 'published' | 'failed' | 'dry_run'
      error?: string
    }> = []

    for (const post of posts) {
      const platform = post.platform || 'threads'

      if (dryRun) {
        console.log(`[DRY RUN] Would publish ${platform} post ${post.id}: ${post.content.substring(0, 50)}...`)
        results.push({ id: post.id, platform, status: 'dry_run' })
        continue
      }

      // Update status to publishing
      await supabase
        .from('posts')
        .update({ status: 'publishing' })
        .eq('id', post.id)

      // Publish to the appropriate platform
      const publishResult = platform === 'instagram'
        ? await publishToInstagram(post)
        : await publishToThreads(post)

      if (publishResult.success) {
        // Success - update to published
        const updateData: Record<string, unknown> = {
          status: 'published',
          published_at: new Date().toISOString(),
          error_message: null,
        }

        // Set the platform-specific external ID
        if (platform === 'instagram') {
          updateData.instagram_media_id = publishResult.externalId
        } else {
          updateData.thread_id = publishResult.externalId
        }

        await supabase
          .from('posts')
          .update(updateData)
          .eq('id', post.id)

        results.push({ id: post.id, platform, status: 'published' })
        console.log(`Published ${platform} post ${post.id}`)
      } else {
        // Failed - update with error
        await supabase
          .from('posts')
          .update({
            status: 'failed',
            error_message: publishResult.error || 'Unknown error'
          })
          .eq('id', post.id)

        results.push({
          id: post.id,
          platform,
          status: 'failed',
          error: publishResult.error
        })
        console.error(`Failed to publish ${platform} post ${post.id}:`, publishResult.error)
      }

      // Small delay between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return NextResponse.json({
      message: dryRun ? 'Dry run completed' : 'Publishing completed',
      processed: results.length,
      results
    })
  } catch (error) {
    console.error('Cron publish error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
