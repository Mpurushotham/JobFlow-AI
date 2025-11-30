
import { Job, UserProfile, RecentSearchQuery } from '../types';

const JOBS_KEY = 'jobflow_jobs_multi';
const PROFILES_KEY = 'jobflow_profiles_multi';
const RECENT_SEARCHES_KEY = 'jobflow_recent_searches';

// Helper functions to get and set namespaced data
const getAllJobs = (): Record<string, Job[]> => {
  try {
    const data = localStorage.getItem(JOBS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.error('Failed to load all jobs', e);
    return {};
  }
};

const getAllProfiles = (): Record<string, UserProfile> => {
    try {
      const data = localStorage.getItem(PROFILES_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error('Failed to load all profiles', e);
      return {};
    }
};

export const storageService = {
  // === User-specific functions ===
  getJobs: (username: string): Job[] => {
    if (!username) return [];
    const allJobs = getAllJobs();
    return allJobs[username] || [];
  },

  saveJob: (username: string, job: Job): void => {
    if (!username) return;
    const allJobs = getAllJobs();
    const userJobs = allJobs[username] || [];
    
    const existingIndex = userJobs.findIndex((j) => j.id === job.id);
    if (existingIndex >= 0) {
      userJobs[existingIndex] = job;
    } else {
      userJobs.push(job);
    }
    allJobs[username] = userJobs;
    localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs));
  },

  deleteJob: (username: string, id: string): void => {
    if (!username) return;
    const allJobs = getAllJobs();
    let userJobs = allJobs[username] || [];
    userJobs = userJobs.filter((j) => j.id !== id);
    allJobs[username] = userJobs;
    localStorage.setItem(JOBS_KEY, JSON.stringify(allJobs));
  },

  getProfile: (username: string): UserProfile => {
    if (!username) return { name: '', resumeContent: '', targetRoles: '' };
    const allProfiles = getAllProfiles();
    return allProfiles[username] || { name: username, resumeContent: '', targetRoles: '' };
  },

  saveProfile: (username: string, profile: UserProfile): void => {
    if (!username) return;
    const allProfiles = getAllProfiles();
    allProfiles[username] = profile;
    localStorage.setItem(PROFILES_KEY, JSON.stringify(allProfiles));
  },

  getRecentSearches: (): RecentSearchQuery[] => {
    try {
      const data = localStorage.getItem(RECENT_SEARCHES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load recent searches', e);
      return [];
    }
  },

  saveRecentSearch: (query: string): void => {
    let searches = storageService.getRecentSearches();
    // Remove existing entry if query is the same to update timestamp
    searches = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase());
    
    // Add new search
    searches.unshift({ query, timestamp: Date.now() });
    
    // Keep only the latest 5
    if (searches.length > 5) {
      searches = searches.slice(0, 5);
    }
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  },

  // === Admin functions ===
  getAllProfiles: (): Record<string, UserProfile> => {
    return getAllProfiles();
  },

  getAllJobs: (): Record<string, Job[]> => {
    return getAllJobs();
  },

  deleteAllData: (): void => {
    localStorage.removeItem(JOBS_KEY);
    localStorage.removeItem(PROFILES_KEY);
    localStorage.removeItem(RECENT_SEARCHES_KEY); // Clear recent searches too
    // Note: This does not delete user accounts from authService. That should be handled separately.
  }
};