-- WebComment — follows table + 'follow' recipient type

-- 1. Add 'follow' value to recipient type enum
ALTER TYPE comment_recipient_type ADD VALUE IF NOT EXISTS 'follow';

-- 2. Follows table (asymmetric, no acceptance)
CREATE TABLE follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  followed_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT no_self_follow CHECK (follower_id != followed_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can see who follows whom (enables follow status checks)
CREATE POLICY "follows_select" ON follows
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "follows_insert" ON follows
  FOR INSERT WITH CHECK (follower_id = auth.uid());

CREATE POLICY "follows_delete" ON follows
  FOR DELETE USING (follower_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE follows;

-- 3. RLS for follow-type comment_recipients rows
--    Followers can read and update (mark read / resolve) their inbox entries
CREATE POLICY "cr_select_follow" ON comment_recipients
  FOR SELECT USING (
    recipient_type = 'follow'::comment_recipient_type
    AND recipient_id = auth.uid()
  );

CREATE POLICY "cr_update_read_follow" ON comment_recipients
  FOR UPDATE USING (
    recipient_type = 'follow'::comment_recipient_type
    AND recipient_id = auth.uid()
  );

-- 4. Rebuild comment_inbox view: add 'follow' case + restore anchor_path
DROP VIEW IF EXISTS comment_inbox;

CREATE VIEW comment_inbox AS
SELECT
  cr.id                                              AS recipient_id,
  c.id                                               AS comment_id,
  c.from_user_id,
  COALESCE(p.username,  'Deleted user')              AS from_username,
  COALESCE(p.email,     '')                          AS from_email,
  p.avatar_url                                       AS from_avatar_url,
  p.initials                                         AS from_initials,
  c.url,
  c.screenshot_url,
  c.pin_x,
  c.pin_y,
  c.anchor_selector,
  c.anchor_path,
  c.anchor_x,
  c.anchor_y,
  c.body,
  c.tags,
  c.created_at,
  cr.read_at,
  CASE
    WHEN cr.recipient_type = 'user'::comment_recipient_type   THEN cr.recipient_id
    WHEN cr.recipient_type = 'group'::comment_recipient_type  THEN gm.user_id
    WHEN cr.recipient_type = 'public'::comment_recipient_type THEN auth.uid()
    WHEN cr.recipient_type = 'follow'::comment_recipient_type THEN cr.recipient_id
    ELSE NULL::uuid
  END                                                AS for_user_id,
  cr.resolved_at,
  cr.recipient_type
FROM comment_recipients cr
JOIN  comments      c  ON c.id  = cr.comment_id
LEFT JOIN profiles  p  ON p.id  = c.from_user_id
LEFT JOIN group_members gm
  ON cr.recipient_type = 'group'::comment_recipient_type
  AND gm.group_id = cr.recipient_id;
