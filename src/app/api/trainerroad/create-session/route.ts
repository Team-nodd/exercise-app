import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the target user ID from the request body
    const { targetUserId } = await request.json()
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId parameter' }, { status: 400 })
    }

    // Verify the current user is a coach
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can create sessions' }, { status: 403 })
    }

    // Create a dummy TrainerRoad session for the target user
    const { data: session, error: sessionError } = await supabase
      .from('trainerroad_sessions')
      .upsert({
        user_id: targetUserId,
        cookies: 'dummy_session=test_value; authenticated=true',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (sessionError) {
      console.error('❌ TRAINERROAD CREATE SESSION: Error creating session:', sessionError)
      return NextResponse.json({ 
        error: 'Failed to create session',
        details: sessionError.message
      }, { status: 500 })
    }

    console.log('✅ TRAINERROAD CREATE SESSION: Created session for user:', targetUserId)

    return NextResponse.json({ 
      success: true,
      message: 'Session created successfully',
      session
    })

  } catch (error) {
    console.error('❌ TRAINERROAD CREATE SESSION: Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
