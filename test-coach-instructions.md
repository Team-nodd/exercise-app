# Test Coach Account Setup

## Option 1: Disable Email Verification (Recommended for Testing)

1. **Go to Supabase Dashboard**

   - Navigate to your project
   - Go to **Authentication → Settings**
   - Find **Email Auth** section
   - **Disable** "Enable email confirmations"
   - Save the changes

2. **Create Test Coach Account**

   - Go to **SQL Editor**
   - Run the `create-test-coach.sql` script
   - This creates a coach profile in the database

3. **Register the Coach Account**

   - Go to your app's registration page
   - Use these credentials:
     - **Email**: `coach@test.com`
     - **Password**: `password123`
     - **Name**: `Test Coach`
     - **Role**: `Coach`

4. **Login with the Coach Account**
   - Go to login page
   - Use the same credentials
   - Should redirect to `/coach/dashboard`

## Option 2: Use Existing Account (If you already registered)

If you already registered with `coach@test.com`:

1. **Check if email is verified**

   - Go to Supabase Dashboard → Authentication → Users
   - Find your user and check if email is confirmed

2. **If not verified, manually confirm**

   - Click on the user
   - Set "Email confirmed at" to current time
   - Save changes

3. **Login with your credentials**

## Test Credentials

- **Email**: `coach@test.com`
- **Password**: `password123`
- **Role**: `Coach`

## Troubleshooting

If login still doesn't work:

1. **Check environment variables** - Make sure `.env.local` exists
2. **Test connection** - Use the debug component on login page
3. **Check Supabase logs** - Look for any errors in the dashboard
4. **Verify user exists** - Check both `auth.users` and `public.users` tables
