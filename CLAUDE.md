# WebComment — Development Guide

Chrome Extension (MV3) for sending private anchored comments (with screenshots) on any web page.

## Stack

- **Extension**: Chrome MV3, React 18, Vite, CRXJS, Tailwind CSS, TypeScript
- **Icons**: Iconify (`@iconify/react` + `@iconify-icons/lucide`) — offline, CSP-compatible with MV3
- **Backend**: Supabase (Auth, Postgres, Storage, Realtime, Edge Functions)
- **Email**: Resend via Edge Function

## Repo structure

```
extension/          # Chrome extension code
  src/
    background/     # service worker (auth, capture, realtime)
    content/        # scripts injected into pages (pin picker, overlay, error)
    popup/          # React UI (inbox, composer, settings)
      components/   # reusable components (Button, …)
      views/        # main views (Inbox, Sent, Login, Settings)
    shared/         # supabase client, TS types, chrome message types
  manifest.json
  vite.config.ts

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
```

## Supabase

- **Project**: `yhavbvgahhtlddyrycai` (WebComment)
- **URL**: `https://yhavbvgahhtlddyrycai.supabase.co`
- Environment variables in `extension/.env.local`

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
- Popup icons: `<Icon icon={…} />` from `@iconify/react` with offline imports `@iconify-icons/lucide/*`
- Content script icons: module-level SVG string constants in `content.ts` (no React available)
- Always `escapeHtml()` before injecting `innerHTML` in the content script

## Reference docs

- Architecture: `docs/ARCHITECTURE.md`
- Database: `docs/DATABASE.md`
- API Edge Functions: `docs/API.md`
- Extension detail: `docs/EXTENSION.md`
- Roadmap: `docs/ROADMAP.md`
- Design: `docs/DESIGN.md`
