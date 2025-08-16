"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import LandingPage from "@/components/landing/landing-page"
import { useAuth } from "@/components/providers/auth-provider"

export default function Home() {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (user && profile) {
      router.replace(profile.role === "coach" ? "/coach/dashboard" : "/dashboard")
    }
  }, [loading, user, profile, router])

  // While determining auth or redirecting, avoid flashing the landing page
  if (loading || (user && profile)) {
    return null
  }

  return <LandingPage />
}
