-- Allow comment authors to delete their own comments
CREATE POLICY "comments_delete" ON comments
  FOR DELETE USING (auth.uid() = from_user_id);
