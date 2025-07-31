-- FitTracker Pro Seed Data
-- Run this after setting up the schema to populate with initial data

-- ============================================================================
-- SAMPLE EXERCISES
-- ============================================================================

-- Insert sample exercises for the exercise library
INSERT INTO public.exercises (name, category, equipment, instructions) VALUES
-- Strength Training
('Push-ups', 'Strength', 'Bodyweight', 'Start in plank position, lower body to ground, push back up'),
('Squats', 'Strength', 'Bodyweight', 'Stand with feet shoulder-width apart, lower hips back and down'),
('Deadlifts', 'Strength', 'Barbell', 'Stand with feet hip-width apart, bend at hips and knees to lower bar'),
('Bench Press', 'Strength', 'Barbell', 'Lie on bench, lower bar to chest, press back up'),
('Pull-ups', 'Strength', 'Pull-up bar', 'Hang from bar, pull body up until chin over bar'),
('Lunges', 'Strength', 'Bodyweight', 'Step forward, lower back knee toward ground, return to start'),
('Plank', 'Core', 'Bodyweight', 'Hold body in straight line from head to heels'),
('Russian Twists', 'Core', 'Bodyweight', 'Sit with knees bent, rotate torso side to side'),
('Burpees', 'Cardio', 'Bodyweight', 'Squat, jump back to plank, do push-up, jump forward, jump up'),
('Mountain Climbers', 'Cardio', 'Bodyweight', 'Start in plank, alternate bringing knees to chest'),

-- Cardio
('Running', 'Cardio', 'Treadmill/Outdoor', 'Maintain steady pace, focus on breathing'),
('Cycling', 'Cardio', 'Bike', 'Pedal at consistent cadence, maintain good posture'),
('Rowing', 'Cardio', 'Rowing machine', 'Push with legs, pull with arms, maintain rhythm'),
('Jump Rope', 'Cardio', 'Jump rope', 'Bounce on balls of feet, keep rope moving'),
('High Knees', 'Cardio', 'Bodyweight', 'Run in place, bring knees up to waist level'),

-- Flexibility
('Stretching', 'Flexibility', 'Bodyweight', 'Hold each stretch for 30 seconds, don\'t bounce'),
('Yoga', 'Flexibility', 'Yoga mat', 'Follow guided sequence, focus on breathing'),
('Foam Rolling', 'Recovery', 'Foam roller', 'Roll slowly over tight muscles, pause on tender spots')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TEST ACCOUNTS (Optional - for development/testing)
-- ============================================================================

-- Create test coach account (if not exists)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'coach@test.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test Coach", "role": "coach"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create test coach profile
INSERT INTO public.users (
    id,
    name,
    email,
    role,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test Coach',
    'coach@test.com',
    'coach',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create test athlete account (if not exists)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    '660e8400-e29b-41d4-a716-446655440000',
    'athlete@test.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test Athlete", "role": "user"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Create test athlete profile
INSERT INTO public.users (
    id,
    name,
    email,
    role,
    created_at,
    updated_at
) VALUES (
    '660e8400-e29b-41d4-a716-446655440000',
    'Test Athlete',
    'athlete@test.com',
    'user',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SAMPLE PROGRAM (Optional - for testing)
-- ============================================================================

-- Create a sample program for the test athlete
INSERT INTO public.programs (
    name,
    description,
    coach_id,
    user_id,
    start_date,
    end_date,
    status
) VALUES (
    'Beginner Strength Program',
    'A 4-week program designed for beginners to build strength and fitness',
    '550e8400-e29b-41d4-a716-446655440000', -- Test Coach
    '660e8400-e29b-41d4-a716-446655440000', -- Test Athlete
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '28 days',
    'active'
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check that data was inserted correctly
SELECT 'Exercises' as table_name, COUNT(*) as count FROM public.exercises
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Programs' as table_name, COUNT(*) as count FROM public.programs;

-- Show test accounts
SELECT 
    name,
    email,
    role,
    created_at
FROM public.users 
WHERE email IN ('coach@test.com', 'athlete@test.com')
ORDER BY role; 