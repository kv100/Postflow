# Vercel Deployment Guide

Deploy PostFlow to Vercel in about 5 minutes.

## Prerequisites

- A [Vercel](https://vercel.com) account (free Hobby plan works)
- A GitHub/GitLab/Bitbucket repository with PostFlow code
- Completed setup: [Supabase](./setup-supabase.md), [Threads](./setup-meta-threads.md)

---

## Step 1: Deploy to Vercel

### Option A: One-click deploy (fastest)

Click the "Deploy to Vercel" button in the README, or:

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Import your PostFlow repository
3. Vercel auto-detects Next.js — no config needed
4. Click **"Deploy"**

### Option B: Vercel CLI

```bash
npm i -g vercel
cd postflow
vercel
```

Follow the prompts to link to your Vercel account and project.

## Step 2: Add environment variables

1. In Vercel Dashboard → your project → **Settings** → **Environment Variables**
2. Add each variable from your `.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key |
| `THREADS_USER_ID` | Yes | Your Threads user ID |
| `THREADS_ACCESS_TOKEN` | Yes | Long-lived Threads token |
| `THREADS_APP_ID` | Yes | Meta app ID |
| `THREADS_APP_SECRET` | Yes | Meta app secret |
| `CRON_SECRET` | Yes | Random secret for cron security |
| `INSTAGRAM_USER_ID` | No | Instagram Business Account ID |
| `FACEBOOK_ACCESS_TOKEN` | No | Instagram Page token |
| `GROQ_API_KEY` | No | Groq API key for AI replies |
| `VERCEL_API_TOKEN` | No | For auto token refresh |
| `VERCEL_PROJECT_ID` | No | For auto token refresh |

3. Click **"Save"** after adding all variables
4. Go to **Deployments** → click **"Redeploy"** on the latest deployment (env vars take effect on next deploy)

## Step 3: Configure cron jobs

PostFlow includes two cron jobs configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/publish",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/refresh-token",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

- **Publish cron:** Runs daily at 9:00 AM UTC — publishes scheduled posts
- **Token refresh:** Runs monthly — refreshes the Threads access token

### Adjusting the schedule

Edit `vercel.json` to change timing. Common options:

```
"0 9 * * *"     — Daily at 9:00 AM UTC
"0 */6 * * *"   — Every 6 hours
"0 8,14,20 * * *" — Three times a day (8 AM, 2 PM, 8 PM UTC)
```

> **Vercel Hobby plan limitation:** Cron jobs on the free plan run at most **once per day**. If you need more frequent publishing, use an external cron service like [cron-job.org](https://cron-job.org) (free) to call your publish endpoint.

### External cron setup (optional, for hourly publishing)

1. Sign up at [cron-job.org](https://cron-job.org) (free)
2. Create a new cron job:
   - **URL:** `https://your-app.vercel.app/api/cron/publish?secret=YOUR_CRON_SECRET`
   - **Schedule:** Every hour (or as needed)
   - **Method:** GET
3. The `secret` query parameter ensures only authorized requests trigger publishing

## Step 4: Verify deployment

1. Visit your Vercel URL: `https://your-app.vercel.app`
2. You should see the PostFlow dashboard
3. Go to **Settings** and test your Threads connection
4. Create a draft post and try publishing it

---

## Custom domain (optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your domain (e.g., `social.yourdomain.com`)
3. Follow DNS instructions (add CNAME record)

---

## Troubleshooting

### Cron jobs not running
- Check that `vercel.json` is in the project root
- Verify `CRON_SECRET` is set in environment variables
- On Hobby plan, crons run at most once per day

### "Environment variable not found" errors
- Make sure you redeployed after adding env vars
- Check for typos in variable names

### Build fails
- Ensure you're using Node.js 18+ (Vercel default is fine)
- Run `npm run build` locally to check for errors

---

## Cost

| Plan | Price | Cron limit | Notes |
|---|---|---|---|
| Hobby (free) | $0/month | 1x/day | Perfect for personal use |
| Pro | $20/month | Every minute | For teams or frequent posting |

Most users will be fine on the free Hobby plan. Use an external cron service if you need more frequent publishing.
