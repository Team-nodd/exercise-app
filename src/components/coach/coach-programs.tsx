"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, Plus, Eye, Dumbbell, Clock, Target } from "lucide-react"
import type { ProgramWithDetails } from "@/types"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface CoachProgramsProps {
  coachId: string
}

export function CoachPrograms({ coachId }: CoachProgramsProps) {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        let query = supabase
          .from("programs")
          .select(
            `
            *,
            coach:users!programs_coach_id_fkey(*),
            user:users!programs_user_id_fkey(*),
            workouts(*)
          `,
          )
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false })

        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter)
        }

        const { data, error } = await query

        if (error) {
          console.error("Error fetching programs:", error)
          return
        }

        setPrograms(data as ProgramWithDetails[])
      } catch (error) {
        console.error("Error fetching programs:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPrograms()
  }, [coachId, statusFilter, supabase])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return {
          badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          cardBorder: "border-l-green-500 bg-green-50/30 dark:bg-green-900/5",
          iconBg: "bg-green-100 dark:bg-green-900/30",
          iconText: "text-green-600 dark:text-green-400",
        }
      case "completed":
        return {
          badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
          cardBorder: "border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/5",
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconText: "text-blue-600 dark:text-blue-400",
        }
      case "paused":
        return {
          badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          cardBorder: "border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-900/5",
          iconBg: "bg-yellow-100 dark:bg-yellow-900/30",
          iconText: "text-yellow-600 dark:text-yellow-400",
        }
      case "draft":
        return {
          badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          cardBorder: "border-l-gray-500 bg-gray-50/30 dark:bg-gray-900/5",
          iconBg: "bg-gray-100 dark:bg-gray-800",
          iconText: "text-gray-600 dark:text-gray-400",
        }
      default:
        return {
          badge: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
          cardBorder: "border-l-gray-500 bg-gray-50/30 dark:bg-gray-900/5",
          iconBg: "bg-gray-100 dark:bg-gray-800",
          iconText: "text-gray-600 dark:text-gray-400",
        }
    }
  }

  const calculateProgress = (program: ProgramWithDetails) => {
    if (!program.workouts || program.workouts.length === 0) return 0
    const completedWorkouts = program.workouts.filter((w) => w.completed).length
    return Math.round((completedWorkouts / program.workouts.length) * 100)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-4">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between mb-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center gap-4 mb-8">
            <div className="h-10 w-48 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>

          {/* Program Cards Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 w-16 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-2 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (programs.length === 0 && statusFilter === "all") {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Programs</h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
                Manage and track all your client programs
              </p>
            </div>
            <Button href="/coach/programs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Button>
          </div>
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600 dark:text-gray-300">{programs.length} programs</div>
          </div>
        </div>
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
              Start creating personalized programs for your clients.
            </p>
            <Button href="/coach/programs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Program
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Programs</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
              Manage and track all your client programs
            </p>
          </div>
          <Button href="/coach/programs/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Program
          </Button>
        </div>
        {/* Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {programs.length} program{programs.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => {
          const statusColors = getStatusColor(program.status)
          const progress = calculateProgress(program)
          const totalWorkouts = program.workouts?.length || 0
          const completedWorkouts = program.workouts?.filter((w) => w.completed).length || 0
          return (
            <Card
              key={program.id}
              className={cn("hover:shadow-lg transition-shadow border-l-4", statusColors.cardBorder)}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                      statusColors.iconBg,
                    )}
                  >
                    <Target className={cn("h-5 w-5", statusColors.iconText)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-lg sm:text-xl font-semibold ">{program.name}</CardTitle>
                      <Badge className={cn("text-xs flex-shrink-0", statusColors.badge)}>
                        {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                      </Badge>
                    </div>
                    <CardDescription className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {program.description || "No description provided."}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Program Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4 flex-shrink-0" />
                      <span>Client: {program.user?.name || "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {program.start_date
                          ? `Started: ${new Date(program.start_date).toLocaleDateString()}`
                          : "No start date"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Dumbbell className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Workouts: {completedWorkouts} / {totalWorkouts}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        Duration: {totalWorkouts} workout{totalWorkouts !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {totalWorkouts > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                        <span className="text-gray-600 dark:text-gray-400">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-4">
                    <div className="text-xs text-gray-500">
                      Created {new Date(program.created_at).toLocaleDateString()}
                    </div>
                    <div className="space-x-2 flex items-center">
                      <Button variant="outline" size="sm" href={`/coach/programs/${program.id}`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" href={`/coach/programs/${program.id}/edit`}>
                        Edit
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
