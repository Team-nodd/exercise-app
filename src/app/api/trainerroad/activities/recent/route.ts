import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { TrainerRoadActivitiesResponse } from '@/lib/trainerroad/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const cookieStore = await cookies()
    
    // Get TrainerRoad session cookies
    const trCookies = Array.from(cookieStore.getAll())
      .filter(cookie => cookie.name.startsWith('tr_'))
      .map(cookie => `${cookie.name.substring(3)}=${cookie.value}`)
    
    if (trCookies.length === 0) {
      return NextResponse.json(
        { error: 'Not authenticated with TrainerRoad' },
        { status: 401 }
      )
    }

    console.log('🔄 TRAINERROAD API: Using POST method for workouts API...')

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

    console.log('🔍 TRAINERROAD API: Workouts API response status:', activitiesResponse.status)
    
    // Log the response for debugging
    console.log('🔍 TRAINERROAD API: Response headers:', Object.fromEntries(activitiesResponse.headers.entries()))
    
    if (!activitiesResponse.ok) {
      const errorText = await activitiesResponse.text()
      console.log('🔍 TRAINERROAD API: Error response body:', errorText.substring(0, 1000))
      console.log('🔍 TRAINERROAD API: Cookies sent:', trCookies.join('; ').substring(0, 200) + '...')
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

      console.error('❌ TRAINERROAD API: Failed to fetch workouts:', activitiesResponse.status)
      const errorText = await activitiesResponse.text()
      console.error('❌ TRAINERROAD API: Error response:', errorText)
      
      return NextResponse.json(
        { error: 'Failed to fetch workouts from TrainerRoad' },
        { status: activitiesResponse.status }
      )
    }

    const responseData = await activitiesResponse.json()
    console.log('🔍 TRAINERROAD API: Response type:', typeof responseData)
    console.log('🔍 TRAINERROAD API: Response keys:', Object.keys(responseData))
    console.log('🔍 TRAINERROAD API: Response preview:', JSON.stringify(responseData).substring(0, 500))

    let activities: any[] = []

    if (Array.isArray(responseData)) {
      activities = responseData
    } else if (responseData && typeof responseData === 'object') {
      // Check for the Workouts property specifically first
      if (Array.isArray(responseData.Workouts)) {
        console.log(`🔍 TRAINERROAD API: Found Workouts array with length: ${responseData.Workouts.length}`)
        activities = responseData.Workouts
      } else {
        console.log('🔍 TRAINERROAD API: No Workouts property found, checking other properties...')
        // Fallback to other possible array properties
        const possibleArrays = ['data', 'workouts', 'results', 'activities', 'items', 'records', 'list', 'entries', 'content']
        for (const key of possibleArrays) {
          if (Array.isArray(responseData[key])) {
            console.log(`🔍 TRAINERROAD API: Found activities array in property: ${key}`)
            activities = responseData[key]
            break
          }
        }
      }
    }

    if (!Array.isArray(activities)) {
      console.error('❌ TRAINERROAD API: Could not find activities array in response')
      return NextResponse.json(
        { error: 'Invalid response format from TrainerRoad' },
        { status: 500 }
      )
    }

    // Note: This appears to be workout templates, not completed activities
    // We might need a different endpoint for completed workouts
    console.log('🔍 TRAINERROAD API: Activities array length:', activities.length)
    if (activities.length > 0) {
      console.log('🔍 TRAINERROAD API: First workout item structure:', JSON.stringify(activities[0]).substring(0, 300))
    } else {
      console.log('🔍 TRAINERROAD API: No activities found in response')
    }
    
    // For now, just return the workouts (but these are templates, not completed activities)
    const sortedActivities = activities.slice(0, limit)

    console.log(`✅ TRAINERROAD API: Fetched ${sortedActivities.length} workouts from workouts API`)
    
    return NextResponse.json(sortedActivities)

  } catch (error) {
    console.error('❌ TRAINERROAD API: Error fetching activities:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}