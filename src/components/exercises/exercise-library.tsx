"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Dumbbell, Plus } from "lucide-react"
import type { Exercise } from "@/types"

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [equipmentFilter, setEquipmentFilter] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const { data, error } = await supabase.from("exercises").select("*").order("name", { ascending: true })

        if (error) {
          console.error("Error fetching exercises:", error)
          return
        }

        setExercises(data)
        setFilteredExercises(data)
      } catch (error) {
        console.error("Error fetching exercises:", error)
      } finally {
        setLoading(false)
      }
    }

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
    return <div className="flex items-center justify-center h-64">Loading exercises...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Exercise Library</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Browse and manage your exercise database</p>
          </div>
          <Button asChild>
            <a href="/coach/exercises/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Exercise
            </a>
          </Button>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-4 gap-4">
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
          <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
            {filteredExercises.length} of {exercises.length} exercises
          </div>
        </div>
      </div>

      {filteredExercises.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Dumbbell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No exercises found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm || categoryFilter !== "all" || equipmentFilter !== "all"
                ? "Try adjusting your filters to see more exercises."
                : "Start building your exercise library by adding your first exercise."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExercises.map((exercise) => (
            <Card key={exercise.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Dumbbell className="h-5 w-5" />
                  {exercise.name}
                </CardTitle>
                <div className="flex gap-2">
                  {exercise.category && <Badge variant="secondary">{exercise.category}</Badge>}
                  {exercise.equipment && <Badge variant="outline">{exercise.equipment}</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {exercise.instructions && (
                  <CardDescription className="line-clamp-3">{exercise.instructions}</CardDescription>
                )}
                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Added {new Date(exercise.created_at).toLocaleDateString()}
                  </div>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                    <Button size="sm">Use in Program</Button>
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
