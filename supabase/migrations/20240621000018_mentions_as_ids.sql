-- WebComment — store @mentions as UUIDs in comment body
--
-- Problem: @username stored as plain text breaks when a user renames.
-- Fix: send-comment replaces @username with @[uuid] before storing; a
--      denormalised `mentions` jsonb column caches [{id, username}] for
--      fast display without an extra round-trip.

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Rebuild comment_inbox view to expose the mentions column
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
  c.mentions,
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
