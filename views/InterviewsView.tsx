
import React, { useMemo } from 'react';
import { Sparkles, ArrowRight, Calendar, Clock, Briefcase } from 'lucide-react';
import { Job, JobStatus, JobActivity } from '../types';

interface InterviewsViewProps {
  jobs: Job[];
  onSelectJob: (j: Job) => void;
}

interface InterviewEvent {
  job: Job;
  activity: JobActivity;
}

const InterviewsView: React.FC<InterviewsViewProps> = ({ jobs, onSelectJob }) => {
  
  const interviewEvents = useMemo(() => {
    const allInterviews: InterviewEvent[] = [];
    jobs
      .filter(j => j.status === JobStatus.INTERVIEWING && j.activity)
      .forEach(job => {
        job.activity!
          .filter(act => act.type === 'INTERVIEW')
          .forEach(activity => {
            allInterviews.push({ job, activity });
          });
      });
    
    // Sort all interviews chronologically, most recent first
    return allInterviews.sort((a, b) => b.activity.date - a.activity.date);
  }, [jobs]);


  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Interview Hub</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">A chronological timeline of all your scheduled interviews.</p>
        </div>
      </div>

      {interviewEvents.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 p-12 rounded-[2rem] border border-gray-100 dark:border-slate-700 shadow-sm text-center">
            <div className="w-24 h-24 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={40} className="text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">No interviews scheduled</h3>
            <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-md mx-auto">Log an "Interview" activity in a job's workspace to see it appear here. Good luck!</p>
        </div>
      ) : (
        <div className="space-y-6">
            {interviewEvents.map(({ job, activity }) => (
              <div key={activity.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-white">{job.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 mt-1">
                        <Briefcase size={14} />
                        <span>{job.company}</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onSelectJob(job)} 
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-md"
                    >
                      Prep Guide <ArrowRight size={16} />
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
                    <div className="flex items-center gap-2 font-medium">
                        <Calendar size={16} className="text-purple-500"/> 
                        <span className="text-gray-800 dark:text-slate-200">{new Date(activity.date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                        <Clock size={16} className="text-purple-500"/>
                        <span className="text-gray-800 dark:text-slate-200">{new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                   <div className="mt-4 p-5 bg-gray-50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-700">
                        <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mb-2">Details & Notes</p>
                        <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{activity.content}</p>
                   </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default InterviewsView;
