"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Bell, CheckCircle2, MessageSquare, Dumbbell, Loader2, RefreshCw } from 'lucide-react'
import { cn } from "@/lib/utils"
import Link from "next/link"

export type NotificationWithUser = {
  id: string
  user_id: string
  type: string
  message: string | null
  title: string
  related_id: string | null
  created_at: string
  read: boolean
  user: {
    id: string
    name: string
    role: string
  }
}

interface NotificationListProps {
  userId: string
  onNotificationClick?: () => void
}

export function NotificationList({ userId, onNotificationClick }: NotificationListProps) {
  const [notifications, setNotifications] = useState<NotificationWithUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          user:users(id, name, role)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20) // Limit to recent notifications

      if (error) throw error
      setNotifications(data as NotificationWithUser[])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Error fetching notifications:", err)
      setError(err.message || "Failed to load notifications.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      fetchNotifications()

      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel(`notifications_for_user_${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            // Fetch the user data for the new notification
            supabase.from("users").select("id, name, role").eq("id", payload.new.user_id).single()
              .then(({ data: userData, error: userError }) => {
                if (userError) {
                  console.error("Error fetching user for new notification:", userError);
                  return;
                }
                const newNotification: NotificationWithUser = {
                  ...(payload.new as NotificationWithUser),
                  user: userData,
                };
                setNotifications((prev) => [newNotification, ...prev]);
              })
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              // .catch((err: any) => console.error("Error processing new notification payload:", err));
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, supabase])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)

      if (error) throw error
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      )
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .in("id", unreadIds);

      if (error) throw error;
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Error marking all notifications as read:", err);
    }
  };

  const getNotificationIcon = (type: NotificationWithUser["type"]) => {
    switch (type) {
      case "workout_completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "user_comment":
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case "coach_comment":
        return <MessageSquare className="h-5 w-5 text-purple-500" />
      case "program_assigned":
        return <Dumbbell className="h-5 w-5 text-orange-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getNotificationLink = (notification: NotificationWithUser) => {
    if (!notification.related_id) return "#";
    
    switch (notification.type) {
      case "workout_completed":
      case "user_comment":
      case "coach_comment":
        // Parse related_id to get workout and program IDs
        const match = notification.related_id.match(/workout:(\d+):program:(\d+)/)
        if (match) {
          const [, workoutId, programId] = match
          // For workout-related notifications, check user role to determine correct route
          if (notification.user?.role === "coach") {
            // Coach should go to edit workout page
            return `/coach/programs/${programId}/workouts/${workoutId}`
          } else {
            // User should go to workout detail page
            return `/dashboard/workouts/${workoutId}`
          }
        } else {
          // Fallback for old format
          if (notification.user?.role === "coach") {
            return `/coach/dashboard`
          } else {
            return `/dashboard/workouts/${notification.related_id}`
          }
        }
      case "program_assigned":
        if (notification.user?.role === "user") {
          return `/dashboard/programs/${notification.related_id}`
        }
        return "#"
      default:
        return "#"
    }
  }

  if (loading) {
    return (
      <Card className="w-80">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Notifications</CardTitle>
          <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-80">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Notifications</CardTitle>
          <RefreshCw className="h-4 w-4 text-red-500 cursor-pointer" onClick={fetchNotifications} />
        </CardHeader>
        <CardContent className="text-center text-sm text-red-600">
          Failed to load notifications.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-80">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Notifications</CardTitle>
        {notifications.filter(n => !n.read).length > 0 && (
          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={markAllAsRead}>
            Mark all as read
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">No new notifications.</div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {notifications.map((notification) => (
                <Link
                  key={notification.id}
                  href={getNotificationLink(notification)}
                  onClick={() => {
                    markAsRead(notification.id);
                    onNotificationClick?.(); // Close popover/dropdown
                  }}
                  className={cn(
                    "flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
                    !notification.read ? "bg-blue-50 dark:bg-blue-950/30" : ""
                  )}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
