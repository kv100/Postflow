# Instagram API Setup Guide

This guide walks you through setting up Instagram content publishing for PostFlow. Takes about 20-30 minutes.

> **Instagram is optional.** PostFlow works perfectly with just Threads. Skip this guide if you don't need Instagram posting.

## What you'll get

- `INSTAGRAM_USER_ID` — your Instagram Business Account ID
- `FACEBOOK_ACCESS_TOKEN` — a never-expiring Page Access Token for publishing

## Prerequisites

- An **Instagram Business Account** (not Creator, not Personal)
- A **Facebook Page** linked to your Instagram Business Account
- A **Meta Developer** account (same one from Threads setup)
- The Meta App you created in the [Threads setup guide](./setup-meta-threads.md)

---

## Step 0: Ensure you have a Business Account

### Convert Instagram to Business Account

1. Open Instagram → **Settings** → **Account type and tools** → **Switch to professional account**
2. Choose **"Business"** (not "Creator" — Creator accounts can't publish via API)
3. Select a category for your business
4. Complete the setup

### Link Instagram to a Facebook Page

1. Open Instagram → **Settings** → **Account** → **Sharing to other apps** → **Facebook**
2. Connect your Facebook account
3. Select or create a Facebook Page to link to your Instagram

> **Important:** Content Publishing API only works with Instagram **Business** accounts linked to a Facebook Page. Creator accounts are NOT supported.

---

## Step 1: Add Instagram permissions to your Meta App

1. Go to **[Meta for Developers](https://developers.facebook.com/apps)** → your app
2. In the left sidebar, click **"Use cases"** → **"Customize"**
3. Add these permissions:
   - `instagram_basic` — read profile and media info
   - `instagram_content_publish` — publish photos, reels, carousels
   - `pages_show_list` — access your Facebook Pages
   - `pages_read_engagement` — read page insights

## Step 2: Get your Instagram Business Account ID

### Option A: Via Graph API Explorer (recommended)

1. Go to **[Graph API Explorer](https://developers.facebook.com/tools/explorer/)**
2. Select your app from the dropdown
3. Click **"Generate Access Token"**
4. In the permissions dialog, enable:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
5. Click **"Generate Access Token"** and authorize
6. In the query field, enter:
   ```
   me/accounts?fields=id,name,instagram_business_account{id,username}
   ```
7. Click **"Submit"**
8. Find your Page in the response and note the `instagram_business_account.id`

Response example:
```json
{
  "data": [
    {
      "id": "1000127223180923",
      "name": "My Page",
      "instagram_business_account": {
        "id": "17841480019199018",
        "username": "myaccount"
      }
    }
  ]
}
```

The `instagram_business_account.id` (e.g., `17841480019199018`) is your `INSTAGRAM_USER_ID`.

### Option B: Via curl

```bash
curl "https://graph.facebook.com/v24.0/me/accounts?fields=id,name,instagram_business_account{id,username}&access_token=YOUR_USER_TOKEN"
```

## Step 3: Get a never-expiring Page Access Token

The Graph API Explorer gives you a short-lived User token. We need to convert it to a permanent Page token.

### 3a. Get a long-lived User token

```bash
curl "https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=SHORT_LIVED_USER_TOKEN"
```

Response:
```json
{
  "access_token": "EAAQC...",
  "token_type": "bearer",
  "expires_in": 5184000
}
```

### 3b. Get a never-expiring Page token

```bash
curl "https://graph.facebook.com/v24.0/me/accounts?fields=id,name,access_token&access_token=LONG_LIVED_USER_TOKEN"
```

Response:
```json
{
  "data": [
    {
      "id": "1000127223180923",
      "name": "My Page",
      "access_token": "EAAQC...very-long-token..."
    }
  ]
}
```

The `access_token` for your Page is a **never-expiring Page Access Token**. This is your `FACEBOOK_ACCESS_TOKEN`.

> **Why never-expiring?** When you exchange a long-lived user token for a page token, Meta automatically generates a non-expiring page token. No refresh needed.

### 3c. Verify the token is permanent

```bash
curl "https://graph.facebook.com/v24.0/debug_token?input_token=YOUR_PAGE_TOKEN&access_token=YOUR_PAGE_TOKEN"
```

Look for `"expires_at": 0` or `"data_access_expires_at"` far in the future — this confirms it's permanent.

## Step 4: Test the connection

```bash
curl "https://graph.facebook.com/v24.0/YOUR_INSTAGRAM_USER_ID?fields=id,username,name,profile_picture_url,followers_count&access_token=YOUR_PAGE_TOKEN"
```

You should see your Instagram profile:

```json
{
  "id": "17841480019199018",
  "username": "myaccount",
  "name": "My Name",
  "followers_count": 42
}
```

## Step 5: Add to .env.local

```bash
INSTAGRAM_USER_ID=17841480019199018
FACEBOOK_ACCESS_TOKEN=EAAQC...your-never-expiring-page-token
```

---

## Content Publishing Limits

| Content Type | Limit |
|---|---|
| Posts (photos + carousels) | 25 per 24 hours |
| Reels | 25 per 24 hours |
| Carousel items | 2-10 items per carousel |

A carousel counts as 1 post.

## Supported Media

| Type | Format | Requirements |
|---|---|---|
| **Image** | JPEG, PNG | Max 8MB, aspect ratio 4:5 to 1.91:1 |
| **Reels** | MP4 | 3-90 seconds, min 720p, max 1GB |
| **Carousel** | Mixed | 2-10 items, each JPEG/PNG or MP4 |

---

## Troubleshooting

### "instagram_business_account is null"
Your Instagram account is not a Business account, or it's not linked to a Facebook Page. Complete Step 0.

### "(#10) Application does not have permission"
Enable `instagram_content_publish` permission in your app's Use Cases (Step 1).

### "The user is not an Instagram Business"
Creator accounts can't publish via API. Switch to a Business account in Instagram settings.

### "Media creation failed"
Check your image/video meets the requirements above. Common issues: wrong aspect ratio, file too large, video too short (<3s).

### Token stops working
The page token from Step 3 should be permanent. If it stops working, your app permissions may have changed, or the page-Instagram link was disconnected. Re-do Step 3.

---

## Summary of values

| Env Variable | Where to get it | Example |
|---|---|---|
| `INSTAGRAM_USER_ID` | Step 2: `instagram_business_account.id` | `17841480019199018` |
| `FACEBOOK_ACCESS_TOKEN` | Step 3b: Page access token | `EAAQC123...` |
