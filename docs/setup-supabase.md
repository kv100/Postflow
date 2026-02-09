# Supabase Setup Guide

This guide walks you through setting up the Supabase database for PostFlow. Takes about 5 minutes.

## What you'll get

- `NEXT_PUBLIC_SUPABASE_URL` — your project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public (anon) key for client-side
- `SUPABASE_SERVICE_ROLE_KEY` — secret key for server-side API routes

---

## Step 1: Create a Supabase project

1. Go to **[supabase.com](https://supabase.com)** and sign up (free)
2. Click **"New Project"**
3. Choose your organization (or create one)
4. Enter:
   - **Project name:** `postflow` (or anything you like)
   - **Database password:** generate a strong password and save it
   - **Region:** choose the closest to your users
5. Click **"Create new project"**
6. Wait ~2 minutes for the project to provision

## Step 2: Get your API keys

1. In your Supabase project, go to **Settings** (gear icon) → **API**
2. Copy these values:
   - **Project URL** → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal") → this is your `SUPABASE_SERVICE_ROLE_KEY`

> **Security note:** The `service_role` key has full database access and bypasses Row Level Security. Never expose it in client-side code. PostFlow only uses it in server-side API routes.

## Step 3: Create the database tables

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Open the `setup.sql` file from the PostFlow project root
4. Copy the entire contents and paste into the SQL Editor
5. Click **"Run"** (or press Cmd/Ctrl + Enter)

You should see "Success. No rows returned" — this means all tables were created.

## Step 4: Verify the tables

1. Go to **Table Editor** (left sidebar)
2. You should see these tables:
   - `posts` — content scheduling
   - `replies` — mention tracking
   - `analytics` — Threads daily metrics
   - `post_analytics` — Threads per-post metrics
   - `instagram_analytics` — Instagram daily metrics
   - `instagram_post_analytics` — Instagram per-post metrics
   - `settings` — app configuration

## Step 5: Add to .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## About Row Level Security (RLS)

The `setup.sql` script enables RLS on all tables with these policies:

- **Server-side (service_role key):** Full read/write access. This is used by API routes for publishing, syncing analytics, managing replies, etc.
- **Client-side (anon key):** Read-only access. The dashboard uses this to display posts, analytics, and replies.

This means even if someone finds your anon key (it's in the browser), they can only read data — not modify or delete anything.

---

## Troubleshooting

### "permission denied for table posts"
RLS is enabled but policies weren't created. Re-run the RLS section of `setup.sql`.

### "relation posts already exists"
The tables were already created. This is safe — `CREATE TABLE IF NOT EXISTS` skips existing tables.

### Tables show 0 rows
Expected! Tables start empty. Data appears after you create posts and run analytics sync.

---

## Summary of values

| Env Variable | Where to get it | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role | `eyJhbG...` |
