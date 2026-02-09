// Instagram Graph API client for Reels and image publishing
// Official docs: https://developers.facebook.com/docs/instagram-api/guides/content-publishing

const GRAPH_API_BASE = 'https://graph.facebook.com/v24.0'

// Environment variables needed:
// - INSTAGRAM_USER_ID: Instagram Business Account ID (e.g., 17841480019199018)
// - INSTAGRAM_PAGE_ID: Facebook Page ID linked to Instagram
// - FACEBOOK_ACCESS_TOKEN: User/Page access token with instagram_content_publish permission
// - FACEBOOK_BUSINESS_ID: Business Portfolio ID (for getting page access token)

interface InstagramApiResponse {
  success: boolean
  mediaId?: string
  error?: string
  permalink?: string
}

interface ContainerStatus {
  id: string
  status_code: 'EXPIRED' | 'ERROR' | 'FINISHED' | 'IN_PROGRESS' | 'PUBLISHED'
  error_message?: string
}

/**
 * Get the access token for Instagram API calls.
 * Uses FACEBOOK_ACCESS_TOKEN from environment.
 */
function getAccessToken(): string {
  const token = process.env.FACEBOOK_ACCESS_TOKEN
  if (!token) {
    throw new Error('FACEBOOK_ACCESS_TOKEN environment variable is not set')
  }
  return token
}

function getInstagramUserId(): string {
  const userId = process.env.INSTAGRAM_USER_ID
  if (!userId) {
    throw new Error('INSTAGRAM_USER_ID environment variable is not set')
  }
  return userId
}

/**
 * Helper function for Instagram Graph API calls
 */
async function instagramApiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = getAccessToken()
  const separator = endpoint.includes('?') ? '&' : '?'
  const url = `${GRAPH_API_BASE}${endpoint}${separator}access_token=${accessToken}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      errorData.error?.message ||
      `Instagram API error: ${response.status} ${response.statusText}`
    )
  }

  return response
}

/**
 * Check container status (video processing can take time)
 * Poll this until status is FINISHED, ERROR, or EXPIRED
 */
async function checkContainerStatus(containerId: string): Promise<ContainerStatus> {
  const response = await instagramApiFetch(
    `/${containerId}?fields=status_code`
  )
  const data = await response.json()
  return {
    id: containerId,
    status_code: data.status_code,
    error_message: data.error_message,
  }
}

/**
 * Wait for container to be ready (poll status)
 * Reels/video containers need processing time
 */
async function waitForContainer(
  containerId: string,
  maxAttempts: number = 30,
  intervalMs: number = 5000
): Promise<ContainerStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkContainerStatus(containerId)

    if (status.status_code === 'FINISHED') {
      return status
    }

    if (status.status_code === 'ERROR' || status.status_code === 'EXPIRED') {
      throw new Error(
        `Container ${containerId} failed: ${status.status_code} - ${status.error_message || 'Unknown error'}`
      )
    }

    // Still IN_PROGRESS, wait and retry
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Container ${containerId} timed out after ${maxAttempts * intervalMs / 1000}s`)
}

/**
 * Publish a Reel (short-form video) to Instagram
 * Video must be hosted at a publicly accessible URL
 *
 * Requirements:
 * - Video between 3-90 seconds
 * - Minimum 720p resolution
 * - MP4 format recommended
 * - Max 1GB file size
 */
export async function publishReel(
  videoUrl: string,
  caption: string
): Promise<InstagramApiResponse> {
  try {
    const userId = getInstagramUserId()

    // Step 1: Create Reel container
    const createResponse = await instagramApiFetch(`/${userId}/media`, {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
      }),
    })

    const createData = await createResponse.json()
    const containerId = createData.id

    if (!containerId) {
      return { success: false, error: 'Failed to create Reel container' }
    }

    // Step 2: Wait for video processing
    await waitForContainer(containerId)

    // Step 3: Publish
    const publishResponse = await instagramApiFetch(`/${userId}/media_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: containerId,
      }),
    })

    const publishData = await publishResponse.json()
    const mediaId = publishData.id

    if (!mediaId) {
      return { success: false, error: 'Failed to publish Reel' }
    }

    // Get permalink
    let permalink: string | undefined
    try {
      const mediaResponse = await instagramApiFetch(
        `/${mediaId}?fields=permalink`
      )
      const mediaData = await mediaResponse.json()
      permalink = mediaData.permalink
    } catch {
      // Permalink fetch is optional, don't fail the whole operation
    }

    return { success: true, mediaId, permalink }
  } catch (error) {
    console.error('Failed to publish Reel:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Publish an image post to Instagram
 * Image must be hosted at a publicly accessible URL
 *
 * Supported formats: JPEG, PNG
 * Max 8MB, aspect ratio between 4:5 and 1.91:1
 */
export async function publishImage(
  imageUrl: string,
  caption: string
): Promise<InstagramApiResponse> {
  try {
    const userId = getInstagramUserId()

    // Step 1: Create image container
    const createResponse = await instagramApiFetch(`/${userId}/media`, {
      method: 'POST',
      body: JSON.stringify({
        image_url: imageUrl,
        caption: caption,
      }),
    })

    const createData = await createResponse.json()
    const containerId = createData.id

    if (!containerId) {
      return { success: false, error: 'Failed to create image container' }
    }

    // Step 2: Publish (images don't need processing wait)
    const publishResponse = await instagramApiFetch(`/${userId}/media_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: containerId,
      }),
    })

    const publishData = await publishResponse.json()
    const mediaId = publishData.id

    if (!mediaId) {
      return { success: false, error: 'Failed to publish image' }
    }

    // Get permalink
    let permalink: string | undefined
    try {
      const mediaResponse = await instagramApiFetch(
        `/${mediaId}?fields=permalink`
      )
      const mediaData = await mediaResponse.json()
      permalink = mediaData.permalink
    } catch {
      // Optional
    }

    return { success: true, mediaId, permalink }
  } catch (error) {
    console.error('Failed to publish image to Instagram:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Publish a carousel (multiple images/videos) to Instagram
 */
export async function publishCarousel(
  items: Array<{ type: 'IMAGE' | 'VIDEO'; url: string }>,
  caption: string
): Promise<InstagramApiResponse> {
  try {
    const userId = getInstagramUserId()

    // Step 1: Create child containers for each item
    const childIds: string[] = []

    for (const item of items) {
      const body = item.type === 'IMAGE'
        ? { image_url: item.url, is_carousel_item: true }
        : { video_url: item.url, media_type: 'VIDEO', is_carousel_item: true }

      const response = await instagramApiFetch(`/${userId}/media`, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!data.id) {
        return { success: false, error: `Failed to create carousel item container` }
      }

      // Wait for video items to process
      if (item.type === 'VIDEO') {
        await waitForContainer(data.id)
      }

      childIds.push(data.id)
    }

    // Step 2: Create carousel container
    const carouselResponse = await instagramApiFetch(`/${userId}/media`, {
      method: 'POST',
      body: JSON.stringify({
        media_type: 'CAROUSEL',
        caption: caption,
        children: childIds,
      }),
    })

    const carouselData = await carouselResponse.json()
    const containerId = carouselData.id

    if (!containerId) {
      return { success: false, error: 'Failed to create carousel container' }
    }

    // Step 3: Publish carousel
    const publishResponse = await instagramApiFetch(`/${userId}/media_publish`, {
      method: 'POST',
      body: JSON.stringify({
        creation_id: containerId,
      }),
    })

    const publishData = await publishResponse.json()
    const mediaId = publishData.id

    return { success: true, mediaId }
  } catch (error) {
    console.error('Failed to publish carousel:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get Instagram profile information
 */
export async function getInstagramProfile(): Promise<{
  id: string
  username: string
  name?: string
  profile_picture_url?: string
  followers_count?: number
  media_count?: number
} | null> {
  try {
    const userId = getInstagramUserId()
    const response = await instagramApiFetch(
      `/${userId}?fields=id,username,name,profile_picture_url,followers_count,media_count`
    )
    return await response.json()
  } catch (error) {
    console.error('Failed to get Instagram profile:', error)
    return null
  }
}

/**
 * Get user's recent media
 */
export async function getUserMedia(limit: number = 25): Promise<Array<{
  id: string
  caption?: string
  media_type: string
  media_url?: string
  permalink: string
  timestamp: string
  like_count?: number
  comments_count?: number
}>> {
  try {
    const userId = getInstagramUserId()
    const response = await instagramApiFetch(
      `/${userId}/media?fields=id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count&limit=${limit}`
    )
    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to get user media:', error)
    return []
  }
}

/**
 * Test connection to Instagram API
 */
export async function testConnection(): Promise<{
  connected: boolean
  username?: string
  error?: string
}> {
  try {
    const profile = await getInstagramProfile()
    if (!profile) {
      return { connected: false, error: 'Failed to fetch profile' }
    }
    return { connected: true, username: profile.username }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
