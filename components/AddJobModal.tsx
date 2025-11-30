


import React, { useState } from 'react';
import { Plus, X, Eraser } from 'lucide-react';
import { Job, JobStatus, LogActionType } from '../types';
import { logService } from '../services/logService'; // Import logService

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (j: Job) => void;
  currentUser: string; // Add currentUser prop
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onSave, currentUser }) => {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [deadline, setDeadline] = useState('');
  const [comments, setComments] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [availability, setAvailability] = useState('');
  const [relocation, setRelocation] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title || !company) return;
    const now = Date.now();
    const newJob: Job = {
      id: now.toString(),
      title,
      company,
      description: desc,
      status: JobStatus.WISHLIST,
      dateAdded: now,
      url,
      source,
      applicationDeadline: deadline,
      comments,
      city,
      country,
      availability,
      relocation,
      activity: [{
        id: `activity-${now}`,
        date: now,
        type: 'NOTE',
        content: 'Job added to tracker.'
      }]
    };
    onSave(newJob);
    logService.log(currentUser, LogActionType.JOB_ADD, `Job "${newJob.title}" for "${newJob.company}" added.`, 'info');
    // Reset
    handleClear();
    onClose();
  };

  const handleClear = () => {
    setTitle('');
    setCompany('');
    setDesc('');
    setUrl('');
    setSource('');
    setDeadline('');
    setComments('');
    setCity('');
    setCountry('');
    setAvailability('');
    setRelocation(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-2xl p-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Application</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"><X size={20} className="text-gray-500 dark:text-slate-400" /></button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
           <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Job Title <span className="text-red-500">*</span></label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="e.g. Senior Developer" />
           </div>
           <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Company <span className="text-red-500">*</span></label>
            <input value={company} onChange={e => setCompany(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="e.g. Acme Corp" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">City</label>
             <input value={city} onChange={e => setCity(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="e.g. London" />
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Country</label>
             <input value={country} onChange={e => setCountry(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="e.g. UK" />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Deadline</label>
             <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" />
           </div>
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Availability</label>
             <input value={availability} onChange={e => setAvailability(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="e.g. 2 weeks" />
           </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <input type="checkbox" checked={relocation} onChange={e => setRelocation(e.target.checked)} className="w-5 h-5 rounded border-gray-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500" />
          <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Relocation Required/Available?</span>
        </div>

        <div className="space-y-5">
          <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Job Link</label>
             <input value={url} onChange={e => setUrl(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="https://..." />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Description (Important for AI)</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl h-24 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="Paste full job description here..." />
          </div>
           <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Comments</label>
             <input value={comments} onChange={e => setComments(e.target.value)} className="w-full p-3.5 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900" placeholder="Initial thoughts..." />
           </div>
          <div className="flex gap-3 mt-8">
            <button 
                onClick={() => { if(confirm("Clear all fields?")) handleClear(); }} 
                className="px-6 py-4 rounded-xl font-bold text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
                <Eraser size={18} /> Clear
            </button>
            <button onClick={handleSubmit} className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors shadow-lg flex justify-center items-center gap-2">
                <Plus size={20}/> Create Job Card
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};