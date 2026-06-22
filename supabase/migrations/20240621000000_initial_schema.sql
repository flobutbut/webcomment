-- WebComment — schéma initial

-- ============================================================
-- Profiles (extension de auth.users)
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique not null,
  email       text not null,
  avatar_url  text,
  created_at  timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles_select" on profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update" on profiles
  for update using (auth.uid() = id);

-- Trigger : création automatique du profil à l'inscription
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

-- ============================================================
-- Groups
-- ============================================================
create table groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

alter table groups enable row level security;

create policy "groups_select" on groups
  for select using (
    exists (
      select 1 from group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

create policy "groups_insert" on groups
  for insert with check (auth.uid() = created_by);

create policy "groups_delete" on groups
  for delete using (auth.uid() = created_by);

-- ============================================================
-- Group members
-- ============================================================
create type group_role as enum ('owner', 'member');

create table group_members (
  group_id   uuid not null references groups(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  role       group_role not null default 'member',
  joined_at  timestamptz default now(),
  primary key (group_id, user_id)
);

alter table group_members enable row level security;

create policy "group_members_select" on group_members
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_id
        and gm2.user_id  = auth.uid()
        and gm2.role     = 'owner'
    )
  );

create policy "group_members_insert" on group_members
  for insert with check (
    exists (
      select 1 from group_members gm
      where gm.group_id = group_id
        and gm.user_id  = auth.uid()
        and gm.role     = 'owner'
    )
  );

-- ============================================================
-- Comments
-- ============================================================
create table comments (
  id              uuid primary key default gen_random_uuid(),
  from_user_id    uuid not null references profiles(id) on delete cascade,
  url             text not null,
  screenshot_url  text not null,
  screenshot_path text not null,
  pin_x           float4 not null check (pin_x between 0 and 100),
  pin_y           float4 not null check (pin_y between 0 and 100),
  body            text not null,
  created_at      timestamptz default now()
);

create index comments_url_idx on comments (url);

alter table comments enable row level security;

-- ============================================================
-- Comment recipients
-- ============================================================
create type recipient_type as enum ('user', 'group');

create table comment_recipients (
  id              uuid primary key default gen_random_uuid(),
  comment_id      uuid not null references comments(id) on delete cascade,
  recipient_type  recipient_type not null,
  recipient_id    uuid not null,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

create index cr_recipient_idx on comment_recipients (recipient_type, recipient_id);
create index cr_comment_idx   on comment_recipients (comment_id);

alter table comment_recipients enable row level security;

-- ============================================================
-- Vue inbox (résout les groupes en membres)
-- ============================================================
create view comment_inbox as
select
  cr.id               as recipient_id,
  c.id                as comment_id,
  c.from_user_id,
  p.username          as from_username,
  p.email             as from_email,
  c.url,
  c.screenshot_url,
  c.pin_x,
  c.pin_y,
  c.body,
  c.created_at,
  cr.read_at,
  case
    when cr.recipient_type = 'user'  then cr.recipient_id
    when cr.recipient_type = 'group' then gm.user_id
  end as for_user_id
from comment_recipients cr
join comments c    on c.id  = cr.comment_id
join profiles p    on p.id  = c.from_user_id
left join group_members gm
  on cr.recipient_type = 'group' and gm.group_id = cr.recipient_id;

-- ============================================================
-- RLS sur comments et comment_recipients
-- ============================================================
create policy "comments_select" on comments
  for select using (
    from_user_id = auth.uid() or
    exists (
      select 1 from comment_inbox ci
      where ci.comment_id = id and ci.for_user_id = auth.uid()
    )
  );

create policy "comments_insert" on comments
  for insert with check (auth.uid() = from_user_id);

create policy "cr_select" on comment_recipients
  for select using (
    exists (
      select 1 from comments c
      where c.id = comment_id and c.from_user_id = auth.uid()
    ) or
    (recipient_type = 'user' and recipient_id = auth.uid()) or
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

create policy "cr_update_read" on comment_recipients
  for update using (
    (recipient_type = 'user' and recipient_id = auth.uid()) or
    (recipient_type = 'group' and exists (
      select 1 from group_members gm
      where gm.group_id = recipient_id and gm.user_id = auth.uid()
    ))
  );

-- ============================================================
-- Storage
-- ============================================================
insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', false);

create policy "screenshots_insert" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table comment_recipients;
