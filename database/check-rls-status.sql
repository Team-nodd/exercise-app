-- Check RLS status for all tables
-- Run this in Supabase SQL Editor to see which tables have RLS enabled

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'exercises', 'programs', 'workouts', 'workout_exercises')
ORDER BY tablename;

-- Check if there are any RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'exercises', 'programs', 'workouts', 'workout_exercises')
ORDER BY tablename, policyname; 