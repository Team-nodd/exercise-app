/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient as createSupabaseClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/types/database"

export const createServerClient = () => {

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return (cookies() as any).get(name)?.value
        },
        set(name: string, value: string, options?: unknown) {
          try { (cookies() as any).set(name, value, options as any) } catch {}
        },
        remove(name: string, options?: unknown) {
          try { (cookies() as any).set(name, "", options as any) } catch {}
        },
      } as any,
    },
  )
}