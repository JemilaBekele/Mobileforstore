// api/config.ts
import axios from "axios";
import { loadFromStorage } from "@/(utils)/storage";

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

export default api;