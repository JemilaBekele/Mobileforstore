import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { loadUser, logout, checkAuthStatus } from '@/(redux)/authSlice';
import { AppDispatch, RootState } from '@/(redux)/store';

// Define the user type to match your Redux state
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
  shopId?: string;
  storeId?: string;
  shops?: { id: string; name: string }[];
  stores?: { id: string; name: string }[];
  // Add other user properties as needed
}

// Define the auth context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  loadUser: () => void;
  logout: () => void;
  checkAuthStatus: () => void;
}

// Create the context with default values
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Props for the provider
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const dispatch = useDispatch<AppDispatch>();
  
  // Select auth state from Redux
  const authState = useSelector((state: RootState) => state.auth);
  
  // Load user on mount
  useEffect(() => {
    dispatch(loadUser());
  }, [dispatch]);

  // Context methods
  const contextValue: AuthContextType = {
    user: authState.user,
    token: authState.token,
    isAuthenticated: authState.isAuthenticated,
    loading: authState.loading,
    error: authState.error,
    loadUser: () => dispatch(loadUser()),
    logout: () => dispatch(logout()),
    checkAuthStatus: () => dispatch(checkAuthStatus()),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Export the context for direct usage if needed
export default AuthContext;