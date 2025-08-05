"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Dumbbell, TrendingUp, Plus, RefreshCw } from "lucide-react"
import Link from "next/link"
import type { User } from "@/types"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"

interface CoachDashboardProps {
  coach: User
}

export function CoachDashboard({ coach }: CoachDashboardProps) {
  const { stats, recentClients, loading, error, refetch } = useDashboardData({
    coachId: coach.id,
    isCoach: true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading dashboard: {error}</p>
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back, Coach {coach.name}!</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Here is your coaching overview for today.</p>
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
            <p className="text-xs text-muted-foreground">Active clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalPrograms || 0}</div>
            <p className="text-xs text-muted-foreground">Created programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activePrograms || 0}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Workouts</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedWorkouts || 0}</div>
            <p className="text-xs text-muted-foreground">By all clients</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Workouts</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.upcomingWorkouts || 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions and Recent Clients */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Manage your coaching</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/coach/programs">
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Programs
              </Button>
            </Link>
            <Link href="/coach/clients">
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                View Clients
              </Button>
            </Link>
            <Link href="/coach/exercises">
              <Button className="w-full justify-start" variant="outline">
                <Dumbbell className="h-4 w-4 mr-2" />
                Exercise Library
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>Your active clients</CardDescription>
          </CardHeader>
          <CardContent>
            {recentClients && recentClients.length > 0 ? (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {client.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-medium">{client.name}</h4>
                        <p className="text-sm text-muted-foreground">{client.email}</p>
                      </div>
                    </div>
                    <Link href={`/coach/clients/${client.id}`}>
                      <Button size="sm" variant="outline">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                ))}
                {recentClients.length > 5 && (
                  <div className="text-center pt-2">
                    <Link href="/coach/clients">
                      <Button variant="ghost" size="sm">
                        View all clients
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No clients yet</p>
                <Link href="/coach/programs">
                  <Button className="mt-4" variant="outline">
                    Create Your First Program
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create New Program */}
      <Card>
        <CardHeader>
          <CardTitle>Get Started</CardTitle>
          <CardDescription>Create your first program or manage existing ones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/coach/programs/new">
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create New Program
              </Button>
            </Link>
            <Link href="/coach/clients">
              <Button variant="outline" className="w-full sm:w-auto">
                <Users className="h-4 w-4 mr-2" />
                Manage Clients
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
