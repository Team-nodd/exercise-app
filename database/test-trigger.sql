-- Test script to verify the user profile creation trigger is working
-- Run this in Supabase SQL Editor to test the trigger

-- First, let's check if the trigger exists
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check if the function exists
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name = 'handle_new_user';

-- Test the trigger by creating a test user
-- (This will be cleaned up automatically by Supabase)
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_user_meta_data
) VALUES (
    gen_random_uuid(),
    'test-trigger@example.com',
    crypt('testpassword', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"name": "Test User", "role": "user"}'::jsonb
);

-- Check if the profile was created
SELECT 
    id,
    name,
    email,
    role,
    created_at
FROM public.users 
WHERE email = 'test-trigger@example.com';

-- Clean up the test user
DELETE FROM auth.users WHERE email = 'test-trigger@example.com';
DELETE FROM public.users WHERE email = 'test-trigger@example.com'; 