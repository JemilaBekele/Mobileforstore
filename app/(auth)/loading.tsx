// app/(auth)/loading.tsx
import { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useDispatch } from 'react-redux';
import { checkAuthStatus } from '@/(services)/api/api';
import { setUser, setToken } from '@/(redux)/authSlice';
import { router } from 'expo-router';

export default function AuthLoading() {
  const dispatch = useDispatch();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        
        const authStatus = await checkAuthStatus();
        
        if (authStatus.isAuthenticated && authStatus.user && authStatus.token) {
          
          // Update Redux state with stored auth data
          dispatch(setUser(authStatus.user));
          dispatch(setToken(authStatus.token));
          
          // Navigate to main app
          router.replace('/(tabs)' as any);
        } else {
          console.log('❌ No valid authentication, redirecting to login...');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        router.replace('/(auth)/login');
      }
    };

    initializeApp();
  }, [dispatch]); // Add dispatch to dependencies

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
      <Text style={{ marginTop: 10 }}>Loading...</Text>
    </View>
  );
}