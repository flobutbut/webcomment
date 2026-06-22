-- Ajoute from_avatar_url à la vue comment_inbox
CREATE OR REPLACE VIEW comment_inbox AS
SELECT
  cr.id                AS recipient_id,
  c.id                 AS comment_id,
  c.from_user_id,
  p.username           AS from_username,
  p.email              AS from_email,
  p.avatar_url         AS from_avatar_url,
  c.url,
  c.screenshot_url,
  c.pin_x,
  c.pin_y,
  c.anchor_selector,
  c.anchor_x,
  c.anchor_y,
  c.body,
  c.created_at,
  cr.read_at,
  CASE
    WHEN cr.recipient_type = 'user'  THEN cr.recipient_id
    WHEN cr.recipient_type = 'group' THEN gm.user_id
    ELSE NULL
  END                  AS for_user_id,
  cr.resolved_at
FROM comment_recipients cr
JOIN comments        c  ON c.id  = cr.comment_id
JOIN profiles        p  ON p.id  = c.from_user_id
LEFT JOIN group_members gm
  ON cr.recipient_type = 'group' AND gm.group_id = cr.recipient_id;
