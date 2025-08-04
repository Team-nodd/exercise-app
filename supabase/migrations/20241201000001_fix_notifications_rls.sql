-- Add RLS policy to allow users to send notifications to their coaches
-- This policy allows users to insert notifications for coaches who are assigned to their programs

CREATE POLICY "Users can send notifications to their coaches" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM programs p
      JOIN users u ON p.user_id = u.id
      WHERE p.coach_id = notifications.user_id
      AND u.id = auth.uid()
    )
  );

-- Also allow coaches to send notifications to their clients
CREATE POLICY "Coaches can send notifications to their clients" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM programs p
      JOIN users u ON p.user_id = u.id
      WHERE p.coach_id = auth.uid()
      AND u.id = notifications.user_id
    )
  ); 