"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, ExternalLink, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { trainerRoadClient } from "@/lib/trainerroad/client"

interface TrainerRoadWorkout {
  Id: number
  WorkoutName: string
  Duration: number
  Tss: number
  IntensityFactor: number
  AverageFtpPercent: number
  WorkoutDescription: string
  GoalDescription: string
  Progression?: {
    Text: string
  }
  ProfileName?: string
  PowerZones?: string[]
  WorkoutDifficultyRating: number
}

interface TrainerRoadWorkoutSelectorProps {
  userId: string
  onWorkoutSelect: (workout: TrainerRoadWorkout) => void
  selectedWorkoutId?: number | null
  disabled?: boolean
}

export function TrainerRoadWorkoutSelector({ 
  userId, 
  onWorkoutSelect, 
  selectedWorkoutId,
  disabled = false 
}: TrainerRoadWorkoutSelectorProps) {
  const [allWorkouts, setAllWorkouts] = useState<TrainerRoadWorkout[]>([])
  const [filteredWorkouts, setFilteredWorkouts] = useState<TrainerRoadWorkout[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedWorkout, setSelectedWorkout] = useState<TrainerRoadWorkout | null>(null)
  const [totalCount, setTotalCount] = useState(0)
  const [hasInitialized, setHasInitialized] = useState(false)
  const isSelectingRef = useRef(false)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize] = useState(20)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const fetchWorkouts = useCallback(async (page = 0, search = "", isLoadMore = false) => {
    try {
      if (isLoadMore) {
        setIsLoadingMore(true)
      } else {
      setLoading(true)
      }
      
      
      // Use the proper workouts API with pagination and search
      const result = await trainerRoadClient.getWorkouts(userId, {
        search: search.trim(),
        pageSize,
        pageNumber: page
      })
      
      
      if (!result.authenticated) {
        throw new Error('User not authenticated with TrainerRoad')
      }
      
      // Convert workouts to display format
      const workoutTemplates = (result.workouts || []).map(workout => {
        return {
          Id: workout.Id,
          WorkoutName: workout.WorkoutName || 'Unknown Workout',
          Duration: workout.Duration || 0,
          Tss: workout.Tss || 0,
          IntensityFactor: workout.IntensityFactor || 0,
          AverageFtpPercent: workout.AverageFtpPercent || 0,
          WorkoutDescription: workout.WorkoutDescription || '',
          GoalDescription: workout.GoalDescription || '',
          Progression: workout.Progression ? {
            Text: workout.Progression.Text
          } : undefined,
          ProfileName: workout.ProfileName || undefined,
          PowerZones: workout.PowerZones || [],
          WorkoutDifficultyRating: workout.WorkoutDifficultyRating || 3
        }
      })
      

      if (isLoadMore) {
        // Append to existing workouts
        setAllWorkouts(prev => [...prev, ...workoutTemplates])
        // Re-apply current search filter to all workouts (including newly loaded ones)
        if (searchTerm.trim()) {
          const allWorkoutsWithNew = [...allWorkouts, ...workoutTemplates]
          const filtered = allWorkoutsWithNew.filter(workout => {
            const searchLower = searchTerm.toLowerCase()
            
            // PRIORITIZE Progression.Text (intensity type badges) over description
            // First check if Progression.Text matches the search for intensity types
            if (workout.Progression?.Text) {
              const progressionLower = workout.Progression.Text.toLowerCase()
              if (progressionLower.includes(searchLower) ||
                  (progressionLower.includes('vo2') && (searchLower.includes('vo2') || searchLower.includes('vo') || searchLower.includes('v02'))) ||
                  (progressionLower.includes('sweet spot') && (searchLower.includes('sweet') || searchLower.includes('spot') || searchLower.includes('sweetspot'))) ||
                  (progressionLower.includes('threshold') && (searchLower.includes('threshold') || searchLower.includes('thresh'))) ||
                  (progressionLower.includes('endurance') && (searchLower.includes('endurance') || searchLower.includes('endur'))) ||
                  (progressionLower.includes('tempo') && searchLower.includes('tempo')) ||
                  (progressionLower.includes('aerobic') && searchLower.includes('aerobic')) ||
                  (progressionLower.includes('anaerobic') && searchLower.includes('anaerobic'))) {
                return true
              }
            }
            
            // If Progression.Text doesn't match, check other fields (but NOT description for intensity searches)
            return (
              workout.WorkoutName.toLowerCase().includes(searchLower) ||
              (workout.ProfileName && workout.ProfileName.toLowerCase().includes(searchLower)) ||
              (workout.PowerZones && workout.PowerZones.some((zone: string) => zone.toLowerCase().includes(searchLower))) ||
              // Intensity-related search fields
              (workout.IntensityFactor && workout.IntensityFactor.toString().includes(searchLower)) ||
              (workout.AverageFtpPercent && workout.AverageFtpPercent.toString().includes(searchLower)) ||
              (workout.Tss && workout.Tss.toString().includes(searchLower)) ||
              (workout.Duration && workout.Duration.toString().includes(searchLower))
            )
          })
          setFilteredWorkouts(filtered)
        } else {
          // No search term, just append to filtered results
          setFilteredWorkouts(prev => [...prev, ...workoutTemplates])
        }
      } else {
        // Replace all workouts
        setAllWorkouts(workoutTemplates)
        setFilteredWorkouts(workoutTemplates)
      }
      
      setTotalCount(result.totalCount || 0)
      setCurrentPage(page)
      setHasMore((page + 1) * pageSize < (result.totalCount || 0))

      // If we have a selected workout ID and this is the first load, find and set it
      if (page === 0 && selectedWorkoutId && workoutTemplates.length > 0) {
        const found = workoutTemplates.find(w => w.Id === selectedWorkoutId)
        if (found) {
          setSelectedWorkout(found)
        }
      }

      // Mark as initialized after first load
      if (page === 0) {
        setHasInitialized(true)
      }

    } catch (error) {
      console.error("Error fetching TrainerRoad workouts:", error)
      if (error instanceof Error) {
        toast.error(error.message)
      } else {
        toast.error("Failed to fetch TrainerRoad workouts")
      }
    } finally {
      if (isLoadMore) {
        setIsLoadingMore(false)
      } else {
      setLoading(false)
    }
  }
  }, [userId, selectedWorkoutId, pageSize])

  // Initial load
  useEffect(() => {
    fetchWorkouts(0, "", false)
  }, [fetchWorkouts])

  // Handle search with debouncing - ALWAYS fetch workouts first, then filter locally
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Always fetch workouts without search term, then filter locally
      if (!hasInitialized || searchTerm.trim() === "") {
        setCurrentPage(0)
        fetchWorkouts(0, "", false)
      }
      // Note: We don't send search terms to TrainerRoad API anymore
      // All filtering is done locally for better intensity type matching
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchTerm, fetchWorkouts, hasInitialized])

  // Filter workouts based on search term (for local filtering when we have all workouts)
  useEffect(() => {
    if (!searchTerm.trim()) {
      // Only prioritize selected workout if we're not in the middle of selecting
      // and we have a selected workout from the prop
      if (hasInitialized && selectedWorkoutId && !isSelectingRef.current && allWorkouts.length > 0) {
        const selectedWorkout = allWorkouts.find(w => w.Id === selectedWorkoutId)
        if (selectedWorkout) {
          const otherWorkouts = allWorkouts.filter(w => w.Id !== selectedWorkoutId)
          setFilteredWorkouts([selectedWorkout, ...otherWorkouts])
          return
        }
      }
      setFilteredWorkouts(allWorkouts)
      return
    }

    // For local filtering when we have all workouts loaded
    const filtered = allWorkouts.filter(workout => {
      const searchLower = searchTerm.toLowerCase()
      
      // Debug logging to see what fields are available
      if (searchTerm.trim()) {
        console.log('🔍 Search debug:', {
          searchTerm: searchLower,
          workoutName: workout.WorkoutName,
          progressionText: workout.Progression?.Text || 'N/A',
          progressionMatches: workout.Progression?.Text ? workout.Progression.Text.toLowerCase().includes(searchLower) : false,
          description: workout.WorkoutDescription?.substring(0, 50) || 'N/A',
          descriptionMatches: workout.WorkoutDescription ? workout.WorkoutDescription.toLowerCase().includes(searchLower) : false,
          // Show the actual search logic results
          nameMatch: workout.WorkoutName.toLowerCase().includes(searchLower),
          progressionDirectMatch: workout.Progression?.Text ? workout.Progression.Text.toLowerCase().includes(searchLower) : false,
          // Show all available fields to debug where intensity type comes from
          allFields: {
            name: workout.WorkoutName,
            description: workout.WorkoutDescription,
            goalDescription: workout.GoalDescription,
            progression: workout.Progression,
            profileName: workout.ProfileName,
            powerZones: workout.PowerZones,
            intensityFactor: workout.IntensityFactor,
            averageFtpPercent: workout.AverageFtpPercent,
            tss: workout.Tss,
            duration: workout.Duration
          },
          // Additional debugging for Progression.Text search
          progressionSearchDetails: workout.Progression?.Text ? {
            original: workout.Progression.Text,
            lowercase: workout.Progression.Text.toLowerCase(),
            includesSweetSpot: workout.Progression.Text.toLowerCase().includes('sweet spot'),
            includesSweetspot: workout.Progression.Text.toLowerCase().includes('sweetspot'),
            includesSweet: workout.Progression.Text.toLowerCase().includes('sweet'),
            includesSpot: workout.Progression.Text.toLowerCase().includes('spot')
          } : 'No Progression data'
        })
      }
      
      // PRIORITIZE Progression.Text (intensity type badges) over description
      // First check if Progression.Text matches the search for intensity types
      if (workout.Progression?.Text) {
        const progressionLower = workout.Progression.Text.toLowerCase()
        if (progressionLower.includes(searchLower) ||
            (progressionLower.includes('vo2') && (searchLower.includes('vo2') || searchLower.includes('vo') || searchLower.includes('v02'))) ||
            (progressionLower.includes('sweet spot') && (searchLower.includes('sweet') || searchLower.includes('spot') || searchLower.includes('sweetspot'))) ||
            (progressionLower.includes('threshold') && (searchLower.includes('threshold') || searchLower.includes('thresh'))) ||
            (progressionLower.includes('endurance') && (searchLower.includes('endurance') || searchLower.includes('endur'))) ||
            (progressionLower.includes('tempo') && searchLower.includes('tempo')) ||
            (progressionLower.includes('aerobic') && searchLower.includes('aerobic')) ||
            (progressionLower.includes('anaerobic') && searchLower.includes('anaerobic'))) {
          return true
        }
      }
      
      // If Progression.Text doesn't match, check other fields (but NOT description for intensity searches)
      return (
        workout.WorkoutName.toLowerCase().includes(searchLower) ||
        (workout.ProfileName && workout.ProfileName.toLowerCase().includes(searchLower)) ||
        (workout.PowerZones && workout.PowerZones.some(zone => zone.toLowerCase().includes(searchLower))) ||
        // Intensity-related search fields
        (workout.IntensityFactor && workout.IntensityFactor.toString().includes(searchLower)) ||
        (workout.AverageFtpPercent && workout.AverageFtpPercent.toString().includes(searchLower)) ||
        (workout.Tss && workout.Tss.toString().includes(searchLower)) ||
        (workout.Duration && workout.Duration.toString().includes(searchLower))
        // REMOVED: Description and GoalDescription checks for intensity searches
      )
    })

    // Even when searching, prioritize the selected workout if it matches the search
    if (selectedWorkoutId && filtered.length > 0) {
      const selectedWorkout = filtered.find(w => w.Id === selectedWorkoutId)
      if (selectedWorkout) {
        const otherFilteredWorkouts = filtered.filter(w => w.Id !== selectedWorkoutId)
        setFilteredWorkouts([selectedWorkout, ...otherFilteredWorkouts])
        return
      }
    }

    console.log(`🔍 Search results: ${filtered.length} workouts match "${searchTerm}" out of ${allWorkouts.length} total`)
    setFilteredWorkouts(filtered)
  }, [searchTerm, allWorkouts, selectedWorkoutId, hasInitialized])

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      // Always load more workouts without search term, then filter locally
      fetchWorkouts(currentPage + 1, "", true)
    }
  }

  const handleWorkoutSelect = (workout: TrainerRoadWorkout) => {
    // Mark that we're in the middle of selecting
    isSelectingRef.current = true
    
    setSelectedWorkout(workout)
    onWorkoutSelect(workout)
    
    // Reset the flag after a short delay to allow for re-renders
    setTimeout(() => {
      isSelectingRef.current = false
    }, 100)
  }

  const getDifficultyColor = (rating: number) => {
    if (rating <= 2) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
    if (rating <= 4) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
  }

  const getDifficultyText = (rating: number) => {
    if (rating <= 2) return "Easy"
    if (rating <= 4) return "Moderate"
    return "Hard"
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">TrainerRoad Workouts</CardTitle>
        <CardDescription className="text-sm">
          Search and select from all TrainerRoad workouts by name, description, intensity, TSS, FTP, duration, or zones ({totalCount.toLocaleString()} total workouts)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
                 {/* Search */}
         <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input
              placeholder="Search workouts by intensity type (VO2, Sweet Spot, Threshold, Endurance), name, TSS, FTP, or duration..."
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               disabled={disabled}
              className="pl-10"
             />
           </div>
           </div>

        {/* Results */}
        {loading && allWorkouts.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : filteredWorkouts.length === 0 ? (
            <div className="flex justify-center py-8">
              <Card className="w-full max-w-md text-left">
                <CardHeader>
                  <CardTitle className="text-base font-semibold">No workouts found</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    This could be because:
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-xs mt-2 space-y-1 list-disc list-inside text-muted-foreground">
                    <li>The user is not authenticated with TrainerRoad</li>
                    <li>No workouts match your search terms</li>
                    <li>There's an issue with the TrainerRoad connection</li>
                  </ul>
                  <p className="text-sm mt-4 text-muted-foreground">
                    The user needs to authenticate with TrainerRoad first.<br />
                    They can do this in their profile settings.
                  </p>
                </CardContent>
              </Card>
            </div>
        ) : (
          <div className="space-y-4">
            {/* Results count */}
            <div className="text-sm text-muted-foreground">
              Showing {filteredWorkouts.length} of {totalCount.toLocaleString()} workouts
              {searchTerm && ` matching "${searchTerm}"`}
              {currentPage > 0 && ` (page ${currentPage + 1})`}
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorkouts.map((workout) => (
                <Card
                key={workout.Id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                  selectedWorkout?.Id === workout.Id
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:border-primary/50"
                }`}
                onClick={() => !disabled && handleWorkoutSelect(workout)}
              >
                  <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-semibold line-clamp-2 leading-tight">
                        {workout.WorkoutName}
                      </CardTitle>
                      {selectedWorkout?.Id === workout.Id && (
                        <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-3">
                    {/* Key metrics */}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {formatDuration(workout.Duration)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {workout.Tss} TSS
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {workout.IntensityFactor}% IF
                      </Badge>
                    </div>

                    {/* Difficulty */}
                      <Badge 
                        variant="outline" 
                      className={`text-xs ${getDifficultyColor(workout.WorkoutDifficultyRating)}`}
                      >
                        {getDifficultyText(workout.WorkoutDifficultyRating)}
                      </Badge>

                    {/* Progression and Profile */}
                    <div className="flex flex-wrap gap-1">
                      {workout.Progression && (
                        <Badge variant="secondary" className="text-xs">
                          {workout.Progression.Text}
                        </Badge>
                      )}
                      {workout.ProfileName && (
                        <Badge variant="secondary" className="text-xs">
                          {workout.ProfileName}
                        </Badge>
                      )}
                    </div>

                    {/* Power Zones */}
                    {workout.PowerZones && workout.PowerZones.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {workout.PowerZones.slice(0, 3).map((zone, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {zone}
                          </Badge>
                        ))}
                        {workout.PowerZones.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{workout.PowerZones.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {workout.WorkoutDescription && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {workout.WorkoutDescription.replace(/<[^>]*>/g, '')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
              </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || disabled}
                  variant="outline"
                  size="sm"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Load More Workouts
                </Button>
              </div>
            )}

            {/* No results message for search */}
            {searchTerm && filteredWorkouts.length === 0 && allWorkouts.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No workouts match "{searchTerm}"</p>
                <p className="text-sm">Try different search terms or clear the search to see all workouts.</p>
            </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
