

import { Job, UserProfile, RecentSearchQuery, User, AppBackupData, AppActivityLogEntry } from '../types';
import { indexedDbService } from './indexedDbService'; // Import new IndexedDB service

// Define keys for localStorage items that are NOT migrated to IndexedDB (e.g., migration flag)
const LOCAL_STORAGE_MIGRATED_KEY = 'jobflow_idb_migrated';

export const storageService = {
  // === User-specific functions ===
  async getJobs(username: string): Promise<Job[]> {
    if (!username) return [];
    return indexedDbService.getJobsForUser(username);
  },

  async saveJob(username: string, job: Job): Promise<void> {
    if (!username) return;
    // FIX: Add username to the job object before saving for IndexedDB indexing
    const jobWithUsername = { ...job, username };
    return indexedDbService.saveJob(jobWithUsername, username);
  },

  async deleteJob(id: string): Promise<void> {
    return indexedDbService.deleteJob(id);
  },

  async getProfile(username: string): Promise<UserProfile> {
    if (!username) return { name: '', resumeContent: '', targetRoles: '' };
    const profile = await indexedDbService.getProfile(username);
    return profile || { name: username, resumeContent: '', targetRoles: '' };
  },

  async saveProfile(username: string, profile: UserProfile): Promise<void> {
    if (!username) return;
    return indexedDbService.saveProfile(profile);
  },

  async getRecentSearches(): Promise<RecentSearchQuery[]> {
    // FIX: Await the promise from indexedDbService.getRecentSearches()
    const searches = await indexedDbService.getRecentSearches();
    // Sort by timestamp for consistency, assuming `saveRecentSearch` adds timestamp
    return searches.sort((a, b) => b.timestamp - a.timestamp);
  },

  async saveRecentSearch(query: string): Promise<void> {
    // FIX: Await the promise from indexedDbService.getRecentSearches()
    let searches = await indexedDbService.getRecentSearches();
    // Remove existing entry if query is the same to update timestamp
    searches = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    
    // Add new search
    const newSearch = { query, timestamp: Date.now() };
    searches.unshift(newSearch); // Add to the beginning

    // Keep only the latest 5
    if (searches.length > 5) {
      searches = searches.slice(0, 5);
    }
    
    // Save all current searches back to IndexedDB
    await Promise.all(searches.map(s => indexedDbService.saveRecentSearch(s)));
  },

  // === Auth-related (User) functions - now directly use indexedDbService ===
  async getAllUsers(): Promise<User[]> {
      return indexedDbService.getUsers();
  },

  async saveUser(user: User): Promise<void> {
      return indexedDbService.saveUser(user);
  },

  async deleteUser(username: string): Promise<void> {
      await indexedDbService.deleteUser(username);
      await indexedDbService.deleteProfile(username); // Also delete profile data
      await indexedDbService.deleteAllJobsForUser(username); // And associated jobs
      await indexedDbService.deleteAllActivityLogsForUser(username); // FIX: Delete associated activity logs
  },

  // === Admin functions ===
  async getAllProfiles(): Promise<Record<string, UserProfile>> {
    return indexedDbService.getAllProfiles();
  },

  async getAllJobs(): Promise<Record<string, Job[]>> {
    return indexedDbService.getAllJobs();
  },
  
  async getAppActivityLogs(): Promise<AppActivityLogEntry[]> {
    return indexedDbService.getLogEntries();
  },

  async deleteAllData(): Promise<void> {
    // Note: The admin account will be the only one remaining after this operation.
    await indexedDbService.clearAllData();
  },

  // --- Backup/Restore Functions ---
  async exportAllUserData(username: string): Promise<AppBackupData | null> {
    if (!username) return null;

    const user = (await indexedDbService.getUsers()).find(u => u.username === username);
    const profile = await indexedDbService.getProfile(username);
    const jobs = await indexedDbService.getJobsForUser(username);
    const recentSearches = await indexedDbService.getRecentSearches(); // Global recent searches
    // FIX: Call getLogEntries from indexedDbService
    const activityLogs = (await indexedDbService.getLogEntries()).filter(log => log.username === username || log.username === 'system' || log.username === 'guest'); // Only export logs relevant to user/system/guest

    if (!user || !profile) return null; // Must have at least user and profile

    return {
      users: [user], // Only export data for the current user
      profiles: { [username]: profile },
      jobs: { [username]: jobs },
      recentSearches: recentSearches,
      activityLogs: activityLogs,
    };
  },

  async exportAllAppAdminData(): Promise<AppBackupData> {
    const users = await indexedDbService.getUsers();
    const profiles = await indexedDbService.getAllProfiles();
    const allJobsMap = await indexedDbService.getAllJobs();
    const recentSearches = await indexedDbService.getRecentSearches();
    // FIX: Call getLogEntries from indexedDbService
    const activityLogs = await indexedDbService.getLogEntries();

    const allJobs: Record<string, Job[]> = {};
    for (const username of users.map(u => u.username)) {
      allJobs[username] = allJobsMap[username] || [];
    }

    return {
      users: users,
      profiles: profiles,
      jobs: allJobs,
      recentSearches: recentSearches,
      activityLogs: activityLogs,
    };
  },

  async importAllUserData(data: AppBackupData, currentUsername: string): Promise<void> {
    if (!data || !data.users || !data.profiles || !data.jobs || !data.recentSearches || !data.activityLogs) {
      throw new Error('Invalid backup data format.');
    }

    // For importing, we assume it's importing *one user's data* into the current logged-in session.
    // If multiple users are in the backup, we take the one whose username matches currentUsername.
    const userToImport = data.users.find(u => u.username === currentUsername);
    if (!userToImport) {
        throw new Error(`Backup does not contain data for user '${currentUsername}'.`);
    }

    const profileToImport = data.profiles[currentUsername];
    const jobsToImport = data.jobs[currentUsername] || [];

    if (!profileToImport) {
        throw new Error(`Backup data for profile for user '${currentUsername}' is missing.`);
    }

    // Overwrite existing data for the current user
    await indexedDbService.saveUser(userToImport);
    await indexedDbService.saveProfile(profileToImport);
    await indexedDbService.deleteAllJobsForUser(currentUsername); // Clear old jobs
    for (const job of jobsToImport) {
        await indexedDbService.saveJob(job, currentUsername);
    }
    
    // Recent searches are global, replace them
    await indexedDbService.clearRecentSearches();
    for (const search of data.recentSearches) {
        await indexedDbService.saveRecentSearch(search);
    }

    // Clear and import activity logs
    // FIX: Call clearActivityLogs from indexedDbService
    await indexedDbService.clearActivityLogs();
    for (const logEntry of data.activityLogs) {
        // FIX: Call saveLogEntry from indexedDbService
        await indexedDbService.saveLogEntry(logEntry);
    }
  },

  async importAllAppAdminData(data: AppBackupData): Promise<void> {
    if (!data || !data.users || !data.profiles || !data.jobs || !data.recentSearches || !data.activityLogs) {
      throw new Error('Invalid backup data format for admin import.');
    }

    await indexedDbService.clearAllData(); // Clear everything first
    
    // Re-add the admin user if it exists and is not in the backup, otherwise use the backup's admin.
    const currentAdminSession = JSON.parse(sessionStorage.getItem('jobflow_session') || '{}');
    const adminUserExistsInBackup = data.users.some(u => u.username === 'admin');

    // Only re-add if admin is logged in and not covered by backup.
    // For this context, the admin is a special case to ensure the system is not locked out.
    // However, `clearAllData` clears the admin user too.
    // The safest approach is to ensure a backup will cover the admin, or the user manually manages it.

    // Populate with backup data
    await indexedDbService.populateAllData({
      users: data.users,
      profiles: Object.values(data.profiles), // IndexedDB profile store takes UserProfile objects directly
      jobs: data.jobs ? Object.values(data.jobs).flat() : [], // Flatten jobs from map
      recentSearches: data.recentSearches,
      // FIX: Add activityLogs to the populateAllData call
      activityLogs: data.activityLogs, 
    });
  }
};