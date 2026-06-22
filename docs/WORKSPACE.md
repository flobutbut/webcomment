# Workspaces (post-MVP feature)

> Not implemented in the MVP. Documented to guide future architecture decisions.

## Concept

A **workspace** is a shared space that associates a team with one or more web domains. All members automatically see comments left on URLs covered by the workspace, without needing to address them individually.

## Difference from the current model

| Directed model (MVP) | Workspace |
|---|---|
| Alice sends explicitly to Bob | Alice posts in "Acme Project" |
| Bob receives in their inbox | All members see it on the page |
| Private between participants | Shared with the whole team |
| Useful for one-to-one feedback | Useful for team collaboration |

Both models coexist. A comment can be either directed or posted in a workspace.

## Schema

```sql
create table workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_by  uuid not null references profiles(id) on delete cascade,
  plan        text not null default 'team',   -- 'team' | 'business'
  created_at  timestamptz default now()
);

create table workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  role         text not null default 'member', -- 'owner' | 'admin' | 'member'
  joined_at    timestamptz default now(),
  primary key (workspace_id, user_id)
);

-- Domains covered by the workspace
-- Supports wildcards: "*.acme.com", "acme.com"
create table workspace_domains (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  domain       text not null,
  created_at   timestamptz default now()
);

-- On the comments table (future addition)
-- alter table comments add column workspace_id uuid references workspaces(id);
```

## Workspace RLS

A comment with `workspace_id` set is visible to all workspace members:

```sql
-- Add to the existing "comments_select" policy:
or (
  workspace_id is not null and
  exists (
    select 1 from workspace_members wm
    where wm.workspace_id = comments.workspace_id
      and wm.user_id = auth.uid()
  )
)
```

## Extension impact

- The Composer adds a "Post in [workspace]" selector as an alternative to recipients
- The content script loads workspace comments for the current URL (in addition to directed comments)
- The popup shows available workspaces in settings

## SaaS model

| Tier | Features |
|---|---|
| **Free** | Unlimited directed comments, share links |
| **Team** | Shared workspaces, up to 10 members, unlimited domains |
| **Business** | Multiple workspaces, domain-based invitations, SSO, audit log |
