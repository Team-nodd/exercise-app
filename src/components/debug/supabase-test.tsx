"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function SupabaseTest() {
  const [status, setStatus] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const testConnection = async () => {
    setLoading(true)
    setStatus("Testing connection...")

    try {
      // Check environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      setStatus(`Environment check: URL=${!!supabaseUrl}, Key=${!!supabaseKey}`)

      if (!supabaseUrl || !supabaseKey) {
        setStatus("❌ Missing environment variables")
        setLoading(false)
        return
      }

      // Test basic connection
      const { data, error } = await supabase.from('users').select('count').limit(1)
      
      if (error) {
        setStatus(`❌ Connection failed: ${error.message}`)
      } else {
        setStatus("✅ Connection successful")
      }
    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="font-semibold mb-2">Supabase Connection Test</h3>
      <Button onClick={testConnection} disabled={loading} className="mb-2">
        {loading ? "Testing..." : "Test Connection"}
      </Button>
      {status && (
        <div className="text-sm p-2 bg-gray-100 rounded">
          {status}
        </div>
      )}
    </div>
  )
} 