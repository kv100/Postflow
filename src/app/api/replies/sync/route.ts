import { NextRequest, NextResponse } from 'next/server'
import { syncMentions } from '@/lib/threads/mentions'
import { generateReply, shouldAutoSend } from '@/lib/ai/reply-generator'
import { createAdminClient } from '@/lib/supabase/admin'
import { replyToThread } from '@/lib/threads/mentions'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

/**
 * Fetch parent post content for a reply via Threads API.
 * Uses replied_to field to find the parent thread, then looks up content in posts table.
 */
async function getParentPostContent(
  mentionThreadId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<string | undefined> {
  try {
    const accessToken = process.env.THREADS_ACCESS_TOKEN
    if (!accessToken) return undefined

    // Get parent thread ID via replied_to field
    const response = await fetch(
      `${THREADS_API_BASE}/${mentionThreadId}?fields=replied_to`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!response.ok) return undefined

    const data = await response.json()
    const parentThreadId = data.replied_to?.id
    if (!parentThreadId) return undefined

    // Look up parent post content from our posts table
    const { data: post } = await supabase
      .from('posts')
      .select('content')
      .eq('thread_id', parentThreadId)
      .maybeSingle()

    if (post?.content) return post.content

    // Fallback: fetch parent text directly from Threads API
    const parentResponse = await fetch(
      `${THREADS_API_BASE}/${parentThreadId}?fields=text`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    )

    if (!parentResponse.ok) return undefined

    const parentData = await parentResponse.json()
    return parentData.text || undefined
  } catch (error) {
    console.error(`Failed to get parent post for ${mentionThreadId}:`, error)
    return undefined
  }
}

// GET /api/replies/sync - Sync mentions from Threads and generate AI replies
export async function GET(request: NextRequest) {
  const dryRun = request.nextUrl.searchParams.get('dry_run') === 'true'

  try {
    // Step 1: Sync mentions from Threads
    const syncResult = await syncMentions()

    if (syncResult.error) {
      return NextResponse.json({
        error: syncResult.error,
        step: 'sync_mentions'
      }, { status: 500 })
    }

    // Step 2: Check daily reply limit (max 15/day)
    const supabase = createAdminClient()

    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Kyiv' })
    const { count: todaysSentCount } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .in('status', ['auto_sent', 'manual_sent'])
      .gte('sent_at', `${today}T00:00:00Z`)

    const DAILY_REPLY_LIMIT = 15
    if (todaysSentCount && todaysSentCount >= DAILY_REPLY_LIMIT) {
      return NextResponse.json({
        sync: {
          found: syncResult.found,
          new: syncResult.new,
        },
        ai: {
          generated: 0,
          autoSent: 0,
          skipped: 0,
        },
        message: `Daily reply limit reached (${todaysSentCount}/${DAILY_REPLY_LIMIT})`,
        dryRun,
      })
    }

    // Step 3: Generate AI replies for pending mentions without suggestions
    const { data: pendingReplies } = await supabase
      .from('replies')
      .select('*')
      .eq('status', 'pending')
      .is('suggested_reply', null)
      .limit(10)

    let generatedCount = 0
    let autoSentCount = 0
    let skippedCount = 0

    for (const reply of pendingReplies || []) {
      if (!reply.mention_content || !reply.mention_author) continue

      // Fetch parent post context for better AI replies
      const parentPostContent = await getParentPostContent(
        reply.mention_thread_id,
        supabase
      )

      // Generate AI reply with parent context
      const generated = await generateReply(
        reply.mention_content,
        reply.mention_author,
        parentPostContent
      )

      // Skip if category is 'skip'
      if (generated.category === 'skip') {
        await supabase
          .from('replies')
          .update({
            status: 'skipped',
            suggested_reply: generated.reply || '[SPAM/OFF-TOPIC]',
            confidence_score: generated.confidence,
          })
          .eq('id', reply.id)

        skippedCount++
        continue
      }

      // Update with suggestion
      await supabase
        .from('replies')
        .update({
          suggested_reply: generated.reply,
          confidence_score: generated.confidence,
        })
        .eq('id', reply.id)

      generatedCount++
      console.log(`Reply ${reply.id}: category=${generated.category}, confidence=${generated.confidence}, hasParent=${!!parentPostContent}`)

      // For 'red' category, NEVER auto-send (always require manual review)
      if (generated.category === 'red') {
        continue
      }

      // Auto-send if confidence is high enough (learning phase = always manual)
      if (!dryRun && shouldAutoSend(generated.confidence, 0.85, true)) {
        const sendResult = await replyToThread(
          reply.mention_thread_id,
          generated.reply
        )

        if (sendResult.success) {
          await supabase
            .from('replies')
            .update({
              status: 'auto_sent',
              sent_at: new Date().toISOString(),
              final_reply: generated.reply,
            })
            .eq('id', reply.id)

          autoSentCount++
        }
      }

      // Small delay between API calls
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      sync: {
        found: syncResult.found,
        new: syncResult.new,
      },
      ai: {
        generated: generatedCount,
        autoSent: autoSentCount,
        skipped: skippedCount,
      },
      dryRun,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
