# FitTracker Pro Database Setup Instructions

This guide will help you set up the complete database for FitTracker Pro.

## 📋 Prerequisites

- Supabase account and project
- Access to Supabase SQL Editor

## 🚀 Setup Steps

### Step 1: Create Database Schema

1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/schema.sql`
4. Click **Run**

This will create:

- All database tables (users, exercises, programs, workouts, workout_exercises)
- Indexes for better performance
- Updated_at triggers

### Step 2: Set Up Row Level Security (RLS)

1. In the **SQL Editor**, copy and paste the contents of `database/rls-policies.sql`
2. Click **Run**

This will:

- Enable RLS on all tables
- Create security policies for different user roles
- Ensure data privacy and access control

### Step 3: Create Database Triggers

1. In the **SQL Editor**, copy and paste the contents of `database/triggers.sql`
2. Click **Run**

This will:

- Create automatic user profile creation when users sign up
- Set up updated_at timestamp triggers

### Step 4: Add Sample Data (Optional)

1. In the **SQL Editor**, copy and paste the contents of `database/seed-data.sql`
2. Click **Run**

This will add:

- Sample exercises for the exercise library
- Test accounts for development
- Sample program for testing

## 🔐 Test Accounts

After running the seed data, you'll have these test accounts:

### Coach Account

- **Email**: `coach@test.com`
- **Password**: `password123`
- **Role**: Coach

### Athlete Account

- **Email**: `athlete@test.com`
- **Password**: `password123`
- **Role**: Athlete

## ✅ Verification

After completing all steps, run these verification queries:

```sql
-- Check table counts
SELECT 'Exercises' as table_name, COUNT(*) as count FROM public.exercises
UNION ALL
SELECT 'Users' as table_name, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Programs' as table_name, COUNT(*) as count FROM public.programs;

-- Check test accounts
SELECT name, email, role FROM public.users
WHERE email IN ('coach@test.com', 'athlete@test.com');
```

## 🔧 Configuration

### Authentication Settings

1. Go to **Authentication → Settings** in your Supabase Dashboard
2. Configure your authentication providers
3. For development, you can disable email confirmations temporarily

### Environment Variables

Make sure your `.env.local` file contains:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 🐛 Troubleshooting

### Common Issues

1. **"Table already exists" errors**:

   - The scripts use `CREATE TABLE IF NOT EXISTS`, so this is normal
   - You can safely ignore these warnings

2. **"Policy already exists" errors**:

   - The scripts will handle this automatically
   - Policies will be updated if they already exist

3. **"Function already exists" errors**:
   - Functions are recreated with `CREATE OR REPLACE`
   - This is normal and expected

### Verification Queries

If you encounter issues, run these diagnostic queries:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('users', 'exercises', 'programs', 'workouts', 'workout_exercises');

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('users', 'exercises', 'programs', 'workouts', 'workout_exercises');

-- Check if triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

## 🔄 Reset Database (Development Only)

If you need to reset the database for development:

```sql
-- Drop all tables (WARNING: This will delete all data!)
DROP TABLE IF EXISTS public.workout_exercises CASCADE;
DROP TABLE IF EXISTS public.workouts CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.exercises CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Then run the setup scripts again
```

## 📚 Next Steps

After setting up the database:

1. **Start your development server**: `npm run dev`
2. **Test authentication**: Use the test accounts to log in
3. **Create your own accounts**: Register new users through the app
4. **Add exercises**: Use the coach dashboard to add exercises
5. **Create programs**: Build training programs for athletes

## 🆘 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your Supabase project configuration
3. Check the browser console for error messages
4. Review the Supabase documentation
