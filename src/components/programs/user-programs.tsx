"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, Clock, TrendingUp, RefreshCw, Target, ArrowRight, User, Dumbbell } from "lucide-react"
import Link from "next/link"
import type { ProgramWithDetails } from "@/types"
import { usePrograms } from "@/lib/hooks/use-programs"
import { cn } from "@/lib/utils"
import { AppLink } from "../ui/app-link"

interface UserProgramsProps {
  userId: string
}

export function UserPrograms({ userId }: UserProgramsProps) {
  const { programs, loading, error, refetch } = usePrograms({
    userId,
    isCoach: false,
  })

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
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-4">
          {/* Header Skeleton */}
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>

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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Programs</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={refetch} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Programs</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
          Track your fitness programs and progress.
        </p>
      </div>

      {programs.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm max-w-sm mx-auto">
              It looks like you have not been assigned any programs. Contact your coach to get started!
            </p>
            <AppLink href="/dashboard/programs/browse">
              <Button>
                <TrendingUp className="h-4 w-4 mr-2" />
                Browse Programs
              </Button>
            </AppLink>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {programs.map((program) => {
            const statusColors = getStatusColor(program.status)
            const progress = calculateProgress(program)
            return (
              <Card
                key={program.id}
                className={cn("hover:shadow-lg transition-shadow border-l-4 w-full", statusColors.cardBorder)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full  items-center justify-center flex-shrink-0 hidden sm:flex",
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
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Progress</span>
                        <span className="text-gray-600 dark:text-gray-400">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {/* Program Details */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Dumbbell className="h-4 w-4 flex-shrink-0" />
                        <span>
                          Workouts: {program.workouts?.filter((w) => w.completed).length || 0} /{" "}
                          {program.workouts?.length || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>Duration: {program.workouts?.length || 0} workouts</span>
                      </div>
                      {program.coach && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                          <User className="h-4 w-4 flex-shrink-0" />
                          <span>Coach: {program.coach.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 flex-shrink-0" />
                        <span>Created: {new Date(program.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="pt-4">
                      <AppLink href={`/dashboard/programs/${program.id}`}>
                        <Button className="w-full" variant="default">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </AppLink>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
