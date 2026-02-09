import type { Post, PostStatus, Platform, MediaType } from '@/lib/types/database'

const API_URL = '/api/posts'

export interface PostsResponse {
  posts: Post[]
  total: number
  limit: number
  offset: number
}

export interface PostResponse {
  post: Post
}

export async function fetchPosts(options?: {
  status?: string
  platform?: string
  limit?: number
  offset?: number
}): Promise<PostsResponse> {
  const params = new URLSearchParams()

  if (options?.status) params.set('status', options.status)
  if (options?.platform) params.set('platform', options.platform)
  if (options?.limit) params.set('limit', options.limit.toString())
  if (options?.offset) params.set('offset', options.offset.toString())

  const url = params.toString() ? `${API_URL}?${params}` : API_URL
  const res = await fetch(url)

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to fetch posts')
  }

  return res.json()
}

export async function createPost(data: {
  content: string
  media_urls?: string[]
  scheduled_at?: string | null
  status?: PostStatus
  platform?: Platform
  media_type?: MediaType
}): Promise<PostResponse> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error || 'Failed to create post')
  }

  return res.json()
}

export async function updatePost(
  id: string,
  data: {
    content?: string
    media_urls?: string[]
    scheduled_at?: string | null
    status?: PostStatus
  }
): Promise<PostResponse> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error || 'Failed to update post')
  }

  return res.json()
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error || 'Failed to delete post')
  }
}
