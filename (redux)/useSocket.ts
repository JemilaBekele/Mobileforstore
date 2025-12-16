// (redux)/useSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import socketService, { Notification, NotificationCallback } from '../(services)/socket';
import { useSelector } from 'react-redux';
import { RootState } from '@/(redux)/store';
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';
import { NotificationService } from '@/(utils)/notificationService';

const getNotificationKey = (notification: Notification): string => {
  return `${notification.type}-${notification.id}`;
};

export const useSocketSafe = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const notificationCallbackRef = useRef<NotificationCallback | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasAttemptedConnection, setHasAttemptedConnection] = useState(false);
  const appState = useRef(AppState.currentState);
  
  // Track seen notifications to filter duplicates - use ref to persist across re-renders
  const seenNotificationsRef = useRef<Set<string>>(new Set());
  const originalCallbackRef = useRef<NotificationCallback | null>(null);

  // Extract complex expressions to variables
  const shopId = user?.shops?.[0]?.id;
  const userId = user?.id;

  const connect = useCallback((): void => {
    if (shopId && userId) {
      socketService.connect(shopId, userId);
      
      const socket = socketService.getSocket();
      if (socket) {
        socket.on('connect', () => {
          setIsConnected(true);
        });
        
        socket.on('disconnect', () => {
          setIsConnected(false);
        });
      }
      setHasAttemptedConnection(true);
    } else {
      console.log('❌ useSocketSafe: No shop ID or user ID available for connection');
    }
  }, [shopId, userId]);

  const isDuplicateNotification = (notification: Notification): boolean => {
    const key = getNotificationKey(notification);
    const isDuplicate = seenNotificationsRef.current.has(key);
  
    return isDuplicate;
  };

  const trackNotification = (notification: Notification): void => {
    const key = getNotificationKey(notification);
    seenNotificationsRef.current.add(key);
  };

  const onNotification = useCallback((callback: NotificationCallback): void => {
    
    // Store the original callback
    originalCallbackRef.current = callback;
    
    // Only set up the socket listener once
    if (!notificationCallbackRef.current) {
      notificationCallbackRef.current = (notification: Notification) => {
        
        // Check if this is a duplicate notification
        if (isDuplicateNotification(notification)) {
          return;
        }
        
        // Track the notification to prevent duplicates
        trackNotification(notification);
        
        // Call the original callback if it exists
        if (originalCallbackRef.current) {
          originalCallbackRef.current(notification);
        }
      };
      
      socketService.onNotification(notificationCallbackRef.current);
    }
  }, []);

  // Method to manually clear duplicate tracking
  const clearNotificationHistory = useCallback((): void => {
    seenNotificationsRef.current.clear();
  }, []);

  // Handle notification tap - MARK AS READ when user taps notification
  useEffect(() => {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (isValidNotification(data) && userId) {
        console.log('👆 useSocketSafe: Notification tapped:', getNotificationKey(data));
        
        // Mark notification as read in backend
        socketService.markAsRead(data.id, userId);
        
        // Track this notification to prevent duplicates if it comes through socket again
        trackNotification(data);
        
        // Call the callback if any screen is listening
        if (originalCallbackRef.current) {
          originalCallbackRef.current(data);
        }
      }
    });

    return () => {
      responseSubscription.remove();
    };
  }, [userId]);

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - clear badge and notification history
        NotificationService.setBadgeCount(0);
        clearNotificationHistory(); // Clear duplicates when app comes to foreground
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [clearNotificationHistory]);

  // Only attempt connection when user data is available
  useEffect(() => {
    // Only register for push notifications when user is available
    if (userId) {
      NotificationService.registerForPushNotificationsAsync().catch(error => {
      });
    }

    if (shopId && userId) {
      connect();
    } else if (!hasAttemptedConnection) {
      console.log('⏳ useSocketSafe: Waiting for user data...');
    }

    return () => {
      if (notificationCallbackRef.current) {
        socketService.offNotification(notificationCallbackRef.current);
        notificationCallbackRef.current = null;
      }
      socketService.disconnect();
    };
  }, [connect, shopId, userId, hasAttemptedConnection]);

  return {
    connect,
    disconnect: socketService.disconnect,
    onNotification,
    isConnected: () => isConnected,
    getSocket: socketService.getSocket,
    markAsRead: socketService.markAsRead,
    isUserReady: !!userId,
    clearNotificationHistory,
  };
};

// Validation function
function isValidNotification(data: any): data is Notification {
  return (
    data &&
    typeof data.id === 'string' &&
    typeof data.shopId === 'string' &&
    typeof data.title === 'string' &&
    typeof data.message === 'string' &&
    typeof data.type === 'string' &&
    typeof data.relatedEntityType === 'string' &&
    typeof data.createdAt === 'string' &&
    typeof data.read === 'boolean' &&
    typeof data.userId === 'string'
  );
}