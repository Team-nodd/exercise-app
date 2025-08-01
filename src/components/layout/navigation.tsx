"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, Menu, X, Dumbbell, Calendar, Users, Home } from "lucide-react"
import { useAuth } from "@/components/providers/auth-provider"

export function Navigation() {
  const { profile, loading, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  console.log("🧭 NAVIGATION: Render state - loading:", loading, "profile:", profile?.name || "none")

  const handleSignOut = async () => {
    console.log("🔄 NAVIGATION: Starting sign out...")
    try {
      setSigningOut(true)
      setDropdownOpen(false)
      
      await signOut()
      
      console.log("✅ NAVIGATION: Sign out complete, redirecting to home")
      
      // Use window.location.href for a hard redirect to ensure clean state
      window.location.href = "/"
    } catch (error) {
      console.error("❌ NAVIGATION: Signout error:", error)
      // Reset signing out state on error
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
    const link = profile.role === "coach" ? "/coach/dashboard" : "/dashboard"
    console.log("🔗 NAVIGATION: Dashboard link for", profile.role, "->", link)
    return link
  }

  // Only show loading skeleton for a brief moment and only if we don't have profile data
  if (loading && !profile) {
    console.log("⏳ NAVIGATION: Showing loading skeleton")
    return (
      <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
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

  console.log("✅ NAVIGATION: Rendering full navigation")

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href={getDashboardLink()} className="flex items-center">
                <Dumbbell className="h-8 w-8 text-primary" />
                <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">FitTracker</span>
              </Link>
            </div>

            {profile && (
              <div className="hidden md:ml-10 md:flex md:space-x-8">
                <Link
                  href={getDashboardLink()}
                  className="text-gray-900 dark:text-white hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>

                {profile.role === "coach" ? (
                  <>
                    <Link
                      href="/coach/programs"
                      className="text-gray-500 dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Programs
                    </Link>
                    <Link
                      href="/coach/clients"
                      className="text-gray-500 dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Clients
                    </Link>
                    <Link
                      href="/coach/exercises"
                      className="text-gray-500 dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                    >
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Exercises
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/dashboard/programs"
                      className="text-gray-500 dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      My Programs
                    </Link>
                    <Link
                      href="/dashboard/workouts"
                      className="text-gray-500 dark:text-gray-300 hover:text-primary px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors"
                    >
                      <Dumbbell className="h-4 w-4 mr-2" />
                      Workouts
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center">
            {profile ? (
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
                      <button
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {signingOut ? "Signing out..." : "Sign out"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/login">
                  <Button variant="ghost">Sign in</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Sign up</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden ml-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:text-gray-500 transition-colors"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && profile && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200 dark:border-gray-700">
              <Link
                href={getDashboardLink()}
                className="text-gray-900 dark:text-white hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>

              {profile.role === "coach" ? (
                <>
                  <Link
                    href="/coach/programs"
                    className="text-gray-500 dark:text-gray-300 hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Programs
                  </Link>
                  <Link
                    href="/coach/clients"
                    className="text-gray-500 dark:text-gray-300 hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Clients
                  </Link>
                  <Link
                    href="/coach/exercises"
                    className="text-gray-500 dark:text-gray-300 hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Exercises
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/dashboard/programs"
                    className="text-gray-500 dark:text-gray-300 hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    My Programs
                  </Link>
                  <Link
                    href="/dashboard/workouts"
                    className="text-gray-500 dark:text-gray-300 hover:text-primary block px-3 py-2 rounded-md text-base font-medium transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Workouts
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
