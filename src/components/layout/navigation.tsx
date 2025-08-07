"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Menu, X, Dumbbell, Calendar, Users, Home, User, Bell, Trash2 } from 'lucide-react'
import { useAuth } from "@/components/providers/auth-provider"
import { useGlobalLoading } from "@/components/providers/loading-provider"
// import { useNotifications } from "@/lib/hooks/use-notifications"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import useNotifications from "@/lib/hooks/use-notifications"
import { AppLink } from "../ui/app-link"

export function Navigation() {
const { profile, loading, signOut, user } = useAuth()
const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
const [dropdownOpen, setDropdownOpen] = useState(false)
const [signingOut, setSigningOut] = useState(false)
const pathname = usePathname()
const router = useRouter()
const { setLoading } = useGlobalLoading()

// Add notification hook
const { notifications, unreadCount, deleteNotification, markNotificationAsRead } = useNotifications(profile?.id)
const [notifSheetOpen, setNotifSheetOpen] = useState(false) // Use Sheet for notifications

const handleNotificationClick = async (notificationId: string, relatedId?: string) => {
  setLoading(true) // IMMEDIATE feedback
  await markNotificationAsRead(notificationId)
  setNotifSheetOpen(false) // Close notification sheet after clicking
  
  // Navigate to the appropriate page based on user role and notification type
  if (relatedId && profile) {
    try {
      if (profile.role === "coach") {
        // Parse related_id to get workout and program IDs
        const match = relatedId.match(/workout:(\d+):program:(\d+)/)
        if (match) {
          const [, workoutId, programId] = match
          // For coach, navigate to the edit workout page
          router.push(`/coach/programs/${programId}/workouts/${workoutId}`)
        } else {
          // Fallback for old format or other notification types
          router.push(`/coach/dashboard`)
        }
      } else {
        // Parse related_id to get workout ID
        const match = relatedId.match(/workout:(\d+):program:(\d+)/)
        if (match) {
          const [, workoutId] = match
          // For user, navigate to the workout detail page
          router.push(`/dashboard/workouts/${workoutId}`)
        } else {
          // Fallback for old format or other notification types
          router.push(`/dashboard/workouts/${relatedId}`)
        }
      }
    } catch (error) {
      console.error("Error navigating to notification:", error)
      // Fallback to dashboard
      router.push(profile.role === "coach" ? "/coach/dashboard" : "/dashboard")
    } finally {
      setLoading(false)
    }
  } else {
    setLoading(false)
  }
}

const handleDeleteNotification = async (notificationId: string, e: React.MouseEvent) => {
  e.stopPropagation()
  await deleteNotification(notificationId)
}

const handleSignOut = async () => {
  try {
    setSigningOut(true)
    setDropdownOpen(false)
    setLoading(true) // Show global loading indicator
    await signOut()
  } catch (error) {
    console.error("Navigation signout error:", error)
    setSigningOut(false)
    setLoading(false) // Hide loading on error
  }
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const getDashboardLink = () => {
  if (!profile) return "/"
  return profile.role === "coach" ? "/coach/dashboard" : "/dashboard"
}

const isActiveLink = (href: string) => {
  if (
    (href === "/dashboard" && pathname.startsWith("/dashboard/")) ||
    (href === "/coach/dashboard" && pathname.startsWith("/coach/dashboard/"))
  ) {
    return false
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

const getLinkClasses = (href: string, isMobile = false) => {
  const baseClasses = isMobile
    ? "block px-3 py-2 text-base font-medium transition-colors"
    : "px-3 py-2 text-sm font-medium flex items-center transition-colors"
  const isActive = isActiveLink(href)
  if (isActive) {
    return `${baseClasses} text-primary border-b-2 border-primary pb-1`
  }
  return `${baseClasses} text-gray-500 dark:text-gray-300 hover:text-primary hover:border-b-2 hover:border-gray-300 dark:hover:border-gray-600 pb-1`
}

if (loading) {
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Dumbbell className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">FitTracker</span>
            </div>
          </div>
          <div className="flex items-center">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </nav>
  )
}

return (
  <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
    <div className="container mx-auto px-2 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <AppLink href={getDashboardLink()} className="flex items-center">
              <Dumbbell className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">FitTracker</span>
            </AppLink>
          </div>
          {user && profile && (
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              <AppLink href={getDashboardLink()} className={getLinkClasses(getDashboardLink())}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </AppLink>
              {profile.role === "coach" ? (
                <>
                  <AppLink href="/coach/programs" className={getLinkClasses("/coach/programs")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Programs
                  </AppLink>
                  <AppLink href="/coach/clients" className={getLinkClasses("/coach/clients")}>
                    <Users className="h-4 w-4 mr-2" />
                    Clients
                  </AppLink>
                  <AppLink href="/coach/exercises" className={getLinkClasses("/coach/exercises")}>
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Exercises
                  </AppLink>
                </>
              ) : (
                <>
                  <AppLink href="/dashboard/programs" className={getLinkClasses("/dashboard/programs")}>
                    <Calendar className="h-4 w-4 mr-2" />
                    My Programs
                  </AppLink>
                  <AppLink href="/dashboard/workouts" className={getLinkClasses("/dashboard/workouts")}>
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Workouts
                  </AppLink>
                </>
              )}
              <AppLink href="/dashboard/configuration" className={getLinkClasses("/dashboard/configuration")}>
                <Bell className="h-4 w-4 mr-2" />
                Configuration
              </AppLink>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
          ) : user && profile ? (
            <>
              {/* Notification Bell */}
              <Sheet open={notifSheetOpen} onOpenChange={setNotifSheetOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-xs p-0"> {/* Adjusted for mobile full width */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                      <Button variant="ghost" size="icon" onClick={() => setNotifSheetOpen(false)}>
                        {/* <X className="h-5 w-5" /> */}
                        <span className="sr-only">Close notifications</span>
                      </Button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No notifications</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`p-3 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                              !notif.read ? "bg-blue-50 dark:bg-blue-900/20" : ""
                            }`}
                            onClick={() => handleNotificationClick(notif.id, notif.related_id ?? undefined)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 dark:text-white">{notif.title}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">{notif.message}</div>
                                <div className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.created_at).toLocaleString()}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteNotification(notif.id, e)}
                                className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                                title="Delete notification"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

              {/* User Dropdown */}
              <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`/placeholder-user.jpg?name=${profile.name}`} alt={profile.name} />
                      <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <span className="sr-only">Open user menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {profile.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <AppLink href="/profile/settings">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </AppLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} disabled={signingOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{signingOut ? "Signing out..." : "Sign out"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center space-x-4">
              <Button asChild variant="ghost">
                <AppLink href="/auth/login">Sign in</AppLink>
              </Button>
              <Button asChild>
                <AppLink href="/auth/register">Sign up</AppLink>
              </Button>
            </div>
          )}
          {/* Mobile menu button */}
          {user && profile && (
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                  >
                    {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    <span className="sr-only">Toggle mobile menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full p-0"> {/* Removed max-w-xs */}
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                      <AppLink href={getDashboardLink()} className="flex items-center" onClick={() => { setLoading(true); setMobileMenuOpen(false); }}>
                        <Dumbbell className="h-8 w-8 text-primary" />
                        <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">FitTracker</span>
                      </AppLink>
                    </div>
                    <div className="flex-1 px-2 pt-2 pb-3 space-y-1 overflow-y-auto">
                      <AppLink
                        href={getDashboardLink()}
                        className={getLinkClasses(getDashboardLink(), true)}
                        onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                      >
                        Dashboard
                      </AppLink>
                      {profile.role === "coach" ? (
                        <>
                          <AppLink
                            href="/coach/programs"
                            className={getLinkClasses("/coach/programs", true)}
                            onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                          >
                            Programs
                          </AppLink>
                          <AppLink
                            href="/coach/clients"
                            className={getLinkClasses("/coach/clients", true)}
                            onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                          >
                            Clients
                          </AppLink>
                          <AppLink
                            href="/coach/exercises"
                            className={getLinkClasses("/coach/exercises", true)}
                            onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                          >
                            Exercises
                          </AppLink>
                        </>
                      ) : (
                        <>
                          <AppLink
                            href="/dashboard/programs"
                            className={getLinkClasses("/dashboard/programs", true)}
                            onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                          >
                            My Programs
                          </AppLink>
                          <AppLink
                            href="/dashboard/workouts"
                            className={getLinkClasses("/dashboard/workouts", true)}
                            onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                          >
                            Workouts
                          </AppLink>
                        </>
                      )}
                      <AppLink
                        href="/dashboard/configuration"
                        className={getLinkClasses("/dashboard/configuration", true)}
                        onClick={() => { setLoading(true); setMobileMenuOpen(false); }}
                      >
                        Configuration
                      </AppLink>
                    </div>
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <AppLink
                        href="/profile/settings"
                        className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="h-5 w-5 mr-2" />
                        Profile Settings
                      </AppLink>
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="mt-2 flex items-center w-full px-3 py-2 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50 transition-colors"
                      >
                        <LogOut className="h-5 w-5 mr-2" />
                        {signingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}
        </div>
      </div>
    </div>
  </nav>
)
}
