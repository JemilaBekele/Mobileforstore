import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { Notification } from '../(services)/socket';
import { useSocketSafe  } from '@/(redux)/useSocket';

const NotificationHandler: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { onNotification, isConnected } = useSocketSafe ();

  useEffect(() => {
    // Set up notification listener
    const handleNotification = (notification: Notification) => {
      console.log('📢 New notification received:', notification);
      setNotifications(prev => [notification, ...prev]);
      
      Alert.alert(
        notification.title,
        notification.message,
        [{ text: 'OK', onPress: () => console.log('OK Pressed') }]
      );
    };

    onNotification(handleNotification);

    // Cleanup is handled by the hook
  }, [onNotification]);

  return (
    <View>
      <Text>Socket Status: {isConnected() ? '✅ Connected' : '❌ Disconnected'}</Text>
      {notifications.length > 0 && (
        <Text style={{ padding: 10, backgroundColor: '#f0f0f0' }}>
          You have {notifications.length} new notifications
        </Text>
      )}
    </View>
  );
};

export default NotificationHandler;