-- Admin read-only backoffice access
-- Grants SELECT on all relevant tables to the admin account only

create policy "admin_comments_select" on comments
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );

create policy "admin_groups_select" on groups
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );

create policy "admin_group_members_select" on group_members
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );

create policy "admin_comment_recipients_select" on comment_recipients
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );

create policy "admin_contacts_select" on contacts
  for select using (
    (auth.jwt() ->> 'email') = 'f.butour@gmail.com'
  );
