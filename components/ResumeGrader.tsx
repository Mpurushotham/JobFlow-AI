


import React, { useState, useRef } from 'react';
import { Sparkles, FileHeart, CheckCircle, XCircle, RefreshCcw, Info, TrendingUp } from 'lucide-react';
import { UserProfile, ResumeGrade, SubscriptionTier, EmailPurpose } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { geminiService } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';

interface ResumeGraderProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
  // FIX: Add currentUser prop
  currentUser: string; 
}

// FIX: Changed to a named export.
export const ResumeGrader: React.FC<ResumeGraderProps> = ({ profile, subscriptionTier, currentUser }) => {
    const [grade, setGrade] = useState<ResumeGrade | null>(null);
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifications();

    const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
    const freeTierGradeLimit = 1; // Max analyses for free users per session
    const gradeCountRef = useRef(0); // Track grade count for free users

    const handleGrade = async () => {
        if (!navigator.onLine) {
            addNotification("Cannot perform Resume Health Check: You are offline.", "info");
            return;
        }
        if (!profile.resumeContent) {
            addNotification("Please add your master resume in the Profile section first.", 'error');
            return;
        }

        if (!isAIPro) {
          if (gradeCountRef.current >= freeTierGradeLimit) {
            addNotification(`Free tier limit reached for Resume Health Check (${freeTierGradeLimit} per session). Upgrade to AI Pro for unlimited checks!`, 'info');
            return;
          }
          addNotification(`Free tier check: ${gradeCountRef.current + 1}/${freeTierGradeLimit}`, 'info');
        }

        setLoading(true);
        try {
            // FIX: Pass currentUser to geminiService.gradeResume
            const result = await geminiService.gradeResume(profile.resumeContent, currentUser);
            setGrade(result);
            addNotification("Resume analysis complete!", "success");
            if (!isAIPro) {
              gradeCountRef.current += 1; // Increment count only on success
            }
        } catch (e: any) {
            if (e.message === 'RATE_LIMIT_EXCEEDED') {
              addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
            } else if (e.message === 'OFFLINE') {
                addNotification("Cannot grade resume: You are offline.", "info");
            } else {
              addNotification("Failed to grade resume. Please try again.", 'error');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const GradePill: React.FC<{ pass: boolean, label: string }> = ({ pass, label }) => (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${pass ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
            {pass ? <CheckCircle size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />} {label}
        </span>
    );

    const isFreeTierLimitReached = !isAIPro && gradeCountRef.current >= freeTierGradeLimit;
    const isOffline = !navigator.onLine;
    
    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            {loading && <LoadingOverlay message="Grading your resume..." />}
            {!grade ? (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <FileHeart size={64} className="text-gray-300 dark:text-slate-600 mb-6" aria-hidden="true" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Resume Health Check</h3>
                    <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-md">Get an AI-powered analysis of your master resume. We'll check for ATS compatibility, clarity, action verbs, and quantifiable results.</p>
                    <button 
                      onClick={handleGrade} 
                      className={`mt-8 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-colors
                        ${(isFreeTierLimitReached || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                          'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      disabled={isFreeTierLimitReached || isOffline}
                      aria-label="Analyze My Resume"
                      title={isOffline ? "Requires internet connection" : isFreeTierLimitReached ? `Free tier limit reached for Resume Health Check (${freeTierGradeLimit} per session). Upgrade to AI Pro for unlimited checks!` : ""}
                    >
                      <Sparkles size={18} aria-hidden="true" /> Analyze My Resume
                    </button>
                    {isFreeTierLimitReached && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-3 flex items-center justify-center gap-1" role="alert">
                        <Info size={16} aria-hidden="true"/> Free tier limit reached. Upgrade to AI Pro for unlimited checks.
                      </p>
                    )}
                    {isOffline && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-3 flex items-center justify-center gap-1" role="alert">
                        <Info size={16} aria-hidden="true"/> Offline: This feature requires an internet connection.
                      </p>
                    )}
                </div>
            ) : (
                <div className="max-w-3xl mx-auto animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="relative h-40 w-40 mx-auto flex items-center justify-center" role="meter" aria-valuenow={grade.score} aria-valuemin={0} aria-valuemax={100} aria-label={`Resume Health Score: ${grade.score}%`}>
                            <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36"><path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" /><path className={`${grade.score >= 85 ? 'text-green-500' : grade.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${grade.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            <div className="absolute"><span className="text-4xl font-bold text-gray-800 dark:text-white">{grade.score}</span><span className="text-2xl text-gray-800 dark:text-white">%</span></div>
                        </div>
                        <p className="mt-4 text-gray-600 dark:text-slate-300 italic">"{grade.summary}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <GradePill pass={grade.atsFriendly.pass} label="ATS Friendly" />
                        <GradePill pass={grade.actionVerbs.pass} label="Strong Verbs" />
                        <GradePill pass={grade.quantifiableMetrics.pass} label="Impact Metrics" />
                        <GradePill pass={grade.clarity.pass} label="Clarity" />
                    </div>
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">ATS Compatibility</h4><p className="text-sm text-gray-700 dark:text-slate-300">{grade.atsFriendly.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">Action Verbs</h4><p className="text-sm text-gray-700 dark:text-slate-300">{grade.actionVerbs.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">Quantifiable Metrics</h4><p className="text-sm text-gray-700 dark:text-slate-300">{grade.quantifiableMetrics.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm text-gray-800 dark:text-white mb-1">Clarity & Conciseness</h4><p className="text-sm text-gray-700 dark:text-slate-300">{grade.clarity.feedback}</p></div>
                    </div>
                    <button 
                      onClick={handleGrade} 
                      className={`mt-8 w-full py-3 rounded-lg flex items-center justify-center gap-2
                        ${(isFreeTierLimitReached || isOffline) ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed' :
                          'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 font-bold'
                        }`}
                      disabled={isFreeTierLimitReached || isOffline}
                      aria-label="Re-analyze resume"
                      title={isOffline ? "Requires internet connection" : isFreeTierLimitReached ? `Free tier limit reached for Resume Health Check (${freeTierGradeLimit} per session). Upgrade to AI Pro for unlimited checks.` : ""}
                    >
                      <RefreshCcw size={16} aria-hidden="true" /> Re-analyze
                    </button>
                    {isFreeTierLimitReached && (
                      <p className="text-sm text-red-500 dark:text-red-400 mt-3 flex items-center justify-center gap-1" role="alert">
                        <Info size={16} aria-hidden="true"/> Free tier limit reached. Upgrade to AI Pro for unlimited checks.
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
    );
};