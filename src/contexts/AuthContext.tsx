import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthService } from '../services';
import { apiClient } from '../utils/api';
import { queryClient } from '../main';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (nationalId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (has valid token)
    const savedToken = localStorage.getItem('authToken');
    console.log('AuthContext: Checking saved token...', { hasToken: !!savedToken });

    if (savedToken) {
      apiClient.setToken(savedToken);
      // Verify token by fetching user profile
      AuthService.getProfile()
        .then((userData) => {
          console.log('AuthContext: Profile fetched successfully', {
            userId: userData.id,
            role: userData.role
          });
          setUser(userData);
        })
        .catch((error) => {
          console.error('Token verification failed:', error);
          // Check error message for 401/Unauthorized
          const errorMessage = error.message?.toLowerCase() || '';
          if (errorMessage.includes('unauthorized') ||
            errorMessage.includes('401') ||
            errorMessage.includes('unauthenticated')) {
            localStorage.removeItem('authToken');
            apiClient.setToken(null);
          }
          // For other errors (network, server errors), keep the token
          // The user might still be able to use cached data or retry
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (nationalId: string, pin: string): Promise<boolean> => {
    setIsLoading(true);

    // Preserve theme preference before clearing cache
    const savedTheme = localStorage.getItem('theme');

    // Clear any cached data from previous user for security
    localStorage.clear();

    // 🔐 مسح cache الـ TanStack Query لمنع تسرب البيانات بين المستأجرين
    queryClient.clear();

    // Restore theme preference
    if (savedTheme) {
      localStorage.setItem('theme', savedTheme);
    }

    try {
      const loginResponse = await AuthService.login({ nationalId, pin });
      setUser(loginResponse.user);
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);

    // Preserve theme preference before clearing cache
    const savedTheme = localStorage.getItem('theme');

    try {
      await AuthService.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear ALL localStorage to ensure no data leaks between users
      localStorage.clear();

      // 🔐 مسح cache الـ TanStack Query لمنع تسرب البيانات بين المستأجرين
      queryClient.clear();

      // Restore theme preference
      if (savedTheme) {
        localStorage.setItem('theme', savedTheme);
      }

      // Clear apiClient token
      apiClient.setToken(null);

      setUser(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
