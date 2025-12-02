

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
    
    // Attempt to fetch public IP (simulated for client-side context or actual fetch)
    let ipAddress = 'Unavailable (Client-side)';
    try {
        // In a real production app without backend, calling a public IP API is the only way
        // We use a timeout to prevent hanging if the service is down/blocked
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal }).catch(() => null);
        clearTimeout(timeoutId);
        if (response && response.ok) {
            const data = await response.json();
            ipAddress = data.ip;
        }
    } catch (e) {
        // Ignore IP fetch errors
    }

    const logEntry: AppActivityLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // Unique ID
      timestamp: Date.now(),
      username,
      actionType,
      details,
      severity,
      metadata: {
        ipAddress: ipAddress,
        userAgent: navigator.userAgent,
        location: window.location.href,
        cookies: document.cookie || 'No cookies accessible', // Capturing visible cookies
        screenResolution: `${window.screen.width}x${window.screen.height}`,
      }
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