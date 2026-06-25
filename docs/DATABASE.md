# Database (Supabase / PostgreSQL)

## Schema

### `profiles`

Extension of `auth.users`. Created automatically on signup via trigger.

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  email       text not null,
  avatar_url  text,
  initials    text check (char_length(initials) <= 2),  -- up to 2 chars, user-editable
  baseline    text,                                      -- short bio / tagline (max 80 chars)
  created_at  timestamptz default now()
);
```

### `groups`

Recipient groups (e.g. "design team", "project X clients").

```sql
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now()
);
```

### `group_members`

Members of a group.

```sql
create type group_role as enum ('owner', 'member');

create table group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       group_role not null default 'member',
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);
```

### `comments`

Comment anchored on a web page.

```sql
create table comments (
  id               uuid primary key default gen_random_uuid(),
  from_user_id     uuid references profiles(id) on delete set null,  -- nullable: deleted users become "Deleted user"
  url              text not null,
  screenshot_url   text not null,        -- signed Supabase Storage URL
  screenshot_path  text not null,        -- raw path in the bucket
  pin_x            float4 not null,      -- horizontal % on the screenshot (0-100)
  pin_y            float4 not null,      -- vertical % on the screenshot (0-100)
  anchor_selector  text,                 -- CSS selector of the anchor element
  anchor_x         float4,              -- horizontal % relative to the anchor element
  anchor_y         float4,              -- vertical % relative to the anchor element
  anchor_path      text,                -- rich DOM path JSON (replaces CSS selector approach)
  body             text not null,
  tags             text[] not null default '{}',  -- auto-extracted #hashtags from body
  created_at       timestamptz default now()
);

-- Index to retrieve comments for a URL quickly
create index comments_url_idx on comments (url);
```

Tags are extracted server-side by `send-comment` via regex `/#([A-Za-z0-9_]+)/g` — the client never sets them directly.

### `comment_recipients`

Who a comment is addressed to. A comment can have multiple recipients (individual users, groups, or unregistered email addresses).

```sql
create type comment_recipient_type as enum ('user', 'group', 'email', 'public');

create table comment_recipients (
  id               uuid primary key default gen_random_uuid(),
  comment_id       uuid not null references comments(id) on delete cascade,
  recipient_type   comment_recipient_type not null,
  recipient_id     uuid,            -- user_id or group_id (null if recipient_type = 'email')
  recipient_email  text,            -- raw email address (only if recipient_type = 'email')
  read_at          timestamptz,     -- null = unread
  resolved_at      timestamptz,     -- null = unresolved; filled by recipient to archive
  created_at       timestamptz default now()
);

create index cr_recipient_idx on comment_recipients (recipient_type, recipient_id);
create index cr_comment_idx   on comment_recipients (comment_id);
```

**Rules**:
- `recipient_type = 'user'`   → `recipient_id` = profile UUID, `recipient_email` = null
- `recipient_type = 'group'`  → `recipient_id` = group UUID, `recipient_email` = null
- `recipient_type = 'email'`  → `recipient_id` = null, `recipient_email` = raw address
- `recipient_type = 'public'` → `recipient_id` = null, `recipient_email` = null; visible to all authenticated users

When `send-comment` receives a recipient `{ type: 'email', email }`, it first checks whether the email matches an existing profile: if so, it inserts as `user`; otherwise, it inserts as `email` so that `notify-email` can send a direct email.

`@username` mentions in the comment body are auto-resolved to `user` recipients by `send-comment` (regex `/@([A-Za-z0-9_]+)/g`).

## Denormalized view

View used by the extension inbox and webapp: resolves group recipients into individual members. Handles deleted users (COALESCE) and public comments (`auth.uid()`).

```sql
create view comment_inbox as
select
  cr.id                                              as recipient_id,
  c.id                                               as comment_id,
  c.from_user_id,
  coalesce(p.username, 'Deleted user')               as from_username,
  coalesce(p.email, '')                              as from_email,
  p.avatar_url                                       as from_avatar_url,
  p.initials                                         as from_initials,
  c.url,
  c.screenshot_url,
  c.pin_x,
  c.pin_y,
  c.anchor_selector,
  c.anchor_x,
  c.anchor_y,
  c.anchor_path,
  c.body,
  c.tags,
  c.created_at,
  cr.read_at,
  case
    when cr.recipient_type = 'user'   then cr.recipient_id
    when cr.recipient_type = 'group'  then gm.user_id
    when cr.recipient_type = 'public' then auth.uid()
    else null
  end                                                as for_user_id,
  cr.resolved_at,
  cr.recipient_type
from comment_recipients cr
join  comments      c  on c.id  = cr.comment_id
left join profiles  p  on p.id  = c.from_user_id
left join group_members gm
  on cr.recipient_type = 'group' and gm.group_id = cr.recipient_id;
```

## Row Level Security (RLS)

All tables have RLS enabled. A user only sees what belongs to them.

```sql
-- ========================
-- profiles
-- ========================
alter table profiles enable row level security;

-- read: visible to all authenticated users (for recipient search)
create policy "profiles_select" on profiles
  for select using (auth.role() = 'authenticated');

-- write: only own profile
create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- ========================
-- groups
-- ========================
alter table groups enable row level security;

-- read: group members only
create policy "groups_select" on groups
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

-- create: any authenticated user can create a group
create policy "groups_insert" on groups
  for insert with check (auth.uid() = created_by);

-- delete: owner only
create policy "groups_delete" on groups
  for delete using (auth.uid() = created_by);

-- ========================
-- group_members
-- ========================
alter table group_members enable row level security;

create policy "group_members_select" on group_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'owner'
    )
  );

create policy "group_members_insert" on group_members
  for insert with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_id
        and gm.user_id = auth.uid()
        and gm.role = 'owner'
    )
  );

-- ========================
-- comments
-- ========================
alter table comments enable row level security;

-- read: sender or recipient
create policy "comments_select" on comments
  for select using (
    from_user_id = auth.uid() or
    exists (
      select 1 from comment_inbox ci
      where ci.comment_id = id and ci.for_user_id = auth.uid()
    )
  );

-- create: only as yourself
create policy "comments_insert" on comments
  for insert with check (auth.uid() = from_user_id);

-- ========================
-- comment_recipients
-- ========================
alter table comment_recipients enable row level security;

create policy "cr_select" on comment_recipients
  for select using (
    -- sender of the parent comment
    exists (
      select 1 from comments c
      where c.id = comment_id and c.from_user_id = auth.uid()
    ) or
    -- direct recipient
    (recipient_type = 'user' and recipient_id = auth.uid()) or
    -- member of the recipient group
    (recipient_type = 'group' and exists (
      select 1 from group_members gm
      where gm.group_id = recipient_id and gm.user_id = auth.uid()
    ))
  );

create policy "cr_insert" on comment_recipients
  for insert with check (
    exists (
      select 1 from comments c
      where c.id = comment_id and c.from_user_id = auth.uid()
    )
  );

-- mark as read / resolved: recipient only
create policy "cr_update_read" on comment_recipients
  for update using (
    (recipient_type = 'user' and recipient_id = auth.uid()) or
    (recipient_type = 'group' and exists (
      select 1 from group_members gm
      where gm.group_id = recipient_id and gm.user_id = auth.uid()
    ))
  );
```

## Storage

Bucket `screenshots` — private.

```sql
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false);

-- upload: any authenticated user can upload to their own folder
create policy "screenshots_insert" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- read: via signed URL generated server-side only
-- (no public select policy)
```

Captures are organized as: `screenshots/{user_id}/{comment_id}.webp`

Signed URLs have a 7-day lifetime, regenerated on demand.

## Trigger: automatic profile creation

```sql
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, username, email)
  values (
    new.id,
    split_part(new.email, '@', 1),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### `share_links`

Pre-configured share links. When a user shares a `/s/{token}` link, any comment sent via that link is automatically addressed to its creator, without the sender needing an account.

```sql
create table share_links (
  id          uuid primary key default gen_random_uuid(),
  token       text unique not null default encode(gen_random_bytes(8), 'hex'),
  created_by  uuid not null references profiles(id) on delete cascade,
  url         text,             -- exact target URL (null if scope = 'domain')
  domain      text not null,    -- domain extracted from the URL
  scope       text not null default 'page' check (scope in ('page', 'domain')),
  expires_at  timestamptz,      -- null = permanent
  created_at  timestamptz default now()
);

create index share_links_token_idx on share_links (token);
```

**Scope**:
- `page` — the link is valid only for the exact URL provided
- `domain` — the link is valid for the entire domain (`url` is null)

**RLS**: read and delete reserved to the creator (`auth.uid() = created_by`). Token resolution by `resolve-share-link` uses service role (not subject to RLS).

```sql
alter table share_links enable row level security;

create policy "share_links_select" on share_links
  for select using (auth.uid() = created_by);

create policy "share_links_insert" on share_links
  for insert with check (auth.uid() = created_by);

create policy "share_links_delete" on share_links
  for delete using (auth.uid() = created_by);
```

**Migration**: `supabase/migrations/20240621000001_share_links.sql`

---

### `contacts`

Contact relationship between two users. Directional request (requester → addressee), pair-unique constraint prevents duplicates in both directions.

```sql
create table contacts (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles(id) on delete cascade,
  addressee_id  uuid not null references profiles(id) on delete cascade,
  status        text not null default 'pending',
  created_at    timestamptz default now(),

  constraint contacts_no_self    check (requester_id != addressee_id),
  constraint contacts_status_chk check (status = any(array['pending','accepted','declined']))
);

-- Pair-unique: A→B and B→A cannot coexist
create unique index contacts_unique_pair_idx
  on contacts (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
```

RLS: read = both parties; insert = requester_id only; update = addressee_id (to accept/decline); delete = either party.

Also subscribed to Supabase Realtime for live contact request notifications.

**Migration**: `supabase/migrations/20240621000015_contacts.sql`

---

### `screenshot_cleanup_queue`

Deferred cleanup queue for Storage objects. When a comment is deleted, a trigger adds the `screenshot_path` to this table. `cleanup-screenshots` Edge Function drains it on demand.

```sql
create table screenshot_cleanup_queue (
  id         uuid primary key default gen_random_uuid(),
  path       text not null,
  created_at timestamptz default now()
);

-- Trigger: on comment delete, enqueue the screenshot path
create trigger on_comment_deleted
  before delete on comments
  for each row execute function queue_screenshot_cleanup();
```

No public RLS policy — only accessible via service role (Edge Function).

**Migration**: `supabase/migrations/20240621000010_before_replies.sql`

---

## Realtime

Live notifications use Supabase Realtime on the `comment_recipients` table.

```sql
-- Enable replication for Realtime
alter publication supabase_realtime add table comment_recipients;
```

The extension subscribes to two channels:

```js
// Incoming comments
supabase
  .channel('inbox')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'comment_recipients',
    filter: `recipient_type=eq.user,recipient_id=eq.${userId}`
  }, handleNewComment)
  .subscribe()

// Contact requests
supabase
  .channel('contacts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'contacts',
    filter: `addressee_id=eq.${userId}`
  }, handleNewContactRequest)
  .subscribe()
```
