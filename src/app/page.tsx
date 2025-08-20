"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LandingPage from "@/components/landing/landing-page"
import { useAuth } from "@/components/providers/auth-provider"

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) {

      return
    }
    
    if (user && profile) {

      const targetRoute = profile.role === "coach" ? "/coach/dashboard" : "/dashboard"
      router.replace(targetRoute)
    } else if (!user) {

    } else if (user && !profile) {

      // If user exists but no profile, show landing page instead of infinite loading
      // This can happen during auth state transitions
    }
  }, [loading, user, profile, router])

  // Show loading only when we're actually loading auth state
  // Don't show loading if user exists but profile is missing (show landing page instead)
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated with profile, show loading while redirecting
  if (user && profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {/* <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Redirecting to dashboard...</p>
        </div> */}
      </div>
    )
  }

  return <LandingPage />
}
