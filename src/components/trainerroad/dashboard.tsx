"use client"

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, CheckCircle, Loader2, RefreshCw, Activity } from 'lucide-react'
import { trainerRoadClient, TrainerRoadAPIError } from '@/lib/trainerroad/client'
import { TrainerRoadAuthForm } from '@/components/trainerroad/auth-form'
import { TrainerRoadWorkoutList } from '@/components/trainerroad/workout-list'

export function TrainerRoadDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus()
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
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
            <div className="flex gap-2">
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
      <TrainerRoadWorkoutList />
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
