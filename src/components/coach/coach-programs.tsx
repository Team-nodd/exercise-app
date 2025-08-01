"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, User, Plus, Eye } from "lucide-react"
import Link from "next/link"
import type { ProgramWithDetails } from "@/types"

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
          .select(`
            *,
            coach:users!programs_coach_id_fkey(*),
            user:users!programs_user_id_fkey(*),
            workouts(*)
          `)
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Programs</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Manage and track all your client programs</p>
          </div>
          <Button asChild>
            <Link href="/coach/programs/new">
              <Plus className="h-4 w-4 mr-2" />
              Create Program
            </Link>
          </Button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
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

      {programs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No programs found</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {statusFilter === "all"
                ? "Start creating personalized programs for your clients."
                : `No programs with status "${statusFilter}" found.`}
            </p>
            <Button asChild>
              <Link href="/coach/programs/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Program
              </Link>
            </Button>
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
                    {/* <Badge className={getStatusColor(program.status)}> */}
                      {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    {/* </Badge> */}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Program Info */}
                    <div className="grid md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <User className="h-4 w-4" />
                        <span>Client: {program.user.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {program.start_date
                            ? `Started: ${new Date(program.start_date).toLocaleDateString()}`
                            : "No start date"}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300">
                        {totalWorkouts} workouts • {completedWorkouts} completed
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {totalWorkouts > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-4">
                      <div className="text-sm text-gray-500">
                        Created {new Date(program.created_at).toLocaleDateString()}
                      </div>
                      <div className="space-x-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/coach/programs/${program.id}`}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button size="sm" asChild>
                          <Link href={`/coach/programs/${program.id}/edit`}>Edit</Link>
                        </Button>
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
