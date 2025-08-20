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

    // Get the user ID from query params (the user whose TrainerRoad status we want to check)
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')
    
    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // Verify the current user is a coach
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'coach') {
      return NextResponse.json({ error: 'Only coaches can check TrainerRoad status' }, { status: 403 })
    }

    // Check if the target user has TrainerRoad authentication
    const { data: trSession } = await supabase
      .from('trainerroad_sessions')
      .select('*')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    return NextResponse.json({ 
      authenticated: !!trSession,
      userId: targetUserId
    })

  } catch (error) {
    console.error('❌ TRAINERROAD USER STATUS API: Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
