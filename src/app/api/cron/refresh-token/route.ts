import { NextRequest, NextResponse } from 'next/server'

// Threads long-lived tokens last 60 days
// This cron refreshes the token before it expires
// Schedule: runs every 30 days (see vercel.json)

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const querySecret = request.nextUrl.searchParams.get('secret')
  const cronSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === 'development') {
    return true
  }

  if (!cronSecret) {
    console.warn('CRON_SECRET not set, rejecting request')
    return false
  }

  return authHeader === `Bearer ${cronSecret}` || querySecret === cronSecret
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const currentToken = process.env.THREADS_ACCESS_TOKEN
    const appSecret = process.env.THREADS_APP_SECRET

    if (!currentToken || !appSecret) {
      return NextResponse.json({
        error: 'THREADS_ACCESS_TOKEN or THREADS_APP_SECRET not configured'
      }, { status: 500 })
    }

    // Exchange current long-lived token for a new long-lived token
    // https://developers.facebook.com/docs/threads/get-started/long-lived-tokens
    const response = await fetch(
      `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Token refresh failed:', errorData)
      return NextResponse.json({
        error: errorData.error?.message || `Refresh failed: ${response.status}`,
        details: errorData
      }, { status: 500 })
    }

    const data = await response.json()

    // The new token is returned in the response
    // In production, you'd update this in Vercel env vars via API
    // For now, log success and the expiry
    const expiresInDays = Math.round(data.expires_in / 86400)
    const expiresDate = new Date(Date.now() + data.expires_in * 1000).toISOString()

    console.log(`Token refreshed successfully. Expires in ${expiresInDays} days (${expiresDate})`)

    // If Vercel API token is configured, auto-update the env var
    const vercelToken = process.env.VERCEL_API_TOKEN
    const vercelProjectId = process.env.VERCEL_PROJECT_ID

    if (vercelToken && vercelProjectId) {
      // Auto-update THREADS_ACCESS_TOKEN in Vercel
      const updateResponse = await fetch(
        `https://api.vercel.com/v10/projects/${vercelProjectId}/env`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'THREADS_ACCESS_TOKEN',
            value: data.access_token,
            type: 'encrypted',
            target: ['production', 'preview'],
          }),
        }
      )

      if (updateResponse.ok) {
        console.log('Vercel env var updated automatically')
        return NextResponse.json({
          success: true,
          expires_in_days: expiresInDays,
          expires_date: expiresDate,
          vercel_updated: true,
        })
      } else {
        console.warn('Failed to update Vercel env var, manual update needed')
      }
    }

    return NextResponse.json({
      success: true,
      new_token: data.access_token,
      expires_in_days: expiresInDays,
      expires_date: expiresDate,
      note: 'Update THREADS_ACCESS_TOKEN in Vercel env vars manually, or set VERCEL_API_TOKEN + VERCEL_PROJECT_ID for auto-update',
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}
