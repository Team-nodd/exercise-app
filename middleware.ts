import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log("Middleware - Path:", req.nextUrl.pathname, "Session:", !!session)

  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith("/dashboard") || req.nextUrl.pathname.startsWith("/coach")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", req.url))
    }

    // For now, allow access to dashboard without role checking to avoid getting stuck
    // Role-based redirects can be handled in the individual pages
    return res
  }

  // Redirect authenticated users away from auth pages
  if (req.nextUrl.pathname.startsWith("/auth") && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return res
}

export const config = {
  matcher: ["/dashboard/:path*", "/coach/:path*", "/auth/:path*"],
}
