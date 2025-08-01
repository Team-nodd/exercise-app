-- Add sample data for testing the dashboard
-- Run this after disabling RLS

-- First, let's get a user ID to work with
-- Replace 'your-email@example.com' with an actual user email from your auth.users table
DO $$
DECLARE
    user_id UUID;
BEGIN
    -- Get the first user from auth.users (or replace with a specific email)
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    
    IF user_id IS NOT NULL THEN
        -- Create a sample program
        INSERT INTO public.programs (
            name,
            description,
            coach_id,
            user_id,
            start_date,
            end_date,
            status
        ) VALUES (
            'Beginner Fitness Program',
            'A comprehensive program for beginners',
            user_id, -- Using same user as coach for testing
            user_id,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '30 days',
            'active'
        ) ON CONFLICT DO NOTHING;

        -- Create some sample workouts
        INSERT INTO public.workouts (
            program_id,
            user_id,
            name,
            workout_type,
            scheduled_date,
            order_in_program,
            completed
        ) VALUES 
        (
            (SELECT id FROM public.programs WHERE user_id = user_id LIMIT 1),
            user_id,
            'Upper Body Strength',
            'gym',
            CURRENT_DATE + INTERVAL '1 day',
            1,
            false
        ),
        (
            (SELECT id FROM public.programs WHERE user_id = user_id LIMIT 1),
            user_id,
            'Cardio Session',
            'cardio',
            CURRENT_DATE + INTERVAL '2 days',
            2,
            false
        ),
        (
            (SELECT id FROM public.programs WHERE user_id = user_id LIMIT 1),
            user_id,
            'Lower Body Strength',
            'gym',
            CURRENT_DATE - INTERVAL '1 day',
            3,
            true
        ) ON CONFLICT DO NOTHING;

        RAISE NOTICE 'Sample data created for user: %', user_id;
    ELSE
        RAISE NOTICE 'No users found in auth.users table';
    END IF;
END $$;

-- Verify the data was created
SELECT 
    'Programs' as table_name, COUNT(*) as count 
FROM public.programs
UNION ALL
SELECT 
    'Workouts' as table_name, COUNT(*) as count 
FROM public.workouts; 