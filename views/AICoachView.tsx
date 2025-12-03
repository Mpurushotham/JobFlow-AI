

import React, { useState, useEffect } from 'react';
import { Bot, FileHeart, Mic, BrainCircuit, TrendingUp, Lightbulb } from 'lucide-react';
import { UserProfile, SubscriptionTier, InterviewTips } from '../types';
import { AIChat } from '../components/AIChat';
import { ResumeGrader } from '../components/ResumeGrader';
import { MockInterview } from '../components/MockInterview';
import SkillDevelopment from '../components/SkillDevelopment';
import { geminiService } from '../services/geminiService';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { useNotifications } from '../context/NotificationContext';

interface AICoachViewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null;
  currentUser: string; 
}

const InterviewTipsTab: React.FC<{ currentUser: string, isAIPro: boolean | null }> = ({ currentUser, isAIPro }) => {
    const [tips, setTips] = useState<InterviewTips | null>(null);
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifications();
    const isOffline = !navigator.onLine;

    const fetchTips = async () => {
        if (isOffline) {
            addNotification("Cannot fetch tips: You are offline.", "info");
            return;
        }
        if (!isAIPro) {
            addNotification("This is an AI Pro feature.", "info");
            return;
        }
        setLoading(true);
        try {
            const result = await geminiService.generateInterviewTips(currentUser);
            setTips(result);
        } catch (e) {
            addNotification("Failed to fetch interview tips.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(isAIPro && !tips) { // Fetch only if pro and tips are not already loaded
            fetchTips();
        }
    }, [isAIPro]);

    if (!isAIPro) return null;

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            {loading && <LoadingOverlay message="Generating interview tips..." />}
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Before & After Interview Smart Tips</h3>
                <button onClick={fetchTips} className="px-4 py-2 text-sm font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg">Re-generate</button>
            </div>
            
            {tips ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Before Your Interview</h4>
                        <ul className="space-y-3 list-disc list-inside text-gray-700 dark:text-slate-300">
                            {tips.before.map((tip, i) => <li key={`before-${i}`}>{tip}</li>)}
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">After Your Interview</h4>
                        <ul className="space-y-3 list-disc list-inside text-gray-700 dark:text-slate-300">
                            {tips.after.map((tip, i) => <li key={`after-${i}`}>{tip}</li>)}
                        </ul>
                    </div>
                </div>
            ) : (
                <p>Click the button to generate tips.</p>
            )}
        </div>
    );
};

const AICoachView: React.FC<AICoachViewProps> = ({ profile, subscriptionTier, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'GRADER' | 'INTERVIEW' | 'SKILL_DEV' | 'TIPS' | 'CHAT'>('GRADER');

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;

  const tabs = [
    { id: 'GRADER', label: 'Resume Health Check', icon: FileHeart, requiresPro: false },
    { id: 'INTERVIEW', label: 'Mock Interview', icon: Mic, requiresPro: true },
    { id: 'SKILL_DEV', label: 'Skill Development', icon: BrainCircuit, requiresPro: true },
    { id: 'TIPS', label: 'Interview Tips', icon: Lightbulb, requiresPro: true },
    { id: 'CHAT', label: 'AI Chat', icon: Bot, requiresPro: false },
  ];

  return (
    <div className="flex flex-col h-full max-w-full mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">AI Coach</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Your personal suite of career preparation tools.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10 overflow-x-auto">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap relative
                      ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}
                    `}
                    disabled={tab.requiresPro && !isAIPro}
                >
                    <tab.icon size={16} /> {tab.label}
                    {tab.requiresPro && !isAIPro && (
                      <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1">
                        <TrendingUp size={10}/> Pro
                      </span>
                    )}
                </button>
            ))}
        </div>
        
        <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden relative">
           <div className={activeTab === 'CHAT' ? '' : 'hidden'}>
             <AIChat profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />
           </div>
           
           {activeTab === 'GRADER' && <ResumeGrader profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}
           {activeTab === 'INTERVIEW' && <MockInterview profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}
           {activeTab === 'SKILL_DEV' && <SkillDevelopment profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}
           {activeTab === 'TIPS' && <InterviewTipsTab currentUser={currentUser} isAIPro={isAIPro} />}

           {/* Overlay for Free users on Pro tabs */}
           {((activeTab === 'INTERVIEW' || activeTab === 'SKILL_DEV' || activeTab === 'TIPS') && !isAIPro) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                <TrendingUp size={64} className="text-purple-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                  This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your career prep!
                </p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AICoachView;
