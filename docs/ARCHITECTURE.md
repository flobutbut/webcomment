# Architecture

## Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Chrome Extension                      │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Popup UI  │  │ Content      │  │  Service      │ │
│  │  (React)    │  │ Script       │  │  Worker       │ │
│  │             │  │ (Shadow DOM) │  │  (auth, API,  │ │
│  │ - inbox     │  │              │  │   capture,    │ │
│  │ - sent      │  │ - pin picker │  │   notifs)     │ │
│  │ - settings  │  │ - composer   │  │               │ │
│  │             │  │   overlay    │  │               │ │
│  │             │  │ - live pins  │  │               │ │
│  │             │  │ - error      │  │               │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘ │
│         └────────────────┴──────────────────┘         │
│                           │                            │
└───────────────────────────┼────────────────────────────┘
                            │
┌───────────────────────────┼────────────────────────────┐
│             Web App  (webcomment.app)                   │
│                           │                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Vite + React + Tailwind — same Supabase client  │  │
│  │                                                  │  │
│  │  / (landing + demo)                              │  │
│  │  /dashboard/inbox       → received comments      │  │
│  │  /dashboard/my-comments → sent comments          │  │
│  │  /dashboard/contacts    → contacts               │  │
│  │  /dashboard/settings    → profile settings       │  │
│  │  /s/:token              → share link resolve     │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │ Supabase JS Client
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      Supabase                           │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌─────────┐ │
│  │   Auth   │  │ Postgres │  │Storage │  │Realtime │ │
│  │          │  │          │  │        │  │         │ │
│  │ accounts │  │comments  │  │screens │  │notifs   │ │
│  │ sessions │  │profiles  │  │shots   │  │live     │ │
│  │          │  │groups    │  │(WebP)  │  │         │ │
│  └──────────┘  └──────────┘  └────────┘  └─────────┘ │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              Edge Functions                     │   │
│  │  send-comment | notify-email                   │   │
│  │  create-share-link | resolve-share-link        │   │
│  │  get-signed-url | get-comment-page             │   │
│  │  delete-account | cleanup-screenshots          │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## Extension components

### Service Worker (`background/`)

The brain of the extension. Runs in the background even when the popup is closed.

Responsibilities:
- Supabase token management (automatic refresh via `onAuthStateChange`)
- `ensureSession()`: restores the session from `chrome.storage.local` before each operation (the SW is ephemeral)
- Screenshot capture via `chrome.tabs.captureVisibleTab()` + WebP compression via `OffscreenCanvas`
- Upload of the capture to Supabase Storage
- Recipient search (`SEARCH_USERS`) with RLS-compatible access
- Two-step comment sending: `PREPARE_CAPTURE` → `FINALIZE_COMMENT`
- Listening to Supabase Realtime notifications → badge + `chrome.notifications`

### Content Script (`content/`)

Injected into every web page. Isolated via Shadow DOM to avoid CSS conflicts with the host page. Protected against double injection by the `window.__webcomment_injected` guard.

Responsibilities:
- **Pin picker**: in "new comment" mode, displays a crosshair cursor and records click coordinates as percentages of the visible page
- **Composer overlay** (Shadow DOM, Figma style): appears anchored to the click point, without a dark backdrop. Contains the recipient field (dropdown with keyboard navigation, support for unregistered emails), message field, and Cancel / Send buttons
- **Live pins**: displays comment pins received for the current page
- **Error screen**: if the page is inaccessible, replaces the content with the screenshot + comment message

### Popup UI (`popup/`)

Main React interface, 360×560 px.

```
┌──────────────────────────────┐
│  WebComment  [Pins] [👤]     │  ← header (Pins toggle + user icon)
├──────────────────────────────┤
│  [  Inbox  ] [My comments ]  │  ← tabs (hidden in settings mode)
├──────────────────────────────┤
│                              │
│   Active view                │
│   (Inbox, My comments,       │
│    or Settings)              │
│                              │
├──────────────────────────────┤
│  [+ New comment  Alt+Shift+N]│  ← fixed footer
│  [↗ Open web app]            │
└──────────────────────────────┘
```

- **Inbox**: list of received comments, sorted by date, with thumbnail and read/unread indicator.
- **My comments**: list of sent comments, with thumbnail, hostname, message preview.
- **Settings** (user icon in header): replaces the tab content. Shows profile, contacts, and sign-out. A red badge on the icon counts pending contact requests.
- **Pins toggle**: show/hide comment pins on the active page. State persisted in `chrome.storage.local`.
- **New comment**: button in footer (keyboard shortcut `Alt+Shift+N`). Closes the popup, puts the content script into pin picker mode. If the content script is absent, automatic re-injection via `chrome.scripting.executeScript`.
- **Open web app**: link in footer, opens the webapp at `/dashboard` with an auth hash token for seamless SSO.

## Session — sharing between contexts

The popup and service worker have separate Supabase instances that **do not share** `localStorage`. The session is synchronized via `chrome.storage.local`:

```
Popup (React)               chrome.storage.local       Service Worker
─────────────────────────   ──────────────────────     ──────────────────────
getSession() → session  ──► set({ session })
onAuthStateChange()     ──► set/remove session
                                                   ◄── ensureSession() reads session
                                                        → supabase.auth.setSession()
```

## Data flow

### Sending a comment (two-step flow)

```
1. User clicks "+ New comment" in the popup
2. Popup → chrome.tabs.sendMessage → Content Script: ACTIVATE_PIN_PICKER
   (if content script absent: re-injection via chrome.scripting.executeScript)
3. Popup closes. Crosshair cursor active on the page.
4. User clicks on the page → Content Script → Service Worker:
   PREPARE_CAPTURE { x: %, y: % }
5. Service Worker:
   a. chrome.tabs.captureVisibleTab() → PNG
   b. WebP compression (OffscreenCanvas, quality 0.75)
   c. Upload to Supabase Storage → screenshot_path
   d. Stores { comment_id, pin_x, pin_y, url, screenshot_path } in chrome.storage.local
   e. Returns { ok: true }
6. Content Script shows the composer overlay (Shadow DOM, anchored to click point)
7. User fills in recipients + message → clicks Send
8. Content Script → Service Worker: FINALIZE_COMMENT { body, to }
9. Service Worker reads chrome.storage.local → calls send-comment Edge Function
10. Edge Function:
    a. Generates signed screenshot URL (7 days)
    b. INSERT comments
    c. Resolves recipients (user / group / unregistered email)
    d. INSERT comment_recipients
    e. Calls notify-email
11. Content Script shows toast "✓ Comment sent", closes the overlay
```

### Receiving a comment

```
Option A — real-time (extension open):
  Realtime subscription → badge updated → chrome.notifications

Option B — user opens the extension later:
  Popup mount → GET comment_inbox WHERE for_user_id = me → shows inbox

Option C — user clicks "Open page" from the inbox:
  New tab → page URL → Content Script loads the comment
  → if page OK: overlay with pin
  → if page KO: replacement screen with the screenshot
```

## Web App (`webapp/`)

Web interface complementing the extension. Same Supabase backend, deployed on Vercel at `webcomment.app`.

### Role

The extension remains the only tool for **creating** anchored comments (screenshot, pin picker). The web app covers what the popup can't do well:

| Extension (popup 360×560) | Web App |
|---|---|
| Create a comment | Full-screen inbox with search & filters |
| See latest received | Contact management |
| Toggle pins on active page | Profile settings (username, initials, baseline) |
| — | Portal for recipients without the extension |

### Routes

```
/                     → landing + install extension button + live demo
/dashboard            → redirects to /dashboard/inbox
/dashboard/inbox      → received comments, full view, mark read/resolved
/dashboard/my-comments → sent comments
/dashboard/contacts   → contacts list, pending requests, accept/decline
/dashboard/settings   → profile (username, initials, baseline), email change, delete account
/s/:token             → share link resolution (redirects to target page)
```

Routes `groups`, `feed`, `whats-new` are listed in the sidebar as "coming soon".

### Stack

- **Vite + React 18 + Tailwind CSS** — deployed on Vercel (auto-deploy from `main`)
- **lucide-react** for icons (not @iconify — different from the extension)
- Root directory in Vercel: `webapp/`
- Shared Supabase auth — SSO with the extension via hash token (`/dashboard#access_token=...`)

### Dashboard layout

Sidebar navigation (256 px) + main area with top header bar (search + user menu).

```
┌─────────────────┬───────────────────────────────────────┐
│ WEBCOMMENT      │  [Search + filters]        [UserMenu] │  ← header 56px
├─────────────────┼───────────────────────────────────────┤
│ Inbox           │                                       │
│ My Comments     │   <Outlet /> — active route content   │
│ Contacts        │                                       │
│ ─────────────── │                                       │
│ Groups (soon)   │                                       │
│ Feed (soon)     │                                       │
│ ─────────────── │                                       │
│ What's new (s.) │                                       │
│ Settings        │                                       │
└─────────────────┴───────────────────────────────────────┘
```

An amber banner prompts users to install the extension if `useExtensionInstalled()` returns `false` (dismissible, persisted in `localStorage`).

### Inter-component dependencies

- No new backend required: all tables and Edge Functions are shared with the extension
- The `/s/:token` link is handled by `resolve-share-link`
- Screenshots remain in the private bucket; `get-signed-url` is used for expired URLs

## Security

- All data is read/written via the Supabase JS client with the user's JWT
- Supabase RLS policies ensure a user only sees comments addressed to them or that they sent
- Captures are stored in a private bucket, accessible only via signed URL generated by the backend (7-day lifetime)
- No data transits outside Supabase (no custom proxy)

## MV3 constraints

The extension uses Manifest V3, which means:
- The service worker is ephemeral: it can be terminated by Chrome at any time. The session and pending captures are persisted in `chrome.storage.local`
- No `XMLHttpRequest` in the service worker: only `fetch`
- `chrome.tabs.captureVisibleTab` requires the `activeTab` or `<all_urls>` permission
- The content script must be manually re-injected on already-open pages (`scripting` permission + `chrome.scripting.executeScript`)
