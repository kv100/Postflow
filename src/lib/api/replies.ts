import type { Reply, ReplyStatus } from '@/lib/types/database'

const API_URL = '/api/replies'

export interface RepliesResponse {
  replies: Reply[]
  total: number
}

export interface ReplyResponse {
  reply: Reply
}

export interface SyncResponse {
  sync: {
    found: number
    new: number
  }
  ai: {
    generated: number
    autoSent: number
  }
  dryRun: boolean
}

export async function fetchReplies(options?: {
  status?: string
  limit?: number
}): Promise<RepliesResponse> {
  const params = new URLSearchParams()

  if (options?.status) params.set('status', options.status)
  if (options?.limit) params.set('limit', options.limit.toString())

  const url = params.toString() ? `${API_URL}?${params}` : API_URL
  const res = await fetch(url)

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to fetch replies')
  }

  return res.json()
}

export async function updateReply(
  id: string,
  data: {
    final_reply?: string
    status?: ReplyStatus
  }
): Promise<ReplyResponse> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error || 'Failed to update reply')
  }

  return res.json()
}

export async function sendReply(id: string): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'POST',
  })

  if (!res.ok) {
    const result = await res.json()
    throw new Error(result.error || 'Failed to send reply')
  }

  return res.json()
}

export async function syncMentions(dryRun = false): Promise<SyncResponse> {
  const url = dryRun ? `${API_URL}/sync?dry_run=true` : `${API_URL}/sync`
  const res = await fetch(url)

  if (!res.ok) {
    const data = await res.json()
    throw new Error(data.error || 'Failed to sync mentions')
  }

  return res.json()
}
