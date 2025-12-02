


import React, { useState } from 'react';
import { Bot, FileHeart, Mic, BrainCircuit, TrendingUp } from 'lucide-react';
import { UserProfile, SubscriptionTier } from '../types';

// Import refactored components
// FIX: Changed to named import since AIChat is not a default export.
import { AIChat } from '../components/AIChat';
import { ResumeGrader } from '../components/ResumeGrader';
// FIX: Changed to named import since MockInterview is not a default export.
import { MockInterview } from '../components/MockInterview';
import SkillDevelopment from '../components/SkillDevelopment'; // New component

interface AICoachViewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
  // FIX: Add currentUser prop
  currentUser: string; 
}

const AICoachView: React.FC<AICoachViewProps> = ({ profile, subscriptionTier, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'GRADER' | 'INTERVIEW' | 'SKILL_DEV' | 'CHAT'>('GRADER');

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;

  const tabs = [
    { id: 'GRADER', label: 'Resume Health Check', icon: FileHeart, requiresPro: false },
    { id: 'INTERVIEW', label: 'Mock Interview', icon: Mic, requiresPro: true },
    { id: 'SKILL_DEV', label: 'Skill Development', icon: BrainCircuit, requiresPro: true }, // New tab
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
           {/* AIChat is always mounted but its content depends on activeTab */}
           <div className={activeTab === 'CHAT' ? '' : 'hidden'}>
             <AIChat profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />
           </div>
           
           {activeTab === 'GRADER' && <ResumeGrader profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}
           {activeTab === 'INTERVIEW' && <MockInterview profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}
           {/* FIX: Added subscriptionTier prop to SkillDevelopment component */}
           {activeTab === 'SKILL_DEV' && <SkillDevelopment profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />}

           {/* Overlay for Free users on Pro tabs */}
           {((activeTab === 'INTERVIEW' || activeTab === 'SKILL_DEV') && !isAIPro) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                <TrendingUp size={64} className="text-purple-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                  This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your career prep!
                </p>
                {/* Could add a button to navigate to pricing here if needed */}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AICoachView;
