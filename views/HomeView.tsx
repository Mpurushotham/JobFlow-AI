
import React from 'react';
import { Briefcase, UserCircle, Plus, Search, MessageSquare, Sparkles, Target, List, Clock, ArrowRight, CheckCircle } from 'lucide-react';
import { Job, JobStatus, UserProfile, ViewState } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface HomeViewProps {
  profile: UserProfile;
  jobs: Job[];
  onNavigate: (view: ViewState) => void;
  onAddJob: () => void;
}

// Helper to get the start of the current week (Sunday)
const getStartOfWeek = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day;
  return new Date(now.setDate(diff)).setHours(0, 0, 0, 0);
};

const HomeView: React.FC<HomeViewProps> = ({ profile, jobs, onNavigate, onAddJob }) => {
  const activeJobs = jobs.filter(j => j.status !== JobStatus.REJECTED && j.status !== JobStatus.OFFER);
  const interviews = jobs.filter(j => j.status === JobStatus.INTERVIEWING);
  
  const weeklyGoal = 5; // Static goal for applications
  const startOfWeek = getStartOfWeek();
  const weeklyApplications = jobs.filter(j => j.status === JobStatus.APPLIED && j.dateAdded >= startOfWeek).length;
  const weeklyProgress = Math.min((weeklyApplications / weeklyGoal) * 100, 100);

  return (
    <div className="space-y-8 animate-fade-in pb-10 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10 dark:ring-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full translate-y-1/3 -translate-x-1/4 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-medium backdrop-blur-sm">
              <Sparkles size={12} className="text-yellow-300" /> AI-Powered Career Assistant
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
              Welcome back, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-white">{profile.name || 'Job Seeker'}</span>
            </h2>
            <p className="text-indigo-100 text-lg max-w-xl leading-relaxed opacity-90">
              You have <span className="text-white font-bold text-xl">{activeJobs.length}</span> active applications and 
              <span className="text-white font-bold text-xl"> {interviews.length}</span> upcoming interviews. 
              Let's get you hired!
            </p>
          </div>
          <button 
            onClick={onAddJob}
            className="bg-white text-indigo-900 px-8 py-4 rounded-2xl hover:bg-indigo-50 hover:scale-105 transition-all flex items-center gap-2 font-bold shadow-xl shadow-indigo-900/20 group"
          >
            <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" /> Add New Job
          </button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { id: 'JOB_SEARCH', icon: Search, label: 'Find Jobs', desc: 'AI search for roles.', color: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
          { id: 'JOBS', icon: Briefcase, label: 'My Board', desc: 'Kanban pipeline.', color: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
          { id: 'TRACKER', icon: List, label: 'Tracker', desc: 'Detailed table view.', color: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
          { id: 'INTERVIEWS', icon: MessageSquare, label: 'Interview Prep', desc: 'Q&A guides.', color: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
        ].map((item) => (
          <div key={item.id} onClick={() => onNavigate(item.id as ViewState)} className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group">
            <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <item.icon size={28} className={item.text} />
            </div>
            <h3 className="text-lg font-bold mb-1 text-gray-800 dark:text-white">{item.label}</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>
      
      {/* Stats & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-gray-400" /> Recent Activity
            </h3>
            <button onClick={() => onNavigate('TRACKER')} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg transition-colors">
              View All <ArrowRight size={14}/>
            </button>
          </div>
          <div className="space-y-4">
            {jobs.slice(0, 4).map(job => (
              <div key={job.id} onClick={() => onNavigate('JOBS')} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-2xl hover:bg-white dark:hover:bg-slate-700 hover:shadow-md border border-transparent hover:border-gray-100 dark:hover:border-slate-600 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center shadow-sm text-lg font-bold text-gray-700 dark:text-slate-300 border border-gray-100 dark:border-slate-700 group-hover:scale-105 transition-transform">
                    {job.company.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">{job.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                   <div className="text-xs text-gray-400 font-medium hidden sm:block">
                     {new Date(job.dateAdded).toLocaleDateString()}
                   </div>
                   <StatusBadge status={job.status} />
                </div>
              </div>
            ))}
            {jobs.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-100 dark:border-slate-700 rounded-2xl">
                <p className="text-gray-400">No jobs yet. Start by finding one!</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
               <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                 <Target size={20} className="text-gray-400" /> This Week's Goals
               </h3>
               <div className="space-y-4">
                   <p className="text-sm text-gray-500 dark:text-slate-400">Apply to {weeklyGoal} jobs this week to stay on track.</p>
                   <div className="flex justify-between items-center text-sm font-bold">
                       <span className="text-gray-600 dark:text-slate-300">Progress</span>
                       <span className="text-indigo-600 dark:text-indigo-400">{weeklyApplications} / {weeklyGoal}</span>
                   </div>
                   <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
                       <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${weeklyProgress}%` }}></div>
                   </div>
               </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
              <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                Setup Progress
              </h3>
              <div className="space-y-6 flex-1">
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 shadow-sm`}>
                      <CheckCircle size={14} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">AI Integration</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">System ready.</p>
                    </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${profile.resumeContent ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'} shadow-sm`}>
                      {profile.resumeContent ? <CheckCircle size={14} /> : <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">Master Resume</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Upload your base resume text.</p>
                      {!profile.resumeContent && <button onClick={() => onNavigate('PROFILE')} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-medium mt-2 shadow-sm hover:bg-indigo-700">Add Resume</button>}
                    </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;
