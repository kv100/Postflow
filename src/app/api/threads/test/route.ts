import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/threads/client'

// GET /api/threads/test - Test Threads API connection
export async function GET() {
  try {
    const result = await testConnection()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Threads test error:', error)
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Connection failed'
    }, { status: 500 })
  }
}

// DELETE - no longer needed (no session to clear), but keep for API compat
export async function DELETE() {
  return NextResponse.json({ success: true, message: 'No session to clear (using API tokens)' })
}
