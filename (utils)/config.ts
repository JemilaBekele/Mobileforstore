// api/config.ts
import axios from "axios";
import { router } from "expo-router";
import { loadFromStorage, removeFromStorage } from "@/(utils)/storage";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json", 
  },
});

// Add token to requests if available
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await loadFromStorage("authToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch  {
      console.log("No auth token found");
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// The saved token expired or was revoked: clear it and show the login screen
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config || {};
    if (
      error?.response?.status === 401 &&
      config.headers?.Authorization &&
      !config.skipAuthRedirect
    ) {
      await removeFromStorage("authToken");
      await removeFromStorage("userInfo");
      try {
        router.replace("/");
      } catch {
        // navigation not ready yet; the start screen will ask for login
      }
    }
    return Promise.reject(error);
  }
);

export default api;