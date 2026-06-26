# Changelog

All notable changes to WebComment are documented here.
Format: `## [version] — YYYY-MM-DD`, most recent first.

## Rules — to follow absolutely on every write

1. **One version at a time.** There must never be more than one unpublished version block. All in-progress changes accumulate under a single `## [Unreleased]` section until the version is published.
2. **No pre-numbered unreleased versions.** Never write `## [0.9.0]` with a future date while work is still ongoing. Use `## [Unreleased]` until the moment of publication.
3. **Publication = version number + date.** Only when actually releasing (zip exported or version bumped in `manifest.json` and pushed), replace `[Unreleased]` with `## [x.y.z] — YYYY-MM-DD`.
4. **Accumulate, don't split.** If multiple features land before a release, they all go under the same `## [Unreleased]` block — never open a second one.

---

## [1.0.0] — 2026-06-26

### Early access — Webapp + Extension + Backend

- **Backend**: migration `invite_requests` — table storing early access requests (full_name, email, status, secure token)
- **Backend**: new Edge Function `request-invite` (public) — validates and persists invite requests, notifies admin at f.butour@gmail.com via Resend with a one-click approve button
- **Backend**: new Edge Function `approve-invite` — token-secured, calls Supabase Auth Admin `inviteUserByEmail`, marks request as approved (idempotent), returns branded HTML confirmation page
- **Webapp**: `AuthModal` signup tab replaced with "Early access" — collects full name + email, posts to `request-invite`, shows "request received" confirmation
- **Webapp**: new `/welcome` route (`WelcomePage`) — intercepts Supabase invite link hash tokens, lets invited users choose username, initials, and set their password; updates both `auth.users` metadata and `profiles` table, then redirects to dashboard
- **Extension**: `Login` view signup form removed; sign-in only, with a "Request early access at webcomment.app →" link below the form

### Groups — Extension + Webapp

- **Backend**: migration `groups_management` — RLS policies (update/delete groups + members), 6 RPCs (`create_group`, `get_user_groups`, `get_group_members`, `invite_group_member`, `update_member_role`, `remove_group_member`, `get_group_feed`), Realtime on `group_members`
- **Extension**: new Groups view (icon in header) — create group, list groups, group detail with Feed and Members tabs; inline rename, invite member by username/email search, promote/demote owner, remove member, leave/delete group
- **Extension**: `@mention` autocomplete now includes the user's groups (shown with group icon + "group" badge); `@GroupName` in body is resolved at send time — the comment reaches all group members' inboxes and appears in the shared group Feed
- **Extension**: new message handlers: `SEARCH_RECIPIENTS`, `GET_USER_GROUPS`, `CREATE_GROUP`, `GET_GROUP_MEMBERS`, `GET_GROUP_FEED`, `INVITE_MEMBER`, `UPDATE_MEMBER_ROLE`, `REMOVE_MEMBER`, `RENAME_GROUP`, `DELETE_GROUP`
- **Webapp**: `/dashboard/groups` page — two-column layout (group list left, group detail right), group cards show name + people count, detail with Feed / People tabs, dark mode support; Groups nav item no longer marked "coming soon"
- **Webapp**: group Feed tab uses the full `CommentDetail` card (screenshot, pin, avatar, formatted date, body with tag/mention highlights, "Open" button) — consistent with the Feed page

## [0.9.0] — 2026-06-26

### Dark mode — Webapp dashboard

The webapp dashboard now supports full dark mode with three modes: **Light**, **Dark**, and **System** (follows OS preference).

- **Theme toggle** — A sun/moon icon button in the dashboard header (top-right, next to the user menu) switches instantly between light and dark. Clicking always lands on an explicit Light or Dark preference, never on System.
- **Appearance setting** — Settings page gains an Appearance section with a Light / Dark / System pill selector for users who prefer the full control.
- **Zero flash on load** — An inline script in `index.html` reads the saved preference and applies the `.dark` class before the first paint, preventing any white flash.
- **Persistent** — Chosen theme is saved to `localStorage` and restored on every page load.
- **Full coverage** — Sidebar, header, all dashboard pages (Inbox, My Comments, Feed, Contacts, Search, Settings), modals, and every shared component (Button, Input, IconButton, PageHeader, EmptyState) are fully themed. Custom dark background and border tokens (`dark-800` → `dark-900`, `dark-border-*`) keep contrast ratios consistent across surfaces.

### Design system — Components & spacing

- **`IconButton` component** — New reusable icon-only button (`default` / `danger` variant) introduced in both the extension and the webapp; replaces all hand-rolled `<button className="p-1 …">` patterns across Inbox, Sent, Feed, Settings, SearchBar, FollowedUrlsPage, MyCommentsPage, and the install banner.
- **`Button` system (Extension)** — `size` prop added (`sm` / `md`); new `success` variant (green border) replaces the "Mark as resolved" workaround; `secondary` variant replaces remaining raw Cancel buttons.
- **Border radius token scale** — A 3 px grid (`3 / 6 / 9 / 12 / 15 / 18 / 24 / 32 px + full`) is now defined in `@theme` for both the extension and the webapp; every `rounded-lg`, `rounded-xl`, `rounded-2xl` occurrence replaced with the matching named token (`rounded-6`, `rounded-9`, `rounded-12`, …) for visual consistency.

---

## [0.8.0] — 2026-06-25

### Feed — Follow URLs
- Extension / Webapp — New **Feed** feature: users can follow any URL and see its public comments in a dedicated feed, separate from the inbox
- Extension — New "Feed" tab (3rd tab, alongside Inbox / My comments); top bar shows the current page hostname with a **Follow / Unfollow** toggle; feed lists the 50 most recent public comments across all followed URLs, newest first; each item opens a detail view with screenshot and pin
- Webapp — New **Feed** page in the dashboard sidebar (was placeholder "Coming Soon"); two-column layout: left column lists followed URLs with favicon, hostname, full URL, and a hover-to-reveal unfollow button; right column shows public comments for the selected URL with author avatar, body, tags, and screenshot thumbnail
- Backend — New `url_follows` table (user_id, url) with RLS (users manage only their own rows); new `get_public_comments_for_url(url)` RPC (single-page detail); new `get_feed_comments(user_id)` RPC (cross-URL feed, limit 50)

### Inbox — Filter tabs
- Extension / Webapp — Inbox now has **All / Mentions / Followed** filter tabs; Mentions shows only comments where the user is explicitly @-mentioned; Followed shows `recipient_type=follow` entries; empty state message adapts to the active tab

### Tech — Audit & refactoring
- Extension — Types: added `baseline` to `Profile`, `tags: string[] | null` to `CommentInboxItem` and `SentComment` to match the webapp (fields were present in DB but missing from extension types, causing silent data loss)
- Extension — `Sent.tsx`: query now selects `tags` to match the updated `SentComment` type
- Extension — `utils.ts`: `AVATAR_COLORS` unexported (internal constant, no external consumers)
- Extension — `content.ts`: `escapeHtml` now also escapes single quotes (`'` → `&#39;`) for defense in depth
- Extension — `Settings.tsx`: removed unnecessary `ContactProfile` type cast; unused import cleaned up
- Webapp — `Avatar`: added `onError` fallback — broken image URLs now fall back to initials instead of showing a broken img icon (matched extension behavior)
- Webapp — `App.tsx`: added catch-all `<Route path="*">` redirecting to `/` — unknown paths no longer render a blank page
- Webapp — `AuthModal`: added `rate limit` error translation (was handled in extension but missing in webapp)
- Webapp — `DashboardLayout`: `toggleFilter` wrapped in `useCallback` to prevent unnecessary `SearchBar` re-renders
- Webapp — `SearchResultsPage`: removed redundant `ContactProfile` cast; added `mentions` to the sent comments query (was missing, causing type mismatch)
- Webapp — `ContactsPage`: removed redundant `ContactProfile` casts; data fetching extracted to `useContacts` hook
- Webapp — `PageComments`: replaced `void delete_token` TS suppression hack with `_` prefix destructuring
- Webapp — New hooks: `useInboxComments`, `useSentComments`, `useContacts` — Supabase queries extracted out of UI components; `InboxPage` and `MyCommentsPage` updated to use them
- Webapp — `utils.ts`: new `matchesSearch(q, active, fields)` utility centralising the search/filter logic used across Inbox, MyComments, and Search pages

---

## [0.7.0] — 2026-06-25

### Social — Follow
- Backend — New `follows` table (asymmetric, no acceptance required); RLS: any authenticated user can read, only follower can insert/delete
- Backend — `send-comment`: when a public comment is posted, creates a `recipient_type='follow'` row in `comment_recipients` for each follower — the comment lands directly in their inbox
- Backend — New `comment_inbox` view: adds `follow` case to `for_user_id` CASE expression; also adds `anchor_path` column (previously missing) and `mentions` column
- Extension — Profile overlay: new "Follow" button (visible when `VITE_PUBLIC_MODE_ENABLED=true`, hidden on own profile and when already a contact); status-aware (`following` / `none`); sends `ADD_FOLLOW` to service worker
- Extension — Service worker: new `ADD_FOLLOW` and `REMOVE_FOLLOW` handlers; `GET_USER_PROFILE` now also returns `followStatus`; Realtime subscription extended to `recipient_type=eq.follow` events (badge + system notification)
- Extension — Popup Inbox: Realtime channel extended to also listen for `recipient_type=eq.follow` inserts
- Webapp — Inbox Realtime channel extended to also listen for `recipient_type=eq.follow` inserts
- Extension — Content script overlays (pin detail, profile): all UI strings translated to English

### Fix — @mentions stored as UUIDs
- Backend — `send-comment`: replaces `@username` with `@[uuid]` in comment body before storage; caches resolved `[{id, username}]` in new `comments.mentions` jsonb column — mentions now survive username renames
- Extension — New shared `resolveBody(body, mentions)` utility in `shared/utils.ts`
- Extension — New shared `BodyText` component in `popup/components/BodyText.tsx` — resolves `@[uuid]` and highlights `#tags` and `@mentions`; replaces the local `BodyWithTags` in `Inbox.tsx`; also used in `Sent.tsx`
- Extension — Content script `renderTaggedBody`: resolves `@[uuid]` using the mentions map; now also highlights `@mentions` in purple (consistent with `#tags` in blue)
- Webapp — New shared `BodyText` component in `components/BodyText.tsx`; new `resolveBody` util in `lib/utils.ts`; `CommentDetail`, `InboxPage`, and `MyCommentsPage` updated to resolve and highlight mentions

### Extension
- Footer: add "Open web app" link below the New Comment button; if the user is logged in, opens the webapp dashboard already authenticated via Supabase session token handoff
- Fix: `VITE_SHARE_BASE_URL=""` (empty string) now correctly falls back to `https://webcomment.app` — previously `??` did not catch empty strings, causing tokens to be sent to an empty URL

### Webapp — Settings page rework
- Avatar tile: replaces the static avatar block + separate initials field with an inline editable circle (dashed when empty, blue-tinted when filled, pencil badge on hover) — identical interaction to the signup form
- Avatar tile preview: shows the baseline instead of the email address, updated live as the user types
- Add editable username field (validation: 3–30 chars, `[a-zA-Z0-9_-]`) — handles uniqueness conflict error
- Save / Discard: Save disabled when form is unchanged; Discard resets all fields to stored values and only appears when there are unsaved changes
- Email change flow: "Edit" link on the Email row reveals an input for the new address + "Send confirmation" button; uses `supabase.auth.updateUser` to trigger a confirmation email — change only takes effect after the user clicks the link; success shows a confirmation banner

### Webapp — Fixes
- Fix: `DashboardLayout` now handles hash-token SSO correctly — defers the redirect-to-home until Supabase's async hash exchange completes, so "Open web app" from the extension actually authenticates the session
- Fix: profile is refreshed in context immediately after a successful Settings save — `savedUsername`, the Account section, `isDirty`, and the UserMenu now reflect the new values without a page reload
- Fix: delete-account modal can no longer be opened before the profile is loaded; `handleDeleteAccount` also guards against a null profile, preventing the `'…'` bypass
- Fix: username uniqueness error now detected via Postgres error code `23505` instead of a broad `"Database error"` string match that was mis-classifying all DB errors as "username already taken"

---

## [0.6.0] — 2026-06-25

### Webapp — Design System
- Add shared `Button` component (8 variants, 4 sizes) — standardizes all action buttons across the dashboard
- Add shared `Input` component (light theme) with unified focus ring — replaces inline classes in dashboard forms
- Add `@theme` block in `index.css` with named CSS custom properties for all dark theme tokens
- Raise dashboard dividers and borders from `gray-100` to `gray-200` for better visibility
- `CommentDetail`, `ContactsPage`, `AuthModal`: migrate to shared components and design tokens

### Webapp — Profiles
- Add `baseline` field on contact cards and search results, replacing the email address
- Settings page: profile form to edit baseline and avatar initials

### Webapp — Account
- Settings: "Delete account" button in a Danger zone section — opens a confirmation modal requiring the user to type their username; explains that sent comments are kept as "Deleted user"
- On confirm: calls the `delete-account` edge function, signs out, redirects to home

### Backend
- Add `delete-account` edge function — deletes the auth user via service role; cascades to `profiles`, `contacts`, `share_links`; `comments.from_user_id` set to null (ON DELETE SET NULL, already in place)
- Add `baseline text` column to `profiles` table

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
