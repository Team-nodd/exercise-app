-- TrainerRoad Integration Schema
-- Adds support for importing and syncing external activity data from TrainerRoad

-- Add TrainerRoad sync settings to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainerroad_username text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_trainerroad_sync timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS trainerroad_sync_enabled boolean DEFAULT false;
-- Session cookie storage (HTTP-only cookies mirrored for server-to-server calls)
CREATE TABLE IF NOT EXISTS public.trainerroad_sessions (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  cookies text,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enforce row-level security so only the owner can access their row
ALTER TABLE public.trainerroad_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_owner_select'
  ) THEN
    CREATE POLICY trainerroad_sessions_owner_select
      ON public.trainerroad_sessions
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_owner_insert'
  ) THEN
    CREATE POLICY trainerroad_sessions_owner_insert
      ON public.trainerroad_sessions
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_owner_update'
  ) THEN
    CREATE POLICY trainerroad_sessions_owner_update
      ON public.trainerroad_sessions
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'trainerroad_sessions' AND policyname = 'trainerroad_sessions_owner_delete'
  ) THEN
    CREATE POLICY trainerroad_sessions_owner_delete
      ON public.trainerroad_sessions
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trainerroad_sessions_set_updated_at'
  ) THEN
    CREATE TRIGGER trainerroad_sessions_set_updated_at
    BEFORE UPDATE ON public.trainerroad_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Add external activity tracking fields to workouts table  
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS external_activity_id bigint;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS actual_tss integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS energy_kj integer;
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS intensity_factor decimal(5,3);

-- Create external_activities table for detailed external activity data
CREATE TABLE IF NOT EXISTS public.external_activities (
  id                    bigserial PRIMARY KEY,
  user_id               uuid NOT NULL,
  external_id           text NOT NULL,        -- TrainerRoad Id
  external_source       text NOT NULL,        -- "trainerroad"
  external_guid         text,                 -- TrainerRoad Guid
  workout_id            bigint,               -- Link to our workouts table
  
  -- Core activity data
  name                  text NOT NULL,
  duration_seconds      integer NOT NULL,
  expected_tss          integer,
  actual_tss            integer,
  expected_kj           integer,
  actual_kj             integer,
  intensity_factor      decimal(5,3),
  expected_intensity    integer,
  
  -- Activity flags
  is_cut_short          boolean DEFAULT false,
  has_gps_data          boolean DEFAULT false,
  is_indoor_swim        boolean DEFAULT false,
  is_external           boolean DEFAULT false,
  can_estimate_tss      boolean DEFAULT false,
  
  -- Additional data
  survey_option_text    text,
  classification_type   integer,
  open_type            integer,
  activity_type        integer,              -- TrainerRoad Type field
  source               text,
  
  -- Progression data (JSON for flexibility)
  progression_data      jsonb,
  
  -- Timestamps
  started_at            timestamptz NOT NULL,
  processed_at          timestamptz NOT NULL,
  sync_at              timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT fk_external_activities_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_external_activities_workout FOREIGN KEY (workout_id) REFERENCES public.workouts(id) ON DELETE SET NULL,
  CONSTRAINT unique_external_activity UNIQUE (external_source, external_id, user_id),
  CONSTRAINT external_source_check CHECK (external_source IN ('trainerroad'))
);

-- Add foreign key constraint to workouts table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_workouts_external_activity'
  ) THEN
    ALTER TABLE public.workouts ADD CONSTRAINT fk_workouts_external_activity 
      FOREIGN KEY (external_activity_id) REFERENCES public.external_activities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add trigger for updated_at on external_activities
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'external_activities_set_updated_at'
  ) THEN
    CREATE TRIGGER external_activities_set_updated_at
    BEFORE UPDATE ON public.external_activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_activities_user_id ON public.external_activities (user_id);
CREATE INDEX IF NOT EXISTS idx_external_activities_external_source ON public.external_activities (external_source);
CREATE INDEX IF NOT EXISTS idx_external_activities_external_id ON public.external_activities (external_id);
CREATE INDEX IF NOT EXISTS idx_external_activities_started_at ON public.external_activities (started_at);
CREATE INDEX IF NOT EXISTS idx_external_activities_sync_at ON public.external_activities (sync_at);
CREATE INDEX IF NOT EXISTS idx_external_activities_workout_id ON public.external_activities (workout_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_external_activities_user_source_started ON public.external_activities (user_id, external_source, started_at DESC);

-- Indexes on new workout columns
CREATE INDEX IF NOT EXISTS idx_workouts_external_activity_id ON public.workouts (external_activity_id);
CREATE INDEX IF NOT EXISTS idx_workouts_actual_tss ON public.workouts (actual_tss);

-- RLS Policies for external_activities
ALTER TABLE public.external_activities ENABLE ROW LEVEL SECURITY;

-- Users can only see their own external activities
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='external_activities' AND policyname='Users can read own external activities'
  ) THEN
    CREATE POLICY "Users can read own external activities" ON public.external_activities
      FOR SELECT USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='external_activities' AND policyname='Users can insert own external activities'
  ) THEN
    CREATE POLICY "Users can insert own external activities" ON public.external_activities
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='external_activities' AND policyname='Users can update own external activities'
  ) THEN
    CREATE POLICY "Users can update own external activities" ON public.external_activities
      FOR UPDATE USING (user_id = auth.uid());
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='external_activities' AND policyname='Users can delete own external activities'
  ) THEN
    CREATE POLICY "Users can delete own external activities" ON public.external_activities
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Coach can view external activities of their assigned users
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='external_activities' AND policyname='Coach can read client external activities'
  ) THEN
    CREATE POLICY "Coach can read client external activities" ON public.external_activities
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.programs p 
          WHERE p.user_id = external_activities.user_id 
          AND p.coach_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Update database types
COMMENT ON TABLE public.external_activities IS 'Stores external activity data from TrainerRoad and other fitness platforms';
COMMENT ON COLUMN public.external_activities.external_id IS 'The ID from the external platform (e.g., TrainerRoad activity ID)';
COMMENT ON COLUMN public.external_activities.external_source IS 'Source platform: trainerroad, strava, etc.';
COMMENT ON COLUMN public.external_activities.progression_data IS 'JSON data for platform-specific progression information';
COMMENT ON COLUMN public.workouts.external_activity_id IS 'Reference to imported external activity data';
COMMENT ON COLUMN public.workouts.actual_tss IS 'Actual Training Stress Score achieved';
COMMENT ON COLUMN public.workouts.energy_kj IS 'Energy expenditure in kilojoules';
COMMENT ON COLUMN public.workouts.intensity_factor IS 'Intensity Factor (IF) - ratio of normalized power to FTP';


