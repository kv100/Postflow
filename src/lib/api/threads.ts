export interface ThreadsTestResponse {
  connected: boolean
  username?: string
  message?: string
  error?: string
}

export interface ThreadsPostResponse {
  success: boolean
  error?: string
}

export async function testThreadsConnection(): Promise<ThreadsTestResponse> {
  const res = await fetch('/api/threads/test')
  return res.json()
}

export async function publishToThreads(
  content: string,
  postId?: string
): Promise<ThreadsPostResponse> {
  const res = await fetch('/api/threads/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, postId }),
  })

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to publish')
  }

  return res.json()
}

export async function clearThreadsSession(): Promise<void> {
  await fetch('/api/threads/test', { method: 'DELETE' })
}
