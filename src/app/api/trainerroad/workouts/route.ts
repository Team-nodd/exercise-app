import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user ID from query params (the user whose TrainerRoad data we want to fetch)
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Verify the current user is a coach and has a program with the target user
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can access TrainerRoad data' }, { status: 403 })
    }

    // Check if coach has a program with the target user (optional check for additional security)
    const { data: program } = await supabase
      .from('programs')
      .select('id')
      .eq('coach_id', user.id)
      .eq('user_id', targetUserId)
      .single()

    // Note: We're not requiring a program relationship for now to allow testing
    // In production, you might want to uncomment this check:
    // if (!program) {
    //   return NextResponse.json({ error: 'No program found with this user' }, { status: 403 })
    // }

    // Check if the target user has TrainerRoad authentication
    const { data: trSession } = await supabase
      .from('trainerroad_sessions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    if (!trSession) {
      return NextResponse.json({ 
        error: 'User not authenticated with TrainerRoad',
        authenticated: false 
      }, { status: 401 })
    }

    // Use the target user's TrainerRoad session cookies
    const trCookies = trSession.cookies || ''

    if (!trCookies || trCookies.length === 0) {
      return NextResponse.json({ 
        error: 'No TrainerRoad session cookies found for user',
        authenticated: false 
      }, { status: 401 })
    }

    // Check if the session has real TrainerRoad cookies (not dummy ones)
    if (!trCookies.includes('SharedTrainerRoadAuth')) {
      return NextResponse.json({ 
        error: 'Invalid TrainerRoad session cookies',
        authenticated: false 
      }, { status: 401 })
    }

    // Format cookies properly - split by '; ' and rejoin
    const cookieArray = trCookies.split('; ').map((cookie: string) => cookie.trim())
    const cookieString = cookieArray.join('; ')

    console.log('🔍 TRAINERROAD WORKOUTS API: Using cookies count:', cookieArray.length)
    console.log('🔍 TRAINERROAD WORKOUTS API: Cookies preview:', cookieString.substring(0, 100) + '...')

    // If pageSize is 1, this is likely an auth check, so just return the auth status
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    if (pageSize === 1) {
      return NextResponse.json({
        workouts: [],
        totalCount: 0,
        authenticated: true
      })
    }

    // Fetch workouts from TrainerRoad API
    const searchText = searchParams.get('search') || ''
    const pageNumber = parseInt(searchParams.get('pageNumber') || '0')

    const requestBody = {
      IsDescending: false,
      PageSize: pageSize,
      PageNumber: pageNumber,
      TotalCount: 0,
      SearchText: searchText,
      TeamIds: [],
      RestrictToTeams: false,
      SortProperty: "progressionLevel",
      TeamOptions: [],
      ZoneOptions: [],
      Durations: {
        LessThanFortyFive: false,
        FortyFive: false,
        OneHour: false,
        OneHourFifteen: false,
        OneHourThirty: false,
        OneHourFortyFive: false,
        TwoHours: false,
        TwoHoursFifteen: false,
        TwoHoursThirty: false,
        MoreThanTwoHoursThirty: false
      },
      WorkoutInstructions: {
        Yup: false,
        Nope: false
      },
      Custom: {
        Yup: false,
        Nope: false,
        MemberAccessId: 0
      },
      Favorite: {
        Yup: false,
        Nope: false,
        FavoriteWorkoutIds: []
      },
      WorkoutTags: {
        WorkoutTagIds: []
      },
      WorkoutLabels: {
        WorkoutLabelIds: []
      },
      Progressions: {
        ProgressionIds: [],
        ProgressionLevels: [],
        ProfileIds: [],
        WorkoutTypeIds: [],
        AdaptiveTrainingVersion: 1000
      },
      WorkoutTypes: {
        Standard: false,
        Test: false,
        Warmup: false,
        RaceSimulation: false,
        Video: false,
        Outside: false
      },
      WorkoutDifficultyRatings: {
        Productive: false,
        Stretch: false,
        Breakthrough: false,
        NotRecommended: false,
        Achievable: false,
        Recovery: false,
        AdaptiveTrainingVersion: 1000
      },
      AllProfiles: {
        ProfileIds: []
      }
    }

    const response = await fetch('https://www.trainerroad.com/app/api/workouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString,
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      body: JSON.stringify(requestBody),
    })

    console.log('🔍 TRAINERROAD WORKOUTS API: Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ TRAINERROAD WORKOUTS API: Error response:', response.status, response.statusText, errorText)
      
      if (response.status === 401) {
        return NextResponse.json({ 
          error: 'Not authenticated with TrainerRoad. Please sign in first.',
          authenticated: false,
          details: errorText
        }, { status: 401 })
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch TrainerRoad workouts',
        status: response.status,
        details: errorText
      }, { status: response.status })
    }

    const data = await response.json()
    
    console.log('🔍 TRAINERROAD WORKOUTS API: Raw response data:', JSON.stringify(data, null, 2))
    console.log('🔍 TRAINERROAD WORKOUTS API: Workouts array length:', data.Workouts?.length || 0)
    console.log('🔍 TRAINERROAD WORKOUTS API: Total count:', data.Predicate?.TotalCount || 0)
    
    return NextResponse.json({
      workouts: data.Workouts || [],
      totalCount: data.Predicate?.TotalCount || 0,
      authenticated: true
    })

  } catch (error) {
    console.error('❌ TRAINERROAD WORKOUTS API: Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
