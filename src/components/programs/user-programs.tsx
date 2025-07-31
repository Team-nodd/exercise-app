"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Calendar, User, Clock, TrendingUp } from "lucide-react"
import Link from "next/link"
import type { ProgramWithDetails } from "@/types"

interface UserProgramsProps {
  userId: string
}

export function UserPrograms({ userId }: UserProgramsProps) {
  const [programs, setPrograms] = useState<ProgramWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const { data, error } = await supabase
          .from("programs")
          .select(`
            *,
            coach:users!programs_coach_id_fkey(*),
            user:users!programs_user_id_fkey(*),
            workouts(*)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

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
  }, [userId, supabase])

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
    return <div className="flex items-center justify-center h-64">Loading programs...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Programs</h1>
        <p className="text-gray-600 dark:text-gray-300">Track your fitness programs and monitor your progress</p>
      </div>

      {programs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs assigned</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Contact your coach to get started with a personalized fitness program.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {programs.map((program) => {
            const progress = calculateProgress(program)
            const totalWorkouts = program.workouts?.length || 0
            const completedWorkouts = program.workouts?.filter((w) => w.completed).length || 0

            return (
              <Card key={program.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{program.name}</CardTitle>
                      <CardDescription className="mt-2">
                        {program.description || "No description provided"}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(program.status)}>
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Program Info */}
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <User className="h-4 w-4" />
                        <span>Coach: {program.coach.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {program.start_date
                            ? `Started: ${new Date(program.start_date).toLocaleDateString()}`
                            : "No start date"}
                        </span>
                      </div>
                      {program.end_date && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Clock className="h-4 w-4" />
                          <span>Ends: {new Date(program.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <TrendingUp className="h-4 w-4" />
                        <span>{totalWorkouts} total workouts</span>
                      </div>
                    </div>

                    {/* Progress */}
                    {totalWorkouts > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {completedWorkouts}/{totalWorkouts} workouts completed
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">{progress}% complete</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-gray-500">
                        Created {new Date(program.created_at).toLocaleDateString()}
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/programs/${program.id}`}>View Details</Link>
                        </Button>
                        {program.status === "active" && (
                          <Button size="sm" asChild>
                            <Link href="/dashboard/workouts">View Workouts</Link>
                          </Button>
                        )}
                      </div>
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
