import { config } from 'dotenv';
config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testNotifications() {
  console.log('🧪 Testing notification system...');

  try {
    // 1. Test creating a notification
    console.log('📝 Creating test notification...');
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: 'test-user-id', // Replace with actual user ID
        title: 'Test Notification',
        message: 'This is a test notification',
        type: 'user_comment',
        related_id: '123', // Replace with actual workout ID
        read: false,
      })
      .select()
      .single();

    if (notificationError) {
      console.error('❌ Error creating notification:', notificationError);
      return;
    }

    console.log('✅ Test notification created:', notification);

    // 2. Test fetching notifications
    console.log('📥 Fetching notifications...');
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', 'test-user-id')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('❌ Error fetching notifications:', fetchError);
      return;
    }

    console.log('✅ Notifications fetched:', notifications);

    // 3. Test marking as read
    if (notifications && notifications.length > 0) {
      console.log('👁️ Marking notification as read...');
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notifications[0].id);

      if (updateError) {
        console.error('❌ Error marking notification as read:', updateError);
        return;
      }

      console.log('✅ Notification marked as read');
    }

    // 4. Test deleting notification
    if (notifications && notifications.length > 0) {
      console.log('🗑️ Deleting test notification...');
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notifications[0].id);

      if (deleteError) {
        console.error('❌ Error deleting notification:', deleteError);
        return;
      }

      console.log('✅ Test notification deleted');
    }

    console.log('🎉 All notification tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotifications(); 