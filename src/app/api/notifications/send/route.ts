import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recipientId, title, message, type, relatedId } = await request.json()

    if (!recipientId || !title || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Notification request:', { 
      senderId: user.id, 
      recipientId, 
      title, 
      type, 
      relatedId 
    })

    // Verify that the current user has permission to send notifications to the recipient
    // Check if the recipient is the user's coach
    const { data: userPrograms, error: userProgramsError } = await supabase
      .from('programs')
      .select('id, coach_id')
      .eq('user_id', user.id)

    console.log('User programs:', userPrograms)

    if (userProgramsError) {
      console.error('Error checking user programs:', userProgramsError)
      return NextResponse.json({ error: 'Failed to verify relationship' }, { status: 500 })
    }

    // Check if the recipient is one of the user's coaches
    const isRecipientCoach = userPrograms?.some(program => program.coach_id === recipientId)

    // Also check if the user is the recipient's coach
    const { data: recipientPrograms, error: recipientProgramsError } = await supabase
      .from('programs')
      .select('id, user_id')
      .eq('coach_id', user.id)

    console.log('Recipient programs:', recipientPrograms)

    if (recipientProgramsError) {
      console.error('Error checking recipient programs:', recipientProgramsError)
      return NextResponse.json({ error: 'Failed to verify relationship' }, { status: 500 })
    }

    const isUserCoach = recipientPrograms?.some(program => program.user_id === recipientId)

    if (!isRecipientCoach && !isUserCoach) {
      console.log('No valid relationship found between users')
      return NextResponse.json({ error: 'No valid relationship found' }, { status: 403 })
    }

    console.log('Relationship verified, inserting notification...')

    // Insert the notification
    const { data: notification, error: insertError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        title,
        message,
        type: type || 'general',
        related_id: relatedId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting notification:', insertError)
      return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
    }

    console.log('Notification sent successfully:', notification)

    return NextResponse.json({ 
      success: true, 
      notification 
    })

  } catch (error) {
    console.error('Error in notification send API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 