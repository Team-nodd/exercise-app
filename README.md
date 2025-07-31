# FitTracker Pro - Exercise Program Management

A professional exercise program management system for coaches and athletes, built with Next.js, Supabase, and TypeScript.

## 🚀 Features

### For Coaches

- **Program Management**: Create and manage personalized exercise programs for athletes
- **Exercise Library**: Build and maintain a comprehensive exercise database
- **Athlete Tracking**: Monitor athlete progress and workout completion
- **Dashboard**: Overview of all programs and athlete performance

### For Athletes

- **Workout Tracking**: View and complete assigned workouts
- **Progress Monitoring**: Track performance and workout history
- **Program Overview**: See current and upcoming training programs
- **Personal Dashboard**: Monitor personal fitness journey

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Supabase Auth with role-based access
- **Database**: PostgreSQL with Row Level Security (RLS)

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd exercise-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**To get your Supabase credentials:**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings → API**
4. Copy the **Project URL** and **anon/public key**

### 4. Set Up Database

#### Option A: Run SQL Scripts (Recommended)

1. Go to your Supabase Dashboard → **SQL Editor**
2. Run the following scripts in order:

```sql
-- 1. Create database schema
-- Run the schema from src/types/database.ts

-- 2. Set up RLS policies
-- Run supabase-rls-policies.sql

-- 3. Create database trigger for user profiles
-- Run supabase-trigger.sql

-- 4. Create test coach account (optional)
-- Run create-coach-user.sql
```

#### Option B: Use Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize and push schema
supabase init
supabase db push
```

### 5. Configure Authentication

1. Go to **Authentication → Settings** in your Supabase Dashboard
2. Configure your authentication providers
3. For development, you can disable email confirmations temporarily

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 👥 User Roles

### Coach Account

- **Email**: `coach@test.com`
- **Password**: `password123`
- **Access**: Coach dashboard, program management, exercise library

### Athlete Account

- Register through the signup form
- Access: Personal dashboard, workout tracking, progress monitoring

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Athlete dashboard
│   ├── coach/            # Coach dashboard
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── dashboard/        # Dashboard components
│   ├── coach/           # Coach-specific components
│   ├── exercises/       # Exercise-related components
│   ├── layout/          # Layout components
│   ├── providers/       # Context providers
│   └── ui/              # Reusable UI components
├── lib/                  # Utility libraries
│   └── supabase/        # Supabase client configuration
├── types/               # TypeScript type definitions
└── styles/              # Global styles
```

## 🔧 Configuration

### Database Schema

The application uses the following main tables:

- **users**: User profiles with roles (coach/athlete)
- **exercises**: Exercise library with instructions
- **programs**: Training programs created by coaches
- **workouts**: Individual workout sessions
- **workout_exercises**: Exercise details within workouts

### Authentication

- **Supabase Auth**: Handles user authentication
- **Role-based Access**: Coaches and athletes have different permissions
- **Row Level Security**: Database-level security policies

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The application can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🧪 Testing

### Manual Testing

1. **Test Coach Login**:

   - Use credentials: `coach@test.com` / `password123`
   - Should redirect to `/coach/dashboard`

2. **Test Registration**:

   - Create a new athlete account
   - Verify email confirmation (if enabled)

3. **Test Authentication Flow**:
   - Use the debug components on the login page
   - Check browser console for detailed logs

### Debug Components

The application includes debug components for troubleshooting:

- **Supabase Test**: Tests database connectivity
- **Auth Test**: Tests authentication flow
- **Connection Test**: Verifies environment variables

## 🔒 Security

- **Row Level Security (RLS)**: Database-level access control
- **Environment Variables**: Sensitive data stored securely
- **Input Validation**: Client and server-side validation
- **Authentication**: Secure user authentication with Supabase

## 📝 API Documentation

### Supabase Client

The application uses Supabase for:

- **Authentication**: User signup, login, session management
- **Database**: CRUD operations on all tables
- **Real-time**: Live updates (future feature)

### Key Functions

```typescript
// Create Supabase client
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Authentication
await supabase.auth.signUp({ email, password })
await supabase.auth.signInWithPassword({ email, password })

// Database operations
await supabase.from('users').select('*')
await supabase.from('programs').insert({ ... })
```

## 🐛 Troubleshooting

### Common Issues

1. **"Email not confirmed" error**:

   - Disable email confirmations in Supabase Auth settings
   - Or manually confirm the user in Supabase dashboard

2. **"Missing environment variables"**:

   - Ensure `.env.local` file exists with correct Supabase credentials
   - Restart development server after adding environment variables

3. **"Connection failed"**:

   - Check Supabase project status
   - Verify URL and API key are correct
   - Check network connectivity

4. **"RLS policy violation"**:
   - Run the RLS policies script in Supabase SQL Editor
   - Ensure user has proper permissions

### Debug Steps

1. Check browser console for error messages
2. Use debug components on login page
3. Verify Supabase project configuration
4. Check environment variables
5. Test database connectivity

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Check the troubleshooting section
- Review Supabase documentation
- Open an issue on GitHub

## 🔄 Updates

Stay updated with the latest changes:

- Follow the repository for updates
- Check the changelog
- Review breaking changes in major versions
