# PostFlow

**Self-hosted social media manager for Threads & Instagram. Free, open-source, with AI-powered replies.**

PostFlow is a Buffer/Hootsuite alternative you own. Schedule posts, track analytics, and manage replies — all from your own dashboard, at zero cost.

## Why PostFlow?

| | Buffer | Later | **PostFlow** |
|---|---|---|---|
| Price | $15+/mo | $25+/mo | **Free** |
| Self-hosted | No | No | **Yes** |
| AI reply assistant | No | No | **Yes** |
| Open source | No | No | **Yes** |
| Your data, your server | No | No | **Yes** |

## Features

**Post Scheduling**
- Write posts, attach images, set publish date/time
- Auto-publish via cron jobs (daily or hourly)
- Support for Threads (text + images) and Instagram (photos, Reels, carousels)
- Draft, schedule, publish, or manually post

**Analytics Dashboard**
- Daily metrics: followers, views, likes, replies, reposts
- Per-post engagement tracking
- Separate Threads and Instagram analytics
- 30-day history with trends

**AI Reply Assistant**
- Automatically collects mentions and replies to your posts
- AI generates reply suggestions (Groq/Llama 3.3 — free)
- You review and approve before sending
- Crisis detection (mental health keywords) — flags for human review
- Spam detection — auto-skips crypto/follow-spam
- Customizable AI persona to match YOUR voice
- Learning phase: first 14 days = 100% manual moderation

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **UI:** React 19 + TailwindCSS 4
- **Database:** Supabase (PostgreSQL, free tier)
- **AI:** Groq (Llama 3.3 70B, free tier)
- **Deployment:** Vercel (free tier)
- **APIs:** Threads REST API, Instagram Graph API v24.0

**Total hosting cost: $0/month** on free tiers.

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/YOUR_USERNAME/postflow.git
cd postflow
npm install
```

### 2. Set up services (one-time, ~30 min)

Follow these guides in order:

1. **[Supabase Setup](docs/setup-supabase.md)** (~5 min) — database
2. **[Threads API Setup](docs/setup-meta-threads.md)** (~15 min) — posting to Threads
3. **[Instagram Setup](docs/setup-meta-instagram.md)** (~15 min, optional) — posting to Instagram
4. **[Vercel Deployment](docs/setup-vercel.md)** (~5 min) — hosting

### 3. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your keys from the setup guides
```

### 4. Set up database

Run `setup.sql` in your Supabase SQL Editor (see [Supabase guide](docs/setup-supabase.md)).

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

```bash
npx vercel
```

Or push to GitHub and import in Vercel Dashboard.

## Project Structure

```
src/
├── app/
│   ├── api/                    # API routes
│   │   ├── cron/publish/       # Auto-publish scheduled posts
│   │   ├── cron/refresh-token/ # Auto-refresh Threads token
│   │   ├── posts/              # CRUD for posts
│   │   ├── replies/            # Reply management + AI sync
│   │   ├── analytics/          # Analytics sync
│   │   ├── threads/            # Threads connection test
│   │   └── instagram/          # Instagram connection test
│   ├── page.tsx                # Dashboard home
│   ├── schedule/               # Post scheduling UI
│   ├── analytics/              # Analytics dashboard
│   ├── replies/                # Reply management UI
│   └── settings/               # Settings & connections
├── components/                 # React components
├── lib/
│   ├── threads/                # Threads API client
│   ├── instagram/              # Instagram API client
│   ├── ai/                     # Groq AI reply generator
│   ├── supabase/               # Database clients
│   └── types/                  # TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/threads/test` | Test Threads connection |
| GET | `/api/instagram/test` | Test Instagram connection |
| GET | `/api/posts` | List posts |
| POST | `/api/posts` | Create post |
| PATCH | `/api/posts/[id]` | Update post |
| DELETE | `/api/posts/[id]` | Delete post |
| GET | `/api/analytics/sync` | Sync analytics from APIs |
| GET | `/api/replies` | List replies |
| GET | `/api/replies/sync` | Sync mentions + generate AI replies |
| PATCH | `/api/replies/[id]` | Update reply |
| POST | `/api/replies/[id]` | Send reply |
| GET | `/api/cron/publish` | Publish scheduled posts (cron) |
| GET | `/api/cron/refresh-token` | Refresh Threads token (cron) |

## Customizing AI Persona

PostFlow's AI reply assistant can be customized to match your voice. Set these in `.env.local`:

```bash
AI_PERSONA_NAME="Alex"
AI_PERSONA_DESCRIPTION="Indie hacker building a habit tracking app"
AI_PERSONA_PRODUCT="HabitFlow"
AI_PERSONA_PRODUCT_DESCRIPTION="iOS habit tracker with streaks and reminders"
AI_PERSONA_TONE="friendly, nerdy, casual"
```

The AI will generate replies that sound like YOU, not a corporate brand.

## Rate Limits

| Platform | Limit |
|---|---|
| Threads posts | 250 per 24 hours |
| Instagram posts | 25 per 24 hours |
| Groq AI (free) | 6,000 requests/day |

## Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## License

[MIT](LICENSE) — use it however you want.

## Resources

- [Threads API Documentation](https://developers.facebook.com/docs/threads)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-platform)
- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Groq API](https://console.groq.com/docs)
