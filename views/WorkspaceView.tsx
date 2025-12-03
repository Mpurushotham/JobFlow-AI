

import React, { useState, useEffect } from 'react';
import { ChevronLeft, Building, MapPin, Edit3, ExternalLink, Target, FileText, MessageSquare, UserCircle, Sparkles, CheckCircle, XCircle, FileDown, History, StickyNote, CalendarPlus, Send, Trophy, Paperclip, XOctagon, Plus, RefreshCw, Info, TrendingUp, CalendarDays, BrainCircuit } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Job, JobStatus, UserProfile, JobActivity, JobActivityType, SubscriptionTier, LogActionType, JobSkillAnalysis } from '../types';
import { geminiService } from '../services/geminiService';
import { handlePrintPDF } from '../utils/exportUtils';
import { ResumeMarkdownComponents } from '../utils/resumeMarkdown';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useNotifications } from '../context/NotificationContext';
import { generateGoogleCalendarLink } from '../utils/calendarUtils';
import { logService } from '../services/logService';

interface WorkspaceViewProps {
  job: Job;
  profile: UserProfile;
  onUpdateJob: (updatedJob: Job) => void;
  onBack: () => void;
  subscriptionTier: SubscriptionTier | null;
  currentUser: string;
}


const WorkspaceView: React.FC<WorkspaceViewProps> = ({ 
  job, 
  profile, 
  onUpdateJob, 
  onBack,
  subscriptionTier,
  currentUser 
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACTIVITY' | 'SKILLS' | 'RESUME' | 'COVER_LETTER' | 'INTERVIEW'>('OVERVIEW');
  const [skillAnalysis, setSkillAnalysis] = useState<JobSkillAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('AI Agent is working...');
  
  const { addNotification } = useNotifications();
  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  
  const handleSkillAnalysis = async () => {
    if (!isAIPro) {
        addNotification("This is an AI Pro feature.", "info");
        return;
    }
    setLoading(true);
    setLoadingMessage("Analyzing skills...");
    try {
        const result = await geminiService.analyzeJobSkillsForInterview(job.description, profile, currentUser);
        setSkillAnalysis(result);
        addNotification('Skill analysis complete!', 'success');
        logService.log(currentUser, LogActionType.JOB_SKILL_ANALYSIS, `Skill analysis run for job: ${job.title}`, 'info');
    } catch (e) {
        addNotification('Failed to run skill analysis.', 'error');
    } finally {
        setLoading(false);
    }
  };

  // Other handlers like handleAnalyze, handleTailorResume, etc. would be here...
  // This is a simplified version focusing on the new tab.

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden relative animate-scale-in transition-colors">
      {loading && <LoadingOverlay message={loadingMessage} />}
      
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
        {/* Back button and Job Title */}
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Job Workspace Sections" className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10 overflow-x-auto gap-6 transition-colors">
        {[
          { id: 'OVERVIEW', label: 'Match Analysis', icon: Target },
          { id: 'ACTIVITY', label: 'Activity Log', icon: History },
          { id: 'SKILLS', label: 'Skills Analysis', icon: BrainCircuit },
          { id: 'RESUME', label: 'Tailored Resume', icon: FileText },
          { id: 'COVER_LETTER', label: 'Cover Letter', icon: MessageSquare },
          { id: 'INTERVIEW', label: 'Interview Prep', icon: UserCircle },
        ].map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 translate-y-px' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
            <tab.icon size={18} aria-hidden="true" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/50 dark:bg-slate-900/50 custom-scrollbar transition-colors">
        {/* Other tabs would be here */}
        
        {/* SKILLS ANALYSIS TAB */}
        {activeTab === 'SKILLS' && (
            <div role="tabpanel" id="panel-SKILLS" aria-labelledby="tab-SKILLS" className="h-full flex flex-col max-w-4xl mx-auto animate-fade-in">
                {!isAIPro && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                      <TrendingUp size={64} className="text-purple-500 mb-4" />
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                      <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                          This powerful tool is available with an AI Pro subscription.
                      </p>
                  </div>
                )}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white text-xl">Skills Analysis for Interview</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-sm">Identify key skills to highlight and potential gaps to address for this role.</p>
                    </div>
                    <button onClick={handleSkillAnalysis} disabled={!isAIPro || loading} className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-md shadow-emerald-200 dark:shadow-none transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                        <Sparkles size={16} /> Run Skill Assessment
                    </button>
                </div>

                {skillAnalysis ? (
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2">Key Skills to Highlight</h4>
                            <div className="flex flex-wrap gap-2">
                                {skillAnalysis.keySkills.map(s => <span key={s} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg">{s}</span>)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2">Potential Gaps to Address</h4>
                             <div className="flex flex-wrap gap-2">
                                {skillAnalysis.gaps.map(s => <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg">{s}</span>)}
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-800 dark:text-white mb-2">Suggested Talking Points</h4>
                            <div className="space-y-4">
                                {skillAnalysis.talkingPoints.map((tp, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700">
                                        <p className="font-bold text-sm text-indigo-700 dark:text-indigo-400">{tp.skill}</p>
                                        <p className="text-sm text-gray-700 dark:text-slate-300 mt-1">{tp.point}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-16">
                        <p>Run the assessment to see your personalized skill analysis for this job.</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default WorkspaceView;
