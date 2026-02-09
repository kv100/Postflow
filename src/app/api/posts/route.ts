import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/posts - List all posts
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    const status = searchParams.get('status')
    const platform = searchParams.get('platform')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .order('published_at', { ascending: false, nullsFirst: true })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (platform && platform !== 'all') {
      query = query.eq('platform', platform)
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      posts: data,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('GET /api/posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/posts - Create new post
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    const { content, media_urls, scheduled_at, status, platform, media_type } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Instagram captions can be up to 2200 chars, Threads up to 500
    const maxLength = platform === 'instagram' ? 2200 : 500
    if (content.length > maxLength) {
      return NextResponse.json({ error: `Content exceeds ${maxLength} characters` }, { status: 400 })
    }

    const postData = {
      content: content.trim(),
      media_urls: media_urls || [],
      scheduled_at: (scheduled_at as string) || null,
      status: (status as string) || 'draft',
      platform: platform || 'threads',
      media_type: media_type || 'text',
    }

    // If scheduling, validate the date
    if (postData.scheduled_at) {
      const scheduledDate = new Date(postData.scheduled_at)
      if (scheduledDate <= new Date()) {
        return NextResponse.json({ error: 'Scheduled date must be in the future' }, { status: 400 })
      }
      if (postData.status === 'draft') {
        postData.status = 'scheduled'
      }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/posts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
