-- WebComment — préparation avant les réponses (replies)
--
-- 1. comments.from_user_id : nullable + ON DELETE SET NULL
--    → supprimer un user conserve ses commentaires, affichés avec "Deleted user"
-- 2. Vue comment_inbox : LEFT JOIN + COALESCE pour les comptes supprimés
-- 3. File d'attente de nettoyage des screenshots + trigger sur DELETE

-- ----------------------------------------------------------------
-- 1. from_user_id : nullable + SET NULL
-- ----------------------------------------------------------------

ALTER TABLE comments ALTER COLUMN from_user_id DROP NOT NULL;

ALTER TABLE comments DROP CONSTRAINT comments_from_user_id_fkey;
ALTER TABLE comments
  ADD CONSTRAINT comments_from_user_id_fkey
  FOREIGN KEY (from_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------
-- 2. Vue comment_inbox : LEFT JOIN + fallback "Deleted user"
-- ----------------------------------------------------------------

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
  END                                                AS for_user_id,
  cr.resolved_at,
  cr.recipient_type
FROM comment_recipients cr
JOIN  comments      c  ON c.id  = cr.comment_id
LEFT JOIN profiles  p  ON p.id  = c.from_user_id
LEFT JOIN group_members gm
  ON cr.recipient_type = 'group'::comment_recipient_type
  AND gm.group_id = cr.recipient_id;

-- ----------------------------------------------------------------
-- 3. File d'attente de nettoyage des screenshots
-- ----------------------------------------------------------------

CREATE TABLE screenshot_cleanup_queue (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  path       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Pas de politique RLS publique : accessible uniquement via service role (Edge Function)
ALTER TABLE screenshot_cleanup_queue ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION queue_screenshot_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.screenshot_path IS NOT NULL AND OLD.screenshot_path <> '' THEN
    INSERT INTO screenshot_cleanup_queue (path) VALUES (OLD.screenshot_path);
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_comment_deleted
  BEFORE DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION queue_screenshot_cleanup();
