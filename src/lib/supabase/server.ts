/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient as createSupabaseClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export const createServerClient = async () => {
  // Next.js 15 dynamic APIs require awaiting cookies()
  const cookieStore = await cookies()

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options?: unknown) {
          try {
            // next/headers cookies implements set in the edge/runtime
            ;(cookieStore as any).set(name, value, options as any)
          } catch {}
        },
        remove(name: string, options?: unknown) {
          try {
            // Prefer delete when available; fallback to setting empty
            if (typeof (cookieStore as any).delete === "function") {
              ;(cookieStore as any).delete(name)
            } else {
              cookieStore.set(name, "", options as any)
            }
          } catch {}
        },
      } as any,
    },
  )
}