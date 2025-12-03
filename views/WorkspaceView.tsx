



import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building, MapPin, Edit3, ExternalLink, Target, FileText, MessageSquare, UserCircle, Sparkles, CheckCircle, XCircle, FileDown, History, StickyNote, CalendarPlus, Send, Trophy, Paperclip, XOctagon, Plus, RefreshCw, Info, TrendingUp, CalendarDays } from 'lucide-react'; // Added CalendarDays for Google Calendar
import ReactMarkdown from 'react-markdown';
import { Job, JobStatus, UserProfile, JobActivity, JobActivityType, SubscriptionTier, LogActionType } from '../types';
import { geminiService } from '../services/geminiService';
import { handlePrintPDF } from '../utils/exportUtils';
import { ResumeMarkdownComponents } from '../utils/resumeMarkdown';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useNotifications } from '../context/NotificationContext';
import { generateGoogleCalendarLink } from '../utils/calendarUtils';
import { logService } from '../services/logService'; // Import logService

interface WorkspaceViewProps {
  job: Job; 
  profile: UserProfile;
  onUpdateJob: (j: Job) => void;
  onBack: () => void;
  subscriptionTier: SubscriptionTier | null; // Destructure subscriptionTier
  currentUser: string; // Add currentUser prop
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


const WorkspaceView: React.FC<WorkspaceViewProps> = ({ 
  job, 
  profile, 
  onUpdateJob, 
  onBack,
  subscriptionTier,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITY' | 'RESUME' | 'COVER_LETTER' | 'INTERVIEW'>('OVERVIEW');
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(job);
  // NEW: State for new activity form fields
  const [newActivityType, setNewActivityType] = useState<JobActivityType>('NOTE');
  const [newActivityContent, setNewActivityContent] = useState('');
  const [interviewStage, setInterviewStage] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  const { addNotification } = useNotifications();

  // Flag for AI Pro features
  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  const isOffline = !navigator.onLine;


  useEffect(() => {
    setEditForm(job);
  }, [job]);

  const handleSaveDetails = () => {
    onUpdateJob(editForm);
    setIsEditing(false);
    addNotification('Job details saved!', 'success');
    logService.log(currentUser, LogActionType.JOB_UPDATE, `Job "${job.title}" details updated.`, 'info');
  };

  const handleAnalyze = async () => {
    if (isOffline) {
      addNotification("Cannot run analysis: You are offline.", "info");
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please add your master resume in the Profile section first.", 'error');
      logService.log(currentUser, LogActionType.JOB_ANALYSIS, `Blocked analysis for "${job.title}" - no resume content.`, 'warn');
      return;
    }
    // Tier check for AI Pro feature
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.JOB_ANALYSIS, `Blocked analysis for "${job.title}" - AI Pro feature for Free user.`, 'warn');
      return;
    }

    setLoading(true);
    try {
      // FIX: Provided all three required arguments (profile.resumeContent, job.title, job.description) to the `geminiService.analyzeJob` function.
      const result = await geminiService.analyzeJob(profile.resumeContent, job.title, job.description, currentUser);
      onUpdateJob({ 
        ...job, 
        matchScore: result.score, 
        analysis: JSON.stringify(result) 
      });
      addNotification('Match analysis complete!', 'success');
      logService.log(currentUser, LogActionType.JOB_ANALYSIS, `Match analysis for "${job.title}" completed with score ${result.score}.`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot analyze job: You are offline.", "info");
      } else {
        addNotification("Analysis failed. Please try again.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Match analysis for "${job.title}" failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTailorResume = async () => {
    if (isOffline) {
      addNotification("Cannot tailor resume: You are offline.", "info");
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please add your master resume in the Profile section first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_TAILOR, `Blocked resume tailoring for "${job.title}" - no resume content.`, 'warn');
      return;
    }
    // Tier check for AI Pro feature
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.RESUME_TAILOR, `Blocked resume tailoring for "${job.title}" - AI Pro feature for Free user.`, 'warn');
      return;
    }

    setLoading(true);
    try {
      // FIX: Incorrect arguments. Pass job.description, profile, and currentUser.
      const tailored = await geminiService.tailorResume(job.description, profile, currentUser);
      onUpdateJob({ ...job, tailoredResume: tailored });
      addNotification('Resume tailored successfully!', 'success');
      logService.log(currentUser, LogActionType.RESUME_TAILOR, `Resume tailored for "${job.title}".`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot tailor resume: You are offline.", "info");
      } else {
        addNotification("Failed to tailor resume.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Resume tailoring for "${job.title}" failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCover = async () => {
    if (isOffline) {
      addNotification("Cannot generate cover letter: You are offline.", "info");
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please add your master resume in the Profile section first.", 'error');
      logService.log(currentUser, LogActionType.COVER_LETTER_GENERATE, `Blocked cover letter generation for "${job.title}" - no resume content.`, 'warn');
      return;
    }
    // Tier check for AI Pro feature
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.COVER_LETTER_GENERATE, `Blocked cover letter generation for "${job.title}" - AI Pro feature for Free user.`, 'warn');
      return;
    }

    setLoading(true);
    try {
      // FIX: Incorrect arguments. Pass job.description, job.company, profile, and currentUser.
      const letter = await geminiService.generateCoverLetter(
        job.description, 
        job.company,
        profile,
        currentUser
      );
      onUpdateJob({ ...job, coverLetter: letter });
      addNotification('Cover letter generated!', 'success');
      logService.log(currentUser, LogActionType.COVER_LETTER_GENERATE, `Cover letter generated for "${job.title}".`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot generate cover letter: You are offline.", "info");
      } else {
        addNotification("Failed to generate cover letter.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Cover letter generation for "${job.title}" failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInterviewPrep = async () => {
    if (isOffline) {
      addNotification("Cannot generate interview prep: You are offline.", "info");
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please add your resume in the Profile section first.", 'error');
      logService.log(currentUser, LogActionType.INTERVIEW_PREP_GENERATE, `Blocked interview prep generation for "${job.title}" - no resume content.`, 'warn');
      return;
    }
    // Tier check for AI Pro feature
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.INTERVIEW_PREP_GENERATE, `Blocked interview prep generation for "${job.title}" - AI Pro feature for Free user.`, 'warn');
      return;
    }

    setLoading(true);
    try {
      // FIX: Incorrect arguments. Pass job.description, profile, and currentUser.
      const prep = await geminiService.generateInterviewPrep(job.description, profile, currentUser);
      onUpdateJob({ ...job, interviewPrep: prep });
      addNotification('Interview prep guide is ready!', 'success');
      logService.log(currentUser, LogActionType.INTERVIEW_PREP_GENERATE, `Interview prep generated for "${job.title}".`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot generate interview prep: You are offline.", "info");
      } else {
        addNotification("Failed to generate interview prep.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Interview prep generation for "${job.title}" failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleStatusChange = (newStatus: JobStatus) => {
    let updatedJob = { ...job, status: newStatus };
    let logMessage = `Job "${job.title}" status changed from ${job.status} to ${newStatus}.`;

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
        logMessage += ' A submission activity was automatically added.';
    }
    onUpdateJob(updatedJob);
    logService.log(currentUser, LogActionType.JOB_UPDATE, logMessage, 'info');
  };

  const handleAddActivity = () => {
    let content = '';
    let activityDate = Date.now();
    let eventTitle = '';
    let eventDescription = '';
    let eventLocation = '';

    if (newActivityType === 'INTERVIEW') {
      if (!interviewStage || !interviewDate) {
        addNotification('Please provide an interview stage and date.', 'error');
        logService.log(currentUser, LogActionType.JOB_UPDATE, 'Attempted to add interview activity with missing details.', 'warn');
        return;
      }
      activityDate = new Date(interviewDate).getTime();
      content = `Stage: ${interviewStage}\nNotes: ${interviewNotes || 'No notes provided.'}`;
      eventTitle = `${job.title} Interview - ${interviewStage}`;
      eventDescription = `Company: ${job.company}\n${content}\nJob Link: ${job.url || 'N/A'}`;
      eventLocation = `${job.city || ''}${job.city && job.country ? ', ' : ''}${job.country || ''}`;
    } else {
      if (!newActivityContent.trim()) {
        addNotification('Please enter some content for the activity.', 'error');
        logService.log(currentUser, LogActionType.JOB_UPDATE, 'Attempted to add activity with empty content.', 'warn');
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
    logService.log(currentUser, LogActionType.JOB_UPDATE, `Activity type "${newActivityType}" logged for job "${job.title}".`, 'info');
    
    // If it's an interview, generate Google Calendar link
    if (newActivityType === 'INTERVIEW') {
      const calendarLink = generateGoogleCalendarLink({
        title: eventTitle,
        startTime: activityDate,
        description: eventDescription,
        location: eventLocation,
      });
      window.open(calendarLink, '_blank', 'noopener,noreferrer');
      logService.log(currentUser, LogActionType.JOB_UPDATE, `Google Calendar link generated for interview activity for job "${job.title}".`, 'info');
    }

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
          <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors" aria-label="Back to jobs board">
            <ChevronLeft className="text-gray-500 dark:text-slate-400" />
          </button>
          <div className="flex flex-col">
            {isEditing ? (
               <input 
                 value={editForm.title} 
                 onChange={e => setEditForm({...editForm, title: e.target.value})}
                 className="text-xl font-bold border rounded p-1 mb-1 text-gray-900 dark:text-white bg-white dark:bg-slate-900"
                 aria-label="Job title"
               />
            ) : (
               <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{job.title}</h2>
            )}
            
            <div className="flex items-center text-gray-500 dark:text-slate-400 space-x-3 mt-1 text-sm">
              <span className="flex items-center gap-1 font-medium"><Building size={14} aria-hidden="true" /> {job.company}</span>
              {(job.city || job.country) && <><span className="text-gray-300" aria-hidden="true">•</span> <span className="flex items-center gap-1"><MapPin size={14} aria-hidden="true" /> {job.city}{job.city && job.country ? ', ' : ''}{job.country}</span></>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!isEditing ? (
             <button onClick={() => setIsEditing(true)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title="Edit Details" aria-label="Edit job details">
               <Edit3 size={18} />
             </button>
          ) : (
             <div className="flex gap-2">
                 <button onClick={() => { setIsEditing(false); setEditForm(job); }} className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors" aria-label="Cancel editing">Cancel</button>
                 <button onClick={handleSaveDetails} className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors" aria-label="Save job details">Save</button>
             </div>
          )}

          {job.url && (
            <a 
              href={job.url} 
              target="_blank" 
              rel="noreferrer"
              className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-2 transition-colors"
              aria-label="Apply to job"
            >
              Apply <ExternalLink size={14} />
            </a>
          )}
          <div className="h-8 w-px bg-gray-200 dark:bg-slate-700 mx-1 hidden md:block" aria-hidden="true"></div>
          <select 
            value={job.status}
            onChange={(e) => handleStatusChange(e.target.value as JobStatus)}
            className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 outline-none font-bold cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Job status"
          >
            {Object.values(JobStatus).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Extended Details for Editing */}
      {isEditing && (
        <div className="p-6 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 transition-colors">
           <div>
             <label htmlFor="edit-source" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Source</label>
             <input id="edit-source" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.source || ''} onChange={e => setEditForm({...editForm, source: e.target.value})} placeholder="e.g. LinkedIn" aria-label="Job source" />
           </div>
           <div>
             <label htmlFor="edit-city" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">City</label>
             <input id="edit-city" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} placeholder="e.g. New York" aria-label="Job city" />
           </div>
           <div>
             <label htmlFor="edit-country" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Country</label>
             <input id="edit-country" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.country || ''} onChange={e => setEditForm({...editForm, country: e.target.value})} placeholder="e.g. USA" aria-label="Job country" />
           </div>
           <div>
             <label htmlFor="edit-deadline" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Deadline</label>
             <input id="edit-deadline" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" type="date" value={editForm.applicationDeadline || ''} onChange={e => setEditForm({...editForm, applicationDeadline: e.target.value})} aria-label="Application deadline" />
           </div>
           <div>
             <label htmlFor="edit-availability" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Availability</label>
             <input id="edit-availability" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.availability || ''} onChange={e => setEditForm({...editForm, availability: e.target.value})} placeholder="e.g. Immediate" aria-label="Job availability" />
           </div>
           <div className="flex items-center pt-5">
             <label htmlFor="edit-relocation" className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" id="edit-relocation" checked={!!editForm.relocation} onChange={e => setEditForm({...editForm, relocation: e.target.checked})} className="w-4 h-4" aria-label="Relocation required or available" />
                <span className="text-sm font-bold text-gray-700 dark:text-slate-300">Relocation?</span>
             </label>
           </div>
           <div className="md:col-span-2">
             <label htmlFor="edit-comments" className="text-xs font-bold text-gray-500 dark:text-slate-400 block mb-1">Comments</label>
             <input id="edit-comments" className="w-full p-2 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" value={editForm.comments || ''} onChange={e => setEditForm({...editForm, comments: e.target.value})} placeholder="Notes..." aria-label="Job comments" />
           </div>
        </div>
      )}

      {/* Tabs */}
      <div role="tablist" aria-label="Job Workspace Sections" className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10 overflow-x-auto gap-6 transition-colors">
        {[
          { id: 'OVERVIEW', label: 'Match Analysis', icon: Target },
          { id: 'ACTIVITY', label: 'Activity Log', icon: History },
          { id: 'RESUME', label: 'Tailored Resume', icon: FileText },
          { id: 'COVER_LETTER', label: 'Cover Letter', icon: MessageSquare },
          { id: 'INTERVIEW', label: 'Interview Prep', icon: UserCircle },
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 translate-y-px' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/50 custom-scrollbar transition-colors">
        {activeTab === 'OVERVIEW' && (
          <div role="tabpanel" id="panel-OVERVIEW" aria-labelledby="tab-OVERVIEW" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  <button 
                    onClick={handleAnalyze} 
                    className={`text-xs px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-1
                      ${(!profile.resumeContent || !isAIPro || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                        'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                      }`}
                    title={isOffline ? "Requires internet connection" : !profile.resumeContent ? "Add your master resume in Profile to use this feature" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                    disabled={!profile.resumeContent || !isAIPro || isOffline}
                    aria-label={analysisData ? "Re-run match analysis" : "Run match analysis"}
                  >
                    <Sparkles size={16} /> {analysisData ? 'Re-Analyze' : 'Run Analysis'}
                  </button>
                </div>
                
                {analysisData ? (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-center py-4" role="meter" aria-valuenow={analysisData.score} aria-valuemin={0} aria-valuemax={100} aria-label="Job Match Score">
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
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><XCircle size={14} className="text-red-400" aria-hidden="true"/> Missing Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysisData.missingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500" aria-hidden="true"/> Matching Skills</h4>
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
                    <Target size={48} className="mx-auto mb-4 opacity-20" aria-hidden="true" />
                    <p>Run analysis to see how well your resume matches this job.</p>
                    {!isAIPro && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-3 flex items-center justify-center gap-1" role="alert">
                        <Info size={16} aria-hidden="true"/> AI Pro feature. Upgrade to unlock this analysis.
                      </p>
                    )}
                    {isOffline && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-3 flex items-center justify-center gap-1" role="alert">
                        <Info size={16} aria-hidden="true"/> Offline: This feature requires an internet connection.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'ACTIVITY' && (
          <div role="tabpanel" id="panel-ACTIVITY" aria-labelledby="tab-ACTIVITY" className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6">
              <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-4">Add New Activity</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  {newActivityType === 'INTERVIEW' ? (
                     <div className="space-y-3">
                        <label htmlFor="interview-stage" className="sr-only">Interview Stage</label>
                        <input type="text" id="interview-stage" value={interviewStage} onChange={e => setInterviewStage(e.target.value)} placeholder="Stage (e.g., Phone Screen)" className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white" aria-label="Interview stage" />
                        <label htmlFor="interview-date" className="sr-only">Interview Date and Time</label>
                        <input type="datetime-local" id="interview-date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white" aria-label="Interview date and time" />
                        <label htmlFor="interview-notes" className="sr-only">Interview Notes</label>
                        <textarea id="interview-notes" value={interviewNotes} onChange={e => setInterviewNotes(e.target.value)} placeholder="Notes, participants, link..." className="w-full h-24 p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none" aria-label="Interview notes" />
                     </div>
                  ) : (
                    <textarea 
                        value={newActivityContent}
                        onChange={e => setNewActivityContent(e.target.value)}
                        placeholder="e.g., Had a great first-round call with Jane Doe."
                        className="w-full h-24 p-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white resize-none"
                        aria-label="Activity content"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="activity-type" className="sr-only">Activity Type</label>
                  <select
                    id="activity-type"
                    value={newActivityType}
                    onChange={e => setNewActivityType(e.target.value as JobActivityType)}
                    className="w-full p-3 mb-3 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                    aria-label="Select activity type"
                  >
                    <option value="NOTE">Note</option>
                    <option value="SUBMISSION">Submission</option>
                    <option value="INTERVIEW">Interview</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="OFFER">Offer</option>
                    <option value="REJECTION">Rejection</option>
                  </select>
                  <button onClick={handleAddActivity} className="w-full bg-indigo-600 text-white p-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2" aria-label="Add activity log">
                    <Plus size={16} /> Add Log
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {(job.activity && job.activity.length > 0) ? job.activity.map((item, index) => (
                <div key={item.id} className="flex gap-4">
                  <div className="flex flex-col items-center" aria-hidden="true">
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
                     {item.type === 'INTERVIEW' && (
                        <button 
                          onClick={() => {
                            const eventTitle = `${job.title} Interview - Stage: ${item.content.split('\n')[0].replace('Stage: ', '')}`;
                            const eventDescription = `Company: ${job.company}\n${item.content}\nJob Link: ${job.url || 'N/A'}`;
                            const eventLocation = `${job.city || ''}${job.city && job.country ? ', ' : ''}${job.country || ''}`;
                            const calendarLink = generateGoogleCalendarLink({
                                title: eventTitle,
                                startTime: item.date,
                                description: eventDescription,
                                location: eventLocation,
                            });
                            window.open(calendarLink, '_blank', 'noopener,noreferrer');
                          }}
                          className="mt-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50 flex items-center gap-2 transition-colors w-fit"
                          aria-label="Add interview to Google Calendar"
                        >
                          <CalendarDays size={16} /> Add to Google Calendar
                        </button>
                     )}
                  </div>
                </div>
              )) : (
                 <div className="text-center py-20 text-gray-400 dark:text-slate-500">
                    <History size={48} className="mx-auto mb-4 opacity-10" aria-hidden="true" />
                    No activities logged yet.
                 </div>
              )}
            </div>
          </div>
        )}
        
        {/* RESUME TAB */}
        {activeTab === 'RESUME' && (
          <div role="tabpanel" id="panel-RESUME" aria-labelledby="tab-RESUME" className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Tailored Resume</h3>
                 <p className="text-gray-500 dark:text-slate-400 text-sm flex items-center gap-1">
                  Optimized for ATS and specific job requirements.
                  <span 
                    title="Your master resume (from Profile) is used as a base. Ensure it's up-to-date for best tailoring results."
                    className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help"
                    aria-label="Information about tailored resume generation"
                  >
                    <Info size={16} />
                  </span>
                 </p>
              </div>
              <div className="flex gap-2">
                {job.tailoredResume && (
                    <button 
                        onClick={() => handlePrintPDF(job.tailoredResume!, `Resume_${job.company}`)}
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 font-bold shadow-sm transition-colors"
                        aria-label="Download tailored resume as PDF"
                    >
                        <FileDown size={16} /> Download PDF
                    </button>
                )}
                <button 
                  onClick={handleTailorResume} 
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none transition-colors
                    ${(!profile.resumeContent || !isAIPro || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                      'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  title={isOffline ? "Requires internet connection" : !profile.resumeContent ? "Add your master resume in Profile to use this feature" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                  disabled={!profile.resumeContent || !isAIPro || isOffline}
                  aria-label={job.tailoredResume ? "Re-tailor resume" : "Tailor resume"}
                >
                  <Sparkles size={16} /> {job.tailoredResume ? 'Re-Tailor' : 'Tailor Resume'}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
              {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-2xl">
                  <TrendingUp size={48} className="text-purple-500 mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                  <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock resume tailoring.</p>
                </div>
              )}
              <div className="p-6 h-full overflow-y-auto custom-scrollbar">
                {job.tailoredResume ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown components={ResumeMarkdownComponents}>{job.tailoredResume}</ReactMarkdown>
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-400 dark:text-slate-600 text-sm h-full flex flex-col justify-center items-center">
                    <FileText size={48} className="mx-auto mb-4 opacity-20" aria-hidden="true" />
                    <p>No tailored resume yet. Click "Tailor Resume" to create one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* COVER LETTER TAB */}
        {/* FIX: Corrected activeTab comparison from 'COVER' to 'COVER_LETTER' */}
        {activeTab === 'COVER_LETTER' && (
          <div role="tabpanel" id="panel-COVER_LETTER" aria-labelledby="tab-COVER_LETTER" className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Cover Letter</h3>
                 <p className="text-gray-500 dark:text-slate-400 text-sm flex items-center gap-1">
                  Custom-crafted for this specific job application.
                  <span 
                    title="Your master resume (from Profile) is used as a base. Ensure it's up-to-date for best results."
                    className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help"
                    aria-label="Information about cover letter generation"
                  >
                    <Info size={16} />
                  </span>
                 </p>
              </div>
              <div className="flex gap-2">
                {job.coverLetter && (
                    <button 
                        onClick={() => handlePrintPDF(job.coverLetter!, `CoverLetter_${job.company}`)}
                        className="bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 font-bold shadow-sm transition-colors"
                        aria-label="Download cover letter as PDF"
                    >
                        <FileDown size={16} /> Download PDF
                    </button>
                )}
                <button 
                  onClick={handleGenerateCover} 
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-purple-200 dark:shadow-none transition-colors
                    ${(!profile.resumeContent || !isAIPro || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                      'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  title={isOffline ? "Requires internet connection" : !profile.resumeContent ? "Add your master resume in Profile to use this feature" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                  disabled={!profile.resumeContent || !isAIPro || isOffline}
                  aria-label={job.coverLetter ? "Re-generate cover letter" : "Generate cover letter"}
                >
                  <Sparkles size={16} /> {job.coverLetter ? 'Re-Generate' : 'Generate Letter'}
                </button>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
              {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-2xl">
                  <TrendingUp size={48} className="text-purple-500 mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                  <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock cover letter generation.</p>
                </div>
              )}
              <div className="p-6 h-full overflow-y-auto custom-scrollbar prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300">
                {job.coverLetter ? (
                  <ReactMarkdown>{job.coverLetter}</ReactMarkdown>
                ) : (
                  <div className="text-center py-20 text-gray-400 dark:text-slate-600 text-sm h-full flex flex-col justify-center items-center">
                    <MessageSquare size={48} className="mx-auto mb-4 opacity-20" aria-hidden="true" />
                    <p>No cover letter yet. Click "Generate Letter" to create one.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* INTERVIEW PREP TAB */}
        {activeTab === 'INTERVIEW' && (
          <div role="tabpanel" id="panel-INTERVIEW" aria-labelledby="tab-INTERVIEW" className="h-full flex flex-col max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                 <h3 className="font-bold text-gray-800 dark:text-white text-lg">Interview Preparation</h3>
                 <p className="text-gray-500 dark:text-slate-400 text-sm flex items-center gap-1">
                  Tailored questions and insights to help you ace the interview.
                  <span 
                    title="Generate common and behavioral interview questions based on the job description and your master resume."
                    className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help"
                    aria-label="Information about interview preparation"
                  >
                    <Info size={16} />
                  </span>
                 </p>
              </div>
              <button 
                onClick={handleInterviewPrep} 
                className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-200 dark:shadow-none transition-colors
                  ${(!profile.resumeContent || !isAIPro || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                    'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                title={isOffline ? "Requires internet connection" : !profile.resumeContent ? "Add your master resume in Profile to use this feature" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                disabled={!profile.resumeContent || !isAIPro || isOffline}
                aria-label={job.interviewPrep && job.interviewPrep.length > 0 ? "Re-generate interview prep" : "Generate interview prep"}
              >
                <Sparkles size={16} /> {job.interviewPrep && job.interviewPrep.length > 0 ? 'Re-Generate' : 'Generate Prep'}
              </button>
            </div>
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden relative">
              {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-2xl">
                  <TrendingUp size={48} className="text-purple-500 mb-4" aria-hidden="true" />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                  <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock interview prep generation.</p>
                </div>
              )}
              <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">
                {(job.interviewPrep && job.interviewPrep.length > 0) ? job.interviewPrep.map((qa, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-900/50 p-5 rounded-xl border border-gray-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Question {index + 1}</p>
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-3 leading-relaxed">{qa.question}</h4>
                    <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Suggested Answer</p>
                      <p className="text-gray-700 dark:text-slate-300 text-sm leading-relaxed">{qa.answer}</p>
                    </div>
                    <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-3">
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Tip</p>
                      <p className="text-gray-700 dark:text-slate-300 text-sm italic leading-relaxed">{qa.tip}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-20 text-gray-400 dark:text-slate-600 text-sm h-full flex flex-col justify-center items-center">
                    <UserCircle size={48} className="mx-auto mb-4 opacity-20" aria-hidden="true" />
                    <p>No interview prep generated. Click "Generate Prep" to get started.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceView;