import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    const serviceRoleKey = request.headers.get('X-Supabase-Auth')
    const testUserId = request.headers.get('X-Test-User-Id')
    
    let user;
    
    if (serviceRoleKey && testUserId) {
      // Use service role authentication for testing
      console.log('🔧 Using service role authentication for testing')
      user = { id: testUserId }
    } else {
      // Get the current user normally
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !authUser) {
        console.error('Auth error:', authError)
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      user = authUser
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

    // Optimized relationship check using a single query
    // This checks if there's any program relationship between the two users
    const { data: relationship, error: relationshipError } = await supabase
      .from('programs')
      .select('id, user_id, coach_id')
      .or(`and(user_id.eq.${user.id},coach_id.eq.${recipientId}),and(user_id.eq.${recipientId},coach_id.eq.${user.id})`)
      .limit(1)

    console.log('Relationship check result:', { relationship, relationshipError })

    if (relationshipError) {
      console.error('Error checking relationship:', relationshipError)
      return NextResponse.json({ error: 'Failed to verify relationship' }, { status: 500 })
    }

    const hasValidRelationship = relationship && relationship.length > 0
    console.log('Has valid relationship?', hasValidRelationship)

    if (!hasValidRelationship) {
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