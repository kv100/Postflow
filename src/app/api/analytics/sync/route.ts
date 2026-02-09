import { NextRequest, NextResponse } from 'next/server'
import { syncAnalytics } from '@/lib/threads/analytics'
import { syncInstagramAnalytics } from '@/lib/instagram/analytics'

// GET /api/analytics/sync - Sync analytics from Threads and Instagram
export async function GET(request: NextRequest) {
  try {
    const platformFilter = new URL(request.url).searchParams.get('platform')

    const results: Record<string, unknown> = {}

    // Sync Threads analytics (unless filtered to instagram only)
    if (!platformFilter || platformFilter === 'threads') {
      const threadsResult = await syncAnalytics()
      results.threads = {
        success: threadsResult.success,
        data: threadsResult.data,
        postsSynced: threadsResult.postsSynced,
        error: threadsResult.error,
      }
    }

    // Sync Instagram analytics (unless filtered to threads only)
    if (!platformFilter || platformFilter === 'instagram') {
      try {
        const instagramResult = await syncInstagramAnalytics()
        results.instagram = {
          success: instagramResult.success,
          data: instagramResult.data,
          postsSynced: instagramResult.postsSynced,
          error: instagramResult.error,
        }
      } catch (error) {
        // Instagram sync is optional — don't fail the whole sync if it errors
        results.instagram = {
          success: false,
          error: error instanceof Error ? error.message : 'Instagram sync failed',
        }
      }
    }

    const allSuccess = Object.values(results).every(
      (r) => (r as { success: boolean }).success
    )

    return NextResponse.json({
      success: allSuccess,
      ...results,
    }, { status: allSuccess ? 200 : 207 }) // 207 Multi-Status if partial failure
  } catch (error) {
    console.error('Sync analytics error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
