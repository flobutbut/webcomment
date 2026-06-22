create table if not exists public.demo_comments (
  id uuid primary key default gen_random_uuid(),
  x_pct float not null,
  y_pct float not null,
  message text not null,
  author text,
  created_at timestamptz not null default now(),
  constraint demo_comments_x_check check (x_pct between 0 and 100),
  constraint demo_comments_y_check check (y_pct between 0 and 100),
  constraint demo_comments_message_check check (char_length(message) between 1 and 200),
  constraint demo_comments_author_check check (author is null or char_length(author) <= 30)
);

alter table public.demo_comments enable row level security;

create policy "demo_comments_select" on public.demo_comments
  for select using (true);

create policy "demo_comments_insert" on public.demo_comments
  for insert with check (
    char_length(message) between 1 and 200 and
    (author is null or char_length(author) <= 30)
  );

alter publication supabase_realtime add table public.demo_comments;
