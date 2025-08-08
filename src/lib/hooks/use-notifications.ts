/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@/lib/supabase/client';
import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  type: string;
  related_id: string | null;
  read: boolean;
  created_at: string;
  updated_at: string;
}

const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const deletedNotifications = useRef(new Set<string>());

  const supabase = createClient();

  const fetchNotifications = async () => {
    if (!userId) return;
        
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('📥 Fetched notifications:', data?.length || 0);

      if (error) {
        console.error('❌ Error fetching notifications:', error);
      } else {
        // Filter out notifications that were deleted locally
        const filteredData = (data || []).filter(n => !deletedNotifications.current.has(n.id));
        setNotifications(filteredData);
        setUnreadCount(filteredData.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('❌ Error in fetchNotifications:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);

      // Realtime subscription for immediate updates
      const channel = supabase
        .channel(`realtime_notifications_${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
          (payload) => {
            const newNotification = payload.new as Notification;
            if (!deletedNotifications.current.has(newNotification.id)) {
              setNotifications((prev) => [newNotification, ...prev]);
              if (!newNotification.read) {
                setUnreadCount((prev) => prev + 1);
              }
            }
          }
        )
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [userId]);

  const deleteNotification = async (notificationId: string) => {
    try {
      console.log('🗑️ Deleting notification:', notificationId);
      
      // Find the notification before deleting to check if it was unread
      const notificationToDelete = notifications.find(n => n.id === notificationId);
            
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
              
      const deletePromise = supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      const { error } = await Promise.race([deletePromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Error deleting notification:', error);
        throw error;
      }
              
      // Add to deleted notifications set to prevent re-appearing
      deletedNotifications.current.add(notificationId);
              
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
            
      // Update unread count if the deleted notification was unread
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      console.log('✅ Notification deleted successfully');
    } catch (error) {
      console.error("❌ Error deleting notification:", error);
      throw error; // Re-throw so the UI can handle it
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
         setTimeout(() => reject(new Error('Timeout')), 10000)
      );
            
      const updatePromise = supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq('id', notificationId);

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;
      
      if (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
      }
            
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));

      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
      if (unreadIds.length === 0) return;

      await supabase
        .from('notifications')
        .update({ read: true, updated_at: new Date().toISOString() })
        .in('id', unreadIds);

      setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    deleteNotification,
    markNotificationAsRead,
    markAllAsRead,
  };
};

export default useNotifications;
