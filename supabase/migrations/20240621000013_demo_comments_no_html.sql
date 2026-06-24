ALTER TABLE public.demo_comments
  ADD CONSTRAINT demo_comments_message_no_html CHECK (message NOT LIKE '%<%'),
  ADD CONSTRAINT demo_comments_author_no_html  CHECK (author IS NULL OR author NOT LIKE '%<%');
