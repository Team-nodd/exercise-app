import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if the target user has a TrainerRoad session
    const { data: session, error: sessionError } = await supabase
      .from('trainerroad_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // Also get all sessions for this user (including inactive ones)
    const { data: allSessions } = await supabase
      .from('trainerroad_sessions')
      .select('*')
      .eq('user_id', userId)

    return NextResponse.json({
      userId,
      hasActiveSession: !!session,
      activeSession: session,
      allSessions: allSessions,
      sessionCount: allSessions?.length || 0,
      error: sessionError?.message
    })

  } catch (error) {
    console.error('❌ TRAINERROAD DEBUG SESSION API: Error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
