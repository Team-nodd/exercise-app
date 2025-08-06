import { createClient } from '@supabase/supabase-js';
import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  related_id?: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

const useNotifications = (userId?: string) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const deletedNotifications = useRef(new Set<string>());

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchNotifications = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      // Filter out notifications that were deleted locally
      const filteredData = (data || []).filter(n => !deletedNotifications.current.has(n.id));
      setNotifications(filteredData);
      setUnreadCount(filteredData.filter(n => !n.read).length);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchNotifications();
      
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const deleteNotification = async (notificationId: string) => {
    try {
      // Find the notification before deleting to check if it was unread
      const notificationToDelete = notifications.find(n => n.id === notificationId);
      
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
        
      const deletePromise = supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      await Promise.race([deletePromise, timeoutPromise]);
        
      // Add to deleted notifications set to prevent re-appearing
      deletedNotifications.current.add(notificationId);
        
      // Update local state immediately
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Update unread count if the deleted notification was unread
      if (notificationToDelete && !notificationToDelete.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error; // Re-throw so the UI can handle it
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const updatePromise = supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      await Promise.race([updatePromise, timeoutPromise]);
      
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    deleteNotification,
    markNotificationAsRead,
  };
};

export default useNotifications;
