"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, TrendingUp, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { User, ProgramWithDetails } from "@/types"
import { usePrograms } from "@/lib/hooks/use-programs"

interface UserProgramsProps {
  userId: string
}

export function UserPrograms({ userId }: UserProgramsProps) {
  const { programs, loading, error, refetch } = usePrograms({
    userId,
    isCoach: false
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "paused":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const calculateProgress = (program: ProgramWithDetails) => {
    if (!program.workouts || program.workouts.length === 0) return 0
    const completedWorkouts = program.workouts.filter((w) => w.completed).length
    return Math.round((completedWorkouts / program.workouts.length) * 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading programs...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading programs: {error}</p>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Programs</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Track your fitness programs and progress.</p>
      </div>

      {programs.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Get started with your first fitness program.</p>
          <Link href="/dashboard/programs/browse">
            <Button>
              <TrendingUp className="h-4 w-4 mr-2" />
              Browse Programs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs.map((program) => (
            <Card key={program.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{program.name}</CardTitle>
                  <Badge className={getStatusColor(program.status)}>{program.status}</Badge>
                </div>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{calculateProgress(program)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${calculateProgress(program)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Workouts</span>
                                         <span className="font-medium">
                       {program.workouts?.filter((w) => w.completed).length || 0} / {program.workouts?.length || 0}
                     </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span className="font-medium">
                      {program.workouts?.length || 0} {program.workouts?.length === 1 ? "workout" : "workouts"}
                    </span>
                  </div>

                  {program.coach && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coach</span>
                      <span className="font-medium">{program.coach.name}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created</span>
                    <span className="font-medium">
                      {new Date(program.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-4">
                    <Link href={`/dashboard/programs/${program.id}`}>
                      <Button className="w-full" variant="outline">
                        <Clock className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
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
