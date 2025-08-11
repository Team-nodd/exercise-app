import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ConfigurationNotificationSettings } from "@/components/configurations/configuration-notification-settings"  

export default async function ConfigurationPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("👤 CONFIGURATION PAGE: User:", user?.id || "No user")

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile with notification settings
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error || !profile) {
    redirect("/auth/login")
  }

  return <ConfigurationNotificationSettings profile={profile} />
} 