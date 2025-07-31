"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Dumbbell, TrendingUp, Plus } from "lucide-react"
import Link from "next/link"
import type { User, DashboardStats } from "@/types"

interface CoachDashboardProps {
  coach: User
}

interface CoachStats extends DashboardStats {
  totalClients: number
}

export function CoachDashboard({ coach }: CoachDashboardProps) {
  const [stats, setStats] = useState<CoachStats | null>(null)
  const [recentClients, setRecentClients] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch coach stats
        const [programsResult, clientsResult, workoutsResult] = await Promise.all([
          supabase.from("programs").select("id, status").eq("coach_id", coach.id),
          supabase.from("programs").select("user_id").eq("coach_id", coach.id),
          supabase
            .from("workouts")
            .select("id, completed, scheduled_date")
            .in(
              "program_id",
              (await supabase.from("programs").select("id").eq("coach_id", coach.id)).data?.map((p) => p.id) || [],
            ),
        ])

        if (programsResult.data && clientsResult.data && workoutsResult.data) {
          const totalPrograms = programsResult.data.length
          const activePrograms = programsResult.data.filter((p) => p.status === "active").length
          const totalClients = new Set(clientsResult.data.map((p) => p.user_id)).size
          const completedWorkouts = workoutsResult.data.filter((w) => w.completed).length
          const upcomingWorkouts = workoutsResult.data.filter(
            (w) => !w.completed && w.scheduled_date && new Date(w.scheduled_date) >= new Date(),
          ).length

          setStats({
            totalPrograms,
            activePrograms,
            completedWorkouts,
            upcomingWorkouts,
            totalClients,
          })
        }

        // Fetch recent clients
        const { data: recentClientsData } = await supabase
          .from("users")
          .select("*")
          .eq("role", "user")
          .in(
            "id",
            (await supabase.from("programs").select("user_id").eq("coach_id", coach.id).limit(5)).data?.map(
              (p) => p.user_id,
            ) || [],
          )
          .limit(5)

        if (recentClientsData) {
          setRecentClients(recentClientsData)
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [coach.id, supabase])

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading dashboard...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, Coach {coach.name}!</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Heres your coaching overview for today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>

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
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingWorkouts || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>Clients youre currently working with</CardDescription>
          </CardHeader>
          <CardContent>
            {recentClients.length > 0 ? (
              <div className="space-y-4">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-semibold">{client.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{client.email}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/coach/clients/${client.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No clients yet.</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common coaching tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button className="w-full justify-start" asChild>
                <Link href="/coach/programs/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Program
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/coach/programs">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Programs
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/coach/clients">
                  <Users className="mr-2 h-4 w-4" />
                  View All Clients
                </Link>
              </Button>
              <Button className="w-full justify-start bg-transparent" variant="outline" asChild>
                <Link href="/coach/exercises">
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Exercise Library
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
