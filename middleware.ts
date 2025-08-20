/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {

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
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: any) {
              request.cookies.set({ name, value, ...options })
              response = NextResponse.next({ request: { headers: request.headers } })
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: any) {
              request.cookies.set({ name, value: "", ...options })
              response = NextResponse.next({ request: { headers: request.headers } })
              response.cookies.set({ name, value: "", ...options })
            },
          },
        },
      )
      
      await supabase.auth.exchangeCodeForSession(code)
    } catch (e) {
      console.error("❌ MIDDLEWARE: Code exchange failed:", e)
    }
    
    // Redirect to home after successful code exchange
    return NextResponse.redirect(new URL("/", request.url))
  }

  // Note: Do not gate by cookie here. In a PWA, sessions persist in localStorage
  // on the client. Redirects based on cookies cause unnecessary login prompts
  // on app relaunch and do not work offline. Client-side guards will handle it.
  // This prevents authentication loops and allows the app to work properly.

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
