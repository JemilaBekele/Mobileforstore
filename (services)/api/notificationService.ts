// import * as Notifications from 'expo-notifications';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';

// // Configure notification behavior
// Notifications.setNotificationHandler({
//   handleNotification: async () => ({
//     shouldShowAlert: true,
//     shouldPlaySound: true,
//     shouldSetBadge: true,
//   }),
// });

// export interface PushNotificationData {
//   title: string;
//   body: string;
//   data?: any;
//   sound?: boolean;
// }

// class NotificationService {
//   private isConfigured = false;

//   async configure() {
//     if (this.isConfigured) return;

//     // Request permissions
//     const { status: existingStatus } = await Notifications.getPermissionsAsync();
//     let finalStatus = existingStatus;
    
//     if (existingStatus !== 'granted') {
//       const { status } = await Notifications.requestPermissionsAsync();
//       finalStatus = status;
//     }
    
//     if (finalStatus !== 'granted') {
//       console.log('❌ Notification permissions not granted');
//       return;
//     }

//     // Get push token
//     try {
//       const token = await this.getPushToken();
//       console.log('✅ Push notification token:', token);
      
//       // Send this token to your backend for push notifications
//       await this.registerPushToken(token);
      
//     } catch (error) {
//       console.log('❌ Error getting push token:', error);
//     }

//     this.isConfigured = true;
//   }

//   private async getPushToken(): Promise<string> {
//     if (!Device.isDevice) {
//       throw new Error('Must use physical device for push notifications');
//     }

//     const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID; // You need to set this up
//     if (!projectId) {
//       console.warn('⚠️ EXPO_PUBLIC_EAS_PROJECT_ID not set, using local notifications only');
//       return 'local-only';
//     }

//     const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
//     return token;
//   }

//   private async registerPushToken(token: string) {
//     if (token === 'local-only') return;
    
//     // Send token to your backend
//     try {
//       const response = await fetch('http://your-backend-api/register-push-token', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           token,
//           platform: Platform.OS,
//         }),
//       });
      
//       if (response.ok) {
//         console.log('✅ Push token registered with backend');
//       }
//     } catch (error) {
//       console.log('❌ Failed to register push token with backend:', error);
//     }
//   }

//   // Local notification (works when app is in foreground/background)
//   async showLocalNotification(notification: PushNotificationData) {
//     await this.configure();

//     await Notifications.scheduleNotificationAsync({
//       content: {
//         title: notification.title,
//         body: notification.body,
//         data: notification.data || {},
//         sound: notification.sound !== false, // Play sound by default
//         // You can also add:
//         // badge: 1, // iOS badge number
//         // vibrate: [0, 250, 250, 250], // Android vibration pattern
//       },
//       trigger: null, // Show immediately
//     });
//   }

//   // Schedule notification for later
//   async scheduleNotification(notification: PushNotificationData, trigger: Notifications.NotificationTriggerInput) {
//     await this.configure();

//     await Notifications.scheduleNotificationAsync({
//       content: {
//         title: notification.title,
//         body: notification.body,
//         data: notification.data || {},
//         sound: true,
//       },
//       trigger,
//     });
//   }

//   // Cancel all scheduled notifications
//   async cancelAllNotifications() {
//     await Notifications.cancelAllScheduledNotificationsAsync();
//   }

//   // Get notification permissions status
//   async getPermissionsStatus() {
//     return await Notifications.getPermissionsAsync();
//   }

//   // Listen for notification responses (when user taps notification)
//   setNotificationHandler(handler: (response: Notifications.NotificationResponse) => void) {
//     return Notifications.addNotificationResponseReceivedListener(handler);
//   }

//   // Listen for notifications received in foreground
//   setForegroundHandler(handler: (notification: Notifications.Notification) => void) {
//     return Notifications.addNotificationReceivedListener(handler);
//   }

//   // Remove listeners
//   removeListeners() {
//     Notifications.removeAllNotificationListeners();
//   }
// }

// export default new NotificationService();