"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Dumbbell, TrendingUp, Plus, RefreshCw, Target, ArrowRight, Zap, Activity } from 'lucide-react'
import type { User, DashboardStats } from "@/types"
import { useDashboardData } from "@/lib/hooks/use-dashboard-data"

interface CoachDashboardProps {
  coach: User
  initialStats?: DashboardStats
  initialRecentClients?: User[]
}

export function CoachDashboard({ coach, initialStats, initialRecentClients }: CoachDashboardProps) {
  const { stats, recentClients, loading, error, refetch } = useDashboardData({
    coachId: coach.id,
    isCoach: true,
    initialStats,
    initialRecentClients,
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
      {/* Welcome Header with Completed Workouts Stat */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            {/* Greeting Section */}
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
            
            {/* Stats Grid in Header */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:ml-16">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{stats?.totalClients || 0}</div>
                <div className="text-xs text-blue-600/80 dark:text-blue-400/80">Total clients</div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Target className="h-3 w-3 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">{stats?.activePrograms || 0}</div>
                <div className="text-xs text-green-600/80 dark:text-green-400/80">Active programs</div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
                <div className="w-6 h-6 mx-auto mb-1 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <Activity className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{stats?.totalPrograms || 0}</div>
                <div className="text-xs text-purple-600/80 dark:text-purple-400/80">Created programs</div>
              </div>


            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="sm:grid lg:grid-cols-3 gap-6">
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
        <Card className="lg:col-span-2 mt-10 sm:mt-0">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Active Clients
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
                    <div className="flex items-center justify-between p-2 sm:3  rounded-lg hover:bg-muted/50 transition-colors">
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
                        View <span className="hidden sm:inline">Profile</span>
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
