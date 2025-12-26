import { useCallback, useEffect, useRef, useState } from 'react';
import socketService, { Notification, NotificationCallback } from '../(services)/socket';
import { useSelector } from 'react-redux';
import { RootState } from '@/(redux)/store';

// Helper function to generate a unique key for notification comparison
const getNotificationKey = (notification: Notification): string => {
  return `${notification.type}-${notification.id}`;
};

export const useSocketSafe = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const notificationCallbackRef = useRef<NotificationCallback | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  
  // Track seen notifications to filter duplicates
  const seenNotificationsRef = useRef<Set<string>>(new Set());
  const notificationHistoryRef = useRef<Notification[]>([]);
  const MAX_HISTORY_SIZE = 100; // Prevent memory leaks

  const connect = useCallback((): void => {
    if (user?.shops?.[0]?.id && user?.id) {
      const shopId = user.shops[0].id;
      const userId = user.id;
      
      socketService.connect(shopId, userId);
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('connect', () => {
          setIsConnected(true);
          // Clear seen notifications on reconnect to receive potentially missed ones
          seenNotificationsRef.current.clear();
        });
        
        socket.on('disconnect', () => {
          setIsConnected(false);
        });
      }
    } else {
      console.log('❌ useSocketSafe: No shop ID or user ID available for connection');
    }
  }, [user?.id, user?.shops]);

  const isDuplicateNotification = (notification: Notification): boolean => {
    const key = getNotificationKey(notification);
    return seenNotificationsRef.current.has(key);
  };

  const trackNotification = (notification: Notification): void => {
    const key = getNotificationKey(notification);
    seenNotificationsRef.current.add(key);
    
    // Add to history
    notificationHistoryRef.current.unshift(notification);
    
    // Limit history size to prevent memory leaks
    if (notificationHistoryRef.current.length > MAX_HISTORY_SIZE) {
      const removed = notificationHistoryRef.current.pop();
      if (removed) {
        const removedKey = getNotificationKey(removed);
        seenNotificationsRef.current.delete(removedKey);
      }
    }
  };

  const onNotification = (callback: NotificationCallback, options: { filterDuplicates?: boolean } = {}): void => {
    const { filterDuplicates = true } = options;
    
    
    if (notificationCallbackRef.current) {
      socketService.offNotification(notificationCallbackRef.current);
    }
    
    notificationCallbackRef.current = (notification: Notification) => {
      
      // Check if this is a duplicate
      if (filterDuplicates && isDuplicateNotification(notification)) {
        return;
      }
      
      // Track the notification
      trackNotification(notification);
      
      // Update state and call callback
      setLastNotification(notification);
      callback(notification);
    };
    
    socketService.onNotification(notificationCallbackRef.current);
  };

  // Method to manually clear duplicate tracking (useful for testing or specific scenarios)
  const clearNotificationHistory = useCallback((): void => {
    seenNotificationsRef.current.clear();
    notificationHistoryRef.current = [];
  }, []);

  // Method to get notification history (for debugging)
  const getNotificationHistory = useCallback((): Notification[] => {
    return [...notificationHistoryRef.current];
  }, []);

  useEffect(() => {
    
    
    if (user?.shops?.[0]?.id && user?.id) {
      connect();
    } else {
      console.log('❌ useSocketSafe: Cannot connect - missing shop ID or user ID');
    }

    return () => {
      if (notificationCallbackRef.current) {
        socketService.offNotification(notificationCallbackRef.current);
      }
      socketService.disconnect();
    };
  }, [connect, user, user?.id]);

  return {
    connect,
    disconnect: socketService.disconnect,
    onNotification,
    isConnected: () => isConnected,
    getSocket: socketService.getSocket,
    lastNotification,
    clearNotificationHistory, // For manual control
    getNotificationHistory, // For debugging
  };
};