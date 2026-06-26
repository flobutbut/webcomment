create table invite_requests (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  email      text not null unique,
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  token      uuid not null default gen_random_uuid() unique,
  created_at timestamptz default now()
);
