-- Add performance indexes for better API response times
-- This migration adds composite indexes for common query patterns

-- Composite index for programs table to optimize coach-client relationship lookups
-- This will help the notifications API check relationships faster
CREATE INDEX IF NOT EXISTS idx_programs_user_coach ON programs(user_id, coach_id);
CREATE INDEX IF NOT EXISTS idx_programs_coach_user ON programs(coach_id, user_id);

-- Composite index for workouts to optimize user-specific queries
CREATE INDEX IF NOT EXISTS idx_workouts_user_completed ON workouts(user_id, completed);

-- Composite index for notifications to optimize user-specific queries with ordering
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Index for workout exercises to optimize workout completion checks
CREATE INDEX IF NOT EXISTS idx_workout_exercises_completed ON workout_exercises(workout_id, completed);

-- Partial index for active programs only (most common query)
CREATE INDEX IF NOT EXISTS idx_programs_active ON programs(user_id, coach_id) 
WHERE status = 'active';

-- Partial index for unread notifications only
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, created_at DESC) 
WHERE read = false; 