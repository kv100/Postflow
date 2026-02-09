// Threads REST API client
// Official Threads API documentation: https://developers.facebook.com/docs/threads

const THREADS_API_BASE = 'https://graph.threads.net/v1.0'

// Environment variables needed:
// - THREADS_USER_ID: Your Threads user ID
// - THREADS_ACCESS_TOKEN: Long-lived access token
// - THREADS_APP_ID: Meta app ID (for token refresh)
// - THREADS_APP_SECRET: Meta app secret (for token refresh)

interface ThreadsApiResponse {
  success: boolean
  threadId?: string
  error?: string
}

/**
 * Helper function for Threads API calls
 * Automatically adds access token to requests
 */
async function threadsApiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = process.env.THREADS_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('THREADS_ACCESS_TOKEN environment variable is not set')
  }

  const url = `${THREADS_API_BASE}${endpoint}`

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  }

  const response = await fetch(url, {
    ...options,
    headers,
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

/**
 * Post a text-only thread
 * Two-step process: create container + publish
 * Rate limit: 250 posts per 24 hours
 */
export async function postToThreads(content: string): Promise<ThreadsApiResponse> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      return { success: false, error: 'THREADS_USER_ID not configured' }
    }

    // Step 1: Create container
    const createResponse = await threadsApiFetch(`/${userId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content,
      }),
    })

    const createData = await createResponse.json()
    const creationId = createData.id

    if (!creationId) {
      return { success: false, error: 'Failed to create thread container' }
    }

    // Step 2: Publish
    const publishResponse = await threadsApiFetch(`/${userId}/threads_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: creationId,
      }),
    })

    const publishData = await publishResponse.json()
    const threadId = publishData.id

    return { success: true, threadId }
  } catch (error) {
    console.error('Failed to post to Threads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Post a thread with image
 * Image must be publicly accessible URL
 */
export async function postImageToThreads(
  content: string,
  imageUrl: string
): Promise<ThreadsApiResponse> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      return { success: false, error: 'THREADS_USER_ID not configured' }
    }

    // Step 1: Create container with image
    const createResponse = await threadsApiFetch(`/${userId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'IMAGE',
        text: content,
        image_url: imageUrl,
      }),
    })

    const createData = await createResponse.json()
    const creationId = createData.id

    if (!creationId) {
      return { success: false, error: 'Failed to create image thread container' }
    }

    // Step 2: Publish
    const publishResponse = await threadsApiFetch(`/${userId}/threads_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: creationId,
      }),
    })

    const publishData = await publishResponse.json()
    const threadId = publishData.id

    return { success: true, threadId }
  } catch (error) {
    console.error('Failed to post image to Threads:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Reply to an existing thread
 */
export async function replyToThread(
  threadId: string,
  content: string
): Promise<{ success: boolean; threadId?: string; error?: string }> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      return { success: false, error: 'THREADS_USER_ID not configured' }
    }

    // Step 1: Create reply container
    const createResponse = await threadsApiFetch(`/${userId}/threads`, {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'TEXT',
        text: content,
        reply_to_id: threadId,
      }),
    })

    const createData = await createResponse.json()
    const creationId = createData.id

    if (!creationId) {
      return { success: false, error: 'Failed to create reply container' }
    }

    // Step 2: Publish reply
    const publishResponse = await threadsApiFetch(`/${userId}/threads_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: creationId,
      }),
    })

    const publishData = await publishResponse.json()
    const replyThreadId = publishData.id

    return { success: true, threadId: replyThreadId }
  } catch (error) {
    console.error('Failed to reply to thread:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get Threads profile information
 */
export async function getThreadsProfile(): Promise<{
  id: string
  username: string
  name?: string
  threads_profile_picture_url?: string
  threads_biography?: string
} | null> {
  try {
    const accessToken = process.env.THREADS_ACCESS_TOKEN
    if (!accessToken) {
      throw new Error('THREADS_ACCESS_TOKEN not configured')
    }

    // Call /me endpoint with profile fields
    const response = await fetch(
      `${THREADS_API_BASE}/me?fields=id,username,name,threads_profile_picture_url,threads_biography&access_token=${accessToken}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        errorData.error?.message ||
        `Failed to fetch profile: ${response.status}`
      )
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to get Threads profile:', error)
    return null
  }
}

/**
 * Get user's recent threads
 */
export async function getUserThreads(limit: number = 25): Promise<Array<{
  id: string
  text: string
  timestamp: string
  media_type: string
  permalink: string
  is_quote_post: boolean
}>> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      throw new Error('THREADS_USER_ID not configured')
    }

    const response = await threadsApiFetch(
      `/${userId}/threads?fields=id,text,timestamp,media_type,permalink,is_quote_post&limit=${limit}`
    )

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to get user threads:', error)
    return []
  }
}

/**
 * Get user's own replies (self-replies in thread chains)
 */
export async function getUserReplies(limit: number = 50): Promise<Array<{
  id: string
  text: string
  timestamp: string
  media_type?: string
}>> {
  try {
    const userId = process.env.THREADS_USER_ID
    if (!userId) {
      throw new Error('THREADS_USER_ID not configured')
    }

    const response = await threadsApiFetch(
      `/${userId}/replies?fields=id,text,timestamp,media_type&limit=${limit}`
    )

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to get user replies:', error)
    return []
  }
}

/**
 * Test connection to Threads API
 * Returns connection status and username if successful
 */
export async function testConnection(): Promise<{
  connected: boolean
  username?: string
  error?: string
}> {
  try {
    const profile = await getThreadsProfile()

    if (!profile) {
      return {
        connected: false,
        error: 'Failed to fetch profile',
      }
    }

    return {
      connected: true,
      username: profile.username,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// Note: No browser/Playwright cleanup needed with REST API
// All functions use stateless HTTP requests
