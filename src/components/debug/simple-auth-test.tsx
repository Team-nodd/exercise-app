"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function SimpleAuthTest() {
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testAuth = async () => {
    setLoading(true)
    setStatus("Testing authentication...")

    try {
      // Step 1: Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setStatus(`Step 1: Environment check - URL: ${!!supabaseUrl}, Key: ${!!supabaseKey}`)

      if (!supabaseUrl || !supabaseKey) {
        setStatus("❌ Missing environment variables")
        setLoading(false)
        return
      }

      // Step 2: Test basic connection
      setStatus("Step 2: Testing basic connection...")
      const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1)
      
      if (testError) {
        setStatus(`❌ Connection failed: ${testError.message}`)
        setLoading(false)
        return
      }

      setStatus("Step 3: Testing authentication...")

      // Step 3: Test authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'coach@test.com',
        password: 'password123'
      })

      if (error) {
        setStatus(`❌ Auth failed: ${error.message}`)
      } else {
        setStatus(`✅ Auth successful! User ID: ${data.user?.id}`)
      }

    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Simple Auth Test</h3>
      <Button onClick={testAuth} disabled={loading} className="mb-2">
        {loading ? "Testing..." : "Test Authentication"}
      </Button>
      {status && (
        <div className="text-sm p-2 bg-gray-100 rounded whitespace-pre-wrap">
          {status}
        </div>
      )}
    </div>
  )
} 