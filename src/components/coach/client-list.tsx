"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, Calendar, Eye, Plus, RefreshCw, Target } from "lucide-react"
import type { User, ProgramWithDetails } from "@/types"
import { Badge } from "@/components/ui/badge"

interface ClientListProps {
  coachId: string
}

interface ClientWithPrograms extends User {
  programs: ProgramWithDetails[]
}

export function ClientList({ coachId }: ClientListProps) {
  const [clients, setClients] = useState<ClientWithPrograms[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchClients = async () => {
    setLoading(true)
    setError(null)
    try {
      // Get all programs for this coach with user details
      const { data: programs, error: fetchError } = await supabase
        .from("programs")
        .select(
          `
            *,
            user:users!programs_user_id_fkey(*)
          `,
        )
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false })

      if (fetchError) {
        console.error("Error fetching clients:", fetchError)
        setError("Failed to load clients. Please try again.")
        return
      }

      // Group programs by client
      const clientMap = new Map<string, ClientWithPrograms>()
      programs?.forEach((program) => {
        const userId = program.user.id
        if (!clientMap.has(userId)) {
          clientMap.set(userId, {
            ...program.user,
            programs: [],
          })
        }
        clientMap.get(userId)!.programs.push(program as ProgramWithDetails)
      })
      setClients(Array.from(clientMap.values()))
    } catch (err) {
      console.error("Error fetching clients:", err)
      setError("An unexpected error occurred while fetching clients.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients()
  }, [coachId, supabase])

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      case "completed":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      case "paused":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
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
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8 animate-pulse"></div>

          {/* Client Cards Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="flex-1 ml-3 space-y-2">
                      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="h-10 w-24 bg-gray-200 rounded"></div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
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
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error Loading Clients</h3>
            <p className="text-red-600 dark:text-red-300 mb-4">{error}</p>
            <Button onClick={fetchClients} variant="outline">
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
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">My Clients</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mt-2">
              Manage your clients&apos; progress and programs.
            </p>
          </div>
          <Button href="/coach/clients/new">
            <Plus className="h-4 w-4 mr-2" />
            Add New Client
          </Button>
        </div>
      </div>

      {clients.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm max-w-sm mx-auto">
              Start by creating programs and assigning them to users to build your client base.
            </p>
            <Button href="/coach/programs/new">
              <Target className="h-4 w-4 mr-2" />
              Create First Program
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {client.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-lg sm:text-xl font-semibold">{client.name}</CardTitle>
                      <CardDescription className="text-sm text-gray-600 dark:text-gray-400 text-wrap">
                        {client.email}
                      </CardDescription>
                    </div>
                  </div>
                  <Button href={`/coach/clients/${client.id}`} size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View Detail
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-base mb-2 text-gray-800 dark:text-gray-200">
                      Programs ({client.programs.length})
                    </h4>
                    {/* {client.programs.length === 0 ? (
                      <p className="text-muted-foreground text-sm italic">No programs assigned yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {client.programs.slice(0, 3).map((program) => (
                          <div
                            key={program.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                          >
                            <div>
                              <span className="font-medium text-sm text-gray-900 dark:text-white">{program.name}</span>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {program.start_date
                                  ? `Started: ${new Date(program.start_date).toLocaleDateString()}`
                                  : "No start date"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(program.status)}>
                                {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                              </Badge>
                              <Button variant="outline" size="sm" href={`/coach/clients/${client.id}`}>
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            </div>
                          </div>
                        ))}
                        {client.programs.length > 3 && (
                          <p className="text-sm text-muted-foreground mt-2">
                            +{client.programs.length - 3} more program{client.programs.length - 3 !== 1 ? "s" : ""}
                          </p>
                        )}
                      </div>
                    )} */}
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-800">
                    <div className="text-xs text-gray-500">
                      Member since {new Date(client.created_at).toLocaleDateString()}
                    </div>
                    <Button variant="outline" size="sm" href="/coach/programs/new">
                      <Calendar className="h-4 w-4 mr-1" />
                      New Program
                    </Button>
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
