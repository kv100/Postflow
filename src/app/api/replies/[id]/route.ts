import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { replyToThread } from '@/lib/threads/mentions'

type RouteContext = {
  params: Promise<{ id: string }>
}

// GET /api/replies/[id] - Get single reply
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('replies')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reply: data })
  } catch (error) {
    console.error('GET /api/replies/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/replies/[id] - Update reply (edit suggested reply, change status)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()
    const body = await request.json()

    const { final_reply, status } = body

    const updateData: Record<string, unknown> = {}

    if (final_reply !== undefined) {
      updateData.final_reply = final_reply
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'auto_sent', 'approved', 'sent', 'skipped']
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('replies')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reply: data })
  } catch (error) {
    console.error('PATCH /api/replies/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/replies/[id]/send - Send the reply to Threads
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createAdminClient()

    // Get the reply
    const { data: reply, error: fetchError } = await supabase
      .from('replies')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !reply) {
      return NextResponse.json({ error: 'Reply not found' }, { status: 404 })
    }

    if (reply.status === 'sent' || reply.status === 'auto_sent') {
      return NextResponse.json({ error: 'Reply already sent' }, { status: 400 })
    }

    // Determine which content to send
    const replyContent = reply.final_reply || reply.suggested_reply
    if (!replyContent) {
      return NextResponse.json({ error: 'No reply content' }, { status: 400 })
    }

    // Send the reply via Playwright
    const result = await replyToThread(reply.mention_thread_id, replyContent)

    if (result.success) {
      await supabase
        .from('replies')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          final_reply: replyContent,
        })
        .eq('id', id)

      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }
  } catch (error) {
    console.error('POST /api/replies/[id]/send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
