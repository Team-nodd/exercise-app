import { LoginForm } from "@/components/auth/login-form"
import { SupabaseTest } from "@/components/debug/supabase-test"
import { SimpleAuthTest } from "@/components/debug/simple-auth-test"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">Sign in to your account</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Access your fitness programs and track your progress
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Enter your credentials to access your account</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
        
        {/* Debug component - remove this after fixing the issue */}
        <Card>
          <CardHeader>
            <CardTitle>Debug</CardTitle>
            <CardDescription>Test Supabase connection</CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseTest />
          </CardContent>
        </Card>
        
        {/* Simple Auth Test */}
        <Card>
          <CardHeader>
            <CardTitle>Auth Test</CardTitle>
            <CardDescription>Test authentication with coach@test.com</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleAuthTest />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
