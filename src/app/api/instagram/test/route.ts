import { NextResponse } from 'next/server'
import { testConnection } from '@/lib/instagram/client'

// GET /api/instagram/test - Test Instagram API connection
export async function GET() {
  try {
    const result = await testConnection()
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
