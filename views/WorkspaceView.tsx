

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building, MapPin, Edit3, ExternalLink, Target, FileText, MessageSquare, UserCircle, Sparkles, CheckCircle, XCircle, FileDown, History, StickyNote, CalendarPlus, Send, Trophy, Paperclip, XOctagon, Plus, Sun, Cloud, CloudRain, CloudSnow, Wind, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Job, JobStatus, UserProfile, JobActivity, JobActivityType } from '../types';
import { geminiService } from '../services/geminiService';
import { handlePrintPDF } from '../utils/exportUtils';
import { ResumeMarkdownComponents } from '../utils/resumeMarkdown';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useNotifications } from '../context/NotificationContext';

interface WorkspaceViewProps {
  job: Job;
  profile: UserProfile;
  onUpdateJob: (j: Job) => void;
  onBack: () => void;
}

const STATUS_LABELS = {
    [JobStatus.WISHLIST]: 'Wishlist',
    [JobStatus.APPLIED]: 'Applied',
    [JobStatus.INTERVIEWING]: 'Interviewing',
    [JobStatus.OFFER]: 'Offer',
    [JobStatus.REJECTED]: 'Rejected'
};

const activityIcons: { [key in JobActivityType]: React.ReactElement } = {
  NOTE: <StickyNote size={16} />,
  SUBMISSION: <Paperclip size={16} />,
  INTERVIEW: <CalendarPlus size={16} />,
  FOLLOW_UP: <Send size={16} />,
  OFFER: <Trophy size={16} />,
  REJECTION: <XOctagon size={16} />,
};

const activityColors: { [key in JobActivityType]: string } = {
  NOTE: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300',
  SUBMISSION: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  INTERVIEW: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  FOLLOW_UP: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  OFFER: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  REJECTION: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
};

const getWeatherIcon = (description: string): React.ReactElement => {
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return <Sun size={16} className="text-yellow-500" />;
    if (desc.includes('cloud')) return <Cloud size={16} className="text-slate-400" />;
    if (desc.includes('rain') || desc.includes('drizzle')) return <CloudRain size={16} className="text-blue-500" />;
    if (desc.includes('snow')) return <CloudSnow size={16} className="text-cyan-300" />;
    if (desc.includes('storm') || desc.includes('thunder')) return <CloudRain size={16} className="text-indigo-500" />;
    if (desc.includes('mist') || desc.includes('fog')) return <Wind size={16} className="text-slate-400" />;
    return <Cloud size={16} className="text-slate-400" />;
};


const WorkspaceView: React.FC<WorkspaceViewProps> = ({ 
  job, 
  profile, 
  onUpdateJob, 
  onBack 
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITY' | 'RESUME' | 'COVER_LETTER' | 'INTERVIEW'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(job);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { addNotification } = useNotifications();

  // Activity Log State
  const [newActivityContent, setNewActivityContent] = useState('');
  const [newActivityType, setNewActivityType] = useState<JobActivityType>('NOTE');
  const [interviewStage, setInterviewStage] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');

  const fetchWeather = async (force = false) => {
    if (job.city && job.country && (!job.weather || force)) {
        setIsFetchingWeather(true);
        try {
            const weatherData = await geminiService.getWeather(job.city, job.country);
            if (weatherData) {
                onUpdateJob({ ...job, weather: weatherData.description, temperature: weatherData.temperature });
            }
        } catch (e: any) {
            if (e.message !== 'RATE_LIMIT_EXCEEDED') {
              console.error("Weather fetch failed", e);
            } else {
              addNotification("Weather API limit reached. Please wait a minute.", 'info');
            }
        } finally {
            setIsFetchingWeather(false);
        }
    }
  };

  useEffect(() => {
    fetchWeather();
  }, [job.id, job.city, job.country]);


  useEffect(() => {
    setEditForm(job);
  }, [job]);

  const handleSaveDetails = () => {
    onUpdateJob(editForm);
    setIsEditing(false);
    addNotification('Job details saved!', 'success');
  };

  const handleAnalyze = async () => {
    if (!profile.resumeContent) return addNotification("Please add your resume in the Profile section first.", 'error');
    setLoading(true);
    try {
      const result = await geminiService.analyzeJob(profile.resumeContent, job.description);
      onUpdateJob({ 
        ...job, 
        matchScore: result.score, 
        analysis: JSON.stringify(result) 
      });
      addNotification('Match analysis complete!', 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Analysis failed. Please try again.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTailorResume = async () => {
    if (!profile.resumeContent) return addNotification("Please add your resume in the Profile section first.", 'error');
    setLoading(true);
    try {
      const tailored = await geminiService.tailorResume(profile.resumeContent, job.description);
      onUpdateJob({ ...job, tailoredResume: tailored });
      addNotification('Resume tailored successfully!', 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to tailor resume.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCover = async () => {
    if (!profile.resumeContent) return addNotification("Please add your resume in the Profile section first.", 'error');
    setLoading(true);
    try {
      const letter = await geminiService.generateCoverLetter(
        profile.resumeContent, 
        job.description, 
        job.company,
        profile.phone,
        profile.email
      );
      onUpdateJob({ ...job, coverLetter: letter });
      addNotification('Cover letter generated!', 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to generate cover letter.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewPrep = async () => {
    if (!profile.resumeContent) return addNotification("Please add your resume in the Profile section first.", 'error');
    setLoading(true);
    try {
      const prep = await geminiService.generateInterviewPrep(profile.resumeContent, job.description);
      onUpdateJob({ ...job, interviewPrep: prep });
      addNotification('Interview prep guide is ready!', 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to generate interview prep.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = (newStatus: JobStatus) => {
    let updatedJob = { ...job, status: newStatus };
    if (job.status !== JobStatus.APPLIED && newStatus === JobStatus.APPLIED) {
        const submissionActivity: JobActivity = {
            id: `activity-${Date.now()}`,
            date: Date.now(),
            type: 'SUBMISSION',
            content: `Application submitted on ${new Date().toLocaleDateString()}.`
        };
        const existingActivities = updatedJob.activity || [];
        updatedJob.activity = [...existingActivities, submissionActivity].sort((a,b) => b.date - a.date);
        addNotification('Application status updated and logged!', 'info');
    }
    onUpdateJob(updatedJob);
  };

  const handleAddActivity = () => {
    let content = '';
    let activityDate = Date.now();

    if (newActivityType === 'INTERVIEW') {
      if (!interviewStage || !interviewDate) {
        addNotification('Please provide an interview stage and date.', 'error');
        return;
      }
      activityDate = new Date(interviewDate).getTime();
      content = `Stage: ${interviewStage}\nNotes: ${interviewNotes || 'No notes provided.'}`;
    } else {
      if (!newActivityContent.trim()) {
        addNotification('Please enter some content for the activity.', 'error');
        return;
      }
      content = newActivityContent.trim();
    }

    const newActivity: JobActivity = {
        id: `activity-${activityDate}`,
        date: activityDate,
        type: newActivityType,
        content: content,
    };
    const updatedActivity = [...(job.activity || []), newActivity].sort((a, b) => b.date - a.date);
    onUpdateJob({ ...job, activity: updatedActivity });
    addNotification('Activity logged successfully!', 'success');
    
    // Reset forms
    setNewActivityContent('');
    setNewActivityType('NOTE');
    setInterviewStage('');
    setInterviewDate('');
    setInterviewNotes('');
  };

  const analysisData = job.analysis ? JSON.parse(job.analysis) : null;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative animate-scale-in transition-colors">
      {loading && <LoadingOverlay message="AI Agent is working..." />}
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-slate-800 z-10 gap-4 transition-colors">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <ChevronLeft className="text-gray-500 dark:text-slate-400" />
          </button>
          <div className="flex flex-col">
            {isEditing ? (
               <input 
                 value={editForm.title} 
                 onChange={e => setEditForm({...editForm, title: e.target.value})}
                 className="text-xl font-bold border rounded p-1 mb-1 text-gray-900 dark:text-white bg-white dark:bg-slate-900"
               />
            ) : (
               <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{job.title}</h2>
            )}
            
            <div className="flex items-center text-gray-500 dark:text-slate-400 space-x-3 mt-1 text-sm">
              <span className="flex items-center gap-1 font-medium"><Building size={14} /> {job.company}</span>
              {(job.city || job.country) && <><span className="text-gray-300">•</span> <span className="flex items-center gap-1"><MapPin size={14} /> {job.city}{job.city && job.country ? ', ' : ''}{job.country}</span></>}
              {job.weather && job.temperature !== undefined && (
                 <>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700/50 px-2 py-0.5 rounded-md border border-gray-100 dark:border-slate-700 text-xs font-medium">
                        {getWeatherIcon(job.weather)}
                        <span className="text-gray-700 dark:text-slate-300">{job.temperature}°C, {job.weather}</span>
                        <button onClick={() => fetchWeather(true)} className="ml-1 text-gray-400 hover:text-indigo-500 disabled:opacity-50" disabled={isFetchingWeather} title="Refresh weather">
                          <RefreshCw size={12} className={isFetchingWeather ? 'animate-spin' : ''} />
                        </button>
                    </div>
                 </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
             <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit Details">
               <Edit3 size={18} />
             </button>
          ) : (
             <div className="flex gap-2">
                 <button onClick={() => { setIsEditing(false); setEditForm(job); }} className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors">Cancel</button>
                 <button onClick={handleSaveDetails} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors">Save</button>
             </div>
          )}

          {job.url && (
            <a 
              href={job.url} 
              target="_blank" 
              rel="noreferrer"
              className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 transition-colors"
            >
              Apply <ExternalLink size={14} />
            </a>
          )}
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block"></div>
          <select 
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            {Object.values(JobStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Extended Details for Editing */}
      {isEditing && (
        <div className="p-6 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 transition-colors">
           <div>
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Source</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.source || ''} onChange={e => setEditForm({...editForm, source: e.target.value})} placeholder="e.g. LinkedIn" />
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">City</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="e.g. New York" />
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Country</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.country || ''} onChange={e => setEditForm({...editForm, country: e.target.value})} placeholder="e.g. USA" />
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Deadline</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" type="date" value={editForm.applicationDeadline || ''} onChange={e => setEditForm({...editForm, applicationDeadline: e.target.value})} />
           </div>
           <div>
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Availability</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.availability || ''} onChange={e => setEditForm({...editForm, availability: e.target.value})} placeholder="e.g. Immediate" />
           </div>
           <div className="flex items-center pt-5">
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!editForm.relocation} onChange={e => setEditForm({...editForm, relocation: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Relocation?</span>
             </label>
           </div>
           <div className="md:col-span-2">
             <label className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Comments</label>
             <input className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.comments || ''} onChange={e => setEditForm({...editForm, comments: e.target.value})} placeholder="Notes..." />
           </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10 overflow-x-auto gap-6 transition-colors">
        {[
          { id: 'OVERVIEW', label: 'Match Analysis', icon: Target },
          { id: 'ACTIVITY', label: 'Activity Log', icon: History },
          { id: 'RESUME', label: 'Tailored Resume', icon: FileText },
          { id: 'COVER_LETTER', label: 'Cover Letter', icon: MessageSquare },
          { id: 'INTERVIEW', label: 'Interview Prep', icon: UserCircle },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 translate-y-px' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/50 custom-scrollbar transition-colors">
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 text-lg">Job Description</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {job.description}
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
                 <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm uppercase">My Notes</h3>
                 <p className="text-gray-600 dark:text-slate-300">{job.comments || "No comments added."}</p>
              </div>
            </div>
            
            <div className="space-y-6">
               {/* Match Score Card */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm sticky top-0">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg">AI Match</h3>
                  <button onClick={handleAnalyze} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 font-bold transition-colors shadow-sm">
                    {analysisData ? 'Re-Analyze' : 'Run Analysis'}
                  </button>
                </div>
                
                {analysisData ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-center py-4">
                      <div className="relative h-40 w-40 flex items-center justify-center">
                         <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                            <path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path className={`${analysisData.score >= 80 ? 'text-green-500' : analysisData.score >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${analysisData.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                         </svg>
                         <div className="absolute flex flex-col items-center">
                            <span className="text-4xl font-extrabold text-gray-800 dark:text-white">{analysisData.score}%</span>
                            <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Match</span>
                         </div>
                      </div>
                    </div>
                    
                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                      <p className="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed text-center">"{analysisData.summary}"</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><XCircle size={14} className="text-red-400"/> Missing Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.missingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500"/> Matching Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.matchingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-100 dark:border-green-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400 dark:text-slate-600 text-sm">
                    <Target size={48} className="mx-auto mb-4 opacity-20" />
                    <p>Run analysis to see how well your resume matches this job.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'ACTIVITY' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4">Add New Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  {newActivityType === 'INTERVIEW' ? (
                     <div className="space-y-3">
                        <input type="text" value={interviewStage} onChange={e => setInterviewStage(e.target.value)} placeholder="Stage (e.g., Phone Screen)" className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                        <input type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white" />
                        <textarea value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} placeholder="Notes, participants, link..." className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" />
                     </div>
                  ) : (
                    <textarea 
                        value={newActivityContent}
                        onChange={e => setNewActivityContent(e.target.value)}
                        placeholder="e.g., Had a great first-round call with Jane Doe."
                        className="w-full h-24 p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                    />
                  )}
                </div>
                <div>
                  <select
                    value={newActivityType}
                    onChange={e => setNewActivityType(e.target.value as JobActivityType)}
                    className="w-full p-3 mb-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  >
                    <option value="NOTE">Note</option>
                    <option value="SUBMISSION">Submission</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTION">Rejection</option>
                  </select>
                  <button onClick={handleAddActivity} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={16} /> Add Log
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {(job.activity && job.activity.length > 0) ? job.activity.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activityColors[item.type]}`}>
                      {activityIcons[item.type]}
                    </div>
                    {index < job.activity!.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-slate-700 my-1"></div>}
                  </div>
                  <div className="flex-1 pb-6">
                     <div className="flex justify-between items-center">
                       <p className={`text-xs font-bold uppercase tracking-wider ${activityColors[item.type]}`}>{item.type.replace('_', ' ')}</p>
                       <p className="text-xs text-gray-400 dark:text-slate-500">{new Date(item.date).toLocaleString()}</p>
                     </div>
                     <p className="mt-2 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm whitespace-pre-wrap">{item.content}</p>
                  </div>
                </div>
              )) : (
                 <div className="text-center py-20 text-gray-400 dark:text-slate-500">
                    <History size={48} className="mx-auto mb-4 opacity-10" />
                    No activities logged yet.
                 </div>
              )}
            </div>
          </div>
        )}
        
        {/* RESUME TAB */}
        {activeTab === 'RESUME' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Tailored Resume</h3>
                 <p className="text-gray-500 dark:text-slate-400 text-sm">Optimized for ATS and specific job requirements.</p>
              </div>
              <div className="flex gap-2">
                {job.tailoredResume && (
                    <button 
                        onClick={() => handlePrintPDF(job.tailoredResume!, `Resume_${job.company}`)}
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 font-bold shadow-sm transition-colors"
                    >
                        <FileDown size={16} /> Download PDF
                    </button>
                )}
                <button onClick={handleTailorResume} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-md shadow-indigo-200 dark:shadow-none">
                    <Sparkles size={16} /> Generate Tailored Version
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-y-auto">
              {job.tailoredResume ? (
                 <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown components={ResumeMarkdownComponents}>{job.tailoredResume}</ReactMarkdown>
                 </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-600">
                  <FileText size={64} className="mb-6 opacity-10" />
                  <p className="font-medium">No tailored resume generated yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* COVER LETTER TAB */}
        {activeTab === 'COVER_LETTER' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">Cover Letter</h3>
                <p className="text-gray-500 dark:text-slate-400 text-sm">Personalized and enthusiastic.</p>
              </div>
              <div className="flex gap-2">
                {job.coverLetter && (
                    <button 
                        onClick={() => handlePrintPDF(job.coverLetter!, `CoverLetter_${job.company}`)}
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 font-bold shadow-sm transition-colors"
                    >
                        <FileDown size={16} /> Download PDF
                    </button>
                )}
                <button onClick={handleGenerateCover} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-md shadow-indigo-200 dark:shadow-none">
                    <Sparkles size={16} /> Generate Letter
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 p-16 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-y-auto whitespace-pre-wrap text-gray-800 dark:text-slate-300 font-serif leading-8 text-lg">
              {job.coverLetter ? (
                <ReactMarkdown>{job.coverLetter}</ReactMarkdown>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-600 font-sans">
                  <MessageSquare size={64} className="mb-6 opacity-10" />
                  <p className="font-medium">Generate a compelling cover letter for {job.company}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTERVIEW TAB */}
        {activeTab === 'INTERVIEW' && (
          <div className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Interview Preparation</h3>
                 <p className="text-gray-500 dark:text-slate-400 text-sm">Practice questions and STAR method answers.</p>
              </div>
              <button onClick={handleInterviewPrep} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-indigo-700 flex items-center gap-2 font-bold shadow-md shadow-indigo-200 dark:shadow-none">
                <Sparkles size={16} /> Generate Questions
              </button>
            </div>
            <div className="space-y-8 pb-10">
              {job.interviewPrep && job.interviewPrep.length > 0 ? (
                job.interviewPrep.map((qa, idx) => (
                  <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all">
                    <h4 className="font-bold text-gray-800 dark:text-white mb-6 flex gap-4 text-lg items-start">
                      <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-xl px-3 py-1 text-sm h-fit shrink-0 mt-0.5">Q{idx+1}</span>
                      {qa.question}
                    </h4>
                    <div className="pl-6 border-l-2 border-dashed border-gray-200 dark:border-slate-700 space-y-6 ml-4">
                      <div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Suggested Answer</span>
                        <p className="text-gray-700 dark:text-slate-300 text-base leading-relaxed bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">{qa.answer}</p>
                      </div>
                      <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 flex gap-3">
                        <Sparkles size={20} className="text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase block mb-1">Pro Tip</span>
                          <p className="text-amber-900 dark:text-amber-300 text-sm">{qa.tip}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-slate-600">
                  <UserCircle size={64} className="mb-6 opacity-10" />
                  <p className="font-medium">Get personalized interview questions and answer strategies.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceView;