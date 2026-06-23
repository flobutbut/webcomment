# Chrome Extension

## Stack

- **Manifest V3**
- **React 18** + **Vite** + **CRXJS** (Vite plugin for Chrome extensions)
- **Tailwind CSS**
- **Supabase JS** (`@supabase/supabase-js`)

## File structure

```
extension/
├── manifest.json
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── background/
│   │   └── service-worker.ts       # main logic, API calls
│   ├── content/
│   │   ├── content.ts              # entry point injected into pages
│   │   ├── PinPicker.tsx           # custom cursor to choose the anchor
│   │   ├── PinOverlay.tsx          # display of received pins
│   │   └── ErrorInterceptor.tsx    # replacement for error pages
│   ├── popup/
│   │   ├── index.html
│   │   ├── main.tsx
│   │   └── App.tsx
│   │   └── views/
│   │       ├── Inbox.tsx
│   │       ├── Composer.tsx
│   │       └── Settings.tsx
│   └── shared/
│       ├── supabase.ts             # singleton Supabase client
│       ├── types.ts                # shared TypeScript types
│       └── messages.ts             # chrome.runtime message types
└── public/
    └── icons/
        ├── 16.png
        ├── 48.png
        └── 128.png
```

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "WebComment",
  "version": "0.1.0",
  "description": "Private anchored comments on any web page.",

  "permissions": [
    "activeTab",
    "storage",
    "tabs",
    "notifications"
  ],

  "host_permissions": [
    "<all_urls>"
  ],

  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content.ts"],
      "run_at": "document_idle"
    }
  ],

  "action": {
    "default_popup": "src/popup/index.html",
    "default_icon": {
      "16": "icons/16.png",
      "48": "icons/48.png",
      "128": "icons/128.png"
    }
  },

  "icons": {
    "16": "icons/16.png",
    "48": "icons/48.png",
    "128": "icons/128.png"
  }
}
```

## Service Worker

### Responsibilities

```
service-worker.ts
│
├── Auth
│   ├── Listens for LOGIN / LOGOUT messages from the popup
│   ├── Stores the session token in chrome.storage.local
│   └── Automatic token refresh (handled by Supabase)
│
├── Capture
│   ├── Receives CAPTURE_AND_SEND from the popup
│   ├── chrome.tabs.captureVisibleTab() → PNG base64
│   ├── Converts to WebP via OffscreenCanvas (~60% compression)
│   ├── Uploads to Supabase Storage
│   └── INSERT into database
│
├── Realtime
│   ├── Subscribes to comment_recipients on login
│   ├── Updates badge chrome.action.setBadgeText()
│   └── Sends a chrome.notifications if extension is closed
│
└── Messages to content scripts
    ├── ACTIVATE_PIN_PICKER → triggers the anchor selector
    ├── SHOW_PINS { comments } → shows the overlays
    └── ACTIVATE_ERROR_SCREEN { comment } → replaces the error page
```

### chrome.runtime messages

```ts
// shared/messages.ts

type Message =
  | { type: 'ACTIVATE_PIN_PICKER' }
  | { type: 'PREPARE_CAPTURE';       payload: PinPosition }
  | { type: 'FINALIZE_COMMENT';      payload: FinalizePayload }
  | { type: 'SEARCH_USERS';          payload: { query: string } }
  | { type: 'SHOW_PINS';             payload: { comments: CommentInboxItem[]; targetCommentId?: string } }
  | { type: 'MARK_READ';             payload: { recipientId: string } }
  | { type: 'RESOLVE_COMMENT';       payload: { recipientId: string } }    // "Dismiss" in the UI
  | { type: 'DELETE_COMMENT';        payload: { commentId: string } }
  | { type: 'GET_SESSION' }
  | { type: 'ACTIVATE_ERROR_SCREEN'; payload: CommentInboxItem }
  | { type: 'SHARE_CONTEXT_ACTIVE';  payload: ShareContext }
  | { type: 'CONTENT_READY' }
  | { type: 'REFRESH_PINS';          payload: { visible: boolean } }
  | { type: 'UPDATE_BADGE' }
  | { type: 'GET_USER_PROFILE';      payload: { userId: string } }         // profile overlay data
  | { type: 'ADD_CONTACT';           payload: { addresseeId: string } }    // send contact request
  | { type: 'NAVIGATE_TO_COMMENT';   payload: { commentId: string; url: string } } // open in new tab

type RecipientEntry =
  | { type: 'user'; id: string }
  | { type: 'public' }

interface FinalizePayload {
  body: string
  to:   RecipientEntry[]
}
```

## Content Script

### Pin Picker

Activated by the `ACTIVATE_PIN_PICKER` message from the popup.

```ts
// Behavior
// 1. Changes the page cursor to crosshair
// 2. Adds a click listener on document
// 3. On click: computes x/y as % of the visible page
// 4. Sends PIN_SELECTED to the service worker
// 5. Deactivates itself

function activatePinPicker() {
  document.body.style.cursor = 'crosshair'
  document.addEventListener('click', onPick, { once: true })
}

function onPick(e: MouseEvent) {
  document.body.style.cursor = ''
  const x = (e.clientX / window.innerWidth) * 100
  const y = (e.clientY / window.innerHeight) * 100
  chrome.runtime.sendMessage({ type: 'PIN_SELECTED', payload: { x, y } })
}
```

### Pin Overlay

Injected into the page via Shadow DOM to avoid CSS conflicts.

```
Each pin = a circle positioned absolutely on the page
On hover : lightweight tooltip (name + start of message)
On click  : detail panel (see below)
```

Position recalculated when the window is resized.

**Detail panel** — Shadow DOM, positioned to the right of the pin (or left if space is lacking), 296 px wide, anchored to the pin while scrolling. Closes on outside click, ✕ button, or Esc.

Actions shown based on permissions:

| Button | Condition | Action |
|--------|-----------|--------|
| **Dismiss** | `recipient_id` present AND `resolved_at` is null | Sets `resolved_at`, removes pin from page, updates badge |
| **Profil** | `from_user_id` non-null | Opens the profile overlay (see below) |
| **Delete** | `from_user_id === currentUserId` (own comment) | Two-step confirmation — deletes from Storage + DB, refreshes pins |

Clicking the username in the header also opens the profile overlay (subtle cursor pointer + blue hover).

**Profile overlay** — second overlay panel (same anchor, same size) opened from the detail panel.

```
┌─────────────────────────┐
│ ← Profil              ✕ │
├─────────────────────────┤
│         ◉               │
│      @username          │
├─────────────────────────┤
│ COMMENTAIRES PUBLICS    │
│ ┌─────────────────────┐ │
│ │ github.com       ↗  │ │  ← click → new tab + auto-opens pin
│ │ "Body preview…"     │ │
│ ├─────────────────────┤ │
│ │ example.com      ↗  │ │
│ │ "Another comment…"  │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ [+ Ajouter aux contacts]│
│  Ouvrez l'extension…    │
└─────────────────────────┘
```

- **Back (←)**: closes the profile and re-opens the detail panel at the same position (position captured synchronously before any async call to prevent reflow shift)
- **Public comments**: up to 5 recent public comments from that user across all pages; clicking one stores `pendingCommentLink` and opens a new tab — `handleContentReady` auto-triggers the pin detail on arrival
- **Add to contacts**: button state reflects current relationship (`none` / `pending` / `accepted` / own profile); `ADD_CONTACT` message → `contacts` insert with `status: 'pending'`
- **CTA**: static hint to open the extension for full contact management (popup cannot be opened programmatically in MV3)

### Error interception

The content script analyzes the page after loading:

```ts
function detectInaccessiblePage(): boolean {
  const checks = [
    // HTTP codes (passed via service worker via webNavigation)
    window.__webcomment_status === 403 ||
    window.__webcomment_status === 404 ||

    // Auth redirections
    /\/(login|signin|sign-in|auth|session)/.test(location.pathname) ||

    // Characteristic text
    document.title.includes('403') ||
    document.title.includes('404') ||
    document.title.includes('Access Denied') ||
    document.body.innerText.includes('You don\'t have permission')
  ]
  return checks.some(Boolean)
}
```

If the page is inaccessible and a comment exists for this URL, the content script replaces `document.body` with the service screen.

**Replacement screen (sketch)**

```
┌────────────────────────────────────────────┐
│                                            │
│  [WebComment logo]                         │
│                                            │
│  Alice shared something on this page       │
│  with you.                                 │
│                                            │
│  You don't have access to this page —      │
│  here's what they were seeing:             │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  [screenshot]                        │  │
│  │              ●  ← pin               │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  "Can you take a look at this section?"    │
│                                            │
│  — Alice Martin · 2 hours ago             │
│                                            │
└────────────────────────────────────────────┘
```

## Popup UI

### Inbox

```
┌─────────────────────────────────┐
│ WebComment          [⚙] [2]     │
├─────────────────────────────────┤
│ Inbox    New                    │
├─────────────────────────────────┤
│ ● Alice Martin                  │
│   example.com/dashboard         │
│   "What do you think of this?"  │
│   2h ago                        │
├─────────────────────────────────┤
│   Bob Dupont                    │
│   app.client.com/settings       │
│   "Check this section"          │
│   yesterday                     │
└─────────────────────────────────┘
```

Click on an item → opens the detail view (screenshot + message + "Open page" button + "Mark as resolved" button).

Resolving a comment removes it from the list and hides its pin on the page. The `resolved_at` column is filled in `comment_recipients`; the `comment_inbox` view and pin queries filter `.is('resolved_at', null)`.

### Composer

Displayed after a pin has been selected on the page. Implemented in vanilla TypeScript with Shadow DOM (no React).

```
┌─────────────────────────────────┐
│ WebComment                   ✕  │
├─────────────────────────────────┤
│ ┌─────────────────────────────┐ │
│ │ Your comment…               │ │
│ │ @ to mention                │ │
│ │                             │ │
│ └─────────────────────────────┘ │
│ ┌── @mention dropdown ────────┐ │
│ │ @alice_martin  alice@...    │ │
│ │ @bob_dupont    bob@...      │ │
│ └─────────────────────────────┘ │
│ ○ Public   [Cancel] [Send]      │
└─────────────────────────────────┘
```

**@username mentions** — typing `@` in the textarea triggers a search (200 ms debounce) and shows a dropdown. Selection by click or with `↑`/`↓`/`Enter`. On send, `@username` occurrences in the body are parsed and resolved to IDs via `SEARCH_USERS`.

**Public mode** — switch in the footer (off by default). Adds `{ type: 'public' }` to the recipients. The comment is visible to all extension users on the same URL, but does not appear in the inbox or badge.

**Fallbacks** — no mention AND not public → personal note (sends to self). Active share context → pre-fills `@username` in the text.

## Local installation (development)

```bash
cd extension
npm install
npm run dev        # watch mode build with CRXJS

# In Chrome:
# 1. Go to chrome://extensions
# 2. Enable "Developer mode"
# 3. "Load unpacked" → dist/ folder
```

## Environment variables

```
# extension/.env.local
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

These variables are bundled into the build. The Supabase `anon key` is safe to expose because RLS policies protect the data.
