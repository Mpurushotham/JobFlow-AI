import React from 'react';
import { Briefcase, UserCircle, Plus, Search, MessageSquare, Sparkles, Target, List, Clock, ArrowRight, CheckCircle, AlertTriangle, RefreshCcw, CalendarClock, MailOpen, Lightbulb, TrendingUp, Share2, Linkedin, Facebook } from 'lucide-react'; // Added TrendingUp for Pro CTA, Share2, Linkedin, Whatsapp, Facebook
import { Job, JobStatus, UserProfile, ViewState, MasterResumeFitResult, SubscriptionTier } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface HomeViewProps {
  profile: UserProfile;
  jobs: Job[];
  onNavigate: (view: ViewState) => void;
  onAddJob: () => void; // FIX: Added onAddJob prop
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
  const interviews = jobs.filter(j => j.status === JobStatus.INTERVIEWING && j.activity?.some(act => act.type === 'INTERVIEW'));
  
  const weeklyGoal = 5; // Static goal for applications
  const startOfWeek = getStartOfWeek();
  const weeklyApplications = jobs.filter(j => j.status === JobStatus.APPLIED && j.dateAdded >= startOfWeek).length;
  const weeklyProgress = Math.min((weeklyApplications / weeklyGoal) * 100, 100);

  // Get upcoming interview
  const upcomingInterview = jobs
    .filter(j => j.status === JobStatus.INTERVIEWING && j.activity)
    .flatMap(job => job.activity!
      .filter(act => act.type === 'INTERVIEW' && act.date > Date.now())
      .map(activity => ({ job, activity }))
    )
    .sort((a, b) => a.activity.date - b.activity.date)[0]; // Closest upcoming

  // Get follow-up reminders (Applied jobs without recent activity, e.g., 7 days)
  const followUpReminders = jobs
    .filter(j => j.status === JobStatus.APPLIED)
    .filter(j => {
      const lastActivityDate = j.activity?.length ? Math.max(...j.activity.map(a => a.date)) : j.dateAdded;
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return lastActivityDate < sevenDaysAgo;
    })
    .slice(0, 3); // Show up to 3 reminders

  // Skill Gap Alerts
  const masterResumeFit: MasterResumeFitResult | null = profile.masterResumeFit ? JSON.parse(profile.masterResumeFit) : null;
  const skillGapAlerts = masterResumeFit?.missingSkills || [];

  const appShareUrl = window.location.origin; // Or a specific landing page URL
  const shareText = "🚀 Land your dream job faster with JobFlow AI! It's your ultimate AI-powered career assistant for job search, resume tailoring, cover letters, and interview prep. Check it out: " + appShareUrl;

  const handleShare = (platform: 'linkedin' | 'whatsapp' | 'facebook') => {
    let url = '';
    switch (platform) {
      case 'linkedin':
        url = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(appShareUrl)}&title=${encodeURIComponent("JobFlow AI: Your Career Copilot")}&summary=${encodeURIComponent(shareText)}&source=${encodeURIComponent(appShareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(appShareUrl)}&quote=${encodeURIComponent(shareText)}`;
        break;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

      {profile.subscriptionTier === SubscriptionTier.FREE && (
        <div className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-6 rounded-[2rem] shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-4">
            <TrendingUp size={36} className="text-white/80" />
            <div>
              <h3 className="text-xl font-bold">Unlock AI Pro Features!</h3>
              <p className="text-orange-100 text-sm">Boost your job search with unlimited AI tools.</p>
            </div>
          </div>
          <button onClick={() => onNavigate('PRICING')} className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-100 transition-colors flex items-center gap-2 shadow-md">
            Upgrade Now <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { id: 'JOB_SEARCH', icon: Search, label: 'Find Jobs', desc: 'AI search for roles.', color: 'bg-indigo-50 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400' },
          { id: 'JOBS', icon: Briefcase, label: 'My Board', desc: 'Kanban pipeline.', color: 'bg-purple-50 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
          { id: 'TRACKER', icon: List, label: 'Detailed Tracker', desc: 'Sortable table view.', color: 'bg-emerald-50 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
          { id: 'AI_COACH', icon: MessageSquare, label: 'AI Coach', desc: 'Prep for interviews.', color: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
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
                   {weeklyApplications >= weeklyGoal && (
                       <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-bold mt-4">
                           <CheckCircle size={18} /> Goal Achieved! Great job!
                       </div>
                   )}
               </div>
            </div>

            {/* Upcoming Interview Card */}
            {upcomingInterview && (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <CalendarClock size={20} className="text-purple-500" /> Upcoming Interview
                </h3>
                <div className="space-y-3">
                  <p className="text-sm text-gray-800 dark:text-white font-bold">{upcomingInterview.job.title} at {upcomingInterview.job.company}</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 flex items-center gap-2">
                    <Clock size={14} className="text-gray-400" />
                    {new Date(upcomingInterview.activity.date).toLocaleString()}
                  </p>
                  <button 
                    onClick={() => onNavigate('INTERVIEWS')} 
                    className="mt-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                  >
                    View Prep Guide
                  </button>
                </div>
              </div>
            )}

            {/* Follow-up Reminders Card */}
            {followUpReminders.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <MailOpen size={20} className="text-orange-500" /> Follow-up Reminders
                </h3>
                <div className="space-y-4">
                  {followUpReminders.map(job => (
                    <div key={job.id} className="flex items-center justify-between">
                      <p className="text-sm text-gray-800 dark:text-white font-medium">{job.title} at {job.company}</p>
                      <button 
                        onClick={() => { onNavigate('WORKSPACE'); }} 
                        className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                      >
                        Follow Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skill Gap Alerts Card */}
            {skillGapAlerts.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col">
                <h3 className="font-bold text-xl text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <Lightbulb size={20} className="text-red-500" /> Skill Gap Alert!
                </h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                  Your master resume is missing key skills for your target roles (based on your <button onClick={() => onNavigate('PROFILE')} className="font-bold text-indigo-600 hover:underline">Profile</button> analysis):
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {skillGapAlerts.map(skill => (
                    <span key={skill} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">{skill}</span>
                  ))}
                </div>
                <button 
                  onClick={() => onNavigate('AI_COACH')} 
                  className="mt-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                >
                  Get Learning Path
                </button>
              </div>
            )}

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
                <div className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors">
                    <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${profile.targetJobDescription ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'} shadow-sm`}>
                      {profile.targetJobDescription ? <CheckCircle size={14} /> : <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-800 dark:text-white">Target Role Defined</h4>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Define your ideal job description for personalized AI insights.</p>
                      {!profile.targetJobDescription && <button onClick={() => onNavigate('PROFILE')} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-lg font-medium mt-2 shadow-sm hover:bg-indigo-700">Define Role</button>}
                    </div>
                </div>
              </div>
            </div>

            {/* Refer a Friend Section */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden flex flex-col justify-center items-center text-center">
              <Share2 size={48} className="text-white/80 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Refer a Friend & Spread the Word!</h3>
              <p className="text-indigo-100 text-sm max-w-md mb-6">
                Love JobFlow AI? Share it with your network and help others land their dream jobs too!
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => handleShare('linkedin')}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  title="Share on LinkedIn"
                >
                  <Linkedin size={24} />
                </button>
                <button 
                  onClick={() => handleShare('whatsapp')}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  title="Share on WhatsApp"
                >
                  <Share2 size={24} />
                </button>
                <button 
                  onClick={() => handleShare('facebook')}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  title="Share on Facebook"
                >
                  <Facebook size={24} />
                </button>
              </div>
            </div>

        </div>
      </div>
    </div>
  );
};

export default HomeView;