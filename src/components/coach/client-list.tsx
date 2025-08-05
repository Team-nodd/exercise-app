"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
import { Users, Calendar, Eye } from "lucide-react"
import Link from "next/link"
import type { User, ProgramWithDetails } from "@/types"
import { Badge } from "../ui/badge"

interface ClientListProps {
  coachId: string
}

interface ClientWithPrograms extends User {
  programs: ProgramWithDetails[]
}

export function ClientList({ coachId }: ClientListProps) {
  const [clients, setClients] = useState<ClientWithPrograms[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchClients = async () => {
      try {
        // Get all programs for this coach with user details
        const { data: programs, error } = await supabase
          .from("programs")
          .select(`
            *,
            user:users!programs_user_id_fkey(*)
          `)
          .eq("coach_id", coachId)
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching clients:", error)
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
      } catch (error) {
        console.error("Error fetching clients:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [coachId, supabase])

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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Clients</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">Manage your clients and their programs</p>
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Start by creating programs and assigning them to users.
            </p>
            <Button asChild>
              <Link href="/coach/programs/new">Create First Program</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {clients.map((client) => (
            <Card key={client.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{client.name}</CardTitle>
                    <CardDescription>{client.email}</CardDescription>
                  </div>
                  <Button asChild>
                    <Link href={`/coach/clients/${client.id}`}>
                      <Eye className="h-4 w-4 mr-2" />
                      View Calendar
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Programs ({client.programs.length})</h4>
                    {client.programs.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No programs assigned</p>
                    ) : (
                      <div className="space-y-2">
                        {client.programs.slice(0, 3).map((program) => (
                          <div key={program.id} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <span className="font-medium">{program.name}</span>
                              <p className="text-sm text-muted-foreground">
                                {program.start_date
                                  ? `Started: ${new Date(program.start_date).toLocaleDateString()}`
                                  : "No start date"}
                              </p>
                            </div>

                            <div className="flex align-middle gap-5">
                              <Badge className={getStatusColor(program.status)}>
                                {program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                              </Badge>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/coach/programs/${program.id}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Link>
                              </Button>
                            </div>
                          </div>
                        ))}
                        {client.programs.length > 3 && (
                          <p className="text-sm text-muted-foreground">+{client.programs.length - 3} more programs</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-500">
                      Member since {new Date(client.created_at).toLocaleDateString()}
                    </div>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/coach/programs/new">
                          <Calendar className="h-4 w-4 mr-1" />
                          New Program
                        </Link>
                      </Button>
                    </div>
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
