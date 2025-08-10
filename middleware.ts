/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  console.log("🔄 MIDDLEWARE:", request.nextUrl.pathname)

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Only handle confirmation code exchange here
  const { searchParams, pathname } = request.nextUrl
  const code = searchParams.get('code')
  if (code) {
    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: (name: string) => request.cookies.get(name)?.value,
            set: (name: string, value: string, options: any) => {
              request.cookies.set({ name, value, ...options })
              response = NextResponse.next({ request: { headers: request.headers } })
              response.cookies.set({ name, value, ...options })
            },
            remove: (name: string, options: any) => {
              request.cookies.set({ name, value: "", ...options })
              response = NextResponse.next({ request: { headers: request.headers } })
              response.cookies.set({ name, value: "", ...options })
            },
          },
        },
      )
      await supabase.auth.exchangeCodeForSession(code)
    } catch (e) {
      console.error("Code exchange failed:", e)
    }
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Very light gate: only check cookie presence, no Supabase call here
  const publicRoutes = ["/", "/auth/login", "/auth/register"]
  const isPublic = publicRoutes.includes(pathname)
  const hasAccessToken = request.cookies.get("sb-access-token")?.value

  if (!hasAccessToken && !isPublic) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
