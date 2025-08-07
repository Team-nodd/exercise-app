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

    if (!recipientId || !title || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log('Creating notification:', { 
      senderId: user.id, 
      recipientId, 
      title, 
      type, 
      relatedId 
    })

    // Verify the sender has permission to create notifications for the recipient
    // This checks if there's a program relationship between them
    const { data: relationship, error: relationshipError } = await supabase
      .from('programs')
      .select('id, user_id, coach_id')
      .or(`and(user_id.eq.${user.id},coach_id.eq.${recipientId}),and(user_id.eq.${recipientId},coach_id.eq.${user.id})`)
      .limit(1)

    if (relationshipError) {
      console.error('Relationship check error:', relationshipError)
      return NextResponse.json({ error: 'Failed to verify relationship' }, { status: 500 })
    }

    if (!relationship || relationship.length === 0) {
      console.error('No relationship found between users')
      return NextResponse.json({ error: 'No relationship found' }, { status: 403 })
    }

    // Create the notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientId,
        title,
        message,
        type,
        related_id: relatedId,
        read: false,
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Error creating notification:', notificationError)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    console.log('✅ Notification created successfully:', notification.id)
    return NextResponse.json({ success: true, notification })

  } catch (error) {
    console.error('Error in notification creation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 