


// services/indexedDbService.ts

import { Job, UserProfile, RecentSearchQuery, User, AppActivityLogEntry } from '../types';

const DB_NAME = 'JobFlowAI';
const DB_VERSION = 1;
const STORE_USERS = 'users';
const STORE_PROFILES = 'profiles';
const STORE_JOBS = 'jobs';
const STORE_RECENT_SEARCHES = 'recentSearches';
// FIX: Add new store for activity logs
const STORE_ACTIVITY_LOGS = 'activityLogs';

interface IndexedDBObjectStoreSchema {
    users: User;
    profiles: UserProfile; // Stored by username
    jobs: Job; // Stored with username as part of the key or in context
    recentSearches: RecentSearchQuery;
    // FIX: Add activity logs to schema
    activityLogs: AppActivityLogEntry; 
}

// Helper to open the IndexedDB
function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_USERS)) {
                db.createObjectStore(STORE_USERS, { keyPath: 'username' });
            }
            if (!db.objectStoreNames.contains(STORE_PROFILES)) {
                db.createObjectStore(STORE_PROFILES, { keyPath: 'name' }); // Key by profile.name (which is username)
            }
            if (!db.objectStoreNames.contains(STORE_JOBS)) {
                // KeyPath: 'id' for individual job, need to create an index for username
                const jobStore = db.createObjectStore(STORE_JOBS, { keyPath: 'id' });
                jobStore.createIndex('username', 'username', { unique: false });
            }
            if (!db.objectStoreNames.contains(STORE_RECENT_SEARCHES)) {
                db.createObjectStore(STORE_RECENT_SEARCHES, { keyPath: 'query' });
            }
            // FIX: Create object store for activity logs
            if (!db.objectStoreNames.contains(STORE_ACTIVITY_LOGS)) {
                const activityLogStore = db.createObjectStore(STORE_ACTIVITY_LOGS, { keyPath: 'id' });
                activityLogStore.createIndex('username', 'username', { unique: false });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
            reject("IndexedDB error");
        };
    });
}

// Helper to get a transaction
async function getTransaction(storeName: string | string[], mode: IDBTransactionMode): Promise<IDBTransaction> {
    const db = await openDatabase();
    return db.transaction(storeName, mode);
}

// Generic CRUD operations
export const indexedDbService = {
    // --- Users (Auth Data) ---
    async getUsers(): Promise<User[]> {
        const tx = await getTransaction(STORE_USERS, 'readonly');
        const store = tx.objectStore(STORE_USERS);
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveUser(user: User): Promise<void> {
        const tx = await getTransaction(STORE_USERS, 'readwrite');
        const store = tx.objectStore(STORE_USERS);
        await new Promise((resolve, reject) => {
            const request = store.put(user);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteUser(username: string): Promise<void> {
        const tx = await getTransaction(STORE_USERS, 'readwrite');
        const store = tx.objectStore(STORE_USERS);
        await new Promise((resolve, reject) => {
            const request = store.delete(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // --- Profiles ---
    async getProfile(username: string): Promise<UserProfile | undefined> {
        const tx = await getTransaction(STORE_PROFILES, 'readonly');
        const store = tx.objectStore(STORE_PROFILES);
        const request = store.get(username);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAllProfiles(): Promise<Record<string, UserProfile>> {
        const tx = await getTransaction(STORE_PROFILES, 'readonly');
        const store = tx.objectStore(STORE_PROFILES);
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const profiles: Record<string, UserProfile> = {};
                for (const profile of request.result) {
                    profiles[profile.name] = profile; // Assuming profile.name is the username
                }
                resolve(profiles);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async saveProfile(profile: UserProfile): Promise<void> {
        const tx = await getTransaction(STORE_PROFILES, 'readwrite');
        const store = tx.objectStore(STORE_PROFILES);
        await new Promise((resolve, reject) => {
            const request = store.put(profile);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteProfile(username: string): Promise<void> {
        const tx = await getTransaction(STORE_PROFILES, 'readwrite');
        const store = tx.objectStore(STORE_PROFILES);
        await new Promise((resolve, reject) => {
            const request = store.delete(username);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // --- Jobs ---
    async getJobsForUser(username: string): Promise<Job[]> {
        const tx = await getTransaction(STORE_JOBS, 'readonly');
        const store = tx.objectStore(STORE_JOBS);
        const index = store.index('username');
        const request = index.getAll(username);
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAllJobs(): Promise<Record<string, Job[]>> {
        const tx = await getTransaction(STORE_JOBS, 'readonly');
        const store = tx.objectStore(STORE_JOBS);
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const allJobs: Record<string, Job[]> = {};
                for (const job of request.result) {
                    if (!allJobs[job.username!]) { // Assuming job has a 'username' field
                        allJobs[job.username!] = [];
                    }
                    allJobs[job.username!].push(job);
                }
                resolve(allJobs);
            };
            request.onerror = () => reject(request.error);
        });
    },

    async saveJob(job: Job, username: string): Promise<void> {
        // Ensure job object includes username for indexing
        const jobWithUsername = { ...job, username };
        const tx = await getTransaction(STORE_JOBS, 'readwrite');
        const store = tx.objectStore(STORE_JOBS);
        await new Promise((resolve, reject) => {
            const request = store.put(jobWithUsername);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteJob(id: string): Promise<void> {
        const tx = await getTransaction(STORE_JOBS, 'readwrite');
        const store = tx.objectStore(STORE_JOBS);
        await new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteAllJobsForUser(username: string): Promise<void> {
        const jobsToDelete = await this.getJobsForUser(username);
        const tx = await getTransaction(STORE_JOBS, 'readwrite');
        const store = tx.objectStore(STORE_JOBS);
        await Promise.all(jobsToDelete.map(job => new Promise<void>((resolve, reject) => {
            const request = store.delete(job.id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        })));
    },

    // --- Recent Searches ---
    async getRecentSearches(): Promise<RecentSearchQuery[]> {
        const tx = await getTransaction(STORE_RECENT_SEARCHES, 'readonly');
        const store = tx.objectStore(STORE_RECENT_SEARCHES);
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async saveRecentSearch(search: RecentSearchQuery): Promise<void> {
        const tx = await getTransaction(STORE_RECENT_SEARCHES, 'readwrite');
        const store = tx.objectStore(STORE_RECENT_SEARCHES);
        await new Promise((resolve, reject) => {
            const request = store.put(search);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async clearRecentSearches(): Promise<void> {
        const tx = await getTransaction(STORE_RECENT_SEARCHES, 'readwrite');
        const store = tx.objectStore(STORE_RECENT_SEARCHES);
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // --- Activity Logs ---
    // FIX: Add getLogEntries method
    async getLogEntries(): Promise<AppActivityLogEntry[]> {
        const tx = await getTransaction(STORE_ACTIVITY_LOGS, 'readonly');
        const store = tx.objectStore(STORE_ACTIVITY_LOGS);
        const request = store.getAll();
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // FIX: Add saveLogEntry method
    async saveLogEntry(logEntry: AppActivityLogEntry): Promise<void> {
        const tx = await getTransaction(STORE_ACTIVITY_LOGS, 'readwrite');
        const store = tx.objectStore(STORE_ACTIVITY_LOGS);
        await new Promise((resolve, reject) => {
            const request = store.put(logEntry);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // FIX: Add clearActivityLogs method
    async clearActivityLogs(): Promise<void> {
        const tx = await getTransaction(STORE_ACTIVITY_LOGS, 'readwrite');
        const store = tx.objectStore(STORE_ACTIVITY_LOGS);
        await new Promise((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    // FIX: Add deleteAllActivityLogsForUser method
    async deleteAllActivityLogsForUser(username: string): Promise<void> {
      const logsToDelete = (await this.getLogEntries()).filter(log => log.username === username);
      const tx = await getTransaction(STORE_ACTIVITY_LOGS, 'readwrite');
      const store = tx.objectStore(STORE_ACTIVITY_LOGS);
      await Promise.all(logsToDelete.map(log => new Promise<void>((resolve, reject) => {
          const request = store.delete(log.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
      })));
  },

    // --- Global Operations ---
    async clearAllData(): Promise<void> {
        const db = await openDatabase();
        // FIX: Include STORE_ACTIVITY_LOGS in the transaction
        const tx = db.transaction([STORE_USERS, STORE_PROFILES, STORE_JOBS, STORE_RECENT_SEARCHES, STORE_ACTIVITY_LOGS], 'readwrite');
        const userStore = tx.objectStore(STORE_USERS);
        const profileStore = tx.objectStore(STORE_PROFILES);
        const jobStore = tx.objectStore(STORE_JOBS);
        const recentSearchStore = tx.objectStore(STORE_RECENT_SEARCHES);
        // FIX: Get activity log store
        const activityLogStore = tx.objectStore(STORE_ACTIVITY_LOGS);

        await Promise.all([
            new Promise<void>((resolve, reject) => {
                const req = userStore.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            }),
            new Promise<void>((resolve, reject) => {
                const req = profileStore.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            }),
            new Promise<void>((resolve, reject) => {
                const req = jobStore.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            }),
            new Promise<void>((resolve, reject) => {
                const req = recentSearchStore.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            }),
            // FIX: Clear activity logs
            new Promise<void>((resolve, reject) => {
                const req = activityLogStore.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            }),
        ]);
    },

    // FIX: Update populateAllData to accept AppActivityLogEntry[]
    async populateAllData(data: { users: User[], profiles: UserProfile[], jobs: Job[], recentSearches: RecentSearchQuery[], activityLogs: AppActivityLogEntry[] }): Promise<void> {
        const db = await openDatabase();
        // FIX: Include STORE_ACTIVITY_LOGS in the transaction
        const tx = db.transaction([STORE_USERS, STORE_PROFILES, STORE_JOBS, STORE_RECENT_SEARCHES, STORE_ACTIVITY_LOGS], 'readwrite');

        const userStore = tx.objectStore(STORE_USERS);
        const profileStore = tx.objectStore(STORE_PROFILES);
        const jobStore = tx.objectStore(STORE_JOBS);
        const recentSearchStore = tx.objectStore(STORE_RECENT_SEARCHES);
        // FIX: Get activity log store
        const activityLogStore = tx.objectStore(STORE_ACTIVITY_LOGS);

        await Promise.all([
            ...data.users.map(item => new Promise<void>((resolve, reject) => {
                const req = userStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })),
            ...data.profiles.map(item => new Promise<void>((resolve, reject) => {
                const req = profileStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })),
            ...data.jobs.map(item => new Promise<void>((resolve, reject) => {
                const req = jobStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })),
            ...data.recentSearches.map(item => new Promise<void>((resolve, reject) => {
                const req = recentSearchStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })),
            // FIX: Populate activity logs
            ...data.activityLogs.map(item => new Promise<void>((resolve, reject) => {
                const req = activityLogStore.put(item);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            })),
        ]);
    }
};

// --- Migration from localStorage to IndexedDB ---
const LOCAL_STORAGE_MIGRATED_KEY = 'jobflow_idb_migrated';

export async function migrateFromLocalStorage(): Promise<void> {
    if (localStorage.getItem(LOCAL_STORAGE_MIGRATED_KEY) === 'true') {
        console.log('IndexedDB migration already performed.');
        return;
    }

    console.log('Starting IndexedDB migration from localStorage...');

    const LS_JOBS_KEY = 'jobflow_jobs_multi';
    const LS_PROFILES_KEY = 'jobflow_profiles_multi';
    const LS_RECENT_SEARCHES_KEY = 'jobflow_recent_searches';
    const LS_USERS_KEY = 'jobflow_users'; // From authService
    // Note: No equivalent localStorage key for activity logs, as they are new with IndexedDB.

    let migratedCount = 0;

    try {
        const db = await openDatabase();
        // FIX: Include STORE_ACTIVITY_LOGS in the transaction
        const tx = db.transaction([STORE_USERS, STORE_PROFILES, STORE_JOBS, STORE_RECENT_SEARCHES, STORE_ACTIVITY_LOGS], 'readwrite');

        // Migrate users
        const lsUsersData = localStorage.getItem(LS_USERS_KEY);
        if (lsUsersData) {
            const lsUsers: User[] = JSON.parse(lsUsersData);
            for (const user of lsUsers) {
                await new Promise<void>((resolve, reject) => {
                    const req = tx.objectStore(STORE_USERS).put(user);
                    req.onsuccess = () => { migratedCount++; resolve(); };
                    req.onerror = () => reject(req.error);
                });
            }
            localStorage.removeItem(LS_USERS_KEY);
            console.log(`Migrated ${lsUsers.length} users.`);
        }

        // Migrate profiles
        const lsProfilesData = localStorage.getItem(LS_PROFILES_KEY);
        if (lsProfilesData) {
            const lsProfiles: Record<string, UserProfile> = JSON.parse(lsProfilesData);
            for (const username in lsProfiles) {
                await new Promise<void>((resolve, reject) => {
                    const req = tx.objectStore(STORE_PROFILES).put(lsProfiles[username]);
                    req.onsuccess = () => { migratedCount++; resolve(); };
                    req.onerror = () => reject(req.error);
                });
            }
            localStorage.removeItem(LS_PROFILES_KEY);
            console.log(`Migrated ${Object.keys(lsProfiles).length} profiles.`);
        }

        // Migrate jobs
        const lsJobsData = localStorage.getItem(LS_JOBS_KEY);
        if (lsJobsData) {
            const lsJobs: Record<string, Job[]> = JSON.parse(lsJobsData);
            for (const username in lsJobs) {
                for (const job of lsJobs[username]) {
                    // Ensure job has a username field for IndexedDB indexing
                    const jobWithUsername = { ...job, username };
                    await new Promise<void>((resolve, reject) => {
                        const req = tx.objectStore(STORE_JOBS).put(jobWithUsername);
                        req.onsuccess = () => { migratedCount++; resolve(); };
                        req.onerror = () => reject(req.error);
                    });
                }
            }
            localStorage.removeItem(LS_JOBS_KEY);
            console.log(`Migrated ${Object.values(lsJobs).flat().length} jobs.`);
        }

        // Migrate recent searches
        const lsRecentSearchesData = localStorage.getItem(LS_RECENT_SEARCHES_KEY);
        if (lsRecentSearchesData) {
            const lsRecentSearches: RecentSearchQuery[] = JSON.parse(lsRecentSearchesData);
            for (const search of lsRecentSearches) {
                await new Promise<void>((resolve, reject) => {
                    const req = tx.objectStore(STORE_RECENT_SEARCHES).put(search);
                    req.onsuccess = () => { migratedCount++; resolve(); };
                    req.onerror = () => reject(req.error);
                });
            }
            localStorage.removeItem(LS_RECENT_SEARCHES_KEY);
            console.log(`Migrated ${lsRecentSearches.length} recent searches.`);
        }

        // No migration needed for activity logs as they are new.

        await new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => {
                localStorage.setItem(LOCAL_STORAGE_MIGRATED_KEY, 'true');
                console.log(`IndexedDB migration complete. Total items migrated: ${migratedCount}`);
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });

    } catch (error) {
        console.error("Error during IndexedDB migration:", error);
        // Do not set LOCAL_STORAGE_MIGRATED_KEY if migration failed, so it can retry.
        throw error;
    }
}