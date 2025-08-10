-- Core schema for FitTracker Pro matching src/types/database.ts
-- Idempotent: safe to run multiple times

-- Enable required extensions (idempotent)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pgcrypto;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Helper function to auto-update updated_at
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
END $$;

-- USERS TABLE ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY,
  name        text NOT NULL,
  email       text NOT NULL UNIQUE,
  role        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  workout_completed_email boolean NOT NULL DEFAULT true,
  program_assigned_email  boolean NOT NULL DEFAULT true,
  weekly_progress_email   boolean NOT NULL DEFAULT true,
  CONSTRAINT users_role_check CHECK (role IN ('coach','user'))
);

-- USERS triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'users_set_updated_at'
  ) THEN
    CREATE TRIGGER users_set_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- EXERCISES TABLE -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exercises (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  category     text,
  muscle_groups text[] NOT NULL DEFAULT '{}',
  equipment    text,
  instructions text,
  image_url    text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'exercises_set_updated_at'
  ) THEN
    CREATE TRIGGER exercises_set_updated_at
    BEFORE UPDATE ON public.exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- CARDIO_EXERCISES TABLE ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cardio_exercises (
  id               bigserial PRIMARY KEY,
  name             text NOT NULL,
  intensity_type   text,
  duration_minutes integer,
  target_tss       integer,
  target_ftp       integer,
  created_by       uuid NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_cardio_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'cardio_exercises_set_updated_at'
  ) THEN
    CREATE TRIGGER cardio_exercises_set_updated_at
    BEFORE UPDATE ON public.cardio_exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- PROGRAMS TABLE ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programs (
  id           bigserial PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  coach_id     uuid NOT NULL,
  user_id      uuid NOT NULL,
  start_date   date,
  end_date     date,
  status       text NOT NULL DEFAULT 'draft',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programs_status_check CHECK (status IN ('draft','active','completed','paused')),
  CONSTRAINT fk_programs_coach FOREIGN KEY (coach_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_programs_user  FOREIGN KEY (user_id)  REFERENCES public.users(id) ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'programs_set_updated_at'
  ) THEN
    CREATE TRIGGER programs_set_updated_at
    BEFORE UPDATE ON public.programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- WORKOUTS TABLE ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workouts (
  id               bigserial PRIMARY KEY,
  program_id       bigint NOT NULL,
  user_id          uuid NOT NULL,
  name             text NOT NULL,
  workout_type     text NOT NULL,
  scheduled_date   date,
  order_in_program integer NOT NULL DEFAULT 0,
  intensity_type   text,
  duration_minutes integer,
  target_tss       integer,
  target_ftp       integer,
  notes            text,
  completed        boolean NOT NULL DEFAULT false,
  completed_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workouts_type_check CHECK (workout_type IN ('gym','cardio')),
  CONSTRAINT fk_workouts_program FOREIGN KEY (program_id) REFERENCES public.programs(id) ON DELETE CASCADE,
  CONSTRAINT fk_workouts_user    FOREIGN KEY (user_id)    REFERENCES public.users(id)    ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'workouts_set_updated_at'
  ) THEN
    CREATE TRIGGER workouts_set_updated_at
    BEFORE UPDATE ON public.workouts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- WORKOUT_EXERCISES TABLE ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_exercises (
  id                 bigserial PRIMARY KEY,
  workout_id         bigint NOT NULL,
  exercise_id        bigint NOT NULL,
  order_in_workout   integer NOT NULL DEFAULT 0,
  sets               integer NOT NULL DEFAULT 3,
  reps               integer NOT NULL DEFAULT 10,
  weight             text,
  rest_seconds       integer NOT NULL DEFAULT 60,
  volume_level       text NOT NULL DEFAULT 'moderate',
  completed          boolean NOT NULL DEFAULT false,
  actual_sets        integer,
  actual_reps        integer,
  actual_weight      text,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_volume_level_check CHECK (volume_level IN ('low','moderate','high')),
  CONSTRAINT fk_we_workout FOREIGN KEY (workout_id)  REFERENCES public.workouts(id)  ON DELETE CASCADE,
  CONSTRAINT fk_we_exercise FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'workout_exercises_set_updated_at'
  ) THEN
    CREATE TRIGGER workout_exercises_set_updated_at
    BEFORE UPDATE ON public.workout_exercises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- NOTIFICATIONS TABLE -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL,
  title      text NOT NULL,
  message    text,
  type       text NOT NULL DEFAULT 'general',
  related_id text,
  read       boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'notifications_set_updated_at'
  ) THEN
    CREATE TRIGGER notifications_set_updated_at
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- COMMENTS TABLE ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comments (
  id                   bigserial PRIMARY KEY,
  user_id              uuid NOT NULL,
  workout_id           bigint,
  workout_exercise_id  bigint,
  comment_text         text NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_comments_user   FOREIGN KEY (user_id)             REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_workout FOREIGN KEY (workout_id)         REFERENCES public.workouts(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_we      FOREIGN KEY (workout_exercise_id) REFERENCES public.workout_exercises(id) ON DELETE CASCADE
);

-- INDEXES -------------------------------------------------------------------
-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- Exercises
CREATE INDEX IF NOT EXISTS idx_exercises_name ON public.exercises (name);

-- Cardio exercises
CREATE INDEX IF NOT EXISTS idx_cardio_created_by ON public.cardio_exercises (created_by);
CREATE INDEX IF NOT EXISTS idx_cardio_created_at ON public.cardio_exercises (created_at);

-- Programs
CREATE INDEX IF NOT EXISTS idx_programs_user_id  ON public.programs (user_id);
CREATE INDEX IF NOT EXISTS idx_programs_coach_id ON public.programs (coach_id);

-- Workouts
CREATE INDEX IF NOT EXISTS idx_workouts_program_id     ON public.workouts (program_id);
CREATE INDEX IF NOT EXISTS idx_workouts_user_id        ON public.workouts (user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON public.workouts (scheduled_date);

-- Workout exercises
CREATE INDEX IF NOT EXISTS idx_we_workout_id ON public.workout_exercises (workout_id);
CREATE INDEX IF NOT EXISTS idx_we_order      ON public.workout_exercises (order_in_workout);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications (created_at);

-- Comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_workout ON public.comments (workout_id);
CREATE INDEX IF NOT EXISTS idx_comments_we      ON public.comments (workout_exercise_id);

-- RLS -----------------------------------------------------------------------
ALTER TABLE public.users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_exercises    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments            ENABLE ROW LEVEL SECURITY;

-- USERS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can select self'
  ) THEN
    CREATE POLICY "Users can select self" ON public.users
      FOR SELECT USING (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.users
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can update self'
  ) THEN
    CREATE POLICY "Users can update self" ON public.users
      FOR UPDATE USING (id = auth.uid());
  END IF;
END $$;

-- EXERCISES policies (global library; allow all authenticated)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='exercises' AND policyname='Authenticated can read exercises'
  ) THEN
    CREATE POLICY "Authenticated can read exercises" ON public.exercises
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='exercises' AND policyname='Authenticated can modify exercises'
  ) THEN
    CREATE POLICY "Authenticated can modify exercises" ON public.exercises
      FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- CARDIO_EXERCISES policies (owner-based)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cardio_exercises' AND policyname='Owners can read cardio templates'
  ) THEN
    CREATE POLICY "Owners can read cardio templates" ON public.cardio_exercises
      FOR SELECT USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cardio_exercises' AND policyname='Owners can insert cardio templates'
  ) THEN
    CREATE POLICY "Owners can insert cardio templates" ON public.cardio_exercises
      FOR INSERT WITH CHECK (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cardio_exercises' AND policyname='Owners can update cardio templates'
  ) THEN
    CREATE POLICY "Owners can update cardio templates" ON public.cardio_exercises
      FOR UPDATE USING (created_by = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='cardio_exercises' AND policyname='Owners can delete cardio templates'
  ) THEN
    CREATE POLICY "Owners can delete cardio templates" ON public.cardio_exercises
      FOR DELETE USING (created_by = auth.uid());
  END IF;
END $$;

-- PROGRAMS policies (coach or assigned user)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Coach or user can read program'
  ) THEN
    CREATE POLICY "Coach or user can read program" ON public.programs
      FOR SELECT USING (coach_id = auth.uid() OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Coach can create program'
  ) THEN
    CREATE POLICY "Coach can create program" ON public.programs
      FOR INSERT WITH CHECK (coach_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Coach can update program'
  ) THEN
    CREATE POLICY "Coach can update program" ON public.programs
      FOR UPDATE USING (coach_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='programs' AND policyname='Coach can delete program'
  ) THEN
    CREATE POLICY "Coach can delete program" ON public.programs
      FOR DELETE USING (coach_id = auth.uid());
  END IF;
END $$;

-- WORKOUTS policies (coach of program or assigned user)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workouts' AND policyname='Coach or user can read workout'
  ) THEN
    CREATE POLICY "Coach or user can read workout" ON public.workouts
      FOR SELECT USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.coach_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workouts' AND policyname='Coach can create workout in own program'
  ) THEN
    CREATE POLICY "Coach can create workout in own program" ON public.workouts
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.coach_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workouts' AND policyname='Coach or user can update workout'
  ) THEN
    CREATE POLICY "Coach or user can update workout" ON public.workouts
      FOR UPDATE USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.coach_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workouts' AND policyname='Coach can delete workout'
  ) THEN
    CREATE POLICY "Coach can delete workout" ON public.workouts
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- WORKOUT_EXERCISES policies (inherit from workout)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workout_exercises' AND policyname='Can read workout_exercises via workout access'
  ) THEN
    CREATE POLICY "Can read workout_exercises via workout access" ON public.workout_exercises
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.workouts w
          JOIN public.programs p ON p.id = w.program_id
          WHERE w.id = workout_id AND (w.user_id = auth.uid() OR p.coach_id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='workout_exercises' AND policyname='Can modify workout_exercises via workout access'
  ) THEN
    CREATE POLICY "Can modify workout_exercises via workout access" ON public.workout_exercises
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.workouts w
          JOIN public.programs p ON p.id = w.program_id
          WHERE w.id = workout_id AND (w.user_id = auth.uid() OR p.coach_id = auth.uid())
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.workouts w
          JOIN public.programs p ON p.id = w.program_id
          WHERE w.id = workout_id AND (w.user_id = auth.uid() OR p.coach_id = auth.uid())
        )
      );
  END IF;
END $$;

-- NOTIFICATIONS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications" ON public.notifications
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Authenticated can insert notifications'
  ) THEN
    CREATE POLICY "Authenticated can insert notifications" ON public.notifications
      FOR INSERT WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON public.notifications
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='Users can delete own notifications'
  ) THEN
    CREATE POLICY "Users can delete own notifications" ON public.notifications
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- COMMENTS policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Can read comments if author, workout user, or coach'
  ) THEN
    CREATE POLICY "Can read comments if author, workout user, or coach" ON public.comments
      FOR SELECT USING (
        user_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.workouts w JOIN public.programs p ON p.id = w.program_id
          WHERE (w.id = comments.workout_id OR w.id = (SELECT we.workout_id FROM public.workout_exercises we WHERE we.id = comments.workout_exercise_id))
            AND (w.user_id = auth.uid() OR p.coach_id = auth.uid())
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Authors can insert comments'
  ) THEN
    CREATE POLICY "Authors can insert comments" ON public.comments
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Authors can update own comments'
  ) THEN
    CREATE POLICY "Authors can update own comments" ON public.comments
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Authors can delete own comments'
  ) THEN
    CREATE POLICY "Authors can delete own comments" ON public.comments
      FOR DELETE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='comments' AND policyname='Coach can delete comments in own programs'
  ) THEN
    CREATE POLICY "Coach can delete comments in own programs" ON public.comments
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.workouts w JOIN public.programs p ON p.id = w.program_id
          WHERE (w.id = comments.workout_id OR w.id = (SELECT we.workout_id FROM public.workout_exercises we WHERE we.id = comments.workout_exercise_id))
            AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Done ----------------------------------------------------------------------

