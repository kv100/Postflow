# Threads API Setup Guide

This guide walks you through getting Threads API access for PostFlow. Takes about 15-20 minutes.

## What you'll get

- `THREADS_APP_ID` — your Meta app identifier
- `THREADS_APP_SECRET` — your Meta app secret
- `THREADS_ACCESS_TOKEN` — long-lived token for posting (valid ~60 days)
- `THREADS_USER_ID` — your numeric Threads user ID

## Prerequisites

- A [Threads](https://threads.net) account (public profile recommended)
- A [Meta Developer](https://developers.facebook.com) account (free, uses your Facebook login)

---

## Step 1: Create a Meta App

1. Go to **[Meta for Developers](https://developers.facebook.com/apps)**
2. Click **"Create App"**
3. Choose use case: **"Access the Threads API"**
4. Enter app name (e.g., "PostFlow" or "My Threads Tool")
5. Enter your contact email
6. If asked about Business Portfolio — you can skip this (click "I don't want to connect a business portfolio")
7. Click **"Create App"**

> **Stuck on Business Portfolio?** Enable Two-Factor Authentication in your Meta Business Suite Settings first, then try again.

## Step 2: Note your App credentials

1. In your new app, go to **Settings → Basic**
2. Copy and save:
   - **App ID** → this is your `THREADS_APP_ID`
   - **App Secret** → click "Show", copy → this is your `THREADS_APP_SECRET`

## Step 3: Configure permissions

1. In the left sidebar, click **"Use cases"** → **"Customize"** next to Threads API
2. Make sure these permissions are enabled:
   - `threads_basic` — read profile info and posts (enabled by default)
   - `threads_content_publish` — create and publish posts
   - `threads_read_replies` — read replies to your posts
   - `threads_manage_replies` — reply to comments
   - `threads_manage_insights` — read analytics data

## Step 4: Configure redirect URI

1. In the left sidebar, go to **"Use cases"** → Threads API → **"Settings"**
2. Under **"Redirect Callback URLs"**, add:
   ```
   https://oauth.pstmn.io/v1/callback/
   ```
   > We use Postman's callback URL as a convenient way to capture the auth code. You can use any URL you control — you just need to grab the `code` parameter from the redirect.
3. Click **"Save"**

## Step 5: Add yourself as a tester

> **Why?** Until your app is approved by Meta for production use, only registered testers can use it. For a personal tool this is fine — you'll always be a tester.

1. In the left sidebar, go to **"App Roles"** → **"Roles"**
2. Click **"Add People"** → **"Add Threads Testers"**
3. Enter your **Threads username** (without @)
4. Click **"Submit"**

## Step 6: Accept the tester invitation

1. Open **[Threads Settings](https://www.threads.net/settings/account)**
2. Go to **"Website permissions"**
3. You should see a pending invitation from your app — click **"Accept"**

> **Don't see the invitation?** Wait a few minutes and refresh. Make sure you're logged into the correct Threads account.

## Step 7: Get the authorization code

Open this URL in your browser (replace `YOUR_APP_ID` with your actual App ID):

```
https://threads.net/oauth/authorize?client_id=YOUR_APP_ID&redirect_uri=https://oauth.pstmn.io/v1/callback/&scope=threads_basic,threads_content_publish,threads_read_replies,threads_manage_replies,threads_manage_insights&response_type=code
```

1. You'll see a Threads authorization screen — click **"Allow"**
2. You'll be redirected to a URL like:
   ```
   https://oauth.pstmn.io/v1/callback/?code=AQB...long-code...#_
   ```
3. Copy the **`code`** parameter value (everything after `code=` and before `#_`)

> **Important:** Remove `#_` from the end if present. The code expires in a few minutes — proceed quickly.

## Step 8: Exchange code for short-lived token

Run this command (replace placeholders):

```bash
curl -X POST "https://graph.threads.net/oauth/access_token" \
  -F "client_id=YOUR_APP_ID" \
  -F "client_secret=YOUR_APP_SECRET" \
  -F "grant_type=authorization_code" \
  -F "redirect_uri=https://oauth.pstmn.io/v1/callback/" \
  -F "code=YOUR_AUTH_CODE"
```

You'll get a response like:

```json
{
  "access_token": "THQVJ...",
  "user_id": 123456789
}
```

Save the `user_id` — this is your `THREADS_USER_ID`.

> The short-lived token is valid for ~1 hour. We'll exchange it for a long-lived one next.

## Step 9: Exchange for long-lived token

```bash
curl -X GET "https://graph.threads.net/access_token?grant_type=th_exchange_token&client_secret=YOUR_APP_SECRET&access_token=SHORT_LIVED_TOKEN"
```

Response:

```json
{
  "access_token": "THABC...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

This long-lived token is valid for **60 days**. This is your `THREADS_ACCESS_TOKEN`.

## Step 10: Verify it works

```bash
curl "https://graph.threads.net/v1.0/me?fields=id,username,name&access_token=YOUR_LONG_LIVED_TOKEN"
```

You should see your profile info:

```json
{
  "id": "123456789",
  "username": "yourname",
  "name": "Your Name"
}
```

## Step 11: Add to .env.local

```bash
THREADS_USER_ID=123456789
THREADS_ACCESS_TOKEN=THABC...your-long-lived-token
THREADS_APP_ID=your-app-id
THREADS_APP_SECRET=your-app-secret
```

---

## Token Refresh

The long-lived token expires after ~60 days. PostFlow includes automatic refresh:

- **Automatic (recommended):** The `/api/cron/refresh-token` endpoint refreshes the token monthly. Configure `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` in your env vars to auto-update the stored token.
- **Manual:** Run the exchange command from Step 9 again using your current (not yet expired) token, then update `.env.local` / Vercel env vars.

You can also manually refresh anytime:

```bash
curl "https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=YOUR_CURRENT_TOKEN"
```

---

## Troubleshooting

### "Invalid redirect URI"
Make sure the redirect URI in Step 4 matches **exactly** what you use in Step 7 (including trailing slash).

### "Invalid scope"
Check that all permissions from Step 3 are enabled in your app's Threads API settings.

### "The user hasn't authorized the application"
Complete Step 5 and Step 6 — you need to be added as a tester AND accept the invitation.

### "Code has expired"
The authorization code from Step 7 expires in a few minutes. Get a new one and proceed to Step 8 quickly.

### Token stops working after ~60 days
Set up automatic token refresh (see Token Refresh section above) or manually refresh before expiry.

---

## Summary of values

| Env Variable | Where to get it | Example |
|---|---|---|
| `THREADS_APP_ID` | Step 2: Settings → Basic | `1234567890` |
| `THREADS_APP_SECRET` | Step 2: Settings → Basic | `abc123def456...` |
| `THREADS_USER_ID` | Step 8: API response `user_id` | `25915546771417209` |
| `THREADS_ACCESS_TOKEN` | Step 9: Long-lived token | `THABC123...` |
