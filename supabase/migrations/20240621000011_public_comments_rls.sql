-- Allow any authenticated user to read public comment_recipients
-- (public comments are visible to everyone — that's the contract of recipient_type='public')
CREATE POLICY "cr_select_public" ON comment_recipients
  FOR SELECT USING (recipient_type = 'public'::comment_recipient_type);
