// lib/notificationService.ts
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Notification } from '../(services)/socket';
import { ALERT_VIBRATION_PATTERN } from './alertFeedback';

// Loud channel for sale alerts. Android never lets an app change a channel's
// sound or vibration after it is created, so changing either needs a new id.
export const ALERT_CHANNEL_ID = 'sale-alerts';
// Bundled through the expo-notifications plugin in app.json
const ALERT_SOUND = 'sale_alert.wav';

// Configure notification behavior. While the app is open the banner stays
// silent: alertUser() in alertFeedback.ts plays the alarm at full volume instead.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  static async registerForPushNotificationsAsync(): Promise<string | null> {
    try {
      let token: string | null = null;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
        });

        // Plays on the alarm volume, which is louder than notification volume
        // and still rings when notification volume is turned down
        await Notifications.setNotificationChannelAsync(ALERT_CHANNEL_ID, {
          name: 'Sale alerts',
          description: 'Loud alarm and vibration for new sales',
          importance: Notifications.AndroidImportance.MAX,
          sound: ALERT_SOUND,
          audioAttributes: {
            usage: Notifications.AndroidAudioUsage.ALARM,
            contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          },
          enableVibrate: true,
          vibrationPattern: ALERT_VIBRATION_PATTERN,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          lightColor: '#FF6B00',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Push notification permission not granted');
        return null;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('✅ Push token:', token);

      return token;
    } catch (error) {
      return null;
    }
  }

  static async showLocalNotification(notification: Notification): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.message,
          data: { ...notification },
          sound: ALERT_SOUND,
          vibrate: ALERT_VIBRATION_PATTERN,
          priority: Notifications.AndroidNotificationPriority.MAX,
          interruptionLevel: 'timeSensitive',
        },
        // Immediate, on the loud channel (Android)
        trigger: Platform.OS === 'android' ? { channelId: ALERT_CHANNEL_ID } : null,
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }

  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
    }
  }
}