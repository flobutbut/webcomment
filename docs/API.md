# API & Edge Functions

## Philosophy

The extension communicates directly with Supabase via the JS client (`@supabase/supabase-js`). RLS policies handle access rights. Edge Functions are only used for operations that cannot be done client-side:

- Sending emails (requires a Resend API key, not exposable)
- Resolving groups into members on send
- Generating signed URLs for captures

## Supabase Client

```ts
// shared/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

The client automatically uses the authenticated user's token for all requests.

## Direct operations (without Edge Function)

### Auth

```ts
// Sign up
await supabase.auth.signUp({ email, password })

// Sign in
await supabase.auth.signInWithPassword({ email, password })

// Sign out
await supabase.auth.signOut()

// Current session
const { data: { session } } = await supabase.auth.getSession()
```

### Inbox

```ts
// Retrieve comments addressed to the current user
const { data } = await supabase
  .from('comment_inbox')
  .select('*')
  .eq('for_user_id', userId)
  .order('created_at', { ascending: false })

// Filter unread
  .is('read_at', null)
```

### Mark as read

```ts
await supabase
  .from('comment_recipients')
  .update({ read_at: new Date().toISOString() })
  .eq('id', recipientRowId)
```

### Recipient search

```ts
// Search by username or email (for the "To" field)
const { data: users } = await supabase
  .from('profiles')
  .select('id, username, email, avatar_url')
  .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
  .limit(5)

// Group search
const { data: groups } = await supabase
  .from('groups')
  .select('id, name')
  .ilike('name', `%${query}%`)
  .limit(5)
```

### Group management

```ts
// Create a group
await supabase
  .from('groups')
  .insert({ name: 'Design team', created_by: userId })

// Add a member
await supabase
  .from('group_members')
  .insert({ group_id, user_id, role: 'member' })

// List own groups
await supabase
  .from('groups')
  .select(`*, group_members!inner(user_id)`)
  .eq('group_members.user_id', userId)
```

## Edge Functions

### `send-comment`

Called by the service worker after the capture upload. Handles atomic insertion of the comment + resolution of group recipients.

**Endpoint**: `POST /functions/v1/send-comment`

**Headers**: `Authorization: Bearer <user_jwt>`

**Body**

```json
{
  "comment_id":      "uuid",
  "url":             "https://example.com/dashboard",
  "screenshot_path": "uuid-user/uuid-comment.webp",
  "pin_x":           42.5,
  "pin_y":           67.1,
  "anchor_path":     "...",        // optional: rich DOM path JSON
  "anchor_selector": "div > p",   // optional: CSS selector
  "anchor_x":        12.3,        // optional: % relative to anchor element
  "anchor_y":        45.6,        // optional: % relative to anchor element
  "body":            "What do you think of this #pricing?",
  "to": [
    { "type": "user",   "id": "uuid-bob" },
    { "type": "group",  "id": "uuid-design-team" },
    { "type": "email",  "email": "alice@example.com" },
    { "type": "public" }
  ]
}
```

`comment_id` is generated client-side (service worker) to allow the screenshot upload before calling this function.

`tags` are auto-extracted from `#hashtags` in `body`. `@username` mentions in `body` are also auto-resolved to user recipients.

**Processing**

```
1. Verify JWT → retrieve from_user_id
2. Generate a signed URL for the screenshot (7 days)
3. Extract #tags and @mentions from body
4. INSERT into comments (with tags, anchor fields)
5. For each recipient in "to":
   - "user"   → INSERT comment_recipients (recipient_type=user, recipient_id=id)
   - "group"  → INSERT group row + resolve members → INSERT user rows
   - "email"  → look up profile by email:
                · found → INSERT as "user"
                · not found → INSERT (recipient_type=email, recipient_email=address)
   - "public" → INSERT (recipient_type=public)
6. Resolve @mentions → INSERT as "user" if not already in recipients list
7. Call notify-email
8. Return { comment_id }
```

**Response**

```json
{ "comment_id": "uuid" }
```

---

### `notify-email`

Sends a notification email via Resend. Called by `send-comment` (service-to-service, `verify_jwt: false`).

**Required environment variables**

```
RESEND_API_KEY=re_...          ← configure in Supabase Settings → Edge Functions → Secrets
```

**Body**

```json
{ "comment_id": "uuid" }
```

**Processing**

```
1. Retrieve the comment + sender's username
2. Retrieve the comment_recipients for the comment
3. For "user" recipients (excluding sender) → resolve email from profiles
4. For "email" recipients → use recipient_email directly
5. Send via Resend (from: noreply@webcomment.app)
```

**Email template**

```
Subject: <username> left you a comment

Hello,
<username> left a comment for you on <hostname>.

"<comment body>"

Install the WebComment extension to see the screenshot and reply.
```

> **Note**: until `RESEND_API_KEY` is configured, the function returns `{ sent: 0 }` without a fatal error — comments are still saved to the database.

---

### `get-signed-url`

Regenerates a signed URL for an existing capture (useful if the 7-day URL has expired).

**Endpoint**: `GET /functions/v1/get-signed-url?path=screenshots/...`

**Verification**: the user must be a recipient or sender of the comment associated with this path.

**Response**

```json
{ "url": "https://xxxx.supabase.co/storage/v1/object/sign/..." }
```

### `delete-account`

Permanently deletes the authenticated user's account via the Supabase Admin API. Comments sent by the user are kept in the database (attributed to "Deleted user" via `ON DELETE SET NULL` on `comments.from_user_id`).

**Endpoint**: `POST /functions/v1/delete-account`

**Headers**: `Authorization: Bearer <user_jwt>`

**Body**: none

**Processing**

```
1. Verify JWT
2. supabase.auth.admin.deleteUser(user.id)
   → cascades: profiles, contacts, share_links, comment_recipients
   → comments.from_user_id SET NULL
3. Return { ok: true }
```

**Response**

```json
{ "ok": true }
```

After success, the client calls `supabase.auth.signOut()` and redirects to `/`.

---

### `cleanup-screenshots`

Drains the `screenshot_cleanup_queue` table and deletes corresponding Storage objects. Called on demand (not on a cron schedule).

**Endpoint**: `POST /functions/v1/cleanup-screenshots`

**Headers**: `Authorization: Bearer <user_jwt>` (any authenticated user can trigger it)

**Processing**

```
1. SELECT up to 100 rows from screenshot_cleanup_queue ORDER BY created_at ASC
2. supabase.storage.from('screenshots').remove(paths) — non-fatal if file already gone
3. DELETE from screenshot_cleanup_queue WHERE id IN (...)
4. Return { deleted: N }
```

**Response**

```json
{ "deleted": 3 }
```

---

### `get-comment-page`

Returns comment metadata for a given `comment_id`. Used by the webapp and shared links to render a standalone comment view. Accessible without auth (uses service role).

**Endpoint**: `GET /functions/v1/get-comment-page?id=<uuid>&format=json`

**Parameters**:
- `id` — comment UUID (required)
- `format=json` — returns JSON; omit for a plain-text fallback (browsers without the extension)

**Response (JSON)**

```json
{
  "username":       "alice",
  "body":           "What do you think of this section?",
  "date":           "15 juin 2024",
  "screenshot_url": "https://xxxx.supabase.co/storage/v1/object/sign/...",
  "pin_x":          42.5,
  "pin_y":          67.1,
  "url":            "https://example.com/dashboard"
}
```

Signed URL expires in 1 hour.

---

## Realtime (Supabase)

No Edge Function. The extension subscribes directly.

```ts
// service-worker.ts

function subscribeToInbox(userId: string) {
  supabase
    .channel(`inbox:${userId}`)
    .on(
      'postgres_changes',
      {
        event:  'INSERT',
        schema: 'public',
        table:  'comment_recipients',
        // filter limited to direct rows (user) — group rows are resolved in the view
        filter: `recipient_type=eq.user,recipient_id=eq.${userId}`
      },
      async (payload) => {
        // Increment badge
        const count = await getUnreadCount()
        chrome.action.setBadgeText({ text: String(count) })
        chrome.action.setBadgeBackgroundColor({ color: '#6366f1' })

        // System notification if extension is closed
        chrome.notifications.create({
          type:    'basic',
          iconUrl: 'icons/48.png',
          title:   'New comment',
          message: 'Someone commented a page for you'
        })
      }
    )
    .subscribe()
}
```

## Capture upload

Handled directly from the service worker with the Supabase client, without an Edge Function.

```ts
async function captureAndUpload(tabId: number, commentId: string): Promise<string> {
  // 1. Capture the visible tab
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' })

  // 2. Convert to WebP via OffscreenCanvas
  const response  = await fetch(dataUrl)
  const blob      = await response.blob()
  const bitmap    = await createImageBitmap(blob)
  const canvas    = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx       = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const webpBlob  = await canvas.convertToBlob({ type: 'image/webp', quality: 0.75 })

  // 3. Upload to Supabase Storage
  const path = `${userId}/${commentId}.webp`
  const { error } = await supabase.storage
    .from('screenshots')
    .upload(path, webpBlob, { contentType: 'image/webp' })

  if (error) throw error
  return path
}
```
