-- WebComment — Group management: RLS policies, RPCs, Realtime

-- ============================================================
-- Fix groups_delete: any owner can delete (not just the creator)
-- ============================================================
drop policy if exists "groups_delete" on groups;

create policy "groups_delete" on groups
  for delete using (
    exists (
      select 1 from group_members
      where group_id = id
        and user_id  = auth.uid()
        and role     = 'owner'
    )
  );

-- ============================================================
-- groups_update: owners can rename the group
-- ============================================================
create policy "groups_update" on groups
  for update using (
    exists (
      select 1 from group_members
      where group_id = id
        and user_id  = auth.uid()
        and role     = 'owner'
    )
  );

-- ============================================================
-- group_members_update: owners can change member roles
-- ============================================================
create policy "group_members_update" on group_members
  for update using (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_id
        and gm2.user_id  = auth.uid()
        and gm2.role     = 'owner'
    )
  );

-- ============================================================
-- group_members_delete: owners can remove members; any member can leave
-- ============================================================
create policy "group_members_delete" on group_members
  for delete using (
    user_id = auth.uid() or
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_id
        and gm2.user_id  = auth.uid()
        and gm2.role     = 'owner'
    )
  );

-- ============================================================
-- RPC: create_group
-- Creates the group and inserts the caller as owner atomically.
-- ============================================================
create or replace function create_group(p_name text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  insert into groups (name, created_by)
  values (trim(p_name), auth.uid())
  returning id into v_group_id;

  insert into group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'owner');

  return v_group_id;
end;
$$;

-- ============================================================
-- RPC: get_user_groups
-- Returns groups the caller belongs to with their role and member count.
-- ============================================================
create or replace function get_user_groups()
returns table (
  id           uuid,
  name         text,
  created_by   uuid,
  created_at   timestamptz,
  role         group_role,
  member_count bigint
)
language sql security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.created_by,
    g.created_at,
    gm.role,
    (select count(*) from group_members gm2 where gm2.group_id = g.id) as member_count
  from groups g
  join group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  order by g.name;
$$;

-- ============================================================
-- RPC: get_group_members
-- Returns members of a group (caller must be a member).
-- ============================================================
create or replace function get_group_members(p_group_id uuid)
returns table (
  user_id    uuid,
  username   text,
  email      text,
  avatar_url text,
  initials   text,
  role       group_role,
  joined_at  timestamptz
)
language sql security definer
set search_path = public
as $$
  select
    p.id        as user_id,
    p.username,
    p.email,
    p.avatar_url,
    p.initials,
    gm.role,
    gm.joined_at
  from group_members gm
  join profiles p on p.id = gm.user_id
  where gm.group_id = p_group_id
    and exists (
      select 1 from group_members caller
      where caller.group_id = p_group_id
        and caller.user_id  = auth.uid()
    )
  order by
    case gm.role when 'owner' then 0 else 1 end,
    p.username;
$$;

-- ============================================================
-- RPC: invite_group_member
-- Owner invites a user into the group.
-- ============================================================
create or replace function invite_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'owner'
  ) then
    raise exception 'Only owners can invite members';
  end if;

  insert into group_members (group_id, user_id, role)
  values (p_group_id, p_user_id, 'member')
  on conflict do nothing;
end;
$$;

-- ============================================================
-- RPC: update_member_role
-- Owner changes a member's role. Prevents demoting the last owner.
-- ============================================================
create or replace function update_member_role(p_group_id uuid, p_user_id uuid, p_role group_role)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from group_members
    where group_id = p_group_id
      and user_id  = auth.uid()
      and role     = 'owner'
  ) then
    raise exception 'Only owners can change roles';
  end if;

  if p_role = 'member' then
    if (
      select count(*) from group_members
      where group_id = p_group_id and role = 'owner'
    ) <= 1 then
      raise exception 'Cannot demote the last owner';
    end if;
  end if;

  update group_members
  set role = p_role
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

-- ============================================================
-- RPC: remove_group_member
-- Owner removes a member, or a member leaves. Prevents removing the last owner.
-- ============================================================
create or replace function remove_group_member(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_target_role group_role;
begin
  if p_user_id <> auth.uid() then
    if not exists (
      select 1 from group_members
      where group_id = p_group_id
        and user_id  = auth.uid()
        and role     = 'owner'
    ) then
      raise exception 'Only owners can remove other members';
    end if;
  end if;

  select role into v_target_role
  from group_members
  where group_id = p_group_id and user_id = p_user_id;

  if v_target_role = 'owner' then
    if (
      select count(*) from group_members
      where group_id = p_group_id and role = 'owner'
    ) <= 1 then
      raise exception 'Cannot remove the last owner. Transfer ownership first.';
    end if;
  end if;

  delete from group_members
  where group_id = p_group_id and user_id = p_user_id;
end;
$$;

-- ============================================================
-- RPC: get_group_feed
-- Comments explicitly sent to a group (caller must be a member).
-- ============================================================
create or replace function get_group_feed(p_group_id uuid)
returns table (
  comment_id      uuid,
  from_user_id    uuid,
  from_username   text,
  from_avatar_url text,
  from_initials   text,
  url             text,
  screenshot_url  text,
  pin_x           float4,
  pin_y           float4,
  body            text,
  mentions        jsonb,
  tags            text[],
  created_at      timestamptz
)
language sql security definer
set search_path = public
as $$
  select
    c.id            as comment_id,
    c.from_user_id,
    p.username      as from_username,
    p.avatar_url    as from_avatar_url,
    p.initials      as from_initials,
    c.url,
    c.screenshot_url,
    c.pin_x,
    c.pin_y,
    c.body,
    c.mentions,
    c.tags,
    c.created_at
  from comment_recipients cr
  join comments c on c.id  = cr.comment_id
  join profiles p on p.id  = c.from_user_id
  where cr.recipient_type = 'group'
    and cr.recipient_id   = p_group_id
    and exists (
      select 1 from group_members
      where group_id = p_group_id
        and user_id  = auth.uid()
    )
  order by c.created_at desc;
$$;

-- ============================================================
-- Realtime: expose group_members so clients react to membership changes
-- ============================================================
alter publication supabase_realtime add table group_members;
