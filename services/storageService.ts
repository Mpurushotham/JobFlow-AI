
import { Job, UserProfile } from '../types';

const JOBS_KEY = 'jobflow_jobs_multi';
const PROFILES_KEY = 'jobflow_profiles_multi';

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
    // Note: This does not delete user accounts from authService. That should be handled separately.
  }
};
