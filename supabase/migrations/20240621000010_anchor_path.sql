-- Add anchor_path column (rich DOM path JSON, replaces CSS selector approach)
ALTER TABLE comments ADD COLUMN anchor_path text;

-- Recreate comment_inbox view with anchor_path
DROP VIEW IF EXISTS comment_inbox;

CREATE VIEW comment_inbox AS
SELECT
  cr.id               AS recipient_id,
  c.id                AS comment_id,
  c.from_user_id,
  p.username          AS from_username,
  p.email             AS from_email,
  p.avatar_url        AS from_avatar_url,
  p.initials          AS from_initials,
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
    ELSE NULL::uuid
  END                 AS for_user_id,
  cr.resolved_at,
  cr.recipient_type
FROM comment_recipients cr
JOIN comments         c  ON c.id  = cr.comment_id
JOIN profiles         p  ON p.id  = c.from_user_id
LEFT JOIN group_members gm
  ON cr.recipient_type = 'group'::comment_recipient_type AND gm.group_id = cr.recipient_id;
