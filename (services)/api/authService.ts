// (services)/authService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export class AuthService {
  // Save token after login
  static async saveAuthData(token: string, user: any): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving auth data:', error);
    }
  }

  // Get stored token
  static async getToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Get stored user data
  static async getUser(): Promise<any | null> {
    try {
      const userString = await AsyncStorage.getItem(USER_KEY);
      return userString ? JSON.parse(userString) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  // Check if user is logged in
  static async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }

  // Clear auth data on logout
  static async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }
}