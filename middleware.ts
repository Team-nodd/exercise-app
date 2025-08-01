import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  // Create a response object to modify
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const user = session?.user

  // Define protected routes
  const isAuthPage = req.nextUrl.pathname.startsWith("/auth")
  const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard")
  const isCoachPage = req.nextUrl.pathname.startsWith("/coach")
  const isProtectedRoute = isDashboardPage || isCoachPage

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL("/auth/login", req.url)
    redirectUrl.searchParams.set("redirectTo", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Handle authenticated users
  if (user && isProtectedRoute) {
    try {
      // Get user profile with timeout
      const { data: profile, error } = (await Promise.race([
        supabase.from("users").select("role").eq("id", user.id).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ])) as any

      if (error || !profile) {
        // If profile fetch fails, redirect to login to recreate profile
        return NextResponse.redirect(new URL("/auth/login", req.url))
      }

      // Role-based redirects
      if (isDashboardPage && profile.role === "coach") {
        return NextResponse.redirect(new URL("/coach/dashboard", req.url))
      }

      if (isCoachPage && profile.role === "user") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    } catch (error) {
      console.error("Middleware error:", error)
      // On error, allow the request to continue rather than blocking
      return supabaseResponse
    }
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthPage) {
    try {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single()

      if (profile?.role === "coach") {
        return NextResponse.redirect(new URL("/coach/dashboard", req.url))
      } else if (profile?.role === "user") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    } catch (error) {
      // If profile fetch fails, stay on auth page
      console.error("Auth redirect error:", error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
