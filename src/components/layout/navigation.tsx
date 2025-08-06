"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { LogOut, Menu, X, Dumbbell, Calendar, Users, Home, User, Bell } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

export function Navigation() {
  const { profile, loading, signOut, user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const pathname = usePathname()

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      setDropdownOpen(false)
      await signOut()
    } catch (error) {
      console.error("Navigation signout error:", error)
      setSigningOut(false)
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
    // Prevent false positives for base dashboard paths
    if (
      (href === "/dashboard" && pathname.startsWith("/dashboard/")) ||
      (href === "/coach/dashboard" && pathname.startsWith("/coach/dashboard/"))
    ) {
      return false
    }
    // Active when href is a parent of the current pathname
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

  // Show loading skeleton while auth is initializing
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
              <Link href={getDashboardLink()} className="flex items-center">
                <Dumbbell className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">FitTracker</span>
              </Link>
            </div>

            {user && profile && (
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link href={getDashboardLink()} className={getLinkClasses(getDashboardLink())}>
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>

                {profile.role === "coach" ? (
                  <>
                    <Link href="/coach/programs" className={getLinkClasses("/coach/programs")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Programs
                    </Link>
                    <Link href="/coach/clients" className={getLinkClasses("/coach/clients")}>
                      <Users className="h-4 w-4 mr-2" />
                      Clients
                    </Link>
                    <Link href="/coach/exercises" className={getLinkClasses("/coach/exercises")}>
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Exercises
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/dashboard/programs" className={getLinkClasses("/dashboard/programs")}>
                      <Calendar className="h-4 w-4 mr-2" />
                      My Programs
                    </Link>
                    <Link href="/dashboard/workouts" className={getLinkClasses("/dashboard/workouts")}>
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Workouts
                    </Link>
                  </>
                )}

                <Link href="/dashboard/configuration" className={getLinkClasses("/dashboard/configuration")}>
                  <Bell className="h-4 w-4 mr-2" />
                  Configuration
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center">
            {loading ? (
              // Show loading indicator while auth is initializing
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse"></div>
            ) : user && profile ? (
              // Show user dropdown when authenticated
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                >
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                    {getInitials(profile.name)}
                  </div>
                  <span className="ml-2 text-gray-700 dark:text-gray-300 hidden md:block">{profile.name}</span>
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
                        <div className="font-medium">{profile.name}</div>
                        <div className="text-xs text-gray-500">{profile.email}</div>
                        <div className="text-xs text-gray-500 capitalize">{profile.role}</div>
                      </div>
                      <Link
                        href="/profile/settings"
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="cursor-pointer flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {signingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // Show sign in/sign up buttons only when not loading and no user
              <div className="flex items-center space-x-4">
                
                <Button href="/auth/login" variant="ghost">Sign in</Button>
                
                <Button href="/auth/register">Sign up</Button>
              
              </div>
            )}

            {/* Mobile menu button */}
            {user && profile && (
              <div className="md:hidden ml-4">
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
                >
                  {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && user && profile && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={getDashboardLink()}
                className={getLinkClasses(getDashboardLink(), true)}
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>

              {profile.role === "coach" ? (
                <>
                  <Link
                    href="/coach/programs"
                    className={getLinkClasses("/coach/programs", true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Programs
                  </Link>
                  <Link
                    href="/coach/clients"
                    className={getLinkClasses("/coach/clients", true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Clients
                  </Link>
                  <Link
                    href="/coach/exercises"
                    className={getLinkClasses("/coach/exercises", true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Exercises
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/programs"
                    className={getLinkClasses("/dashboard/programs", true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Programs
                  </Link>
                  <Link
                    href="/dashboard/workouts"
                    className={getLinkClasses("/dashboard/workouts", true)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Workouts
                  </Link>
                </>
              )}

              <Link
                href="/dashboard/configuration"
                className={getLinkClasses("/dashboard/configuration", true)}
                onClick={() => setMobileMenuOpen(false)}
              >
                Configuration
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
