-- Add cardio_exercise_id to workouts to track selected cardio template
DO $$ BEGIN
  ALTER TABLE public.workouts
  ADD COLUMN IF NOT EXISTS cardio_exercise_id integer NULL REFERENCES public.cardio_exercises(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Helpful index for lookups
CREATE INDEX IF NOT EXISTS idx_workouts_cardio_exercise_id ON public.workouts(cardio_exercise_id);
