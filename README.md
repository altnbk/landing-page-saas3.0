# Landing Page Generator

A minimal SaaS application that lets users create, preview, and deploy beautiful landing pages to Cloudflare Pages in seconds.

**Tech Stack:**
- [Astro](https://astro.build/) - Full-stack web framework (TypeScript)
- [Supabase](https://supabase.com/) - Authentication & PostgreSQL database
- [Cloudflare Pages](https://pages.cloudflare.com/) - Edge deployment via Direct Upload API

## Features

- **Magic Link Authentication** - Passwordless email login via Supabase
- **Real-time Preview** - See your landing page as you type
- **Custom Theme Colors** - Pick your brand color with a color picker
- **One-Click Deploy** - Deploy to Cloudflare's global CDN instantly
- **Deployment Management** - View history and delete old deployments
- **Secure by Design** - Row-level security ensures data isolation

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/altnbk/landing-page-saas3.0.git
cd landing-page-saas3.0
pnpm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase.sql`
3. Go to **Authentication > URL Configuration**:
   - Set **Site URL** to `http://localhost:4321`
   - Add `http://localhost:4321/api/auth/callback` to **Redirect URLs**
4. Go to **Project Settings > API** and copy your credentials

### 3. Set Up Cloudflare

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Get your **Account ID** from the sidebar (any page)
3. Create an API Token:
   - Go to **My Profile > API Tokens**
   - Click **Create Token** > **Custom Token**
   - Add permission: `Account > Cloudflare Pages > Edit`
   - Select your account under **Account Resources**

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_API_TOKEN=your-api-token
```

### 5. Run Locally

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321)

## Project Structure

```
├── src/
│   ├── layouts/
│   │   ├── Layout.astro        # Public pages layout
│   │   └── AppLayout.astro     # Protected app layout (auth check)
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client & auth utilities
│   │   └── cloudflare.ts       # Cloudflare Pages API client
│   ├── pages/
│   │   ├── index.astro         # Landing page (/)
│   │   ├── login.astro         # Login page (/login)
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login.ts    # Send magic link
│   │   │   │   ├── callback.ts # Handle auth callback
│   │   │   │   └── logout.ts   # Sign out
│   │   │   ├── deploy.ts       # Deploy to Cloudflare
│   │   │   └── delete.ts       # Delete deployment
│   │   └── app/
│   │       ├── index.astro     # Create page (/app)
│   │       └── history.astro   # History page (/app/history)
│   └── env.d.ts
├── public/
│   └── favicon.svg
├── supabase.sql                # Database schema + RLS policies
├── .env.example
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

## How It Works

### Authentication Flow

1. User enters email on `/login`
2. Supabase sends a magic link email
3. User clicks link → redirected to `/api/auth/callback`
4. Callback exchanges code for session tokens
5. Tokens stored in HTTP-only cookies
6. Protected pages read cookies to verify auth

### Deploy Flow

1. User fills form on `/app` (title, subtitle, CTA, color)
2. Live preview updates in iframe using `srcdoc`
3. Click "Deploy" → POST to `/api/deploy`
4. Server generates static HTML
5. Creates Cloudflare Pages project (`lp-{slug}-{timestamp}`)
6. Uploads HTML via Direct Upload API
7. Saves deployment record to Supabase
8. Returns `.pages.dev` URL to user

### Delete Flow

1. User clicks "Delete" on `/app/history`
2. Confirmation modal appears
3. POST to `/api/delete` with deployment ID
4. Server verifies ownership (RLS + double-check)
5. Deletes from Cloudflare Pages
6. Deletes from Supabase database

## Database Schema

```sql
CREATE TABLE public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  title text NOT NULL,
  subtitle text NOT NULL,
  cta text NOT NULL,
  theme_color text DEFAULT '#667eea',
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS: Users can only SELECT/INSERT/DELETE their own rows
```

## Security

- **Server-side secrets**: Cloudflare API token never exposed to client
- **Cookie-based auth**: HTTP-only cookies prevent XSS token theft
- **Row-level security**: Database enforces user data isolation
- **Input validation**: Server validates all inputs before processing
- **Ownership verification**: Double-check user ID before operations

## Troubleshooting

### Magic link not arriving
- Check spam/junk folder
- Verify Supabase email settings (Authentication > Email Templates)
- Check Supabase logs for delivery errors

### "Unauthorized" errors
- Clear browser cookies and log in again
- Verify `SUPABASE_ANON_KEY` is correct
- Check that RLS policies are created

### Cloudflare deploy fails
- Verify API token has `Cloudflare Pages: Edit` permission
- Check Account ID is correct (not Zone ID)
- Review Cloudflare Pages dashboard for quota limits

### Database errors
- Run `supabase.sql` in SQL Editor
- Check RLS policies are enabled
- Verify `SUPABASE_SERVICE_ROLE_KEY` for admin operations

## Scripts

```bash
pnpm dev      # Start development server
pnpm build    # Build for production
pnpm preview  # Preview production build
pnpm check    # Type-check the project
```

## License

MIT
