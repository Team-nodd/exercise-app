"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Activity } from 'lucide-react'
import { trainerRoadClient, TrainerRoadAPIError } from '@/lib/trainerroad/client'
import { TrainerRoadAuthForm } from '@/components/trainerroad/auth-form'
import { TrainerRoadWorkoutList } from '@/components/trainerroad/workout-list'
import { createClient } from '@/lib/supabase/client'

export function TrainerRoadDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [hasStoredSession, setHasStoredSession] = useState<boolean>(false)
  const supabase = createClient()

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus()
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('trainerroad_sessions')
            .select('is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle()
          setHasStoredSession(!!data)
        }
      } catch {}
    })()
  }, [])

  const checkAuthStatus = async () => {
    try {
      setIsCheckingAuth(true)
      setAuthError(null)
      
      const isAuth = await trainerRoadClient.checkAuthStatus()
      setIsAuthenticated(isAuth)
      
      if (isAuth) {
        console.log('✅ TRAINERROAD: User is authenticated')
      } else {
        console.log('ℹ️ TRAINERROAD: User is not authenticated')
      }
    } catch (error) {
      console.error('❌ TRAINERROAD: Error checking auth status:', error)
      setAuthError('Failed to check authentication status')
      setIsAuthenticated(false)
    } finally {
      setIsCheckingAuth(false)
    }
  }

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
    setAuthError(null)
  }

  const handleAuthError = (error: string) => {
    setAuthError(error)
    setIsAuthenticated(false)
  }

  const handleSignOut = async () => {
    try {
      await trainerRoadClient.signOut()
      setIsAuthenticated(false)
      setAuthError(null)
    } catch (error) {
      console.error('❌ TRAINERROAD: Sign out error:', error)
      setAuthError('Failed to sign out')
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg">Checking TrainerRoad connection...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {authError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{authError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Connect to TrainerRoad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Connect your TrainerRoad account to sync your training activities and view your workout history.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What you can do with TrainerRoad integration:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• View your recent TrainerRoad workouts</li>
                  <li>• See workout details including TSS, duration, and intensity</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <TrainerRoadAuthForm 
            onAuthSuccess={handleAuthSuccess}
            onAuthError={handleAuthError}
          />
          {/* {hasStoredSession && (
            <p className="text-xs text-gray-500 text-center mt-2">We found a stored TrainerRoad session. Try Refresh if you recently connected.</p>
          )} */}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 mb-3">
      {/* Connection Status */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/20">
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  Connected to TrainerRoad
                </h3>
                <p className="text-sm text-green-700 dark:text-green-200">
                  Your account is successfully connected and ready to sync data.
                </p>
              </div>
            </div>
            <div className="flex gap-2 sm:flex-row flex-col ">
              <Button
                variant="outline"
                size="sm"
                onClick={checkAuthStatus}
                disabled={isCheckingAuth}
              >
                {isCheckingAuth ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout List */}
      {/* <TrainerRoadWorkoutList /> */}
    </div>
  )
}


// https://www.trainerroad.com/app/api/career/tomhall96/recent-activities

// https://www.trainerroad.com/app/api/react-calendar/tomhall96/activities?start=2025-06-29T14:00:00.000Z&end=2025-07-27T13:59:59.999Z 
// [
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.7551020408163265,
//       "kj": 581,
//       "distanceInKm": 25.265638888888876,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 84,
//           "prescribedLevel": 1.399999976158142,
//           "levelDelta": 0.4000000059604645,
//           "difficultyRating": 1
//       },
//       "workoutId": 2372002,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 3,
//           "parentElementKind": null
//       },
//       "id": "239a39d7-906d-4743-856e-23b9ce3c5c9f",
//       "activityId": 367800310,
//       "name": "Fox",
//       "started": "2025-07-29T08:13:57",
//       "processed": "2025-07-29T09:16:07.0566214",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 5,
//       "tss": 57,
//       "associatedPlannedActivity": {
//           "id": "5dec4127-1901-4ca9-a157-25e5bf3a389e",
//           "name": "Fox",
//           "isTrWorkout": true,
//           "openType": 0,
//           "plannedTss": 58,
//           "plannedDurationInSeconds": 3600,
//           "plannedDistanceInKm": null,
//           "isManualComplete": false,
//           "actualTss": 0,
//           "metrics": {},
//           "recommendationReason": 29,
//           "planSettings": null,
//           "revealStatus": 4,
//           "wasRevealed": true
//       },
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.8122448979591836,
//       "kj": 604,
//       "distanceInKm": 23.151083333333332,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 85,
//           "prescribedLevel": 3,
//           "levelDelta": 2,
//           "difficultyRating": 2
//       },
//       "workoutId": 1792,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 3,
//           "parentElementKind": null
//       },
//       "id": "afac40df-e9a4-473e-aee0-8c906149792e",
//       "activityId": 368219116,
//       "name": "Gendarme",
//       "started": "2025-08-01T04:01:49",
//       "processed": "2025-08-01T05:05:38.6467497",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 8,
//       "tss": 66,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.8489795918367347,
//       "kj": 619,
//       "distanceInKm": 21.494694444444477,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 85,
//           "prescribedLevel": 3,
//           "levelDelta": 0,
//           "difficultyRating": 5
//       },
//       "workoutId": 1792,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 3,
//           "parentElementKind": null
//       },
//       "id": "7b9ad04e-ccbc-4c52-990c-3f70539b117a",
//       "activityId": 368714969,
//       "name": "Gendarme",
//       "started": "2025-08-04T07:51:45",
//       "processed": "2025-08-04T08:54:03.4464519",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 8,
//       "tss": 72,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.7061224489795919,
//       "kj": 553,
//       "distanceInKm": 17.56836111111113,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 84,
//           "prescribedLevel": 1,
//           "levelDelta": 0,
//           "difficultyRating": 5
//       },
//       "workoutId": 1249,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 3,
//           "parentElementKind": null
//       },
//       "id": "bd2ca634-b4e9-4284-bd99-25e344f3b524",
//       "activityId": 368974269,
//       "name": "Abney",
//       "started": "2025-08-06T00:18:25",
//       "processed": "2025-08-06T01:18:35.0652278",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 5,
//       "tss": 50,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.7795918367346939,
//       "kj": 639,
//       "distanceInKm": 23.56019444444446,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 33,
//           "prescribedLevel": 5.900000095367432,
//           "levelDelta": 4.900000095367432,
//           "difficultyRating": 4
//       },
//       "workoutId": 18053,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 10,
//           "parentElementKind": 4
//       },
//       "id": "aa5294a4-0b05-4f95-8b03-2c4139b5208e",
//       "activityId": 369263451,
//       "name": "Bays",
//       "started": "2025-08-07T22:02:05",
//       "processed": "2025-08-07T23:02:49.7186764",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 17,
//       "tss": 61,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.8244897959183674,
//       "kj": 559,
//       "distanceInKm": 22.591972222222225,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 85,
//           "prescribedLevel": 3.799999952316284,
//           "levelDelta": 0.800000011920929,
//           "difficultyRating": 1
//       },
//       "workoutId": 29855,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 4,
//           "parentElementKind": null
//       },
//       "id": "bfa8d1dc-e156-4275-bf65-ffd8f449ffd6",
//       "activityId": 369779255,
//       "name": "Baird",
//       "started": "2025-08-11T00:14:38",
//       "processed": "2025-08-11T01:15:42.5867235",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 8,
//       "tss": 68,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.7346938775510204,
//       "kj": 556,
//       "distanceInKm": 22.975833333333338,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 84,
//           "prescribedLevel": 1,
//           "levelDelta": 0,
//           "difficultyRating": 5
//       },
//       "workoutId": 2396185,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 4,
//           "parentElementKind": null
//       },
//       "id": "6e5364e8-b68b-4e42-8927-eee95a089006",
//       "activityId": 370099367,
//       "name": "Tagliaferro",
//       "started": "2025-08-13T02:29:23",
//       "processed": "2025-08-13T03:29:41.9468585",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 5,
//       "tss": 54,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.673469387755102,
//       "kj": 580,
//       "distanceInKm": 27.468833333333333,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 16,
//           "prescribedLevel": 1,
//           "levelDelta": 0,
//           "difficultyRating": 5
//       },
//       "workoutId": 355749,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 8,
//           "parentElementKind": 3
//       },
//       "id": "bfbdeed0-b0aa-480e-9dcf-ffb90719b2bf",
//       "activityId": 370386784,
//       "name": "Colosseum -2",
//       "started": "2025-08-15T00:08:54",
//       "processed": "2025-08-15T01:09:46.6584611",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 2,
//       "tss": 45,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   },
//   {
//       "$type": "ReactCalendarCyclingActivityModel",
//       "activityType": 1,
//       "eventType": 0,
//       "isOutside": false,
//       "intensityFactor": 0.8693877551020408,
//       "kj": 642,
//       "distanceInKm": 25.142111111111127,
//       "progressionDetails": {
//           "$type": "ProgressionDetailsV1Model",
//           "version": 1,
//           "progressionId": 85,
//           "prescribedLevel": 4.300000190734863,
//           "levelDelta": 0.5,
//           "difficultyRating": 1
//       },
//       "workoutId": 6577,
//       "isExternal": false,
//       "isCutShort": false,
//       "surveyResponse": {
//           "elementKind": 4,
//           "parentElementKind": null
//       },
//       "id": "97bf489b-23a6-4529-8b21-1fd69c4f9663",
//       "activityId": 370830204,
//       "name": "Clouds Rest",
//       "started": "2025-08-17T23:07:18",
//       "processed": "2025-08-18T00:10:43.5315541",
//       "durationInSeconds": 3600,
//       "notes": null,
//       "sourceWorkout": null,
//       "useInTssScore": true,
//       "profileId": 8,
//       "tss": 76,
//       "associatedPlannedActivity": null,
//       "metrics": {},
//       "values": {}
//   }
// ]
// https://www.trainerroad.com/app/api/workout-information?ids=6577
// [
//   {
//     "Id": 2372002,
//     "Name": "Fox",
//     "Duration": "01:00:00",
//     "DurationInSeconds": 3600,
//     "Tss": 58,
//     "IntensityFactor": 0.76,
//     "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/2372002/638113473191714141chart.svg",
//     "Kj": 585,
//     "ProgressionId": 84,
//     "ProgressionLevel": 1.41,
//     "WorkoutDifficultyRating": 1,
//     "IsOutside": false
//   }
// ]

// https://www.trainerroad.com/app/activities/370386784


// https://www.trainerroad.com/app/api/activities/370830204

//https://www.trainerroad.com/app/api/workouts

/** 
 * 
 * {
    "WorkoutsCacheUnavailable": false,
    "Predicate": {
        "IsDescending": false,
        "PageSize": 10,
        "PageNumber": 0,
        "TotalCount": 5350,
        "TeamIds": [],
        "RestrictToTeams": false,
        "SortProperty": "progressionLevel",
        "TeamOptions": [],
        "ZoneOptions": [
            {
                "Id": 79,
                "Name": "Anaerobic",
                "WorkoutProfileOptions": [
                    {
                        "Id": 1,
                        "Name": "Attacks",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 5,
                        "Name": "Intervals",
                        "Durations": [
                            30,
                            45
                        ]
                    },
                    {
                        "Id": 7,
                        "Name": "Mixed Intervals",
                        "Durations": [
                            60,
                            65,
                            75,
                            90,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 8,
                        "Name": "On-Offs",
                        "Durations": [
                            15,
                            20,
                            30,
                            45,
                            60,
                            75,
                            85,
                            90,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 13,
                        "Name": "Steps",
                        "Durations": [
                            20,
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120
                        ]
                    }
                ]
            },
            {
                "Id": 33,
                "Name": "Endurance",
                "WorkoutProfileOptions": [
                    {
                        "Id": 2,
                        "Name": "Sustained Power",
                        "Durations": [
                            15,
                            30,
                            45,
                            47,
                            60,
                            75,
                            90,
                            105,
                            120,
                            135,
                            150,
                            165,
                            180,
                            195,
                            210,
                            225,
                            240,
                            255,
                            270,
                            285,
                            300,
                            315,
                            330,
                            345,
                            360
                        ]
                    },
                    {
                        "Id": 17,
                        "Name": "With Bursts",
                        "Durations": [
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            135,
                            180
                        ]
                    }
                ]
            },
            {
                "Id": 41,
                "Name": "Sprint",
                "WorkoutProfileOptions": [
                    {
                        "Id": 1,
                        "Name": "Attacks",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            120
                        ]
                    },
                    {
                        "Id": 6,
                        "Name": "Max Efforts",
                        "Durations": [
                            30,
                            45,
                            60
                        ]
                    }tzxzs
                ]
            },
            {
                "Id": 84,
                "Name": "SweetSpot",
                "WorkoutProfileOptions": [
                    {
                        "Id": 2,
                        "Name": "Sustained Power",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            150
                        ]
                    },
                    {
                        "Id": 4,
                        "Name": "Hard Starts",
                        "Durations": [
                            45,
                            60,
                            75,
                            90,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 5,
                        "Name": "Intervals",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            80,
                            90,
                            105,
                            120,
                            135,
                            150,
                            165,
                            180
                        ]
                    },
                    {
                        "Id": 7,
                        "Name": "Mixed Intervals",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            100,
                            105,
                            120,
                            160,
                            180
                        ]
                    },
                    {
                        "Id": 9,
                        "Name": "Over-Unders",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            135,
                            150,
                            165,
                            180
                        ]
                    },
                    {
                        "Id": 17,
                        "Name": "With Bursts",
                        "Durations": [
                            60,
                            75,
                            90
                        ]
                    }
                ]
            },
            {
                "Id": 16,
                "Name": "Tempo",
                "WorkoutProfileOptions": [
                    {
                        "Id": 2,
                        "Name": "Sustained Power",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            135,
                            150,
                            165,
                            180,
                            270
                        ]
                    },
                    {
                        "Id": 5,
                        "Name": "Intervals",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            120,
                            135,
                            150,
                            165,
                            180,
                            195,
                            240,
                            255,
                            270,
                            285,
                            300
                        ]
                    }
                ]
            },
            {
                "Id": 83,
                "Name": "Threshold",
                "WorkoutProfileOptions": [
                    {
                        "Id": 2,
                        "Name": "Sustained Power",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            80,
                            90,
                            105,
                            120,
                            135,
                            150
                        ]
                    },
                    {
                        "Id": 4,
                        "Name": "Hard Starts",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 5,
                        "Name": "Intervals",
                        "Durations": [
                            20,
                            30,
                            45,
                            60,
                            75,
                            80,
                            90,
                            93,
                            105,
                            120,
                            135
                        ]
                    },
                    {
                        "Id": 7,
                        "Name": "Mixed Intervals",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90
                        ]
                    },
                    {
                        "Id": 9,
                        "Name": "Over-Unders",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            135,
                            150,
                            165,
                            180
                        ]
                    },
                    {
                        "Id": 11,
                        "Name": "Ramps",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90
                        ]
                    },
                    {
                        "Id": 14,
                        "Name": "Long Suprathreshold",
                        "Durations": [
                            30,
                            45,
                            60,
                            62,
                            70,
                            74,
                            75,
                            80,
                            90,
                            100,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 17,
                        "Name": "With Bursts",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            120
                        ]
                    }
                ]
            },
            {
                "Id": 85,
                "Name": "VO2Max",
                "WorkoutProfileOptions": [
                    {
                        "Id": 1,
                        "Name": "Attacks",
                        "Durations": [
                            30,
                            45,
                            57,
                            60,
                            75,
                            90,
                            120
                        ]
                    },
                    {
                        "Id": 3,
                        "Name": "Float Sets",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            130
                        ]
                    },
                    {
                        "Id": 5,
                        "Name": "Intervals",
                        "Durations": [
                            60,
                            75,
                            77,
                            80,
                            90,
                            100
                        ]
                    },
                    {
                        "Id": 7,
                        "Name": "Mixed Intervals",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90,
                            105,
                            120,
                            150
                        ]
                    },
                    {
                        "Id": 8,
                        "Name": "On-Offs",
                        "Durations": [
                            30,
                            45,
                            50,
                            60,
                            75,
                            90,
                            110,
                            120
                        ]
                    },
                    {
                        "Id": 9,
                        "Name": "Over-Unders",
                        "Durations": [
                            30
                        ]
                    },
                    {
                        "Id": 11,
                        "Name": "Ramps",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            90
                        ]
                    },
                    {
                        "Id": 14,
                        "Name": "Long Suprathreshold",
                        "Durations": [
                            30,
                            45,
                            60,
                            74,
                            75,
                            80,
                            90,
                            100,
                            105,
                            120
                        ]
                    },
                    {
                        "Id": 16,
                        "Name": "Traditional",
                        "Durations": [
                            30,
                            45,
                            60,
                            75,
                            80,
                            90,
                            100,
                            120
                        ]
                    }
                ]
            }
        ],
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
            "MemberAccessId": 432338
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
    },
    "Workouts": [
        {
            "Id": 385142,
            "MemberId": 1,
            "Duration": 25,
            "FirstPublishDate": "2018-03-19T13:42:55.787",
            "GoalDescription": "\u003Cp\u003EBy following a convenient, tightly structured assessment protocol, riders can assess changes in fitness at any time of their training season. This short test estimates FTP from an athlete\u2019s ability to sustain a gradually increasing but minimally fatiguing effort.\u003C/p\u003E\u003Cp\u003EThis test shouldn\u0027t require full recovery ahead of testing, but you should be well-rested and properly motivated enough to go truly all-out during the last few crucial minutes.\u003C/p\u003E",
            "AverageFtpPercent": 109.091034,
            "IntensityFactor": 91,
            "ExternalProviderType": null,
            "Kj": 267,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/385142/636721871074288011chart.svg",
            "Tss": 34,
            "WorkoutDescription": "\u003Cp\u003EThe Ramp Test is a fitness assessment that uses gradual increases in power to estimate your FTP. The process is simple: follow the target power as closely as possible until you can\u2019t sustain the effort. Once you stop pedaling, your FTP will be automatically calculated and you can choose to accept or reject it.\u003C/p\u003E\u003Cp\u003EStay in the saddle for the entire test, which usually takes about 25 minutes and starts with a short, easy warmup. Once the warmup is complete the target power will slightly increase each minute until it becomes very difficult to sustain. This is when you need to push yourself, turning the pedals and trying to maintain the target power until you\u2019re no longer capable of doing so. This challenging period only lasts a few minutes, but for the test to be accurate, it\u2019s important to give it everything you\u2019ve got.\u003C/p\u003E\u003Cp\u003EThe test will continue as long as you can match the target power, but once your power drops there\u2019s no reason to keep going. Stop pedaling, and a window will appear asking if you\u2019re finished; click \u201CEnd Test\u201D and your FTP will be calculated and displayed. If you accept it, your new FTP will automatically be used to set the intensity of your future workouts.\u003Cbr\u003E\u003C/p\u003E\u003Cp\u003E\u003Cb\u003ETips and Hints:\u003C/b\u003E\u003C/p\u003E\u003Cp\u003E- Follow the target power as closely as you can throughout the entire test. Small variations are normal, but surging above or below target for extended periods can affect the results.\u0026nbsp;\u003C/p\u003E\u003Cp\u003E- For the best results, do the Ramp Test when you\u2019re fueled, motivated, and well rested.\u003C/p\u003E\u003Cp\u003E- Smart Trainers and ERG mode work great for the Ramp Test but are not required. Use whatever trainer mode you typically use when training.\u0026nbsp;\u003C/p\u003E\u003Cp\u003E- Use whatever cadence feels most comfortable. A steady cadence may help you sustain a steady power output when things get tough.\u003C/p\u003E\u003Cp\u003E- Once you reach your limit and your power begins to drop, there\u2019s no reason to keep going. Stop pedaling and recover as your result is calculated.\u003C/p\u003E\u003Cp\u003E-If you\u2019re a triathlete or time trialist and you plan to do most of your training in aero position, we recommend taking the Ramp Test in this position.\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Ramp Test",
            "WorkoutTypeId": 776,
            "WorkoutLabelId": 13,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": null,
            "ProgressionId": null,
            "ProgressionLevel": null,
            "WorkoutStartTick": 300,
            "WorkoutEndTick": 1170,
            "WorkoutDifficultyRating": 0,
            "PowerZones": [],
            "Tags": [],
            "ProfileId": null,
            "ProfileName": null,
            "HasInstructions": true
        },
        {
            "Id": 4354630,
            "MemberId": 1,
            "Duration": 30,
            "FirstPublishDate": "2025-01-16T23:47:46.433",
            "GoalDescription": "\u003Cp\u003EThe primary objective here is improvement in muscular endurance accomplished by growing your ability to repeat efforts at high percentages of your FTP.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EBy working close to but below your FTP, you not only accumulate a lot of time at a meaningful level of stress, but recovery from slightly sub-threshold effort comes much more readily than recovery following work done at or just above your FTP.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003ETry to hold your spin above 85rpm and even as high as 105rpm depending on your sustainable power and cadence goals.\u003C/p\u003E",
            "AverageFtpPercent": 122.51694,
            "IntensityFactor": 81,
            "ExternalProviderType": null,
            "Kj": 300,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/4354630/638726683113882370chart.svg",
            "Tss": 33,
            "WorkoutDescription": "\u003Cp\u003EMarys is 2x6-minute intervals at 98% FTP with 5-minutes of recovery in between.\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Marys",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": null,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 83,
                "Text": "Threshold",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 83,
            "ProgressionLevel": 0.99,
            "WorkoutStartTick": 300,
            "WorkoutEndTick": 1620,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "Threshold"
            ],
            "Tags": [],
            "ProfileId": 5,
            "ProfileName": "Intervals",
            "HasInstructions": false
        },
        {
            "Id": 1249,
            "MemberId": 1,
            "Duration": 60,
            "FirstPublishDate": "2022-04-14T23:29:37.063",
            "GoalDescription": "The primary aim here is to\u0026nbsp;improve aerobic fitness via Tempo \u0026amp; Sweet Spot power levels while targeting muscle control and improved movement patterns via slow-cadence work. \u003Cbr\u003E\u003Cbr\u003EAt the same time, another goal is to stress and strengthen the connective tissues in order to prevent joint injury when workout intensities increase.\u003Cbr\u003E\u003Cbr\u003ECadence can range widely - as low as 50rpm but ideally no higher than 70rpm - depending on leg strength and joint integrity, knees especially.\u003Cdiv\u003E\u003C/div\u003E",
            "AverageFtpPercent": 226.47708,
            "IntensityFactor": 71,
            "ExternalProviderType": null,
            "Kj": 555,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/1249/637855757983837531chart.svg",
            "Tss": 50,
            "WorkoutDescription": "\u003Cp\u003EAbney is 3x9-minute sets of ascending force intervals ranging from 80-90%FTP.\u0026nbsp;\u003C/p\u003E\u003Cp\u003EEach set consists of 3x3-minute repeats with 1 minute of recovery between intervals and 5 minutes of recovery between each set of intervals.\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Abney",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 18,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 84,
                "Text": "SweetSpot",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 84,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 900,
            "WorkoutEndTick": 3480,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "SweetSpot"
            ],
            "Tags": [],
            "ProfileId": 5,
            "ProfileName": "Intervals",
            "HasInstructions": true
        },
        {
            "Id": 1258,
            "MemberId": 1,
            "Duration": 60,
            "FirstPublishDate": "2015-08-25T23:19:28.603",
            "GoalDescription": "Improved pedaling mechanics through the use of high-cadence efforts cultivating a more efficient pedalstroke and allowing better use of energy at all leg speeds - greater pedal efficiency means less wasted energy.\u003Cbr\u003E\u003Cbr\u003EHigher cadences reduce the level of muscle stress and shift the energy demand more toward the aerobic (oxygen-dependent) system and away from the anaerobic (sugar-dependent) system. Many light pedalstrokes utilize less sugar than fewer hard pedalstrokes. \u003Cbr\u003E\u003Cbr\u003ECadence can climb as high as a rider can sustain while exhibiting excellent control but should fall no lower than 90rpm. ILT cadence is a low as necessary to learn single-leg control with a goal cadence of 90rpm/leg for all durations as improvement takes place.",
            "AverageFtpPercent": 215.72742,
            "IntensityFactor": 69,
            "ExternalProviderType": null,
            "Kj": 529,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/1258/636721867569607966chart.svg",
            "Tss": 47,
            "WorkoutDescription": "Granite consists of 4x7-minute speed intervals with power\u0026nbsp;between 75-90% FTP decreasing then increasing in order to increase then decrease cadence respectively - power goes down, speed goes up and vice versa. \u003Cbr\u003E\u003Cbr\u003EIndividual leg training (ILT) drills conclude the warmup and are included between sets of ladders and 3-minute recoveries fall between all intervals.",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Granite",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 17,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 84,
                "Text": "SweetSpot",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 84,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 600,
            "WorkoutEndTick": 3300,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "SweetSpot"
            ],
            "Tags": [],
            "ProfileId": 5,
            "ProfileName": "Intervals",
            "HasInstructions": true
        },
        {
            "Id": 1259,
            "MemberId": 1,
            "Duration": 60,
            "FirstPublishDate": "2024-05-27T16:27:09.92",
            "GoalDescription": "\u003Cp\u003EThe primary focus is Improved pedaling mechanics through the use of high-cadence efforts that cultivate a more efficient pedalstroke and allow better use of energy at all leg speeds.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EHigher cadences reduce the level of muscle stress and shift the energy demand more toward the aerobic system and away from the anaerobic, sugar-dependent system - many light pedalstrokes utilize less sugar than fewer hard pedalstrokes.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003ECadence can climb as high as a rider can sustain while exhibiting excellent control but should fall no lower than 90rpm. ILT cadence is a low as necessary to learn single-leg control with a goal cadence of 90rpm/leg for all durations as improvement takes place.\u003C/p\u003E\u003Cdiv\u003E\u003C/div\u003E",
            "AverageFtpPercent": 236.129,
            "IntensityFactor": 72,
            "ExternalProviderType": null,
            "Kj": 579,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/1259/638524241121462053chart.svg",
            "Tss": 52,
            "WorkoutDescription": "\u003Cdiv\u003E\u003Cp\u003ESteamboat consists of 4x8-minute spin-ups between 78-84% FTP where leg speed is the focus. Each interval consists of 4 quick minutes, 3 quicker minutes, and 1 really quick minute at relatively low power output.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003E9 minutes of ILT (Individual Leg Training) precedes the spin-ups, and 3 minutes of recovery fall between intervals.\u003C/p\u003E\u003Cdiv\u003E\u003Cp\u003E\u003C/p\u003E\u003C/div\u003E\u003C/div\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Steamboat",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 17,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 84,
                "Text": "SweetSpot",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 84,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 840,
            "WorkoutEndTick": 3300,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "SweetSpot"
            ],
            "Tags": [],
            "ProfileId": 5,
            "ProfileName": "Intervals",
            "HasInstructions": true
        },
        {
            "Id": 1887,
            "MemberId": 1,
            "Duration": 4,
            "FirstPublishDate": "2024-05-30T22:57:43.243",
            "GoalDescription": "Familiarize new TrainerRoad subscribers with the basics of a power-based ride.\u003Cbr\u003E\u003Cbr\u003EIf you\u0027re a user of a load-restricted device like a CompuTrainer, simply maintain a cadence between 85-95rpm - the steadier the better - over the course of this 4 minutes.",
            "AverageFtpPercent": 20.111801,
            "IntensityFactor": 88,
            "ExternalProviderType": null,
            "Kj": 49,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/1887/638527067992539103chart.svg",
            "Tss": 5,
            "WorkoutDescription": "This is a very quick, 4-minute walkthrough showcasing the basic features of TrainerRoad.\u003Cbr\u003E\u003Cbr\u003EOnce you\u0027ve updated your FTP on the \u0027Profile\u0027 tab, this short ride will recommend target outputs in watts based on your personal capabilities. Simply ride along and try to match your effort to the workout\u0027s targets.",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Power Training Ridethrough",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 18,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 83,
                "Text": "Threshold",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 83,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 80,
            "WorkoutEndTick": 220,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "Threshold"
            ],
            "Tags": [],
            "ProfileId": null,
            "ProfileName": null,
            "HasInstructions": true
        },
        {
            "Id": 5457,
            "MemberId": 1,
            "Duration": 90,
            "FirstPublishDate": "2021-10-28T00:32:46.017",
            "GoalDescription": "\u003Cp\u003ELeg-speed drills are aimed at improving pedal economy during lower-intenisty\u0026nbsp;rides.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EBeginning cadence should be above 90rpm, then simply spin more quickly until you\u0027ve reached a quicker, but still controlled\u0026nbsp;spin upwards of 110rpm\u0026nbsp;without rocking or bouncing in the saddle. Remain smooth \u0026amp; relaxed and hold this high leg speed\u0026nbsp;for the duration of the interval as long as you can maintain your form.\u003C/p\u003E",
            "AverageFtpPercent": 333.01608,
            "IntensityFactor": 63,
            "ExternalProviderType": null,
            "Kj": 816,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/5457/637709779855869412chart.svg",
            "Tss": 60,
            "WorkoutDescription": "\u003Cp\u003ETehipite consists of 2 long blocks of Endurance work at 60% FTP and includes 6x3-minute intervals of leg-speed drills at 70-80% FTP with 3 minutes of recovery between intervals.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Tehipite",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": null,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 16,
                "Text": "Tempo",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 16,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 570,
            "WorkoutEndTick": 5250,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "Tempo"
            ],
            "Tags": [],
            "ProfileId": null,
            "ProfileName": null,
            "HasInstructions": true
        },
        {
            "Id": 5460,
            "MemberId": 1,
            "Duration": 60,
            "FirstPublishDate": "2019-05-17T20:19:16.457",
            "GoalDescription": "\u003Cp\u003ELeg-speed drills are aimed at improving pedal economy during a light/recovery ride. \u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EFocus on actively kicking over the top of the pedal stroke \u0026amp; pulling back across the bottom of the pedal stroke while remaining relaxed all with the intent of refining your pedaling technique, expending less energy at higher cadences \u0026amp; accumulating some extra, low-intensity mileage. \u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003E\u003Cspan\u003EFor the 3-minute intervals, the beginning cadence should be above 90rpm, then simply spin more quickly until you\u2019ve reached a spin between 110-120rpm without rocking or bouncing in the saddle.\u003C/span\u003E\u003Cbr\u003E\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003E Remain smooth \u0026amp; relaxed and hold this high rpm for the duration of the interval as long as you can maintain your form.\u003C/p\u003E",
            "AverageFtpPercent": 189.33072,
            "IntensityFactor": 53,
            "ExternalProviderType": null,
            "Kj": 464,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/5460/636937212149882299chart.svg",
            "Tss": 28,
            "WorkoutDescription": "\u003Cp\u003EObelisk is 4x3-minute intervals of leg-speed drills at a very low 60% FTP with 3 minutes of rest between intervals. \u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EKeep the pressure on the pedals light and your intensity low to moderate regardless of your cadence. \u003C/p\u003E\u003Cp\u003E\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Obelisk",
            "WorkoutTypeId": 812,
            "WorkoutLabelId": 2,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 33,
                "Text": "Endurance",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 33,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 1260,
            "WorkoutEndTick": 2520,
            "WorkoutDifficultyRating": 6,
            "PowerZones": [
                "Endurance"
            ],
            "Tags": [],
            "ProfileId": 2,
            "ProfileName": "Sustained Power",
            "HasInstructions": true
        },
        {
            "Id": 5755,
            "MemberId": 1,
            "Duration": 20,
            "FirstPublishDate": "2018-01-09T14:55:37.15",
            "GoalDescription": "\u003Cp\u003ESimply, this short warming workout looks to properly prep your muscles \u0026amp; lungs for Sweet Spot \u0026amp; Threshold workouts where the built-in warmup is too short for your needs.\u003C/p\u003E",
            "AverageFtpPercent": 76.44744,
            "IntensityFactor": 72,
            "ExternalProviderType": null,
            "Kj": 187,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/5755/636721868007364726chart.svg",
            "Tss": 17,
            "WorkoutDescription": "\u003Cp\u003EClyde is a short warmup that can be placed in front of most moderate-intensity, subthreshold workouts.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EFollowing 10 minutes of gradual, low-intensity spinning, a 5-minute effort at 95% FTP prepares for workouts that might be a little short on warmup.\u003C/p\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Clyde",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 17,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 83,
                "Text": "Threshold",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 83,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 600,
            "WorkoutEndTick": 900,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "Threshold"
            ],
            "Tags": [],
            "ProfileId": 5,
            "ProfileName": "Intervals",
            "HasInstructions": false
        },
        {
            "Id": 5756,
            "MemberId": 1,
            "Duration": 20,
            "FirstPublishDate": "2021-06-30T18:54:08.47",
            "GoalDescription": "\u003Cp\u003EWarm up for Sweet Spot workouts, Threshold workouts, VO2max workouts and even Anaerobic workouts anytime a workout\u0027s warmup is insufficiently brief.\u003C/p\u003E",
            "AverageFtpPercent": 72.33939,
            "IntensityFactor": 79,
            "ExternalProviderType": null,
            "Kj": 177,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/5756/637606760620619432chart.svg",
            "Tss": 21,
            "WorkoutDescription": "\u003Cdiv\u003E\u003Cp\u003EDavis begins with 5 minutes of gradual, low-intensity spinning, followed by a 3-minute effort from 90-95% FTP and then concludes with 2 high-intensity, 1-minute ramps up to 130-140% FTP. \u003C/p\u003E\u003Cp\u003E\u003Cp\u003EThis warmup works well for a wide range of workouts that might include subthreshold and suprathreshold efforts. \u003C/p\u003E\u003Cp\u003E\u003Cp\u003EFollow this warmup directly with 5 minutes of recovery riding prior to beginning your workout, or simply follow it with the easy 5 minutes that kick off many of our interval workouts.\u003C/p\u003E\u003C/div\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Davis",
            "WorkoutTypeId": 809,
            "WorkoutLabelId": 13,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 79,
                "Text": "Anaerobic",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 79,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 660,
            "WorkoutEndTick": 900,
            "WorkoutDifficultyRating": 5,
            "PowerZones": [
                "Anaerobic"
            ],
            "Tags": [],
            "ProfileId": 13,
            "ProfileName": "Steps",
            "HasInstructions": false
        },
        {
            "Id": 18127,
            "MemberId": 1,
            "Duration": 45,
            "FirstPublishDate": "2022-08-08T15:10:23.98",
            "GoalDescription": "\u003Cp\u003EThe goals behind the Recess rides are rather wide-ranging and include adaptations such as increased resistance to muscle damage, enhanced neuromuscular coordination (i.e. improved pedal economy), increased fat metabolism, and heat acclimation to name a few.\u003C/p\u003E\u003Cdiv\u003E\u003C/div\u003E",
            "AverageFtpPercent": 134.69511,
            "IntensityFactor": 50,
            "ExternalProviderType": null,
            "Kj": 330,
            "PicUrl": "https://trainrdtrprod01un1hot01.blob.core.windows.net/member-public/8299afad-6265-4d8a-a69b-91aff5e37491/workouts/18127/637955682671734784chart.svg",
            "Tss": 19,
            "WorkoutDescription": "\u003Cdiv\u003E\u003Cp\u003EThe Recess rides range anywhere from 20-60 minutes in duration at roughly 50% FTP.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EExhausted rides, sometimes referred to as \u0022accumulation rides\u0022 or \u0022depleted rides\u0022 are performed within 4-24 hours after your last key workout, race/event, or any other similar, stressful ride.\u003C/p\u003E\u003Cp\u003E\u003C/p\u003E\u003Cp\u003EThese rides should leave you no more fatigued than you were before you hopped on your bike and there are no strict rules governing effort level as long as these feel recuperative and do not negatively impact your next key workout.\u003C/p\u003E\u003C/div\u003E\u003Cdiv\u003E\u003C/div\u003E",
            "WorkoutAlternateDescription": null,
            "WorkoutName": "Recess -4",
            "WorkoutTypeId": 812,
            "WorkoutLabelId": 2,
            "IsOutside": false,
            "IndoorAlternativeId": null,
            "Progression": {
                "Id": 33,
                "Text": "Endurance",
                "MemberId": 1,
                "Updated": "0001-01-01T00:00:00",
                "TranslationsUpdated": null
            },
            "ProgressionId": 33,
            "ProgressionLevel": 1,
            "WorkoutStartTick": 60,
            "WorkoutEndTick": 2640,
            "WorkoutDifficultyRating": 6,
            "PowerZones": [
                "Endurance"
            ],
            "Tags": [],
            "ProfileId": 2,
            "ProfileName": "Sustained Power",
            "HasInstructions": true
        }
    ]
}
 * 
 */
