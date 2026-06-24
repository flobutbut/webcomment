# WebComment — Development Guide

Chrome Extension (MV3) for sending private anchored comments (with screenshots) on any web page.

## Stack

- **Extension**: Chrome MV3, React 18, Vite, CRXJS, Tailwind CSS, TypeScript
- **Icons**: Iconify (`@iconify/react` + `@iconify-icons/lucide`) — offline, CSP-compatible with MV3
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
- **Email**: Resend via Edge Function
- **Webapp**: Vite + React 18 + Tailwind CSS, deployed on Vercel

## Repo structure

```
extension/          # Chrome extension code
  src/
    background/     # service worker (auth, capture, realtime)
    content/        # scripts injected into pages (pin picker, overlay, error)
    popup/          # React UI (inbox, composer, settings)
      components/   # reusable components (Button, Avatar, Loading, Tabs)
      views/        # main views (Inbox, Sent, Login, Settings)
    shared/         # supabase client, TS types, chrome message types
  manifest.json
  vite.config.ts

webapp/             # Landing page (Vite + React + Tailwind)
  src/
    App.tsx         # all sections (Hero, How it works, Use cases, CTA)
    components/
      AuthModal.tsx   # login / signup connected to Supabase
      PageComments.tsx # interactive demo: live pins, composer, Realtime, delete-by-token
    lib/
      supabase.ts   # shared Supabase client
  .env.example      # copy to .env.local and fill in the anon key

supabase/
  migrations/       # SQL migrations to apply in order

docs/               # architecture, API documentation, etc.
```

## Commands

```bash
cd extension
npm install
npm run dev     # watch build → load dist/ in chrome://extensions
npm run build   # production build

cd webapp
npm install
npm run dev     # local dev server → http://localhost:5173
npm run build   # production build (output: dist/)
```

## Supabase

- **Project**: `yhavbvgahhtlddyrycai` (WebComment)
- **URL**: `https://yhavbvgahhtlddyrycai.supabase.co`
- Environment variables in `extension/.env.local` and `webapp/.env.local`

## Webapp — Vercel deployment

- **Platform**: Vercel (free tier)
- **GitHub integration**: auto-deploy on every push to `main`
- **Root directory**: `webapp/` (critical — must be set in Vercel project settings)
- **Build command**: `npm run build` (auto-detected)
- **Output directory**: `dist/` (auto-detected)
- **Environment variables** to set in Vercel dashboard → Settings → Environment Variables:
  - `VITE_SUPABASE_URL` = `https://yhavbvgahhtlddyrycai.supabase.co`
  - `VITE_SUPABASE_ANON_KEY` = anon key from Supabase Dashboard → Settings → API

### First deploy (from scratch)
1. vercel.com → Add New Project → import `flobutbut/webcomment`
2. Set Root Directory to `webapp/`
3. Add the two env vars above
4. Deploy

### Custom domain
Add via Vercel Dashboard → Project → Settings → Domains.
Then update DNS at Hostinger: add a CNAME record pointing to `cname.vercel-dns.com`.

## Important MV3 constraints

- The service worker is **ephemeral**: all state must be persisted in `chrome.storage.local`
- No `XMLHttpRequest` in the service worker — only `fetch`
- `captureVisibleTab` requires the tab to be active at the time of the call

## Conventions

- All communication between extension parts goes through `chrome.runtime.sendMessage` with types defined in `shared/messages.ts`
- Content Script components use **Shadow DOM** to avoid CSS conflicts with host pages
- The Supabase client is instantiated once in `shared/supabase.ts` and reused everywhere
- Design system documented in `docs/DESIGN.md`
- Action buttons: use `<Button variant="…">` from `popup/components/Button.tsx` (primary, secondary, danger, danger-filled)
- User avatars: use `<Avatar username initials avatarUrl />` from `popup/components/Avatar.tsx` — shows photo if available, falls back to colored initials, then username initial
- Tab bars: use `<Tabs tabs active onChange />` from `popup/components/Tabs.tsx`
- Loading states: use `<Loading />` from `popup/components/Loading.tsx`
- Popup icons: `<Icon icon={…} />` from `@iconify/react` with offline imports `@iconify-icons/lucide/*`
- Content script icons: module-level SVG string constants in `content.ts` (no React available)
- Always `escapeHtml()` before injecting `innerHTML` in the content script
- Tags: stored as `text[]` on `comments.tags`; body text with `#hashtags` is rendered via `BodyWithTags` in Inbox.tsx

## Changelog

`CHANGELOG.md` at the repo root tracks every notable change per version.

**`CHANGELOG.md` is also the release notes file.** When a user asks for a "release note", write it here.

**Keep it up to date**: whenever a functional change is made (feature, fix, security, UI, DB schema, Edge Function), add an entry under `## [Unreleased]` with the format:

```
- Short description of what changed and why, scoped to the affected area (Extension / Webapp / Backend)
```

When a version is released (zip exported or version bumped in `manifest.json`), promote `[Unreleased]` to `## [x.y.z] — YYYY-MM-DD`.

## Reference docs

- Architecture: `docs/ARCHITECTURE.md`
- Database: `docs/DATABASE.md`
- API Edge Functions: `docs/API.md`
- Extension detail: `docs/EXTENSION.md`
- Roadmap: `docs/ROADMAP.md`
- Design: `docs/DESIGN.md`
