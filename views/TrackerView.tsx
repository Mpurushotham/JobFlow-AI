
import React from 'react';
import { Download, ExternalLink, Globe } from 'lucide-react';
import { Job } from '../types';
import { downloadCSV } from '../utils/exportUtils';
import { StatusBadge } from '../components/StatusBadge';

interface TrackerViewProps {
  jobs: Job[];
  onSelectJob: (j: Job) => void;
}

export const TrackerView: React.FC<TrackerViewProps> = ({ jobs, onSelectJob }) => {
  return (
    <div className="flex flex-col h-full animate-fade-in max-w-full mx-auto">
      <div className="mb-6 flex justify-between items-end px-1">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Application Tracker</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Detailed list of all your job applications.</p>
        </div>
        <div className="flex gap-3">
            <button 
                onClick={() => downloadCSV(jobs)}
                className="text-sm bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-bold hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 px-4 py-2 rounded-xl shadow-sm flex items-center gap-2 transition-colors"
            >
                <Download size={16} /> Export CSV
            </button>
            <div className="text-sm text-gray-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex items-center">
                Total: <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">{jobs.length}</span>
            </div>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden flex-1 flex flex-col transition-colors">
        <div className="overflow-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead className="bg-gray-50/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-12">No.</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Job Title</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Company</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">City</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Country</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Relocation</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Availability</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Source</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Deadline</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Match</th>
                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
              {jobs.map((job, index) => (
                <tr key={job.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                  <td className="p-4 text-sm text-gray-500 dark:text-slate-500 font-medium">{index + 1}</td>
                  <td className="p-4">
                    <div className="font-bold text-gray-800 dark:text-white">{job.title}</div>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noreferrer" className="text-xs text-indigo-500 hover:underline flex items-center gap-1 mt-0.5">
                        View Ad <ExternalLink size={10} />
                      </a>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-700 dark:text-slate-300 font-medium">
                     <div className="flex items-center gap-2">
                       <div className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400 shrink-0">
                         {job.company.charAt(0)}
                       </div>
                       {job.company}
                     </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-400">
                      {job.city ? <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">{job.city}</span> : '-'}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-400">{job.country || '-'}</td>
                  <td className="p-4 text-sm">
                    {job.relocation ? <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded">Yes</span> : <span className="text-gray-400 dark:text-slate-600">-</span>}
                  </td>
                   <td className="p-4 text-sm text-gray-600 dark:text-slate-400">{job.availability || '-'}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-400">
                    {job.source ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 text-xs truncate max-w-[100px]">
                        <Globe size={10}/> {job.source}
                      </span>
                    ) : <span className="text-gray-300 dark:text-slate-600">-</span>}
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-slate-400">
                    {job.applicationDeadline ? (
                      <span className="text-red-500 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md text-xs whitespace-nowrap">{job.applicationDeadline}</span>
                    ) : <span className="text-gray-300 dark:text-slate-600">-</span>}
                  </td>
                  <td className="p-4"><StatusBadge status={job.status} /></td>
                  <td className="p-4">
                      {job.matchScore ? <span className={`font-bold text-xs ${job.matchScore >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>{job.matchScore}%</span> : <span className="text-gray-300 dark:text-slate-600">-</span>}
                  </td>
                  <td className="p-4">
                    <button 
                      onClick={() => onSelectJob(job)} 
                      className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                      title="Open Workspace"
                    >
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-20 text-gray-400">
                    No records found. Add a job to see it here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};