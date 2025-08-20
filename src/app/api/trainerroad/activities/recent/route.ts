import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { TrainerRoadActivitiesResponse } from '@/lib/trainerroad/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const userId = searchParams.get('userId')

    let trCookies: string[] = []

    if (userId) {
      // For coach accessing athlete's data, try to get the athlete's session from database
      const { createServerClient } = await import('@/lib/supabase/server')
      const supabase = await createServerClient()
      
      
      const { data: session, error: sessionError } = await supabase
        .from('trainerroad_sessions')
        .select('cookies')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (sessionError) {
        console.log('❌ TRAINERROAD API: Error fetching session:', sessionError)
      }

      if (session) {

        // Check if the session has real TrainerRoad cookies (not dummy ones)
        if (session.cookies.includes('SharedTrainerRoadAuth')) {
          trCookies = session.cookies.split('; ').map((cookie: string) => cookie.trim())

        } else {

        }
      } else {

      }

      // If no valid session cookies from database, try to get from browser cookies
      if (trCookies.length === 0) {
        const cookieStore = await cookies()
        trCookies = Array.from(cookieStore.getAll())
          .filter(cookie => cookie.name.startsWith('tr_'))
          .map(cookie => `${cookie.name.substring(3)}=${cookie.value}`)
        

      }
    } else {
      // For current user, get cookies from request
      const cookieStore = await cookies()
      trCookies = Array.from(cookieStore.getAll())
        .filter(cookie => cookie.name.startsWith('tr_'))
        .map(cookie => `${cookie.name.substring(3)}=${cookie.value}`)
    }
    
    if (trCookies.length === 0) {

      return NextResponse.json(
        { error: 'Not authenticated with TrainerRoad' },
        { status: 401 }
      )
    }



    // Use POST method like the browser does
    const activitiesResponse = await fetch('https://www.trainerroad.com/app/api/workouts', {
      method: 'POST',
      headers: {
        'Cookie': trCookies.join('; '),
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.trainerroad.com/',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      body: JSON.stringify({
        "IsDescending": false,
        "PageSize": 10,
        "PageNumber": 0,
        "TotalCount": 0,
        "TeamIds": [],
        "RestrictToTeams": false,
        "SortProperty": "progressionLevel",
        "TeamOptions": [],
        "ZoneOptions": [],
        "SearchText": "",
        "Durations": {
          "LessThanFortyFive": false,
          "FortyFive": false,
          "OneHour": false,
          "OneHourFifteen": false,
          "OneHourThirty": false,
          "OneHourFortyFive": false,
          "TwoHours": false,
          "TwoHoursFifteen": false,
          "TwoHoursThirty": false,
          "MoreThanTwoHoursThirty": false
        },
        "WorkoutInstructions": {
          "Yup": false,
          "Nope": false
        },
        "Custom": {
          "Yup": false,
          "Nope": false,
          "MemberAccessId": 0
        },
        "Favorite": {
          "Yup": false,
          "Nope": false,
          "FavoriteWorkoutIds": []
        },
        "WorkoutTags": {
          "WorkoutTagIds": []
        },
        "WorkoutLabels": {
          "WorkoutLabelIds": []
        },
        "Progressions": {
          "ProgressionIds": [],
          "ProgressionLevels": [],
          "ProfileIds": [],
          "WorkoutTypeIds": [],
          "AdaptiveTrainingVersion": 1000
        },
        "WorkoutTypes": {
          "Standard": false,
          "Test": false,
          "Warmup": false,
          "RaceSimulation": false,
          "Video": false,
          "Outside": false
        },
        "WorkoutDifficultyRatings": {
          "Productive": false,
          "Stretch": false,
          "Breakthrough": false,
          "NotRecommended": false,
          "Achievable": false,
          "Recovery": false,
          "AdaptiveTrainingVersion": 1000
        },
        "AllProfiles": {
          "ProfileIds": []
        }
      }),
    })


    
    // Log the response for debugging

    
    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text()

    }

    if (!activitiesResponse.ok) {
      if (activitiesResponse.status === 401 || activitiesResponse.status === 403) {
        // Clear invalid session cookies
        const cookieStore = await cookies()
        const trCookies = Array.from(cookieStore.getAll())
          .filter(cookie => cookie.name.startsWith('tr_'))
        
        for (const cookie of trCookies) {
          cookieStore.delete(cookie.name)
        }

        return NextResponse.json(
          { error: 'TrainerRoad session expired. Please sign in again.' },
          { status: 401 }
        )
      }


      const errorText = await activitiesResponse.text()

      
      return NextResponse.json(
        { error: 'Failed to fetch workouts from TrainerRoad' },
        { status: activitiesResponse.status }
      )
    }

    const responseData = await activitiesResponse.json()


    let activities: any[] = []

    if (Array.isArray(responseData)) {
      activities = responseData
    } else if (responseData && typeof responseData === 'object') {
      // Check for the Workouts property specifically first
      if (Array.isArray(responseData.Workouts)) {
        activities = responseData.Workouts
      } else {
        // Fallback to other possible array properties
        const possibleArrays = ['data', 'workouts', 'results', 'activities', 'items', 'records', 'list', 'entries', 'content']
        for (const key of possibleArrays) {
          if (Array.isArray(responseData[key])) {
            activities = responseData[key]
            break
          }
        }
      }
    }

    if (!Array.isArray(activities)) {
      return NextResponse.json(
        { error: 'Invalid response format from TrainerRoad' },
        { status: 500 }
      )
    }

    // Note: This appears to be workout templates, not completed activities
    // We might need a different endpoint for completed workouts
    if (activities.length > 0) {
    }
    
    // For now, just return the workouts (but these are templates, not completed activities)
    const sortedActivities = activities.slice(0, limit)

    
    return NextResponse.json(sortedActivities)

  } catch (error) {
    console.error('❌ TRAINERROAD API: Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}