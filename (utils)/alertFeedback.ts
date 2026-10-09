import { Platform, Vibration } from 'react-native';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Loud alarm tone and a long vibration for new-sale alerts.
// The same sound is used by the 'sale-alerts' notification channel
// (see notificationService.ts and the expo-notifications plugin in app.json).

// Android vibrates on/off in ms (starts after 0 ms); iOS always does one fixed buzz,
// so on iOS we repeat it a few times instead.
export const ALERT_VIBRATION_PATTERN = [0, 700, 300, 700, 300, 700, 300, 700];

let player: AudioPlayer | null = null;
let audioModeSet = false;

const getPlayer = () => {
  if (!player) {
    player = createAudioPlayer(require('../assets/sounds/sale_alert.wav'));
  }
  return player;
};

export const vibrateForAlert = () => {
  if (Platform.OS === 'android') {
    Vibration.vibrate(ALERT_VIBRATION_PATTERN);
    return;
  }
  // iOS ignores patterns: buzz 3 times
  [0, 1000, 2000].forEach((delay) => setTimeout(() => Vibration.vibrate(), delay));
};

// Play the alarm at full volume (still limited by the phone's volume buttons)
export const playAlertSound = async () => {
  try {
    if (!audioModeSet) {
      // Play even when the iPhone's silent switch is on, and don't get ducked
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'doNotMix',
        shouldPlayInBackground: false,
      });
      audioModeSet = true;
    }
    const alarm = getPlayer();
    alarm.volume = 1;
    await alarm.seekTo(0);
    alarm.play();
  } catch (error) {
    console.warn('Could not play alert sound:', error);
  }
};

// Sound + vibration together, used when a new alert arrives while the app is open
export const alertUser = () => {
  vibrateForAlert();
  playAlertSound();
};
