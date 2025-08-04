-- Add notification settings columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS workout_completed_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS program_assigned_email BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_progress_email BOOLEAN DEFAULT false;

-- Update existing users to have default notification settings
UPDATE users 
SET 
  workout_completed_email = false,
  program_assigned_email = false,
  weekly_progress_email = false
WHERE workout_completed_email IS NULL 
   OR program_assigned_email IS NULL 
   OR weekly_progress_email IS NULL; 