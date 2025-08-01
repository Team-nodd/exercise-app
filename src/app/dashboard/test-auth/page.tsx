import { createServerClient } from "@/lib/supabase/server"

export default async function TestAuth() {
  try {
    const supabase = await createServerClient()

    // Test auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    // Test profile
    let profile = null
    let profileError = null

    if (user) {
      const { data, error } = await supabase.from("users").select("*").eq("id", user.id).single()
      profile = data
      profileError = error
    }

    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">Auth Debug Page</h1>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Auth Status:</h2>
          {authError ? (
            <div className="text-red-500">
              <p>Auth Error: {authError.message}</p>
            </div>
          ) : user ? (
            <div className="text-green-500">
              <p>✅ User authenticated: {user.id}</p>
              <p>Email: {user.email}</p>
            </div>
          ) : (
            <div className="text-yellow-500">
              <p>❌ No user found</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Profile Status:</h2>
          {profileError ? (
            <div className="text-red-500">
              <p>Profile Error: {profileError.message}</p>
            </div>
          ) : profile ? (
            <div className="text-green-500">
              <p>✅ Profile found</p>
              <pre className="bg-gray-100 p-2 rounded text-sm">{JSON.stringify(profile, null, 2)}</pre>
            </div>
          ) : (
            <div className="text-yellow-500">
              <p>❌ No profile found</p>
            </div>
          )}
        </div>
      </div>
    )
  } catch (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold">Auth Debug Page</h1>
        <div className="text-red-500">
          <p>Error: {error instanceof Error ? error.message : "Unknown error"}</p>
        </div>
      </div>
    )
  }
}
