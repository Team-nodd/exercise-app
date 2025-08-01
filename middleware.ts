import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  console.log("=== MIDDLEWARE DEBUG ===")
  console.log("Path:", req.nextUrl.pathname)

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
          cookiesToSet.forEach(({ name, value, options }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request: req,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  // Get user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("User in middleware:", user?.id)

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/coach")) {
    if (!user) {
      console.log("No user, redirecting to login")
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }

    // For now, allow access without checking profile to avoid redirect loops
    // The individual pages will handle profile checks
    console.log("User authenticated, allowing access")
    return supabaseResponse
  }

  // Redirect authenticated users away from auth pages
  if (req.nextUrl.pathname.startsWith("/auth") && user) {
    console.log("Authenticated user on auth page, redirecting to dashboard")
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  console.log("=== MIDDLEWARE END ===")
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
