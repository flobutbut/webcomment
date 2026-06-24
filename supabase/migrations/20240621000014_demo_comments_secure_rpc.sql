-- Security-definer insert: validation, rate-limit, and delete_token never exposed via direct SELECT
CREATE OR REPLACE FUNCTION create_demo_comment(
  p_x_pct   float,
  p_y_pct   float,
  p_message text,
  p_author  text DEFAULT NULL
) RETURNS TABLE(id uuid, delete_token uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF p_message LIKE '%<%' OR (p_author IS NOT NULL AND p_author LIKE '%<%') THEN
    RAISE EXCEPTION 'HTML not allowed';
  END IF;

  -- Global rate limit: max 50 inserts per hour
  IF (SELECT COUNT(*) FROM demo_comments
      WHERE created_at > NOW() - INTERVAL '1 hour') >= 50 THEN
    RAISE EXCEPTION 'Rate limit exceeded. Try again later.';
  END IF;

  -- Total cap: never more than 200 live comments
  IF (SELECT COUNT(*) FROM demo_comments) >= 200 THEN
    RAISE EXCEPTION 'Comment board is full. Try again later.';
  END IF;

  RETURN QUERY
    INSERT INTO demo_comments (x_pct, y_pct, message, author)
    VALUES (p_x_pct, p_y_pct, p_message, p_author)
    RETURNING demo_comments.id, demo_comments.delete_token;
END;
$$;

-- Security-definer delete: token check enforced in DB, not just client-side
CREATE OR REPLACE FUNCTION delete_demo_comment(p_id uuid, p_token uuid)
RETURNS void
SECURITY DEFINER
SET search_path = public
LANGUAGE sql AS $$
  DELETE FROM demo_comments WHERE id = p_id AND delete_token = p_token;
$$;

GRANT EXECUTE ON FUNCTION create_demo_comment(float, float, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION delete_demo_comment(uuid, uuid) TO anon, authenticated;

-- Remove direct INSERT/DELETE access
DROP POLICY IF EXISTS demo_comments_insert ON demo_comments;
DROP POLICY IF EXISTS demo_comments_delete ON demo_comments;
REVOKE INSERT, DELETE ON TABLE public.demo_comments FROM anon, authenticated;

-- Hide delete_token from direct SELECT queries
REVOKE SELECT (delete_token) ON TABLE public.demo_comments FROM anon, authenticated;
