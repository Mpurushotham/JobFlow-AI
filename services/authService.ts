
// A client-side-only auth service for a multi-user, single-browser environment.
import { storageService } from './storageService';
import { User } from '../types';

const USERS_KEY = 'jobflow_users';
const SESSION_KEY = 'jobflow_session';

// Simple hash function for demonstration. NOT for production use.
const simpleHash = (str: string, salt: string) => {
  return btoa(str + salt);
};

const getUsers = (): User[] => {
    try {
        const data = localStorage.getItem(USERS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        return [];
    }
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const authService = {
  signup: (username: string, password: string, pin: string, email: string, phone: string): boolean => {
    const users = getUsers();
    if (users.some(u => u.username === username)) {
      return false; // User already exists
    }
    const salt = Math.random().toString(36).substring(2, 15);
    const hashedPassword = simpleHash(password, salt);
    const hashedPin = simpleHash(pin, salt);

    const newUser: User = {
      username,
      email,
      phone,
      hashedPassword,
      hashedPin,
      salt,
      createdDate: Date.now(),
    };
    users.push(newUser);
    saveUsers(users);

    // Automatically create the user profile
    storageService.saveProfile(username, {
      name: username,
      email: email,
      phone: phone,
      resumeContent: '',
      targetRoles: ''
    });

    return true;
  },

  login: (username: string, password: string, pin: string): { success: boolean, isAdmin: boolean, username: string | null } => {
    // Admin Backdoor
    if (username === 'admin' && password === 'admin' && pin === '1111') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, isAdmin: true, username: 'admin' }));
      return { success: true, isAdmin: true, username: 'admin' };
    }

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user) return { success: false, isAdmin: false, username: null };

    const hashedPassword = simpleHash(password, user.salt);
    const hashedPin = simpleHash(pin, user.salt);

    if (hashedPassword === user.hashedPassword && hashedPin === user.hashedPin) {
      user.lastLogin = Date.now();
      saveUsers(users);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, isAdmin: false, username: user.username }));
      return { success: true, isAdmin: false, username: user.username };
    }

    return { success: false, isAdmin: false, username: null };
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated: (): { authenticated: boolean, isAdmin: boolean, username: string | null } => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return { authenticated: false, isAdmin: false, username: null };
    const sessionData = JSON.parse(session);
    return { authenticated: sessionData.loggedIn, isAdmin: sessionData.isAdmin, username: sessionData.username };
  },

  doesAnyUserExist: (): boolean => {
    const users = getUsers();
    return users.length > 0;
  },

  // --- Admin Functions ---
  getAllUsers: (): User[] => {
    return getUsers();
  },

  resetPasswordPin: (username: string, newPass: string, newPin: string): boolean => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.username === username);
    if (userIndex === -1) return false;

    const user = users[userIndex];
    user.hashedPassword = simpleHash(newPass, user.salt);
    user.hashedPin = simpleHash(newPin, user.salt);

    saveUsers(users);
    return true;
  }
};
