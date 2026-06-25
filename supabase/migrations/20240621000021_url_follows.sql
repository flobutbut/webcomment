-- url_follows: users subscribe to a URL to see its public comments in their Feed
CREATE TABLE IF NOT EXISTS url_follows (
  user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url        TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, url)
);

ALTER TABLE url_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own url follows"
  ON url_follows FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Returns public comments for a single URL (used by FollowedUrlsPage detail column)
CREATE OR REPLACE FUNCTION get_public_comments_for_url(p_url TEXT)
RETURNS TABLE (
  comment_id      UUID,
  url             TEXT,
  body            TEXT,
  tags            TEXT[],
  created_at      TIMESTAMPTZ,
  screenshot_url  TEXT,
  pin_x           FLOAT4,
  pin_y           FLOAT4,
  from_user_id    UUID,
  from_username   TEXT,
  from_avatar_url TEXT,
  from_initials   TEXT
)
SECURITY DEFINER
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.id            AS comment_id,
    c.url,
    c.body,
    c.tags,
    c.created_at,
    c.screenshot_url,
    c.pin_x,
    c.pin_y,
    c.from_user_id,
    p.username      AS from_username,
    p.avatar_url    AS from_avatar_url,
    p.initials      AS from_initials
  FROM comments c
  JOIN profiles p ON p.id = c.from_user_id
  WHERE c.url = p_url
    AND EXISTS (
      SELECT 1 FROM comment_recipients cr
      WHERE cr.comment_id = c.id
        AND cr.recipient_type = 'public'
    )
  ORDER BY c.created_at DESC;
$$;

-- Returns recent public comments across all URLs followed by p_user_id (used by extension Feed tab)
CREATE OR REPLACE FUNCTION get_feed_comments(p_user_id UUID)
RETURNS TABLE (
  comment_id      UUID,
  url             TEXT,
  body            TEXT,
  tags            TEXT[],
  created_at      TIMESTAMPTZ,
  screenshot_url  TEXT,
  pin_x           FLOAT4,
  pin_y           FLOAT4,
  from_user_id    UUID,
  from_username   TEXT,
  from_avatar_url TEXT,
  from_initials   TEXT
)
SECURITY DEFINER
LANGUAGE SQL
STABLE
AS $$
  SELECT
    c.id            AS comment_id,
    c.url,
    c.body,
    c.tags,
    c.created_at,
    c.screenshot_url,
    c.pin_x,
    c.pin_y,
    c.from_user_id,
    p.username      AS from_username,
    p.avatar_url    AS from_avatar_url,
    p.initials      AS from_initials
  FROM url_follows uf
  JOIN comments c ON c.url = uf.url
  JOIN profiles p ON p.id = c.from_user_id
  WHERE uf.user_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM comment_recipients cr
      WHERE cr.comment_id = c.id
        AND cr.recipient_type = 'public'
    )
  ORDER BY c.created_at DESC
  LIMIT 50;
$$;
