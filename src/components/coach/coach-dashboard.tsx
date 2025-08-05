"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Users,
  Calendar,
  Dumbbell,
  TrendingUp,
  Plus,
  RefreshCw,
  Target,
  ArrowRight,
  Zap,
  Activity,
  Clock,
  CheckCircle,
} from "lucide-react"
import type { User } from "@/types"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"

interface CoachDashboardProps {
  coach: User
}

export function CoachDashboard({ coach }: CoachDashboardProps) {
  const { stats, recentClients, loading, error, refetch } = useDashboardData({
    coachId: coach.id,
    isCoach: true,
  })

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 17) return "Good afternoon"
    return "Good evening"
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <Card className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Dashboard</h3>
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
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Welcome Header */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, Coach {coach.name}!
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-1">
                Here&apos;s your coaching overview for today.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Activity className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs text-blue-600/70 dark:text-blue-400/70">Clients</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats?.totalClients || 0}
            </div>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">Total clients</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Target className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-xs text-green-600/70 dark:text-green-400/70">Programs</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {stats?.totalPrograms || 0}
            </div>
            <p className="text-xs text-green-600/80 dark:text-green-400/80">Created programs</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                <Activity className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-xs text-purple-600/70 dark:text-purple-400/70">Active</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {stats?.activePrograms || 0}
            </div>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">Active programs</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              <span className="text-xs text-orange-600/70 dark:text-orange-400/70">Completed</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {stats?.completedWorkouts || 0}
            </div>
            <p className="text-xs text-orange-600/80 dark:text-orange-400/80">Workouts done</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs text-red-600/70 dark:text-red-400/70">Upcoming</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
              {stats?.upcomingWorkouts || 0}
            </div>
            <p className="text-xs text-red-600/80 dark:text-red-400/80">Scheduled this week</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button href="/coach/programs" className="w-full justify-start bg-transparent" variant="outline">
              <Calendar className="h-4 w-4 mr-2" />
              Manage Programs
            </Button>
            <Button href="/coach/clients" className="w-full justify-start bg-transparent" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              View Clients
            </Button>
            <Button href="/coach/exercises" className="w-full justify-start bg-transparent" variant="outline">
              <Dumbbell className="h-4 w-4 mr-2" />
              Exercise Library
            </Button>
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Recent Clients
              </CardTitle>
              {recentClients && recentClients.length > 0 && (
                <Button href="/coach/clients" variant="ghost" size="sm">
                  View all
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {recentClients && recentClients.length > 0 ? (
              <div className="space-y-3">
                {recentClients.slice(0, 5).map((client, index) => (
                  <div key={client.id}>
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                          {client.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">{client.name}</h4>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                        </div>
                      </div>
                      <Button href={`/coach/clients/${client.id}`} size="sm" variant="outline">
                        View Profile
                      </Button>
                    </div>
                    {index < recentClients.slice(0, 5).length - 1 && (
                      <hr className="my-3 border-t border-gray-200 dark:border-gray-800" />
                    )}
                  </div>
                ))}
                {recentClients.length > 5 && (
                  <div className="text-center pt-3 border-t">
                    <Button href="/coach/clients" variant="ghost" size="sm">
                      <span className="text-sm">View {recentClients.length - 5} more clients</span>
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
                  Start by creating your first program and inviting clients.
                </p>
                <Button href="/coach/programs/new" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Program
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create New Program */}
      <Card className="mt-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Get Started
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Ready to grow your coaching?</span>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Create new programs and manage your clients efficiently.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button href="/coach/programs/new" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Create New Program
            </Button>
            <Button variant="outline" href="/coach/clients" className="w-full sm:w-auto bg-transparent">
              <Users className="h-4 w-4 mr-2" />
              Manage Clients
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
