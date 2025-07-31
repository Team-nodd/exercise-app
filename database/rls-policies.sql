-- FitTracker Pro Row Level Security (RLS) Policies
-- Run this after creating the schema to enable security

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercises ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Coaches can view athlete profiles (for program management)
CREATE POLICY "Coaches can view athlete profiles" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users AS coach_profile 
            WHERE coach_profile.id = auth.uid() 
            AND coach_profile.role = 'coach'
        )
    );

-- Athletes can view coach profiles
CREATE POLICY "Athletes can view coach profiles" ON public.users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users AS user_profile 
            WHERE user_profile.id = auth.uid() 
            AND user_profile.role = 'user'
        )
    );

-- ============================================================================
-- EXERCISES TABLE POLICIES
-- ============================================================================

-- Anyone can view exercises (public exercise library)
CREATE POLICY "Anyone can view exercises" ON public.exercises
    FOR SELECT USING (true);

-- Only coaches can create exercises
CREATE POLICY "Coaches can create exercises" ON public.exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'coach'
        )
    );

-- Only coaches can update exercises
CREATE POLICY "Coaches can update exercises" ON public.exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'coach'
        )
    );

-- Only coaches can delete exercises
CREATE POLICY "Coaches can delete exercises" ON public.exercises
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role = 'coach'
        )
    );

-- ============================================================================
-- PROGRAMS TABLE POLICIES
-- ============================================================================

-- Athletes can view their own programs
CREATE POLICY "Athletes can view own programs" ON public.programs
    FOR SELECT USING (user_id = auth.uid());

-- Coaches can view programs they created
CREATE POLICY "Coaches can view created programs" ON public.programs
    FOR SELECT USING (coach_id = auth.uid());

-- Coaches can create programs
CREATE POLICY "Coaches can create programs" ON public.programs
    FOR INSERT WITH CHECK (coach_id = auth.uid());

-- Coaches can update programs they created
CREATE POLICY "Coaches can update created programs" ON public.programs
    FOR UPDATE USING (coach_id = auth.uid());

-- Coaches can delete programs they created
CREATE POLICY "Coaches can delete created programs" ON public.programs
    FOR DELETE USING (coach_id = auth.uid());

-- ============================================================================
-- WORKOUTS TABLE POLICIES
-- ============================================================================

-- Athletes can view their own workouts
CREATE POLICY "Athletes can view own workouts" ON public.workouts
    FOR SELECT USING (user_id = auth.uid());

-- Coaches can view workouts for their programs
CREATE POLICY "Coaches can view program workouts" ON public.workouts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.programs 
            WHERE programs.id = workouts.program_id 
            AND programs.coach_id = auth.uid()
        )
    );

-- Coaches can create workouts for their programs
CREATE POLICY "Coaches can create workouts" ON public.workouts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.programs 
            WHERE programs.id = workouts.program_id 
            AND programs.coach_id = auth.uid()
        )
    );

-- Athletes can update their own workouts (mark as completed, etc.)
CREATE POLICY "Athletes can update own workouts" ON public.workouts
    FOR UPDATE USING (user_id = auth.uid());

-- Coaches can update workouts for their programs
CREATE POLICY "Coaches can update program workouts" ON public.workouts
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.programs 
            WHERE programs.id = workouts.program_id 
            AND programs.coach_id = auth.uid()
        )
    );

-- ============================================================================
-- WORKOUT_EXERCISES TABLE POLICIES
-- ============================================================================

-- Athletes can view their workout exercises
CREATE POLICY "Athletes can view workout exercises" ON public.workout_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE workouts.id = workout_exercises.workout_id 
            AND workouts.user_id = auth.uid()
        )
    );

-- Coaches can view workout exercises for their programs
CREATE POLICY "Coaches can view program workout exercises" ON public.workout_exercises
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            JOIN public.programs ON workouts.program_id = programs.id
            WHERE workouts.id = workout_exercises.workout_id 
            AND programs.coach_id = auth.uid()
        )
    );

-- Coaches can create workout exercises for their programs
CREATE POLICY "Coaches can create workout exercises" ON public.workout_exercises
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workouts 
            JOIN public.programs ON workouts.program_id = programs.id
            WHERE workouts.id = workout_exercises.workout_id 
            AND programs.coach_id = auth.uid()
        )
    );

-- Athletes can update their workout exercises (mark as completed, etc.)
CREATE POLICY "Athletes can update workout exercises" ON public.workout_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            WHERE workouts.id = workout_exercises.workout_id 
            AND workouts.user_id = auth.uid()
        )
    );

-- Coaches can update workout exercises for their programs
CREATE POLICY "Coaches can update program workout exercises" ON public.workout_exercises
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workouts 
            JOIN public.programs ON workouts.program_id = programs.id
            WHERE workouts.id = workout_exercises.workout_id 
            AND programs.coach_id = auth.uid()
        )
    ); 