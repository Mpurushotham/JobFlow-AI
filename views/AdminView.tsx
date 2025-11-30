
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Job, User, SubscriptionTier, AppBackupData, AppActivityLogEntry, LogActionType } from '../types'; // Added AppBackupData, AppActivityLogEntry, LogActionType
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { logService } from '../services/logService'; // Import logService
import { KeyRound, Eye, Trash2, User as UserIcon, Briefcase, AlertTriangle, X, ShieldCheck, Lock, TrendingUp, ChevronDown, Mail, Phone, DownloadCloud, UploadCloud, RefreshCw, History, Filter, Search } from 'lucide-react'; // Added DownloadCloud, UploadCloud, RefreshCw, History, Filter, Search
import { useNotifications } from '../context/NotificationContext';
import { CountryCodeInput } from '../components/CountryCodeInput';
import { isValidEmail, isValidPin } from '../utils/validationUtils';

interface AdminViewProps {
  currentUserSubscriptionTier: SubscriptionTier | null; // Pass current admin's tier
  // FIX: Add currentUser prop
  currentUser: string;
}

const ResetPasswordModal: React.FC<{ user: User; onClose: () => void; onSave: () => void; }> = ({ user, onClose, onSave }) => {
    const [newPassword, setNewPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);
    const { addNotification } = useNotifications();

    const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setNewPin(value);
      if (value && !isValidPin(value)) {
        setPinError('PIN must be 4 digits.');
      } else {
        setPinError(null);
      }
    };

    const handleReset = async () => {
        if (!newPassword) {
            addNotification('Password cannot be empty.', 'error');
            return;
        }
        if (!isValidPin(newPin)) {
          addNotification('PIN must be 4 digits.', 'error');
          return;
        }
        if (await authService.resetPasswordPin(user.username, newPassword, newPin)) {
            addNotification(`Credentials for ${user.username} have been reset.`, 'success');
            onSave();
            onClose();
        } else {
            addNotification('Failed to reset credentials.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="reset-credentials-title">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 id="reset-credentials-title" className="text-lg font-bold text-gray-800 dark:text-white">Reset Credentials for <span className="text-indigo-500">{user.username}</span></h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full" aria-label="Close reset credentials dialog"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="new-password" className="text-sm font-bold text-gray-600 dark:text-slate-400">New Password</label>
                        <div className="relative mt-1">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" id="new-password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="new-pin" className="text-sm font-bold text-gray-600 dark:text-slate-400">New 4-Digit PIN</label>
                         <div className="relative mt-1">
                            <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                              type="password" 
                              id="new-pin"
                              value={newPin} 
                              onChange={handlePinChange} 
                              onBlur={() => handlePinChange({target: {value: newPin}} as React.ChangeEvent<HTMLInputElement>)} // Validate on blur
                              maxLength={4} 
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg" 
                              aria-invalid={pinError ? "true" : "false"}
                              aria-describedby="pin-error"
                            />
                        </div>
                        {pinError && <p id="pin-error" role="alert" className="mt-1 text-xs text-red-500">{pinError}</p>}
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="w-full py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-200 font-bold rounded-lg" aria-label="Cancel reset">Cancel</button>
                    <button onClick={handleReset} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700" aria-label="Confirm reset">Reset</button>
                </div>
            </div>
        </div>
    );
};


const DataViewerModal: React.FC<{ title: string; data: any; onClose: () => void; }> = ({ title, data, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="data-viewer-title">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 id="data-viewer-title" className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full" aria-label="Close data viewer"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto flex-1 custom-scrollbar" tabIndex={0}>
                <pre className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    </div>
);


const AdminView: React.FC<AdminViewProps> = ({ currentUserSubscriptionTier, currentUser }) => { // Accept current admin's tier and currentUser
    const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users'); // New state for tabs
    const [users, setUsers] = useState<User[]>([]);
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
    const [jobs, setJobs] = useState<Record<string, Job[]>>({});
    const [activityLogs, setActivityLogs] = useState<AppActivityLogEntry[]>([]); // New state for activity logs
    const [filteredLogs, setFilteredLogs] = useState<AppActivityLogEntry[]>([]);
    const [logFilterSeverity, setLogFilterSeverity] = useState<'all' | 'info' | 'warn' | 'error' | 'debug'>('all');
    const [logFilterUser, setLogFilterUser] = useState('all');
    const [logSearchTerm, setLogSearchTerm] = useState('');

    const [modal, setModal] = useState<'reset' | 'viewProfile' | 'viewJobs' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const { addNotification } = useNotifications();
    const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

    useEffect(() => {
        loadData();
    }, []);

    // Effect for filtering logs
    useEffect(() => {
        let tempLogs = activityLogs;

        if (logFilterSeverity !== 'all') {
            tempLogs = tempLogs.filter(log => log.severity === logFilterSeverity);
        }

        if (logFilterUser !== 'all') {
            tempLogs = tempLogs.filter(log => log.username === logFilterUser);
        }

        if (logSearchTerm.trim()) {
            const lowerCaseSearch = logSearchTerm.toLowerCase();
            tempLogs = tempLogs.filter(log => 
                log.actionType.toLowerCase().includes(lowerCaseSearch) ||
                log.details.toLowerCase().includes(lowerCaseSearch) ||
                log.username.toLowerCase().includes(lowerCaseSearch)
            );
        }

        setFilteredLogs(tempLogs.sort((a, b) => b.timestamp - a.timestamp)); // Always sort by newest first
    }, [activityLogs, logFilterSeverity, logFilterUser, logSearchTerm]);


    const loadData = async () => {
        setUsers(await authService.getAllUsers());
        setProfiles(await storageService.getAllProfiles());
        setJobs(await storageService.getAllJobs());
        setActivityLogs(await storageService.getAppActivityLogs()); // Load activity logs
        addNotification("Admin data refreshed.", 'info');
        logService.log(currentUser, LogActionType.APP_INIT, 'Admin data refreshed manually.', 'info');
    };

    const handleClearAllData = async () => {
        if (window.confirm("DANGER: This will delete ALL users, jobs, and profile data from local storage. The admin account will be the only one remaining. This action cannot be undone. Proceed?")) {
            await storageService.deleteAllData();
            loadData(); // Reload to show cleared state (only admin user remains)
            addNotification("All application data has been cleared.", 'success');
            logService.log(currentUser, LogActionType.ADMIN_DATA_CLEAR, 'Admin cleared all application data.', 'warn');
        }
    };

    const handleChangeSubscriptionTier = async (username: string, newTier: SubscriptionTier) => {
      if (await authService.updateUserSubscription(username, newTier)) {
        addNotification(`Subscription for ${username} updated to ${newTier}.`, 'success');
        loadData(); // Reload data to reflect change
      } else {
        addNotification(`Failed to update subscription for ${username}.`, 'error');
      }
    };

    const handleChangeAccountStatus = async (username: string, newStatus: 'valid' | 'invalid') => {
      if (await authService.updateUserAccountStatus(username, newStatus)) {
        addNotification(`Account status for ${username} updated to ${newStatus}.`, 'success');
        loadData(); // Reload data to reflect change
      } else {
        addNotification(`Failed to update account status for ${username}.`, 'error');
      }
    };


    const openModal = (type: 'reset' | 'viewProfile' | 'viewJobs', user: User) => {
        setSelectedUser(user);
        setModal(type);
    };

    // --- Admin Backup/Restore Handlers ---
    const handleExportAllAdminData = async () => {
      try {
        const data = await storageService.exportAllAppAdminData();
        const filename = `jobflow_admin_backup_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('All app data has been exported successfully!', 'success');
        logService.log(currentUser, LogActionType.ADMIN_DATA_EXPORT, 'Admin exported all application data.', 'info');
      } catch (error) {
        console.error('Error exporting all app data:', error);
        addNotification('Failed to export all app data.', 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Admin export of all data failed: ${error}`, 'error');
      }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const content = event.target?.result as string;
            const backupData: AppBackupData = JSON.parse(content);
            if (window.confirm("WARNING: Importing this data will OVERWRITE ALL existing users, profiles, jobs, and recent searches in this browser. This action is irreversible. Proceed?")) {
                await storageService.importAllAppAdminData(backupData);
                addNotification('All app data imported successfully! Reloading application...', 'success');
                logService.log(currentUser, LogActionType.ADMIN_DATA_IMPORT, 'Admin imported all application data.', 'warn');
                setTimeout(() => window.location.reload(), 1500);
            }
          } catch (error) {
            console.error('Error importing data:', error);
            addNotification('Failed to import data. Please ensure it is a valid JobFlow AI JSON backup file.', 'error');
            logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Admin import of all data failed: ${error}`, 'error');
          }
        };
        reader.readAsText(file);
      }
    };
  
    const triggerImport = () => {
      fileInputRef.current?.click();
    };

    const handleClearActivityLogs = async () => {
        if (window.confirm("Are you sure you want to clear all activity logs? This action cannot be undone.")) {
            await logService.clearLogs();
            loadData(); // Reload data to show cleared logs
            addNotification("All activity logs cleared.", 'success');
            logService.log(currentUser, LogActionType.ADMIN_LOGS_CLEAR, 'Admin cleared all activity logs.', 'warn');
        }
    };
    
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-4">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Panel</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage all user accounts and data stored in this browser.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                      onClick={handleExportAllAdminData}
                      className="bg-blue-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
                      aria-label="Export all application data"
                  >
                      <DownloadCloud size={18} /> Export All Data
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".json" 
                    className="hidden" 
                    aria-label="Upload data file for import"
                  />
                  <button 
                      onClick={triggerImport} 
                      className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-lg"
                      aria-label="Import all application data"
                  >
                      <UploadCloud size={18} /> Import All Data
                  </button>
                  {/* New: Refresh Data Button */}
                  <button 
                      onClick={loadData} // Call loadData to refresh the state
                      className="bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white px-5 py-3 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2 shadow-lg"
                      aria-label="Refresh displayed data"
                  >
                      <RefreshCw size={18} /> Refresh Data
                  </button>
                  <button 
                      onClick={handleClearAllData}
                      className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                      aria-label="Clear all application data"
                  >
                      <AlertTriangle size={18} /> Clear All Data
                  </button>
                </div>
            </div>

            {/* Tabs for Users and Activity Logs */}
            <div className="flex border-b border-gray-200 dark:border-slate-700 mb-6">
                <button 
                    onClick={() => setActiveTab('users')} 
                    className={`px-6 py-3 font-bold text-sm border-b-2 ${activeTab === 'users' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                    User Accounts
                </button>
                <button 
                    onClick={() => setActiveTab('logs')} 
                    className={`px-6 py-3 font-bold text-sm border-b-2 ${activeTab === 'logs' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                    Activity Log
                </button>
            </div>

            {activeTab === 'users' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <UserIcon size={20} /> User Accounts ({users.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-900/50">
                                <tr>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Username</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th> {/* New Status Column */}
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Subscription</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Contact</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Created</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Last Login</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Data</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {users.map(user => (
                                    <tr key={user.username}>
                                        <td className="p-3 font-medium text-gray-800 dark:text-white">{user.username}</td>
                                        <td className="p-3">
                                            <div className="relative inline-block text-left">
                                                <select
                                                    value={user.accountStatus}
                                                    onChange={(e) => handleChangeAccountStatus(user.username, e.target.value as 'valid' | 'invalid')}
                                                    className={`appearance-none bg-white dark:bg-slate-700 border rounded-full px-3 py-1 text-xs font-bold uppercase cursor-pointer pr-8
                                                        ${user.accountStatus === 'valid' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400' : 'border-red-200 text-red-700 dark:border-red-700 dark:text-red-400'}
                                                    `}
                                                    aria-label={`Change account status for ${user.username}`}
                                                    disabled={user.username === currentUser} // Prevent admin from invalidating their own account
                                                >
                                                    <option value="valid">Valid</option>
                                                    <option value="invalid">Invalid</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <div className="relative inline-block text-left">
                                                <select
                                                    value={user.subscriptionTier}
                                                    onChange={(e) => handleChangeSubscriptionTier(user.username, e.target.value as SubscriptionTier)}
                                                    className={`appearance-none bg-white dark:bg-slate-700 border rounded-full px-3 py-1 text-xs font-bold uppercase cursor-pointer pr-8
                                                        ${user.subscriptionTier === SubscriptionTier.AI_PRO ? 'border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-400' : 'border-gray-200 text-gray-600 dark:border-slate-600 dark:text-slate-300'}
                                                    `}
                                                    aria-label={`Change subscription for ${user.username}`}
                                                >
                                                    <option value={SubscriptionTier.FREE}>Free</option>
                                                    <option value={SubscriptionTier.AI_PRO}>AI Pro</option>
                                                </select>
                                                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-600 dark:text-slate-300">
                                            <div className="flex items-center gap-1"><Mail size={12} /> {user.email}</div>
                                            <div className="flex items-center gap-1 text-xs text-gray-400"><Phone size={12} /> {user.phone}</div>
                                        </td>
                                        <td className="p-3 text-sm text-gray-500 dark:text-slate-400">{new Date(user.createdDate).toLocaleDateString()}</td>
                                        <td className="p-3 text-sm text-gray-500 dark:text-slate-400">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center items-center gap-2">
                                                <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md" aria-label={`Profile data: ${Object.keys(profiles[user.username] || {}).length > 0 ? 'Yes' : 'No'}`}>{Object.keys(profiles[user.username] || {}).length > 0 ? 'Yes' : 'No'}</span>
                                                <span className="text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-md" aria-label={`Number of jobs: ${(jobs[user.username] || []).length}`}>{(jobs[user.username] || []).length}</span>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => openModal('viewProfile', user)} className="p-2" title="View Profile" aria-label={`View profile for ${user.username}`}><Eye size={16}/></button>
                                                <button onClick={() => openModal('viewJobs', user)} className="p-2" title="View Jobs" aria-label={`View jobs for ${user.username}`}><Briefcase size={16}/></button>
                                                <button onClick={() => openModal('reset', user)} className="p-2" title="Reset Password/PIN" aria-label={`Reset credentials for ${user.username}`}><KeyRound size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                            <History size={20} /> Application Activity Log ({filteredLogs.length})
                        </h3>
                        <div className="flex flex-wrap items-center gap-4 mb-6">
                            <div className="relative">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={logFilterSeverity}
                                    onChange={(e) => setLogFilterSeverity(e.target.value as any)}
                                    className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none"
                                    aria-label="Filter logs by severity"
                                >
                                    <option value="all">All Severities</option>
                                    <option value="info">Info</option>
                                    <option value="warn">Warning</option>
                                    <option value="error">Error</option>
                                    <option value="debug">Debug</option>
                                </select>
                            </div>
                            <div className="relative">
                                <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <select
                                    value={logFilterUser}
                                    onChange={(e) => setLogFilterUser(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none"
                                    aria-label="Filter logs by user"
                                >
                                    <option value="all">All Users</option>
                                    <option value="system">System</option>
                                    <option value="guest">Guest</option>
                                    {users.map(user => (
                                        <option key={user.username} value={user.username}>{user.username}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={logSearchTerm}
                                    onChange={(e) => setLogSearchTerm(e.target.value)}
                                    placeholder="Search details..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm outline-none"
                                    aria-label="Search log details"
                                />
                            </div>
                            <button
                                onClick={handleClearActivityLogs}
                                className="bg-red-500 text-white px-4 py-2 rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                                aria-label="Clear all activity logs"
                            >
                                <Trash2 size={16} /> Clear Logs
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-slate-900/50">
                                <tr>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Timestamp</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">User</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Action Type</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Details</th>
                                    <th scope="col" className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Severity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {filteredLogs.length > 0 ? (
                                    filteredLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="p-3 text-sm text-gray-800 dark:text-white">{new Date(log.timestamp).toLocaleString()}</td>
                                            <td className="p-3 text-sm text-gray-700 dark:text-slate-300">{log.username}</td>
                                            <td className="p-3 text-sm text-indigo-600 dark:text-indigo-400 font-medium">{log.actionType}</td>
                                            <td className="p-3 text-sm text-gray-600 dark:text-slate-300 max-w-sm truncate" title={log.details}>{log.details}</td>
                                            <td className="p-3 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                    log.severity === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    log.severity === 'warn' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                    log.severity === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300'
                                                }`}>
                                                    {log.severity}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="text-center py-10 text-gray-400 dark:text-slate-500">
                                            No activity logs found for the current filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {modal && selectedUser && (
                <>
                    {modal === 'reset' && <ResetPasswordModal user={selectedUser} onClose={() => setModal(null)} onSave={loadData} />}
                    {modal === 'viewProfile' && <DataViewerModal title={`${selectedUser.username}'s Profile`} data={profiles[selectedUser.username] || {}} onClose={() => setModal(null)} />}
                    {modal === 'viewJobs' && <DataViewerModal title={`${selectedUser.username}'s Jobs`} data={jobs[selectedUser.username] || []} onClose={() => setModal(null)} />}
                </>
            )}

        </div>
    );
};

export default AdminView;
