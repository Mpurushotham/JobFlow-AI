
import React from 'react';
import { Plus, Trash2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { Job, JobActivity, JobStatus } from '../types';

interface JobsViewProps {
  jobs: Job[];
  onSelectJob: (j: Job) => void;
  onAddJob: () => void;
  onDeleteJob: (id: string) => void;
  onUpdateJob: (j: Job) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({ 
  jobs, 
  onSelectJob, 
  onAddJob, 
  onDeleteJob,
  onUpdateJob
}) => {
  
  const columns = [
    { id: JobStatus.WISHLIST, label: 'Wishlist', color: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
    { id: JobStatus.APPLIED, label: 'Applied', color: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900' },
    { id: JobStatus.INTERVIEWING, label: 'Interviewing', color: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900' },
    { id: JobStatus.OFFER, label: 'Offer', color: 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900' },
    { id: JobStatus.REJECTED, label: 'Rejected', color: 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900' },
  ];

  const getJobsByStatus = (status: JobStatus) => jobs.filter(j => j.status === status);

  const handleMoveJob = (job: Job, direction: 'forward' | 'backward') => {
    const currentStatusIndex = columns.findIndex(c => c.id === job.status);
    const newIndex = direction === 'forward' ? currentStatusIndex + 1 : currentStatusIndex - 1;

    if (newIndex >= 0 && newIndex < columns.length) {
      const newStatus = columns[newIndex].id as JobStatus;
      let updatedJob = { ...job, status: newStatus };

      // Check if moving TO 'APPLIED' FROM a different status
      if (job.status !== JobStatus.APPLIED && newStatus === JobStatus.APPLIED) {
        const submissionActivity: JobActivity = {
          id: `activity-${Date.now()}`,
          date: Date.now(),
          type: 'SUBMISSION',
          content: `Application submitted on ${new Date().toLocaleDateString()}.`
        };
        // Ensure activity array exists and add the new one, then sort
        const existingActivities = updatedJob.activity || [];
        updatedJob.activity = [...existingActivities, submissionActivity].sort((a, b) => b.date - a.date);
      }
      onUpdateJob(updatedJob);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-fade-in">
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">My Board</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">Visualize your application pipeline.</p>
        </div>
        <button 
          onClick={onAddJob}
          className="bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-gray-900 px-6 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Plus size={20} /> Add Job
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 custom-scrollbar">
        <div className="flex h-full gap-6 min-w-[1400px] px-1">
          {columns.map(col => {
             const colJobs = getJobsByStatus(col.id as JobStatus);
             return (
              <div key={col.id} className="w-80 flex flex-col h-full bg-gray-100/50 dark:bg-slate-900/50 rounded-3xl border border-gray-200 dark:border-slate-800">
                <div className={`p-4 flex items-center justify-between border-b ${col.color} bg-opacity-30 rounded-t-3xl backdrop-blur-sm`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${col.color} bg-white/50 dark:bg-slate-800/50`}>{col.label}</span>
                    <span className="text-gray-500 dark:text-slate-400 text-xs font-bold bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-md">{colJobs.length}</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {colJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => onSelectJob(job)} 
                      className="group bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-lg hover:border-indigo-200 dark:hover:border-indigo-800 cursor-pointer transition-all relative animate-scale-in"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-gray-700 dark:text-slate-300 font-bold text-sm border border-gray-100 dark:border-slate-600">
                          {job.company.charAt(0)}
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                          className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      
                      <h4 className="font-bold text-gray-800 dark:text-white text-base mb-1 leading-tight">{job.title}</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-3 truncate font-medium">{job.company}</p>
                      
                      {job.applicationDeadline && (
                         <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-slate-500 font-medium mb-3 bg-gray-50 dark:bg-slate-900 p-1.5 rounded-lg w-fit">
                           <Clock size={12} /> Deadline: {job.applicationDeadline}
                         </div>
                      )}

                      {job.matchScore !== undefined && (
                        <div className="mb-4">
                           <div className="flex justify-between text-[10px] font-bold text-gray-400 dark:text-slate-500 mb-1">
                             <span>MATCH</span>
                             <span className={job.matchScore >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>{job.matchScore}%</span>
                           </div>
                           <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${job.matchScore >= 80 ? 'bg-green-500' : 'bg-yellow-400'}`} style={{ width: `${job.matchScore}%` }}></div>
                           </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50 dark:border-slate-700">
                         <div className="flex gap-1 w-full justify-between">
                            {col.id !== JobStatus.WISHLIST ? (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleMoveJob(job, 'backward'); }}
                                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              >
                                <ChevronLeft size={18} />
                              </button>
                            ) : <div></div>}
                            
                            {col.id !== JobStatus.REJECTED && col.id !== JobStatus.OFFER && (
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleMoveJob(job, 'forward'); }}
                                className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              >
                                <ChevronRight size={18} />
                              </button>
                            )}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
             );
          })}
        </div>
      </div>
    </div>
  );
};
