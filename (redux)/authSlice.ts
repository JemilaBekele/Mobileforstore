import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { loginUser, getUserById, updateUserById, changePassword } from "@/(services)/api/api";
import { saveToStorage, loadFromStorage, removeFromStorage } from "@/(utils)/storage";

export const loadUser = createAsyncThunk("auth/loadUser", async (_, { rejectWithValue }) => {
  try {
    const user = await loadFromStorage("userInfo");
    const token = await loadFromStorage("authToken");
    return { user, token };
  } catch {
    return rejectWithValue("Error loading user");
  }
});

export const login = createAsyncThunk(
  "auth/login",
  async (loginData: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await loginUser(loginData);
      const token = response.tokens.access.token; // Extract from nested structure
      const user = response.user; // Extract user details
      if (token) {
        await saveToStorage("authToken", token); // Save token
      }
      if (user) {
        await saveToStorage("userInfo", user); // Save user
      }
      return { token, user };
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const fetchUserById = createAsyncThunk("auth/fetchUserById", async (_, { rejectWithValue }) => {
  try {
    const response = await getUserById();
    return response.user || response; // Handle both response structures
  } catch (error: any) {
    console.error("Error fetching user:", error);
    return rejectWithValue(error.message || "Failed to fetch user");
  }
});

export const updateUserByIdAction = createAsyncThunk(
  "auth/updateUserById", 
  async (
    { userID, updatedData }: { userID: string; updatedData: Record<string, any> },
    { rejectWithValue }
  ) => {
    try {
      const response = await updateUserById(userID, updatedData);
      const updatedUser = response.user || response; // Handle both response structures
      
      // Update stored user info
      const currentUser = await loadFromStorage("userInfo");
      if (currentUser) {
        await saveToStorage("userInfo", { ...currentUser, ...updatedUser });
      }
      
      return updatedUser;
    } catch (error: any) {
      console.error("Error updating user:", error);
      return rejectWithValue(error.message || "Failed to update user");
    }
  }
);

export const changePasswordAction = createAsyncThunk(
  "auth/changePassword",
  async (
    { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await changePassword(currentPassword, newPassword);
      return response;
    } catch (error: any) {
      console.error("Change Password Error:", error);
      return rejectWithValue(error.message || "Failed to change password");
    }
  }
);

// Client-side only logout - no API call
export const logout = createAsyncThunk("auth/logout", async (_, { rejectWithValue }) => {
  try {
    
    // Remove tokens and user data from storage
    await removeFromStorage("authToken");
    await removeFromStorage("userInfo");
    await removeFromStorage("refreshToken"); // If you have refresh token
    
    return { success: true, message: "Logged out successfully" };
  } catch (error: any) {
    console.error("Error during client-side logout:", error);
    // Even if storage clearing fails, we still want to proceed with logout
    // So we don't reject the action, we still return success
    return { success: true, message: "Logged out successfully" };
  }
});

// Define your user type based on your API response
interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  status?: string;
  role?: {
    id: string;
    name: string;
  };
  branch?: {
    id: string;
    name: string;
  };
  shops?: { id: string; name: string }[];
  stores?: { id: string; name: string }[];
  // add other user properties as needed
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean; // Add this field
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false, // Initialize as false
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Synchronous logout action for immediate state clearing
    logoutAction: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false; // Update isAuthenticated
      state.loading = false;
      state.error = null;
      // Fire and forget storage clearing
      removeFromStorage("userInfo");
      removeFromStorage("authToken");
      removeFromStorage("refreshToken");
    },
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = !!state.token; // Update isAuthenticated based on token
    },
    // Optional: Clear token only (for specific cases)
    clearToken: (state) => {
      state.token = null;
      state.isAuthenticated = false; // Update isAuthenticated
      removeFromStorage("authToken");
    },
    // Add a new action to check authentication status
    checkAuthStatus: (state) => {
      state.isAuthenticated = !!(state.token && state.user);
    }
  },
  extraReducers: (builder) => {
    builder
      // Load User
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action: PayloadAction<{ user: User | null; token: string | null }>) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = !!(action.payload.token && action.payload.user); // Set isAuthenticated
        state.loading = false;
      })
      .addCase(loadUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false; // Ensure isAuthenticated is false on error
      })
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<{ token: string; user: User }>) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true; // Set to true on successful login
        state.loading = false;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false; // Set to false on login failure
      })
      // Fetch User by ID
      .addCase(fetchUserById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserById.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        state.isAuthenticated = !!state.token; // Update isAuthenticated based on token
        state.loading = false;
        state.error = null;
      })
      .addCase(fetchUserById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.isAuthenticated = false; // Set to false on fetch failure
      })
      // Update User by ID
      .addCase(updateUserByIdAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserByIdAction.fulfilled, (state, action: PayloadAction<User>) => {
        if (state.user) {
          state.user = {
            ...state.user,
            ...action.payload, // Merge updated user details
          };
        } else {
          state.user = action.payload;
        }
        state.isAuthenticated = !!state.token; // Update isAuthenticated
        state.loading = false;
        state.error = null;
      })
      .addCase(updateUserByIdAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Change password
      .addCase(changePasswordAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePasswordAction.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
      })
      .addCase(changePasswordAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout - Client-side only
      .addCase(logout.pending, (state) => {
        state.loading = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false; // Set to false on logout
        state.loading = false;
        state.error = null;
      })
      .addCase(logout.rejected, (state, action) => {
        // Even if there was an error clearing storage, we still clear the state
        state.user = null;
        state.token = null;
        state.isAuthenticated = false; // Set to false on logout
        state.loading = false;
        state.error = null; // Don't set error for logout failures
      });
  },
});

export const { logoutAction, clearError, setUser, clearToken, checkAuthStatus } = authSlice.actions;

export default authSlice.reducer;