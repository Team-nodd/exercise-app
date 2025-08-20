import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test 1: Check if the table exists by trying to select from it
    const { data: tableCheck, error: tableError } = await supabase
      .from('trainerroad_sessions')
      .select('count(*)')
      .limit(1)

    // Test 2: Try to insert a test record
    const testData = {
      user_id: user.id,
      cookies: 'test_cookie=test_value',
      is_active: true,
      updated_at: new Date().toISOString()
    }

    const { data: insertResult, error: insertError } = await supabase
      .from('trainerroad_sessions')
      .insert(testData)
      .select()

    // Test 3: Try to read the record back
    const { data: readResult, error: readError } = await supabase
      .from('trainerroad_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)

    // Test 4: Clean up the test record
    const { error: deleteError } = await supabase
      .from('trainerroad_sessions')
      .delete()
      .eq('user_id', user.id)
      .eq('cookies', 'test_cookie=test_value')

    return NextResponse.json({
      userId: user.id,
      tableExists: !tableError,
      tableError: tableError?.message,
      insertSuccess: !insertError,
      insertError: insertError?.message,
      readSuccess: !readError,
      readError: readError?.message,
      deleteSuccess: !deleteError,
      deleteError: deleteError?.message,
      insertResult,
      readResult
    })

  } catch (error) {
    console.error('❌ TRAINERROAD TEST DB API: Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
