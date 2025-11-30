// A client-side-only auth service for a multi-user, single-browser environment.
import { storageService } from './storageService';
import { User, SubscriptionTier, LogActionType } from '../types';
import { logService } from './logService';

const USERS_KEY = 'jobflow_users'; // Kept for historical context for old localstorage, but now IndexedDB handles actual storage
const SESSION_KEY = 'jobflow_session';

// Simple hash function for demonstration. NOT for production use.
const simpleHash = (str: string, salt: string) => {
  return btoa(str + salt);
};

// Removed direct localStorage.getItem/setItem for users, now uses storageService (which uses IndexedDB)
// const getUsers = (): User[] => { ... }
// const saveUsers = (users: User[]) => { ... }

export const authService = {
  signup: async (username: string, password: string, pin: string, email: string, phone: string): Promise<boolean> => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const trimmedPin = pin.trim();

    // Check if the username is 'admin' and if the admin user already exists
    if (trimmedUsername === 'admin') {
      const existingUsers = await storageService.getAllUsers();
      if (existingUsers.some(u => u.username === 'admin')) {
        console.warn('Attempted to sign up as admin, but admin already exists.');
        return false; // Admin user cannot be signed up if already present
      }
      // If admin doesn't exist, proceed with signup, but this path isn't expected for the fixed 'admin' login
      // For this app, 'admin' is a fixed backdoor, not a signup.
      return false; // Prevent regular signup for 'admin'
    }

    const users = await storageService.getAllUsers();
    if (users.some(u => u.username === trimmedUsername)) {
      return false; // User already exists
    }
    const salt = Math.random().toString(36).substring(2, 15);
    const hashedPassword = simpleHash(trimmedPassword, salt);
    const hashedPin = simpleHash(trimmedPin, salt);

    const newUser: User = {
      username: trimmedUsername,
      email: trimmedEmail,
      phone: trimmedPhone,
      hashedPassword,
      hashedPin,
      salt,
      createdDate: Date.now(),
      subscriptionTier: SubscriptionTier.FREE, // New users start as FREE
      // FIX: Add accountStatus
      accountStatus: 'valid', 
    };
    await storageService.saveUser(newUser);

    // Automatically create the user profile, including tier
    await storageService.saveProfile(trimmedUsername, {
      name: trimmedUsername,
      email: trimmedEmail,
      phone: trimmedPhone,
      resumeContent: '',
      targetRoles: '',
      subscriptionTier: SubscriptionTier.FREE,
    });

    return true;
  },

  login: async (username: string, password: string, pin: string): Promise<{ success: boolean, isAdmin: boolean, username: string | null, subscriptionTier: SubscriptionTier | null, message?: string }> => {
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();
    const trimmedPin = pin.trim();

    // Admin Backdoor
    if (trimmedUsername === 'admin' && trimmedPassword === 'admin' && trimmedPin === '1111') {
      const adminUser: User = {
        username: 'admin',
        email: 'admin@jobflow.ai',
        phone: '+15551234567',
        hashedPassword: simpleHash('admin', 'admin_salt'), // Using a fixed salt for fixed admin
        hashedPin: simpleHash('1111', 'admin_salt'),
        salt: 'admin_salt',
        createdDate: Date.now(),
        lastLogin: Date.now(),
        subscriptionTier: SubscriptionTier.AI_PRO,
        // FIX: Add accountStatus
        accountStatus: 'valid',
      };
      await storageService.saveUser(adminUser); // Ensure admin user exists in DB
      await storageService.saveProfile('admin', { // Ensure admin profile exists
        name: 'admin',
        email: 'admin@jobflow.ai',
        phone: '+15551234567',
        resumeContent: 'Admin account, no personal resume data.',
        targetRoles: 'Administrator',
        subscriptionTier: SubscriptionTier.AI_PRO,
      });

      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, isAdmin: true, username: 'admin', subscriptionTier: SubscriptionTier.AI_PRO }));
      logService.log('admin', LogActionType.USER_LOGIN, 'Admin user logged in via backdoor.', 'info');
      return { success: true, isAdmin: true, username: 'admin', subscriptionTier: SubscriptionTier.AI_PRO, message: 'Admin login successful.' };
    }

    const users = await storageService.getAllUsers();
    const user = users.find(u => u.username === trimmedUsername);

    if (!user) {
      logService.log(trimmedUsername, LogActionType.USER_LOGIN_FAILED, 'Login failed: User not found.', 'warn');
      return { success: false, isAdmin: false, username: null, subscriptionTier: null, message: 'Invalid credentials.' };
    }

    // NEW: Account status check
    if (user.accountStatus === 'invalid') {
      logService.log(trimmedUsername, LogActionType.USER_INACTIVE_LOGIN_ATTEMPT, 'Login failed: Account is inactive.', 'warn');
      return { success: false, isAdmin: false, username: null, subscriptionTier: null, message: 'Your account is currently inactive. Please contact support.' };
    }

    const hashedPassword = simpleHash(trimmedPassword, user.salt);
    const hashedPin = simpleHash(trimmedPin, user.salt);

    if (hashedPassword === user.hashedPassword && hashedPin === user.hashedPin) {
      user.lastLogin = Date.now();
      await storageService.saveUser(user); // Save updated lastLogin
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ loggedIn: true, isAdmin: false, username: user.username, subscriptionTier: user.subscriptionTier }));
      logService.log(trimmedUsername, LogActionType.USER_LOGIN, 'User successfully logged in.', 'info');
      return { success: true, isAdmin: false, username: user.username, subscriptionTier: user.subscriptionTier, message: 'Login successful.' };
    }

    logService.log(trimmedUsername, LogActionType.USER_LOGIN_FAILED, 'Login failed: Invalid password or PIN.', 'warn');
    return { success: false, isAdmin: false, username: null, subscriptionTier: null, message: 'Invalid credentials.' };
  },

  logout: () => {
    sessionStorage.removeItem(SESSION_KEY);
  },

  isAuthenticated: (): { authenticated: boolean, isAdmin: boolean, username: string | null, subscriptionTier: SubscriptionTier | null } => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (!session) return { authenticated: false, isAdmin: false, username: null, subscriptionTier: null };
    const sessionData = JSON.parse(session);
    return { authenticated: sessionData.loggedIn, isAdmin: sessionData.isAdmin, username: sessionData.username, subscriptionTier: sessionData.subscriptionTier };
  },

  doesAnyUserExist: async (): Promise<boolean> => {
    const users = await storageService.getAllUsers();
    return users.length > 0;
  },

  // NEW: Function to update a user's subscription tier
  updateUserSubscription: async (username: string, newTier: SubscriptionTier): Promise<boolean> => {
    const trimmedUsername = username.trim();
    const users = await storageService.getAllUsers();
    const userIndex = users.findIndex(u => u.username === trimmedUsername);
    if (userIndex === -1) return false;

    const user = users[userIndex];
    const oldTier = user.subscriptionTier;
    user.subscriptionTier = newTier;
    await storageService.saveUser(user);

    // Also update the profile's tier
    const profile = await storageService.getProfile(trimmedUsername);
    if (profile) { // Ensure profile exists before updating
      profile.subscriptionTier = newTier;
      await storageService.saveProfile(trimmedUsername, profile);
    }


    // If the user is currently logged in, update their session as well
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session) {
      const sessionData = JSON.parse(session);
      if (sessionData.username === trimmedUsername) {
        sessionData.subscriptionTier = newTier;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
      }
    }
    logService.log('admin', LogActionType.SUBSCRIPTION_CHANGE, `Admin changed ${trimmedUsername}'s subscription from ${oldTier} to ${newTier}.`, 'info');
    return true;
  },

  // NEW: Function to update a user's account status
  updateUserAccountStatus: async (username: string, newStatus: 'valid' | 'invalid'): Promise<boolean> => {
    const trimmedUsername = username.trim();
    const users = await storageService.getAllUsers();
    const userIndex = users.findIndex(u => u.username === trimmedUsername);
    if (userIndex === -1) return false;

    const user = users[userIndex];
    const oldStatus = user.accountStatus;
    user.accountStatus = newStatus;
    await storageService.saveUser(user);

    logService.log('admin', LogActionType.ADMIN_USER_STATUS_CHANGE, `Admin changed ${trimmedUsername}'s account status from ${oldStatus} to ${newStatus}.`, 'info');
    return true;
  },

  // NEW: Function to reset password/PIN based on username, email, and phone
  resetCredentialsByContact: async (username: string, email: string, phone: string, newPassword: string, newPin: string): Promise<boolean> => {
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedNewPassword = newPassword.trim();
    const trimmedNewPin = newPin.trim();

    const users = await storageService.getAllUsers(); // FIX: Await the promise for getAllUsers
    const userIndex = users.findIndex(u => u.username === trimmedUsername && u.email === trimmedEmail && u.phone === trimmedPhone);
    if (userIndex === -1) {
      logService.log('guest', LogActionType.USER_LOGIN_FAILED, `Password reset failed: User '${trimmedUsername}' not found or contact details mismatch.`, 'warn');
      return false; // User not found or contact details don't match
    }

    const user = users[userIndex];
    user.hashedPassword = simpleHash(trimmedNewPassword, user.salt);
    user.hashedPin = simpleHash(trimmedNewPin, user.salt);
    await storageService.saveUser(user);
    logService.log(trimmedUsername, LogActionType.USER_LOGIN, 'User credentials successfully reset via forgot credentials flow.', 'info');
    return true;
  },

  // --- Admin Functions ---
  getAllUsers: async (): Promise<User[]> => {
    return storageService.getAllUsers();
  },

  resetPasswordPin: async (username: string, newPass: string, newPin: string): Promise<boolean> => {
    const trimmedUsername = username.trim();
    const trimmedNewPass = newPass.trim();
    const trimmedNewPin = newPin.trim();

    const users = await storageService.getAllUsers();
    const userIndex = users.findIndex(u => u.username === trimmedUsername);
    if (userIndex === -1) return false;

    const user = users[userIndex];
    user.hashedPassword = simpleHash(trimmedNewPass, user.salt);
    user.hashedPin = simpleHash(trimmedNewPin, user.salt);

    await storageService.saveUser(user);
    logService.log('admin', LogActionType.ADMIN_USER_CRED_RESET, `Admin reset password/PIN for ${trimmedUsername}.`, 'info');
    return true;
  }
};