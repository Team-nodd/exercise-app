"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Dumbbell, TrendingUp, Clock } from "lucide-react"
import Link from "next/link"
import type { User, DashboardStats, WorkoutWithDetails } from "@/types"

interface UserDashboardProps {
  user: User
}

export function UserDashboard({ user }: UserDashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingWorkouts, setUpcomingWorkouts] = useState<WorkoutWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log("=== DASHBOARD DATA FETCH START ===")
        console.log("Fetching data for user:", user.id)
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn("Dashboard data fetch timeout, setting loading to false")
          setLoading(false)
        }, 10000) // 10 second timeout
        
        // Fetch stats
        const [programsResult, workoutsResult] = await Promise.all([
          supabase.from("programs").select("id, status").eq("user_id", user.id),
          supabase.from("workouts").select("id, completed, scheduled_date").eq("user_id", user.id),
        ])

        console.log("Programs result:", programsResult)
        console.log("Workouts result:", workoutsResult)

        if (programsResult.error) {
          console.error("Error fetching programs:", programsResult.error)
        }
        if (workoutsResult.error) {
          console.error("Error fetching workouts:", workoutsResult.error)
        }

        if (programsResult.data && workoutsResult.data) {
          const totalPrograms = programsResult.data.length
          const activePrograms = programsResult.data.filter((p) => p.status === "active").length
          const completedWorkouts = workoutsResult.data.filter((w) => w.completed).length
          const upcomingWorkouts = workoutsResult.data.filter(
            (w) => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= new Date(),
          ).length

          setStats({
            totalPrograms,
            activePrograms,
            completedWorkouts,
            upcomingWorkouts,
          })
          
          console.log("Stats set:", { totalPrograms, activePrograms, completedWorkouts, upcomingWorkouts })
        }

        // Fetch upcoming workouts
        const { data: workouts, error: workoutsError } = await supabase
          .from("workouts")
          .select(`
            *,
            program:programs(*)
          `)
          .eq("user_id", user.id)
          .eq("completed", false)
          .gte("scheduled_date", new Date().toISOString().split("T")[0])
          .order("scheduled_date", { ascending: true })
          .limit(5)

        if (workoutsError) {
          console.error("Error fetching upcoming workouts:", workoutsError)
        }

        if (workouts) {
          setUpcomingWorkouts(workouts as WorkoutWithDetails[])
          console.log("Upcoming workouts set:", workouts.length)
        }
        
        clearTimeout(timeoutId)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
        console.log("=== DASHBOARD DATA FETCH END ===")
      }
    }

    fetchDashboardData()
  }, [user.id, supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, {user.name}!</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Heres your fitness overview for today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPrograms || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePrograms || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedWorkouts || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Workouts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingWorkouts || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Workouts */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Workouts</CardTitle>
            <CardDescription>Your scheduled workouts for the next few days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingWorkouts.length > 0 ? (
              <div className="space-y-4">
                {upcomingWorkouts.map((workout) => (
                  <div key={workout.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{workout.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {workout.scheduled_date && new Date(workout.scheduled_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        {workout.workout_type === "gym" ? "Gym Workout" : "Cardio Session"}
                      </p>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/dashboard/workouts/${workout.id}`}>Start</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No upcoming workouts scheduled.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and navigation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/dashboard/programs">
                  <Calendar className="mr-2 h-4 w-4" />
                  View My Programs
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/dashboard/workouts">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Browse Workouts
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/dashboard/progress">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Track Progress
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
