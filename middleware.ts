/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("🔄 MIDDLEWARE: Processing request for:", request.nextUrl.pathname)

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: "",
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: "",
              ...options,
            })
          },
        },
      },
    )

    // Get session with timeout
    console.log("🔄 MIDDLEWARE: Fetching session...")
    const sessionStart = Date.now()

    const {
      data: { session },
    } = await Promise.race([
      supabase.auth.getSession(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Session timeout")), 3000)),
    ])

    console.log(`⏱️ MIDDLEWARE: Session fetch took ${Date.now() - sessionStart}ms`)
    console.log("👤 MIDDLEWARE: Session user:", session?.user?.id || "No user")

    const { pathname } = request.nextUrl

    // Public routes that don't require authentication
    const publicRoutes = ["/", "/auth/login", "/auth/register"]
    const isPublicRoute = publicRoutes.includes(pathname)

    // If no session and trying to access protected route
    if (!session && !isPublicRoute) {
      console.log("🚫 MIDDLEWARE: No session, redirecting to login")
      const redirectUrl = new URL("/auth/login", request.url)
      return NextResponse.redirect(redirectUrl)
    }

    // If session exists and accessing protected routes, get user profile
    if (session && (pathname.startsWith("/coach") || pathname.startsWith("/dashboard"))) {
      console.log("🔄 MIDDLEWARE: Fetching profile for protected route...")

      try {
        const profileStart = Date.now()
        const { data: profile } = await Promise.race([
          supabase.from("users").select("role").eq("id", session.user.id).single(),
          new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Profile timeout")), 2000)),
        ])

        console.log(`⏱️ MIDDLEWARE: Profile fetch took ${Date.now() - profileStart}ms`)
        console.log("👤 MIDDLEWARE: User role:", profile?.role || "No profile")

        if (profile) {
          // Role-based redirects
          if (pathname.startsWith("/coach") && profile.role !== "coach") {
            console.log("🔄 MIDDLEWARE: User accessing coach route, redirecting to dashboard")
            return NextResponse.redirect(new URL("/dashboard", request.url))
          }

          if (pathname.startsWith("/dashboard") && profile.role === "coach") {
            console.log("🔄 MIDDLEWARE: Coach accessing user route, redirecting to coach dashboard")
            return NextResponse.redirect(new URL("/coach/dashboard", request.url))
          }
        }
      } catch (error) {
        console.error("❌ MIDDLEWARE: Profile fetch error:", error)
        // Continue without redirect to avoid infinite loops
      }
    }

    // Redirect authenticated users from auth pages to their dashboard
    if (session && isPublicRoute && pathname !== "/") {
      console.log("🔄 MIDDLEWARE: Authenticated user on auth page, checking for redirect...")

      try {
        const { data: profile } = await supabase.from("users").select("role").eq("id", session.user.id).single()

        if (profile?.role === "coach") {
          console.log("🔄 MIDDLEWARE: Redirecting coach to coach dashboard")
          return NextResponse.redirect(new URL("/coach/dashboard", request.url))
        } else if (profile?.role === "user") {
          console.log("🔄 MIDDLEWARE: Redirecting user to user dashboard")
          return NextResponse.redirect(new URL("/dashboard", request.url))
        }
      } catch (error) {
        console.error("❌ MIDDLEWARE: Auth redirect error:", error)
      }
    }

    console.log("✅ MIDDLEWARE: Request processed successfully")
    return response
  } catch (error) {
    console.error("❌ MIDDLEWARE: Unexpected error:", error)
    return response
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
