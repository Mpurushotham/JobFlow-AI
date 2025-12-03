

import { Job, UserProfile, RecentSearchQuery, User, AppBackupData, AppActivityLogEntry } from '../types';
import { indexedDbService } from './indexedDbService';

export const storageService = {
  // === User-specific functions ===
  async getJobs(username: string): Promise<Job[]> {
    if (!username) return [];
    return indexedDbService.getJobsForUser(username);
  },

  async saveJob(username: string, job: Job): Promise<void> {
    if (!username) return;
    return indexedDbService.saveJob(job, username);
  },

  async deleteJob(id: string): Promise<void> {
    return indexedDbService.deleteJob(id);
  },

  async getProfile(username: string): Promise<UserProfile | undefined> {
    if (!username) return undefined;
    const profile = await indexedDbService.getProfile(username);
    return profile || { name: username, resumeContent: '', targetRoles: '' };
  },

  async saveProfile(username: string, profile: UserProfile): Promise<void> {
    if (!username) return;
    return indexedDbService.saveProfile({ ...profile, name: username });
  },

  async getRecentSearches(): Promise<RecentSearchQuery[]> {
    const searches = await indexedDbService.getRecentSearches();
    return searches.sort((a, b) => b.timestamp - a.timestamp);
  },

  async saveRecentSearch(query: string): Promise<void> {
    let searches = await indexedDbService.getRecentSearches();
    searches = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    
    const newSearch = { query, timestamp: Date.now() };
    searches.unshift(newSearch);

    if (searches.length > 5) {
      searches = searches.slice(0, 5);
    }
    
    await indexedDbService.clearRecentSearches();
    for (const search of searches) {
      await indexedDbService.saveRecentSearch(search);
    }
  },

  // === Auth-related (User) functions ===
  async getAllUsers(): Promise<User[]> {
      return indexedDbService.getUsers();
  },

  async saveUser(user: User): Promise<void> {
      return indexedDbService.saveUser(user);
  },

  async deleteUser(username: string): Promise<void> {
      await indexedDbService.deleteUser(username);
      await indexedDbService.deleteProfile(username);
      await indexedDbService.deleteAllJobsForUser(username);
      await indexedDbService.deleteAllActivityLogsForUser(username);
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
    await indexedDbService.clearAllData();
  },

  // --- Backup/Restore Functions ---
  async exportAllUserData(username: string): Promise<AppBackupData | null> {
    if (!username) return null;

    const user = (await indexedDbService.getUsers()).find(u => u.username === username);
    const profile = await indexedDbService.getProfile(username);
    const jobs = await indexedDbService.getJobsForUser(username);
    const recentSearches = await indexedDbService.getRecentSearches();
    const activityLogs = (await indexedDbService.getLogEntries()).filter(log => log.username === username || log.username === 'system' || log.username === 'guest');

    if (!user || !profile) return null;

    return {
      users: [user],
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

    const userToImport = data.users.find(u => u.username === currentUsername);
    if (!userToImport) {
        throw new Error(`Backup does not contain data for user '${currentUsername}'.`);
    }

    const profileToImport = data.profiles[currentUsername];
    const jobsToImport = data.jobs[currentUsername] || [];

    if (!profileToImport) {
        throw new Error(`Backup data for profile for user '${currentUsername}' is missing.`);
    }

    await indexedDbService.saveUser(userToImport);
    await indexedDbService.saveProfile(profileToImport);
    await indexedDbService.deleteAllJobsForUser(currentUsername);
    for (const job of jobsToImport) {
        await indexedDbService.saveJob(job, currentUsername);
    }
    
    await indexedDbService.clearRecentSearches();
    for (const search of data.recentSearches) {
        await indexedDbService.saveRecentSearch(search);
    }

    await indexedDbService.clearActivityLogs();
    for (const logEntry of data.activityLogs) {
        await indexedDbService.saveLogEntry(logEntry);
    }
  },

  async importAllAppAdminData(data: AppBackupData): Promise<void> {
    if (!data || !data.users || !data.profiles || !data.jobs || !data.recentSearches || !data.activityLogs) {
      throw new Error('Invalid backup data format for admin import.');
    }

    await indexedDbService.clearAllData();
    
    await indexedDbService.populateAllData({
      users: data.users,
      profiles: Object.values(data.profiles),
      jobs: data.jobs ? Object.values(data.jobs).flat() : [],
      recentSearches: data.recentSearches,
      activityLogs: data.activityLogs, 
    });
  }
};
