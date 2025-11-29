
import React, { useState, useEffect } from 'react';
import { UserProfile, Job, User } from '../types';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';
import { KeyRound, Eye, Trash2, User as UserIcon, Briefcase, AlertTriangle, X, ShieldCheck, Lock } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const ResetPasswordModal: React.FC<{ user: User; onClose: () => void; onSave: () => void; }> = ({ user, onClose, onSave }) => {
    const [newPassword, setNewPassword] = useState('');
    const [newPin, setNewPin] = useState('');
    const { addNotification } = useNotifications();

    const handleReset = () => {
        if (!newPassword || newPin.length !== 4) {
            addNotification('Password cannot be empty and PIN must be 4 digits.', 'error');
            return;
        }
        if (authService.resetPasswordPin(user.username, newPassword, newPin)) {
            addNotification(`Credentials for ${user.username} have been reset.`, 'success');
            onSave();
            onClose();
        } else {
            addNotification('Failed to reset credentials.', 'error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Reset Credentials for <span className="text-indigo-500">{user.username}</span></h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">New Password</label>
                        <div className="relative mt-1">
                            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">New 4-Digit PIN</label>
                         <div className="relative mt-1">
                            <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={4} className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg" />
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 mt-6">
                    <button onClick={onClose} className="w-full py-2 bg-gray-200 dark:bg-slate-600 text-gray-800 dark:text-slate-200 font-bold rounded-lg">Cancel</button>
                    <button onClick={handleReset} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700">Reset</button>
                </div>
            </div>
        </div>
    );
};


const DataViewerModal: React.FC<{ title: string; data: any; onClose: () => void; }> = ({ title, data, onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"><X size={18} /></button>
            </div>
            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto flex-1 custom-scrollbar">
                <pre className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
                    {JSON.stringify(data, null, 2)}
                </pre>
            </div>
        </div>
    </div>
);


export const AdminView: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
    const [jobs, setJobs] = useState<Record<string, Job[]>>({});

    const [modal, setModal] = useState<'reset' | 'viewProfile' | 'viewJobs' | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        setUsers(authService.getAllUsers());
        setProfiles(storageService.getAllProfiles());
        setJobs(storageService.getAllJobs());
    };

    const handleClearAllData = () => {
        if (window.confirm("DANGER: This will delete ALL users, jobs, and profile data from local storage. The admin account will be the only one remaining. This action cannot be undone. Proceed?")) {
            localStorage.removeItem('jobflow_jobs_multi');
            localStorage.removeItem('jobflow_profiles_multi');
            localStorage.removeItem('jobflow_users');
            loadData();
            alert("All application data has been cleared.");
        }
    };

    const openModal = (type: 'reset' | 'viewProfile' | 'viewJobs', user: User) => {
        setSelectedUser(user);
        setModal(type);
    };
    
    return (
        <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-4">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Admin Panel</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Manage all user accounts and data stored in this browser.</p>
                </div>
                <button 
                    onClick={handleClearAllData}
                    className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                    <AlertTriangle size={18} /> Clear All Data
                </button>
            </div>

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
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Username</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Contact</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Created</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Last Login</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Data</th>
                                <th className="p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {users.map(user => (
                                <tr key={user.username}>
                                    <td className="p-3 font-medium text-gray-800 dark:text-white">{user.username}</td>
                                    <td className="p-3 text-sm text-gray-600 dark:text-slate-300">
                                        <div>{user.email}</div>
                                        <div className="text-xs text-gray-400">{user.phone}</div>
                                    </td>
                                    <td className="p-3 text-sm text-gray-500 dark:text-slate-400">{new Date(user.createdDate).toLocaleDateString()}</td>
                                    <td className="p-3 text-sm text-gray-500 dark:text-slate-400">{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <span className="text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-md">{Object.keys(profiles[user.username] || {}).length > 0 ? 'Yes' : 'No'}</span>
                                            <span className="text-xs font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-md">{(jobs[user.username] || []).length}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button onClick={() => openModal('viewProfile', user)} className="p-2" title="View Profile"><Eye size={16}/></button>
                                            <button onClick={() => openModal('viewJobs', user)} className="p-2" title="View Jobs"><Briefcase size={16}/></button>
                                            <button onClick={() => openModal('reset', user)} className="p-2" title="Reset Password/PIN"><KeyRound size={16}/></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

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
