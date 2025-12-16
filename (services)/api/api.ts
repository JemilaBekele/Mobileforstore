import axios from "axios";
import { AuthService } from "./authService";

// Base Axios instance
const apii = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json", 
  },
});


// Add token to requests automatically
apii.interceptors.request.use(
  async (config) => {
    const token = await AuthService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
apii.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AuthService.clearAuthData();
      // You can redirect to login here or let the component handle it
      console.log('🔄 Token expired, redirecting to login...');
    }
    return Promise.reject(error);
  }
);

// Login User
export interface LoginData {
  email: string;
  password: string;
}

export const loginUser = async (user: LoginData) => {
  try {
    const response = await apii.post("/login", user);
    
    // Save token and user data if login successful
    if (response.data.success && response.data.token) {
      await AuthService.saveAuthData(response.data.token, response.data.user);
    }
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

// Get User by ID
export const getUserById = async () => {
  try {
    // Token is automatically added by interceptor
    const response = await apii.get(`/users/Usermy/data`);
    return response.data;
  } catch (error: any) {
    
    // Clear auth data if unauthorized
    if (error.response?.status === 401) {
      await AuthService.clearAuthData();
    }
    
    throw new Error(error.response?.data?.message || "Failed to fetch user");
  }
};

// Update User by ID
export const updateUserById = async (userID: string, updatedData: Record<string, any>) => {
  try {
    const response = await apii.put(`/users/${userID}`, updatedData);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update user");
  }
};

// Change Password
export const changePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const response = await apii.patch(`/users/change-password`, {
      currentPassword,
      newPassword,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to change password");
  }
};

// Logout User
export const logoutUser = async () => {
  try {
    
    // Try to call backend logout (optional)
    try {
      const response = await apii.post("/logout");
      console.log("Backend logout response:", response.data);
    } catch (backendError) {
      console.log("Backend logout failed, continuing with client logout");
    }
    
    // Always clear local auth data
    await AuthService.clearAuthData();
    
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    
    // Still clear local data even if backend fails
    await AuthService.clearAuthData();
    
    throw new Error(error.response?.data?.message || "Logout failed");
  }
};

// Check if user is authenticated (for initial app load)
export const checkAuthStatus = async () => {
  try {
    const token = await AuthService.getToken();
    const user = await AuthService.getUser();
    
    if (!token || !user) {
      return { isAuthenticated: false, user: null, token: null };
    }
    
    // Optional: Validate token with backend
    try {
      const response = await apii.get("/users/Usermy/data");
      return { 
        isAuthenticated: true, 
        user: user, 
        token: token,
        freshUserData: response.data 
      };
    } catch (error) {
      // Token might be expired, clear auth data
      await AuthService.clearAuthData();
      return { isAuthenticated: false, user: null, token: null };
    }
    
  } catch (error) {
    console.error("Error checking auth status:", error);
    return { isAuthenticated: false, user: null, token: null };
  }
};