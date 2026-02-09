import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/posts/[id] - Get single post
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('GET /api/posts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/posts/[id] - Update post
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()
    const body = await request.json()

    const { content, media_urls, scheduled_at, status } = body

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (content !== undefined) {
      if (typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Content cannot be empty' }, { status: 400 })
      }
      if (content.length > 500) {
        return NextResponse.json({ error: 'Content exceeds 500 characters' }, { status: 400 })
      }
      updateData.content = content.trim()
    }

    if (media_urls !== undefined) {
      updateData.media_urls = media_urls
    }

    if (scheduled_at !== undefined) {
      if (scheduled_at) {
        const scheduledDate = new Date(scheduled_at)
        if (scheduledDate <= new Date()) {
          return NextResponse.json({ error: 'Scheduled date must be in the future' }, { status: 400 })
        }
      }
      updateData.scheduled_at = scheduled_at
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'scheduled', 'publishing', 'published', 'failed']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ post: data })
  } catch (error) {
    console.error('PATCH /api/posts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/posts/[id] - Delete post
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()

    // Check if post exists and is not published
    const { data: existing, error: fetchError } = await supabase
      .from('posts')
      .select('status')
      .eq('id', id)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Post not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    // Prevent deleting published posts
    if (existing.status === 'published') {
      return NextResponse.json(
        { error: 'Cannot delete published posts' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/posts/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
