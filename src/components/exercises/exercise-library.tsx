"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Dumbbell, Plus, RefreshCw, Image as ImageIcon } from "lucide-react"
import type { Exercise } from "@/types"

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all")
  const supabase = createClient()

  const fetchExercises = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchError } = await supabase
        .from("exercises")
        .select("*")
        .order("name", { ascending: true })
      if (fetchError) {
        console.error("Error fetching exercises:", fetchError)
        setError("Failed to load exercises. Please try again.")
        return
      }
      setExercises(data)
      setFilteredExercises(data)
    } catch (err) {
      console.error("Error fetching exercises:", err)
      setError("An unexpected error occurred while fetching exercises.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExercises()
  }, [supabase])

  useEffect(() => {
    let filtered = exercises
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (exercise) =>
          exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exercise.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exercise.equipment?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((exercise) => exercise.category === categoryFilter)
    }
    // Filter by equipment
    if (equipmentFilter !== "all") {
      filtered = filtered.filter((exercise) => exercise.equipment === equipmentFilter)
    }
    setFilteredExercises(filtered)
  }, [exercises, searchTerm, categoryFilter, equipmentFilter])

  const categories = Array.from(new Set(exercises.map((e) => e.category).filter(Boolean)))
  const equipmentTypes = Array.from(new Set(exercises.map((e) => e.equipment).filter(Boolean)))

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>

          {/* Filters Skeleton */}
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-1/2 animate-pulse"></div>
          </div>

          {/* Exercise Cards Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="flex gap-2">
                    <div className="h-5 w-20 bg-gray-200 rounded"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-gray-200 rounded mb-4"></div>
                  <div className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="flex gap-2">
                      <div className="h-9 w-16 bg-gray-200 rounded"></div>
                      <div className="h-9 w-28 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Exercises</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={fetchExercises} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Exercise Library</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
              Browse and manage your exercise database
            </p>
          </div>
          <Button href="/coach/exercises/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Exercise
          </Button>
        </div>
        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search exercises..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category!}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="All Equipment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Equipment</SelectItem>
              {equipmentTypes.map((equipment) => (
                <SelectItem key={equipment} value={equipment!}>
                  {equipment}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-end sm:justify-start">
            {filteredExercises.length} of {exercises.length} exercises
          </div>
        </div>
      </div>
      {filteredExercises.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises found</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-sm mx-auto">
              {searchTerm || categoryFilter !== "all" || equipmentFilter !== "all"
                ? "Try adjusting your filters to see more exercises."
                : "Start building your exercise library by adding your first exercise."}
            </p>
            <Button href="/coach/exercises/new" className="mt-6">
              <Plus className="h-4 w-4 mr-2" />
              Add New Exercise
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl font-semibold">
                  {exercise.image_url ? (
                    <div className="w-8 h-8 rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={exercise.image_url}
                        alt={exercise.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <Dumbbell className="h-5 w-5 text-primary hidden" />
                    </div>
                  ) : (
                    <Dumbbell className="h-5 w-5 text-primary" />
                  )}
                  {exercise.name}
                </CardTitle>
                <div className="flex flex-wrap gap-2 mt-1">
                  {exercise.category && (
                    <Badge variant="secondary" className="text-xs text-white">
                      {exercise.category}
                    </Badge>
                  )}
                  {exercise.equipment && (
                    <Badge variant="outline" className="text-xs">
                      {exercise.equipment}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {exercise.image_url && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <img
                      src={exercise.image_url}
                      alt={exercise.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        // Hide image if it fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                {exercise.instructions && (
                  <CardDescription className="line-clamp-3 text-sm text-gray-700 dark:text-gray-300 mb-4">
                    {exercise.instructions}
                  </CardDescription>
                )}
                <div className="mt-4 flex justify-between items-center border-t pt-4 border-gray-200 dark:border-gray-800">
                  <div className="text-xs text-gray-500">
                    Added {new Date(exercise.created_at).toLocaleDateString()}
                  </div>
                  <div className="space-x-2 flex items-center">
                    <Button variant="outline" size="sm" href={`/coach/exercises/${exercise.id}/edit`}>
                      Edit
                    </Button>
                    <Button size="sm" href={`/coach/exercises/${exercise.id}/use`}>
                      Use in Program
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
