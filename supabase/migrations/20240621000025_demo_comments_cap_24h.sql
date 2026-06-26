-- Fix cap check: only count comments from the last 24h (visible window)
-- Previously, old comments accumulated and would eventually block new posts
-- even though they were no longer displayed.
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

  -- Total cap: never more than 200 live (last 24h) comments
  IF (SELECT COUNT(*) FROM demo_comments
      WHERE created_at > NOW() - INTERVAL '24 hours') >= 200 THEN
    RAISE EXCEPTION 'Comment board is full. Try again later.';
  END IF;

  RETURN QUERY
    INSERT INTO demo_comments (x_pct, y_pct, message, author)
    VALUES (p_x_pct, p_y_pct, p_message, p_author)
    RETURNING demo_comments.id, demo_comments.delete_token;
END;
$$;
