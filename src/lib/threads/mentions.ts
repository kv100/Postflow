// Threads Reply Management API for mentions/replies
// Official docs: https://developers.facebook.com/docs/threads/reply-management

import { replyToThread } from './client'
import { createAdminClient } from '@/lib/supabase/admin'

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

export interface ThreadsMention {
  threadId: string
  content: string
  author: string
  authorId: string
  timestamp: Date
}

/**
 * Helper for Threads API calls with access token
 */
async function threadsApiFetch(endpoint: string): Promise<Response> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('THREADS_ACCESS_TOKEN not configured')
  }

  const url = `${THREADS_API_BASE}${endpoint}`
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
      `Threads API error: ${response.status} ${response.statusText}`
    )
  }

  return response
}

interface ReplyData {
  id: string
  text: string
  username: string
  timestamp: string
  is_reply_owned_by_me?: boolean
}

/**
 * Get replies/conversation for a specific thread
 */
async function getThreadReplies(mediaId: string): Promise<ReplyData[]> {
  try {
    const endpoint = `/${mediaId}/replies?fields=id,text,username,timestamp,is_reply_owned_by_me`
    const response = await threadsApiFetch(endpoint)
    const data = await response.json()

    return data.data || []
  } catch (error) {
    console.error(`Failed to get replies for thread ${mediaId}:`, error)
    return []
  }
}

/**
 * Get conversation (nested replies) for a thread
 */
async function getThreadConversation(mediaId: string): Promise<ReplyData[]> {
  try {
    const endpoint = `/${mediaId}/conversation?fields=id,text,username,timestamp,is_reply_owned_by_me`
    const response = await threadsApiFetch(endpoint)
    const data = await response.json()

    return data.data || []
  } catch (error) {
    console.error(`Failed to get conversation for thread ${mediaId}:`, error)
    return []
  }
}

/**
 * Get user's own replies (comments on others' posts)
 */
async function getUserReplies(userId: string, limit: number = 25): Promise<Array<{
  id: string
  text: string
  timestamp: string
}>> {
  try {
    const endpoint = `/${userId}/replies?fields=id,text,timestamp&limit=${limit}`
    const response = await threadsApiFetch(endpoint)
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to get user replies:', error)
    return []
  }
}

/**
 * Collect replies from a list of media IDs, skipping own replies.
 */
async function collectReplies(
  mediaIds: string[],
  seen: Set<string>,
  ourUsername: string,
): Promise<ThreadsMention[]> {
  const mentions: ThreadsMention[] = []

  for (const mediaId of mediaIds) {
    const replies = await getThreadReplies(mediaId)
    const conversation = await getThreadConversation(mediaId)
    const allReplies = [...replies, ...conversation]

    for (const reply of allReplies) {
      if (seen.has(reply.id)) continue
      seen.add(reply.id)

      // Skip own replies using API field (most reliable) + username fallback
      if (reply.is_reply_owned_by_me === true) continue
      if (reply.username?.toLowerCase() === ourUsername.toLowerCase()) continue

      mentions.push({
        threadId: reply.id,
        content: reply.text || '',
        author: reply.username,
        authorId: reply.username,
        timestamp: new Date(reply.timestamp),
      })
    }

    // Rate limit safety
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  return mentions
}

/**
 * Fetch mentions from recent threads AND replies to our comments on others' posts.
 * Strategy:
 *   1. Get user's top-level threads → scan replies
 *   2. Get user's own replies (comments on others' posts) → scan replies to those
 */
export async function fetchMentions(): Promise<ThreadsMention[]> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      throw new Error('THREADS_USER_ID not configured')
    }

    const ourUsername = process.env.THREADS_USERNAME || ''
    const seen = new Set<string>()

    // Step 1: Get replies to our own threads
    const threadsResponse = await threadsApiFetch(
      `/${userId}/threads?fields=id&limit=25`
    )
    const threadsData = await threadsResponse.json()
    const threadIds = (threadsData.data || []).map((t: { id: string }) => t.id)

    const threadMentions = await collectReplies(threadIds, seen, ourUsername)

    // Note: Replies to our comments on others' posts are NOT accessible
    // via Threads API (has_replies=true but /replies returns empty).
    // This is a Meta API limitation — only replies to our own top-level
    // threads are readable. Keeping getUserReplies for future use if
    // Meta opens this access.

    return threadMentions
  } catch (error) {
    console.error('Failed to fetch mentions:', error)
    return []
  }
}

/**
 * Save new mentions to database
 * Same interface as before, now using REST API instead of scraping
 */
export async function syncMentions(): Promise<{
  found: number
  new: number
  error?: string
}> {
  try {
    const mentions = await fetchMentions()
    const supabase = createAdminClient()

    let newCount = 0

    for (const mention of mentions) {
      // Check if we already have this mention
      const { data: existing } = await supabase
        .from('replies')
        .select('id')
        .eq('mention_thread_id', mention.threadId)
        .single()

      if (!existing) {
        // New mention - insert it
        await supabase.from('replies').insert({
          mention_thread_id: mention.threadId,
          mention_content: mention.content,
          mention_author: mention.author,
          mention_author_id: mention.authorId,
          status: 'pending',
        })
        newCount++
      }
    }

    return {
      found: mentions.length,
      new: newCount,
    }
  } catch (error) {
    console.error('Sync mentions error:', error)
    return {
      found: 0,
      new: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Re-export replyToThread from client
export { replyToThread }
