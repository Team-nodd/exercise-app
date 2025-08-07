/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {  Dumbbell, Clock, ArrowLeft, Target, CheckCircle, RefreshCw } from 'lucide-react'
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { User, WorkoutWithDetails, Program } from "@/types"
import { SharedCalendar } from "../ui/shared-calendar"
import { AppLink } from "../ui/app-link"

interface ClientCalendarProps {
  client: User
}

interface WorkoutWithProgram extends WorkoutWithDetails {
  program: Program
}

type StatFilter = "all" | "completed" | "pending" | "unscheduled"

export function ClientCalendar({ client }: ClientCalendarProps) {
  const [workouts, setWorkouts] = useState<WorkoutWithProgram[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProgram, setSelectedProgram] = useState<string>("all")
  const [activeStatFilter, setActiveStatFilter] = useState<StatFilter>("all")

  const supabase = createClient()

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        // Fetch programs for this client
        const { data: programsData, error: programsError } = await supabase
          .from("programs")
          .select("*")
          .eq("user_id", client.id)
          .order("created_at", { ascending: false })

        if (programsError) {
          console.error("Error fetching programs:", programsError)
          setError("Failed to load programs")
          return
        }

        setPrograms(programsData || [])

        // Fetch all workouts for this client
        const { data: workoutsData, error: workoutsError } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("user_id", client.id)
          .order("scheduled_date", { ascending: true, nullsFirst: false })

        if (workoutsError) {
          console.error("Error fetching workouts:", workoutsError)
          setError("Failed to load workouts")
          return
        }

        setWorkouts(workoutsData as WorkoutWithProgram[])
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("An unexpected error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [client.id, supabase])

  // Filter workouts based on selected program
  const programFilteredWorkouts = useMemo(() => {
    return selectedProgram === "all"
      ? workouts
      : workouts.filter(workout => workout.program?.id === Number(selectedProgram))
  }, [workouts, selectedProgram])

  // Further filter by stat filter
  const filteredWorkouts = useMemo(() => {
    switch (activeStatFilter) {
      case "completed":
        return programFilteredWorkouts.filter(w => w.completed)
      case "pending":
        return programFilteredWorkouts.filter(w => !w.completed)
      case "unscheduled":
        return programFilteredWorkouts.filter(w => !w.scheduled_date)
      default:
        return programFilteredWorkouts
    }
  }, [programFilteredWorkouts, activeStatFilter])

  // Calculate stats (always based on program filter, not stat filter)
  const stats = useMemo(() => {
    const totalWorkouts = programFilteredWorkouts.length
    const completedWorkouts = programFilteredWorkouts.filter((w) => w.completed).length
    const pendingWorkouts = totalWorkouts - completedWorkouts
    const unscheduledWorkouts = programFilteredWorkouts.filter((w) => !w.scheduled_date).length

    return {
      total: totalWorkouts,
      completed: completedWorkouts,
      pending: pendingWorkouts,
      unscheduled: unscheduledWorkouts
    }
  }, [programFilteredWorkouts])

  const handleWorkoutUpdate = (updatedWorkouts: WorkoutWithDetails[]) => {
    // Update the workouts state with the updated data
    setWorkouts(prev => 
      prev.map(workout => {
        const updated = updatedWorkouts.find(w => w.id === workout.id)
        return updated ? { ...workout, ...updated } : workout
      })
    )
  }

  const handleStatCardClick = (filter: StatFilter) => {
    setActiveStatFilter(filter)
  }

  const retryFetch = () => {
    setError(null)
    // Re-trigger the useEffect
    setLoading(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>
          
          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Calendar Skeleton */}
          <Card className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="h-6 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 w-48 bg-gray-200 rounded"></div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-7 gap-1 mb-2">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded w-full"></div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Data</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={retryFetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <AppLink href="/coach/clients" className="flex items-center text-sm text-muted-foreground hover:text-primary mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </AppLink>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {client.name}&apos;s Calendar
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2 text-sm sm:text-base">
              View and manage all workouts for this client
              {activeStatFilter !== "all" && (
                <span className="ml-2 text-primary font-medium">
                  • Showing {activeStatFilter} workouts
                </span>
              )}
            </p>
          </div>
          {/* Program Filter */}
          <div className="w-full sm:w-48">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id.toString()}>
                    {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Clickable Stats Cards with Active States */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-8">
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20",
            activeStatFilter === "all" 
              ? "border-2 border-blue-500 shadow-md ring-2 ring-blue-200 dark:ring-blue-800" 
              : "border-blue-200 dark:border-blue-800 hover:border-blue-300"
          )}
          onClick={() => handleStatCardClick("all")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-blue-600 dark:text-blue-400">Total</CardTitle>
            <Dumbbell className="h-3 w-3 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-blue-800 dark:text-blue-200">{stats.total}</div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
              {selectedProgram === "all" ? "All workouts" : "In selected program"}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20",
            activeStatFilter === "completed" 
              ? "border-2 border-green-500 shadow-md ring-2 ring-green-200 dark:ring-green-800" 
              : "border-green-200 dark:border-green-800 hover:border-green-300"
          )}
          onClick={() => handleStatCardClick("completed")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-green-600 dark:text-green-400">
              Completed
            </CardTitle>
            <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-green-800 dark:text-green-200">{stats.completed}</div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">
              {stats.total > 0 ? `${Math.round((stats.completed / stats.total) * 100)}% complete` : "No workouts"}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20",
            activeStatFilter === "pending" 
              ? "border-2 border-orange-500 shadow-md ring-2 ring-orange-200 dark:ring-orange-800" 
              : "border-orange-200 dark:border-orange-800 hover:border-orange-300"
          )}
          onClick={() => handleStatCardClick("pending")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-orange-600 dark:text-orange-400">
              Pending
            </CardTitle>
            <Clock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-orange-800 dark:text-orange-200">{stats.pending}</div>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80">
              {stats.total > 0 ? `${Math.round((stats.pending / stats.total) * 100)}% remaining` : "No workouts"}
            </p>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20",
            activeStatFilter === "unscheduled" 
              ? "border-2 border-purple-500 shadow-md ring-2 ring-purple-200 dark:ring-purple-800" 
              : "border-purple-200 dark:border-purple-800 hover:border-purple-300"
          )}
          onClick={() => handleStatCardClick("unscheduled")}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
            <CardTitle className="text-xs font-medium text-purple-600 dark:text-purple-400">
              Unscheduled
            </CardTitle>
            <Target className="h-3 w-3 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-lg font-bold text-purple-800 dark:text-purple-200">
              {stats.unscheduled}
            </div>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
              Need scheduling
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Filter Indicator */}
      {activeStatFilter !== "all" && (
        <div className="mb-4 flex items-center justify-between bg-muted/50 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium">
              Showing {filteredWorkouts.length} {activeStatFilter} workout{filteredWorkouts.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleStatCardClick("all")}
            className="text-xs"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Shared Calendar Component */}
      <SharedCalendar
        workouts={filteredWorkouts}
        onWorkoutUpdate={handleWorkoutUpdate}
        userRole="coach"
        programId={selectedProgram === "all" ? undefined : Number(selectedProgram)}
        userId={client.id}
      />
    </div>
  )
}
