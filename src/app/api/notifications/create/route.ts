/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

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
      relatedId,
    })

    // Insert using service role to bypass RLS (we already authenticated the sender)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var')
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
    }

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    const { data: notification, error: notificationError } = await admin
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
      const details = (notificationError as any)?.message || 'Failed to create notification'
      return NextResponse.json({ error: details }, { status: 500 })
    }

    console.log('✅ Notification created successfully:', notification.id)
    return NextResponse.json({ success: true, notification })

  } catch (error) {
    console.error('Error in notification creation:', error)
    const details = (error as any)?.message || 'Internal server error'
    return NextResponse.json({ error: details }, { status: 500 })
  }
} 