import api from "@/(utils)/config";
import axios from "axios";

// Base Axios instance
const apii = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json", 
  },
});


// Login User
export interface LoginData {
  email: string;
  password: string;
}

export const loginUser = async (user: LoginData) => {
  try {
    const response = await apii.post("/login/Store/only", user);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

// Get User by ID !QAZxsw2
export const getUserById = async () => {
  try {
    // usser id is get by backend 
    const response = await api.get(`/users/Usermy/data`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to fetch user");
  }
};

// Update User by ID
export const updateUserById = async (userID: string, updatedData: Record<string, any>) => {
  try {
    const response = await api.put(`/users/${userID}`, updatedData);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Failed to update user");
  }
};

// Change Password
export const changePassword = async ( currentPassword: string, newPassword: string) => {
  try {
    const response = await api.patch(`/users/change-password`, {
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
    const response = await apii.post("/logout"); // Assuming the logout route is POST /logout
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Logout failed");
  }
};
