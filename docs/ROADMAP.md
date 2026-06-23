# Roadmap

## Phase 1 — MVP ✅ (weeks 1-4)

Goal: send and receive a comment end-to-end, with link sharing.

### Supabase
- [x] Create the Supabase project (`yhavbvgahhtlddyrycai`)
- [x] Apply migrations (profiles, groups, group_members, comments, comment_recipients, share_links)
- [x] Configure the `screenshots` bucket (private)
- [x] Enable Realtime on `comment_recipients`
- [x] Deploy `send-comment`, `notify-email`, `create-share-link`, `resolve-share-link` Edge Functions

### Extension — Auth
- [x] Set up Vite + CRXJS + React + Tailwind project
- [x] Login / signup view in the popup (email + username + password)
- [x] Avatar preview tile in the signup form (editable initials)
- [x] Session persistence in `chrome.storage.local`
- [x] Session sharing between popup and service worker via `chrome.storage.local`
- [x] Automatic token refresh in the service worker
- [x] Email confirmation disabled (Supabase Dashboard → Auth → Providers → Email) — see note below

> **Auth note**: email confirmation is disabled for the MVP. A Chrome extension cannot serve as a redirect page for Supabase's confirmation link. Re-enable when the Web App is deployed — see Phase 4 below.

### Extension — Sending
- [x] Content script: pin picker (crosshair cursor, click → % coordinates)
- [x] Two-step capture: `PREPARE_CAPTURE` before the overlay, `FINALIZE_COMMENT` on send
- [x] Service worker: capture via `captureVisibleTab`, WebP compression via OffscreenCanvas
- [x] Service worker: Storage upload + call to `send-comment`
- [x] In-page composer (Shadow DOM, Figma style — anchored to click point, no dark backdrop)
- [x] @username mentions inline in the message body (dropdown with keyboard navigation, resolved on send)
- [x] Public mode: toggle switch in the footer — the comment is visible to all extension users on the same URL
- [x] No recipient = personal note (sends to self, does not appear in the inbox)
- [x] Explicit blocking on unsupported pages (chrome://, about:, edge://…)
- [ ] Send to unregistered recipients by raw email (removed with the switch to @mentions — to reconsider)

### Extension — Share link
- [x] Popup: "Share this page" button in the header → generates + copies the link
- [x] Service worker: `webNavigation` listener on `webcomment.app/s/*`
- [x] Service worker: token resolution → context storage + redirect
- [x] Content script: detection of active share context on the page
- [x] In-page composer: automatic pre-filling of recipient from share context

### Extension — Receiving
- [x] Popup: Inbox view (list of received comments, excluding personal and public comments)
- [x] Popup: "My comments" view (list of sent comments, individual deletion)
- [x] Badge showing number of unread comments (updated on popup open + via Realtime)
- [x] Realtime: badge updated in real-time
- [x] `chrome.notifications` for new receptions
- [x] Mark as read on detail open (optimistic update + DB persistence)
- [x] Mark as resolved (filters item from inbox + refreshes pins)
- [x] Realtime refresh of the inbox list (subscription `comment_recipients` in the popup)
- [x] Content script: display of pin overlay on the live page (including public comments)
- [x] On/off toggle in the popup to show/hide pins on the active page
- [x] Pins anchored to the clicked DOM element (CSS selector + % offset) — survive scroll and resize
- [x] Automatic pin repositioning on browser resize (80 ms debounce)
- [x] Delete a comment (Storage + DB) from the list or detail, with pin refresh

### Extension — Error
- [x] Content script: replacement screen with screenshot and message for inaccessible pages

### Extension — MV3 robustness
- [x] `scripting` permission + automatic re-injection of content script on already-open pages
- [x] `window.__webcomment_injected` guard to prevent double injections
- [x] Auto-display of pins on page load (service worker `tabs.onUpdated`) — no need to open the popup
- [x] Automatic pin refresh after sending a comment if the toggle is active
- [x] Pins isolated via `data-webcomment-pin` attribute (no collision with host page CSS classes)

### Extension — UI & Design system
- [x] "New comment" button in a fixed footer at the bottom of the popup
- [x] `Button` component with 4 variants (primary, secondary, danger, danger-filled)
- [x] `Avatar` component — photo or deterministic colored initials (fallback)
- [x] `Loading` component — spinner for async states
- [x] `Tabs` component — reusable tab bar (used in Settings)
- [x] Replacement of all unicode characters with Iconify icons (Lucide, offline)
- [x] Extension icon: emoji 💬
- [x] Page pins: user avatar (photo or deterministic colored initials)

### Backend — Security & Quality
- [x] `notify-email`: service role authentication (external direct calls blocked)
- [x] `notify-email`: HTML escaping of all user fields in emails (XSS fixed)
- [x] DB schema: `anchor_selector`, `anchor_x`, `anchor_y` columns on `comments`
- [x] DB schema: `recipient_email` column + `email` value in enum on `comment_recipients`
- [x] DB schema: `profiles.initials` column (≤ 2 chars) — stored at signup, surfaced as `from_initials` in `comment_inbox`
- [x] DB security fix: `handle_new_user` trigger uses explicit `search_path = public` (SECURITY DEFINER safe)
- [x] `comment_inbox` view: includes anchor fields (functional DOM anchoring from inbox)
- [x] `comment_inbox` view: exposes `from_avatar_url` and `from_initials` for avatar display on pins

### Backend — Edge Functions deployed
- [x] `send-comment` — main comment creation + storage upload
- [x] `notify-email` — email notification (Resend, service role only)
- [x] `create-share-link` — generates a share token for a page
- [x] `resolve-share-link` — resolves a token to its target context
- [x] `cleanup-screenshots` — purges orphan Storage files from `screenshot_cleanup_queue`
- [x] `get-signed-url` — returns a fresh signed URL for a screenshot (auth required, owner or recipient only)
- [x] `get-comment-page` — serves a comment as readable text (or JSON for the future webapp page); used by comment links (`/c/[id]`)

---

## Phase 2 — Social & Groups (weeks 5-8)

### Connections

WebComment's social graph is **page-centric**: content lives on URLs, not profiles. Relationships serve to facilitate private sending (contacts) and discovery of public comments (follows).

#### UI — Profile view (⚙ icon in header)

The current Settings view becomes a **Profile** view with two tabs:

- **Profile** — avatar, username, email, sign out (current Settings content)
- **Contacts** — list of accepted contacts + pending received requests

#### Share button — 3 actions

The current "Share" button (link copy) becomes a menu with three distinct actions:

- **Share this page** — generates a link + token for the current page; option to add email addresses → they receive the link by mail ("X invites you to comment on this page")
- **Share the app** — copies or sends a WebComment install link (no token, no target page)
- **Add a contact** — searches by email or username; if account exists: sends a contact request; if no account: sends an invitation to install the app

#### Contacts (private, mutual relationship)

- [x] `contacts` table: `requester_id`, `addressee_id`, `status: pending | accepted | declined`
- [x] Popup — Contacts tab in the Profile view: accepted contacts + received requests (pending in / pending out / accepted)
- [x] Popup — "Add a contact" action: search by username or email; handles already-sent / already-contact / no-account cases
- [ ] Realtime notification + email when a contact request is received
- [ ] Accepted contacts surfaced first in the @mention dropdown of the composer
- [ ] `send-invite` Edge Function — app invitation email (distinct from `notify-email`)

#### Public mode & Follow (environment variable)

Public mode allows displaying comments visible to all extension users on the same URL. The follow system is an extension of this mode.

- [x] `VITE_PUBLIC_MODE_ENABLED` environment variable (`true` / `false`) — hides from the UI: the public toggle in the composer, the public feed, and follow
- [ ] `follows` table: `follower_id → followed_id` (asymmetric, no acceptance)
- [ ] Popup — "Follow" button on a user's profile (public mode enabled only)
- [ ] Content script — public comments from followed users highlighted visually on visited pages

> **Open decision**: what exactly does "following" someone trigger? (A) their public pins appear on all visited pages, (B) notification when they comment on a previously visited page, (C) both. To decide before implementation.

### Groups

- [ ] `notify-email`: configure `RESEND_API_KEY` secret in Supabase → unblock email sending
- [ ] Group management in the popup (create, invite, list)
- [ ] Send to a group from the in-page composer (group search not yet implemented in content script)
- [ ] Realtime inbox: notifications for messages received via group (current filter only covers direct recipients)
- [ ] Share links with `domain` scope (entire site)

---

## Phase 3 — Quality & Polish (weeks 7-8)

- [x] **Comment link** — "Copy link" button in the detail (inbox and sent); the extension intercepts the URL and opens the page + targeted pin automatically; for users without the extension, the URL shows the comment content as readable text + install link (Supabase forces `text/plain` + restrictive CSP on its entire domain — HTML page rendering planned in Phase 4 via `webcomment.app/c/[id]`)
- [x] **Pre-reply robustness** — `comments.from_user_id` nullable + `ON DELETE SET NULL` (deleted account → comments kept, displayed as "Deleted user"); `screenshot_cleanup_queue` table + trigger + `cleanup-screenshots` Edge Function (called at service worker startup to purge orphan Storage files)
- [x] **Tags** — `comments.tags` column (text array); `comment_inbox` view exposes `tags`; Inbox UI highlights `#hashtags` in blue (`BodyWithTags` component)
- [ ] **Replies (threads)** — reply to a comment from the pin detail overlay
  - DB prep done (nullable `from_user_id`, cleanup queue) — migration `_before_replies` applied
  - Still needed: `comment_replies` table (`id`, `comment_id` FK, `from_user_id` FK SET NULL, `body`, `created_at`)
  - RLS: select if recipient of parent comment or author; insert if authenticated
  - UI: replies section under the message in the overlay panel and popup detail
  - Realtime: subscription on `comment_replies` for comments visible on the page
- [ ] Multi-pin overlay on the same page (list of comments on the current page)
- [ ] **Spatio-temporal pins on video** — if the DOM target is a native `<video>` element, capture `currentTime` as a `timecode` field alongside the XY ratio; on playback, the pin fades in ~5 s before its timecode, animates at the exact moment, and fades out ~5 s after (via `timeupdate` listener); pin changes color when the user scrubs manually to that timecode; option to pause on the timecode available in pin detail. Cross-origin iframes (YouTube, Vimeo embed) not supported in first iteration.
- [ ] Improve CSS selector robustness on SPAs (React, Vue) — dynamic classes
- [ ] Inbox filters: unread, by URL
- [ ] Expired signed URL regeneration (`get-signed-url`)
- [ ] Network error handling (upload retry, offline queue)
- [ ] Error interception tests on common patterns (Google, GitHub, Notion)
- [ ] Optional share link expiration
- [ ] Remove debug logs from the `notify-email` function (`toEmails`, `errors`, `hasApiKey` fields)
- [ ] `MARK_READ` by group: currently one `comment_recipients` row per group → plan one row per member for individual marking
- [ ] Settings: profile editing (username, avatar) — profile display already done, editing not yet implemented

---

## Phase 4 — Distribution & Web App (week 9+)

### Extension
- [x] Iconify icons (Lucide) + extension emoji icon ✅
- [ ] Chrome Web Store description
- [ ] Privacy policy
- [ ] Chrome Web Store submission

### Web App (`webapp/` — Vite + React, deployed on Vercel)
- [x] Initialize Vite + React + Tailwind project
- [x] `/` — landing page with install button, use cases, Supabase auth (login + signup)
- [x] Interactive `PageComments` demo on the landing page — live pins, composer, Realtime insert/delete, delete-by-token, 5 min rate limit (`demo_comments` table, Realtime enabled)
- [x] Deploy on Vercel (GitHub integration, auto-deploy on push to `main`)
- [ ] Custom domain (configure DNS at Hostinger → Vercel)
- [ ] `/login` — dedicated auth page (email/password, same account as the extension)
- [ ] `/dashboard` — inbox and "my comments" with filters (site, date, unread)
- [ ] `/shared/:token` — screenshot read view for recipients without the extension (replaces the current error screen)
- [ ] `/s/:token` — share link resolution → redirect to target page
- [ ] `/groups` — create a group, invite by email, manage members
- [ ] `/settings` — profile, avatar, sign out
- [ ] **Re-enable email confirmation** once the Web App is deployed:
  1. Supabase Dashboard → Auth → Providers → Email → enable "Confirm email"
  2. Supabase Dashboard → Auth → URL Configuration → Site URL = `https://webcomment.app`
  3. Add `https://webcomment.app/**` in Redirect URLs
  4. Create the `/auth/confirm` route that handles the Supabase callback (`?token_hash=...&type=signup`) and shows "Account confirmed, open the extension"
  5. Configure Resend as SMTP (Dashboard → Auth → SMTP Settings) so emails arrive in the main inbox

---

## Phase 5 — Workspaces (post-distribution)

See [WORKSPACE.md](WORKSPACE.md) for details.

- [ ] `workspaces` + `workspace_members` + `workspace_domains` tables
- [ ] Composer: "Post in a workspace" selector
- [ ] Content script: loading workspace comments for the current URL
- [ ] Popup: workspace management in settings
- [ ] Billing model (Free / Team / Business)

---

## Open decisions

| Topic | Question | Decision |
|---|---|---|
| Text annotations | Allow selecting text as an anchor? | To decide |
| Replies | Comment threads? | No for MVP |
| Mobile | Firefox / Safari mobile extension? | Post-MVP |
| Encryption | E2E encryption of messages? | Post-MVP |
| Capture expiration | Do screenshots expire? (storage cost) | 90 days by default |
| Follow — behavior | What does "following" someone trigger? Pins everywhere, notification on visited pages, or both? | To decide before implementation |
| Contacts — friction | Does contact require mutual acceptance, or is having exchanged a comment enough? | Mutual for now |
