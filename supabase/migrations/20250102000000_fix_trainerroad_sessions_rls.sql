-- Fix TrainerRoad Sessions RLS Policies
-- Allow coaches to manage sessions for their assigned athletes

-- Add policy for coaches to read their clients' TrainerRoad sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_coach_select'
  ) THEN
    CREATE POLICY trainerroad_sessions_coach_select
      ON public.trainerroad_sessions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = trainerroad_sessions.user_id 
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add policy for coaches to insert TrainerRoad sessions for their clients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_coach_insert'
  ) THEN
    CREATE POLICY trainerroad_sessions_coach_insert
      ON public.trainerroad_sessions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = trainerroad_sessions.user_id 
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add policy for coaches to update their clients' TrainerRoad sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_coach_update'
  ) THEN
    CREATE POLICY trainerroad_sessions_coach_update
      ON public.trainerroad_sessions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = trainerroad_sessions.user_id 
          AND p.coach_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = trainerroad_sessions.user_id 
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Add policy for coaches to delete their clients' TrainerRoad sessions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_coach_delete'
  ) THEN
    CREATE POLICY trainerroad_sessions_coach_delete
      ON public.trainerroad_sessions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = trainerroad_sessions.user_id 
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;
