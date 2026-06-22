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
│             Web App  (webcomment.app)  [Phase 4]        │
│                           │                             │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js / React — same Supabase JS client       │  │
│  │                                                  │  │
│  │  / (landing + install)                           │  │
│  │  /dashboard  → inbox, captures, filters          │  │
│  │  /groups     → create, invite, manage            │  │
│  │  /settings   → profile, workspaces               │  │
│  │  /s/:token   → share link resolution             │  │
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
│  │              Edge Functions                      │   │
│  │  send-comment | notify-email                    │   │
│  │  create-share-link | resolve-share-link         │   │
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

Main React interface, 360×480 px.

```
┌──────────────────────────────┐
│  WebComment    [↗ Share]   ⚙ │  ← header
├──────────────────────────────┤
│  [  Inbox  ] [My comments ]  │  ← tabs
├──────────────────────────────┤
│                              │
│   Active view                │
│   (Inbox or My comments)     │
│                              │
├──────────────────────────────┤
│  [+ New comment]             │  ← fixed footer
└──────────────────────────────┘
```

- **Inbox**: list of received comments, sorted by date, with thumbnail and read/unread indicator.
- **My comments**: list of sent comments, with thumbnail, hostname, message preview.
- **Settings** (⚙ icon): replaces the tab content. Shows profile and sign-out button.
- **New comment**: button in footer. Closes the popup, puts the content script into pin picker mode. If the content script is absent (page opened before the extension), automatic re-injection via `chrome.scripting.executeScript`.

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

## Web App (`webapp/`) — Phase 4

Web interface complementing the extension. Same Supabase backend, zero infrastructure duplication.

### Role

The extension remains the only tool for **creating** anchored comments (screenshot, pin picker). The web app covers what the popup can't do well:

| Extension (popup 360×480) | Web App |
|---|---|
| Create a comment | View and filter all captures |
| See latest received | Manage groups and invitations |
| Toggle pins on active page | Portal for recipients without the extension |
| — | Profile, workspaces, advanced settings |

### Planned routes

```
/                → landing + install extension button
/login           → auth (shared with the extension via Supabase session)
/dashboard       → inbox + "my comments" with filters (site, date, unread)
/groups          → create a group, invite, manage members
/settings        → profile, avatar, workspaces (Phase 5)
/s/:token        → share link resolution (redirects to target page)
/shared/:token   → screenshot view for recipients without the extension
```

### Planned stack

- **Next.js** (App Router) + React + Tailwind — same design system as the extension
- Deployed on Vercel at `webcomment.app`
- Shared Supabase auth — one account, accessible from both the extension and the web

### Inter-component dependencies

- No backend changes required: all existing tables and Edge Functions are sufficient
- The `/s/:token` link is already handled by `resolve-share-link` — the web app just needs to redirect
- Screenshots remain in the private Supabase bucket; the web app uses `get-signed-url` like the extension

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
