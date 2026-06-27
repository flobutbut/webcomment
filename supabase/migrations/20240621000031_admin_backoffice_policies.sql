-- Enable RLS on invite_requests (was missing)
alter table invite_requests enable row level security;

-- Admin can read all invite requests
create policy "admin_invite_requests_select" on invite_requests
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );

-- Admin can delete any comment (moderation)
create policy "admin_comments_delete" on comments
  for delete using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );
