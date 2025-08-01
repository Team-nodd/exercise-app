import { createServerClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { UserPrograms } from "@/components/programs/user-programs"

export default async function UserProgramsPage() {
  const supabase = await createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <UserPrograms userId={user.id} />
}
