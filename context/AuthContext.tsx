
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authService } from '../services/authService';
import { SubscriptionTier } from '../types';

// Moved SESSION_KEY here for AuthContext's internal use for persistence
const SESSION_KEY = 'jobflow_session'; 

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentUser: string | null;
  subscriptionTier: SubscriptionTier | null;
  isLoading: boolean;
  login: (username: string, isAdmin: boolean, subscriptionTier: SubscriptionTier) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authStatus = authService.isAuthenticated();
    setIsAuthenticated(authStatus.authenticated);
    setIsAdmin(authStatus.isAdmin);
    setCurrentUser(authStatus.username);
    setSubscriptionTier(authStatus.subscriptionTier);
    setIsLoading(false);
  }, []);

  const login = useCallback((username: string, isAdminLogin: boolean, userSubscriptionTier: SubscriptionTier) => {
    setIsAuthenticated(true);
    setIsAdmin(isAdminLogin);
    setCurrentUser(username);
    setSubscriptionTier(userSubscriptionTier);
    // CRITICAL FIX: Persist login state to sessionStorage when AuthContext's login is called
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, isAdmin: isAdminLogin, username: username, subscriptionTier: userSubscriptionTier }));
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setSubscriptionTier(null);
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, currentUser, subscriptionTier, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
