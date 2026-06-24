# Changelog

All notable changes to WebComment are documented here.
Format: `## [version] — YYYY-MM-DD`, most recent first.

---

## [Unreleased]

---

## [0.5.0] — 2026-06-24

### Backend
- Add `contacts` table migration (was missing from repo despite existing on prod DB): RLS, FK constraints with exact PostgREST-hint names, Realtime enabled
- Fix contacts unique constraint: replaced directional `UNIQUE(requester_id, addressee_id)` with pair-based `UNIQUE(least, greatest)` to prevent concurrent duplicate requests
- `send-comment` edge function now parses `@username` tokens in the comment body and inserts a `recipient_type='user'` row for each mentioned user — public comments that @mention someone appear in their inbox (extension + webapp)

### Webapp
- Extension detection: content script sets `data-webcomment-installed` on `<html>`; dashboard shows an amber banner when the extension is absent, with a link to install it and a permanent dismiss (localStorage)

---

## [0.4.0] — 2026-06-24

### Webapp — Dashboard
- Full web dashboard at `/dashboard`: Inbox, My Comments, Contacts, Settings
- Search bar with filter by type (received / sent / public)
- Sidebar navigation with Coming Soon items (Groups, Feed, What's new)
- User menu (avatar, username, sign out)
- Auth guard: redirects to landing page if not signed in

### Webapp — Landing page
- Vercel Analytics added
- Security: HTML injection blocked in the interactive demo (`escapeHtml` on all user input)
- Security: demo comment rate-limit and delete-token enforced server-side via Supabase RPC functions (no longer client-side only)

### Extension — Bug fixes
- Fix: clicking outside a pin was simultaneously closing the overlay and reopening the composer

---

## [0.3.0] — 2026-06-23

### Extension — In-page profile overlay
- New in-page profile overlay accessible from any pin detail: avatar, username, list of public comments by that user
- Clicking a public comment in the overlay navigates to the target page and auto-opens the pin
- "Add to contact" button in the overlay with full status awareness (none / pending sent / pending received / accepted / own profile)
- Back button restores the previous detail panel
- Service worker race condition on cold start fixed (MV3 ephemeral worker)
- Extension context invalidation errors silenced gracefully

### Webapp — Landing page
- GitHub download CTA displayed after successful signup

---

## [0.2.0] — 2026-06-23

### Extension — Contacts
- Contacts tab in the Settings view: accepted contacts, pending sent/received requests
- "Add a contact" action: search by username or email; handles already-sent / already-contact / no-account cases
- RLS policy `cr_select_public`: public comment_recipients readable by any authenticated user

### Extension — Tags
- `comments.tags` column (text array); body text with `#hashtags` highlighted in blue in the Inbox (`BodyWithTags` component)

### Extension — Avatar system
- `Avatar` component: shows photo if available, falls back to deterministic colored initials, then username initial
- Pin avatars updated: avatar photo or colored initials instead of plain circles
- `profiles.initials` column stored at signup, surfaced as `from_initials` in `comment_inbox` view

### Extension — Keyboard shortcuts
- `Shift+Enter` to send a comment
- `Esc` to close the composer or overlay
- `Alt+Shift+N` global command to activate the pin picker on the active tab

### Extension — Auth UI
- Password visibility toggle in login and signup forms
- Minimum password length hint
- Username + avatar preview tile in the signup form (colored initials update live)
- Space automatically converted to underscore in username field

### Webapp — Landing page demo
- Delete own demo comment (delete-by-token system)
- Realtime enabled on `demo_comments` table

---

## [0.1.0] — 2026-06-22

Initial release — full end-to-end MVP.

### Extension
- Auth: login / signup in the popup (email + password + username); session persisted in `chrome.storage.local`; automatic token refresh in the service worker
- Pin picker: crosshair cursor, click on any DOM element → captures `%` coordinates + CSS selector anchor
- Two-step screenshot capture: overlay hidden before capture, restored after; WebP compression via OffscreenCanvas
- In-page composer (Shadow DOM, Figma style): anchored to click point, `@mention` dropdown with keyboard navigation, public mode toggle
- Inbox: received comments list with unread badge, mark as read, dismiss (resolve), delete
- My Comments: sent comments list with individual deletion
- Pin overlay: pins displayed on the live page anchored to the original DOM element, survive scroll/resize, toggle on/off from the popup
- Share link: "Share this page" generates a token; service worker intercepts `webcomment.app/s/*` and redirects with pre-filled recipient context
- Realtime: badge and inbox updated in real time via Supabase Realtime
- `chrome.notifications` for new comment receipts
- Error screen for inaccessible pages (chrome://, about:, etc.)
- MV3 robustness: `scripting` permission, re-injection guard (`__webcomment_injected`), auto-display of pins on page load

### Backend
- Supabase project: `profiles`, `contacts`, `groups`, `group_members`, `comments`, `comment_recipients`, `share_links`, `demo_comments` tables
- `comment_inbox` view with anchor fields, avatar URL, initials
- RLS policies for all tables
- Edge Functions: `send-comment`, `notify-email` (Resend), `create-share-link`, `resolve-share-link`, `cleanup-screenshots`, `get-signed-url`, `get-comment-page`
- `screenshots` private bucket with signed URL access

### Webapp
- Landing page (Vite + React + Tailwind) deployed on Vercel
- Supabase auth modal (login + signup)
- Interactive demo: live pins, composer, Realtime insert/delete, 5-minute rate limit
