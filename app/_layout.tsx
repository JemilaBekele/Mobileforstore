// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { TamaguiProvider } from 'tamagui';
import config from '../tamagui.config';
import { Provider } from 'react-redux';
import store from '@/(redux)/store';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { View, Text } from 'react-native';
import { useSocketSafe } from '@/(redux)/useSocket';

// Create queryClient directly to avoid import issues
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Create a separate component that uses the socket hook
function AppContent() {
  const { onNotification, isConnected, isUserReady } = useSocketSafe();

  useEffect(() => {
    // Only set up notification listener when user is ready
    if (isUserReady) {
      onNotification((notification) => {
        console.log('📱 App received notification while open:', notification);
      });
    }
  }, [onNotification, isUserReady]);

  return (
    <>
      {/* Show connection status only when user is ready */}
      {isUserReady && !isConnected() && (
        <View style={{ backgroundColor: 'red', padding: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontSize: 12 }}>
            🔴 Disconnected from server
          </Text>
        </View>
      )}
      
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TamaguiProvider config={config}>
          <AppContent />
        </TamaguiProvider>
      </QueryClientProvider>
    </Provider>
  );
}