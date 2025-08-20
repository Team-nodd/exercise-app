-- Add TrainerRoad workout ID to workouts table
ALTER TABLE public.workouts 
ADD COLUMN IF NOT EXISTS trainerroad_workout_id bigint,
ADD COLUMN IF NOT EXISTS trainerroad_workout_data jsonb;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workouts_trainerroad_workout_id 
ON public.workouts(trainerroad_workout_id);

-- Add comment for documentation
COMMENT ON COLUMN public.workouts.trainerroad_workout_id IS 'ID of the TrainerRoad workout this workout is based on';
COMMENT ON COLUMN public.workouts.trainerroad_workout_data IS 'Full TrainerRoad workout data for reference';
