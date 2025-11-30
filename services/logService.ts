// services/logService.ts

import { indexedDbService } from './indexedDbService'; 
import { AppActivityLogEntry, LogActionType } from '../types'; 

export const logService = {
  async log(
    username: string | 'system' | 'guest',
    actionType: LogActionType,
    details: string,
    severity: 'info' | 'warn' | 'error' | 'debug' = 'info'
  ): Promise<void> {
    const logEntry: AppActivityLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // Unique ID
      timestamp: Date.now(),
      username,
      actionType,
      details,
      severity,
    };
    try {
      await indexedDbService.saveLogEntry(logEntry);
      // console.debug('Logged:', logEntry); // Optional: for debugging log service itself
    } catch (error) {
      console.error('Failed to save log entry to IndexedDB:', error);
    }
  },

  async getLogs(): Promise<AppActivityLogEntry[]> {
    try {
      return await indexedDbService.getLogEntries();
    } catch (error) {
      console.error('Failed to retrieve log entries from IndexedDB:', error);
      return [];
    }
  },

  async clearLogs(): Promise<void> {
    try {
      await indexedDbService.clearActivityLogs();
    } catch (error) {
      console.error('Failed to clear log entries from IndexedDB:', error);
    }
  },
};