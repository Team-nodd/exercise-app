-- Allow users to delete their own notifications
CREATE POLICY IF NOT EXISTS "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

