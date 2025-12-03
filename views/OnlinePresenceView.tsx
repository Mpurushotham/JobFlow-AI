
import React, { useState } from 'react';
import { Linkedin, MessageSquare, Sparkles, Send, TrendingUp, Info, Mail } from 'lucide-react'; // Added Mail icon
import { UserProfile, SubscriptionTier, EmailPurpose, LogActionType } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import ReactMarkdown from 'react-markdown';
import { logService } from '../services/logService'; // Corrected import path

interface OnlinePresenceViewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; 
  currentUser: string; 
}

const OnlinePresenceView: React.FC<OnlinePresenceViewProps> = ({ profile, subscriptionTier, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'networking' | 'email_assistant'>('linkedin'); 
  
  // LinkedIn State
  const [linkedInMode, setLinkedInMode] = useState<'headline' | 'about'>('headline');
  const [currentText, setCurrentText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [linkedInLoading, setLinkedInLoading] = useState(false);

  // Networking Message State
  const [scenario, setScenario] = useState('');
  const [recipientInfo, setRecipientInfo] = useState('');
  const [networkingMessage, setNetworkingMessage] = useState('');
  const [networkingLoading, setNetworkingLoading] = useState(false);

  // AI Email Assistant State
  const [emailPurpose, setEmailPurpose] = useState<EmailPurpose | ''>('');
  const [emailContext, setEmailContext] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  const { addNotification } = useNotifications();
  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  const isOffline = !navigator.onLine;

  const handleLinkedInOptimize = async () => {
    if (isOffline) {
      addNotification("Cannot optimize LinkedIn profile: You are offline.", "info");
      logService.log(currentUser, LogActionType.LINKEDIN_OPTIMIZE, 'Blocked LinkedIn optimization: offline.', 'warn');
      return;
    }
    if (!currentText.trim()) {
      addNotification("Please enter your current LinkedIn section text.", 'error');
      logService.log(currentUser, LogActionType.LINKEDIN_OPTIMIZE, 'Blocked LinkedIn optimization: empty input.', 'warn');
      return;
    }
    if (!profile.resumeContent && !profile.structuredResume) {
      addNotification("Please add your master resume in the Profile section for better personalization.", 'info');
      logService.log(currentUser, LogActionType.LINKEDIN_OPTIMIZE, 'Blocked LinkedIn optimization: no resume content.', 'warn');
      return;
    }

    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.LINKEDIN_OPTIMIZE, 'Blocked LinkedIn optimization: AI Pro feature for Free user.', 'warn');
      return;
    }

    setLinkedInLoading(true);
    try {
      const result = await geminiService.optimizeLinkedInProfile(linkedInMode, currentText, profile, currentUser);
      setOptimizedText(result);
      addNotification("LinkedIn section optimized!", 'success');
      logService.log(currentUser, LogActionType.LINKEDIN_OPTIMIZE, `LinkedIn ${linkedInMode} optimized.`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot optimize LinkedIn profile: You are offline.", "info");
      } else {
        addNotification(`Failed to optimize LinkedIn ${linkedInMode}.`, 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `LinkedIn ${linkedInMode} optimization failed: ${e.message}`, 'error');
      }
    } finally {
      setLinkedInLoading(false);
    }
  };

  const handleDraftNetworkingMessage = async () => {
    if (isOffline) {
      addNotification("Cannot draft message: You are offline.", "info");
      logService.log(currentUser, LogActionType.NETWORKING_MESSAGE_DRAFT, 'Blocked networking message draft: offline.', 'warn');
      return;
    }
    if (!scenario.trim() || !recipientInfo.trim()) {
      addNotification("Please provide both scenario and recipient information.", 'error');
      logService.log(currentUser, LogActionType.NETWORKING_MESSAGE_DRAFT, 'Blocked networking message draft: missing scenario/recipient.', 'warn');
      return;
    }

    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.NETWORKING_MESSAGE_DRAFT, 'Blocked networking message draft: AI Pro feature for Free user.', 'warn');
      return;
    }

    setNetworkingLoading(true);
    try {
      const result = await geminiService.draftNetworkingMessage(scenario, recipientInfo, profile, currentUser);
      setNetworkingMessage(result);
      addNotification("Networking message drafted!", 'success');
      logService.log(currentUser, LogActionType.NETWORKING_MESSAGE_DRAFT, `Networking message drafted for scenario: "${scenario.slice(0, 50)}".`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot draft message: You are offline.", "info");
      } else {
        addNotification("Failed to draft networking message.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Networking message draft failed: ${e.message}`, 'error');
      }
    } finally {
      setNetworkingLoading(false);
    }
  };

  const handleComposeEmail = async () => {
    if (isOffline) {
      addNotification("Cannot compose email: You are offline.", "info");
      logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `Blocked email compose for "${emailPurpose}": offline.`, 'warn');
      return;
    }
    if (!emailPurpose || !emailContext.trim()) {
      addNotification("Please select a purpose and provide context for the email.", 'error');
      logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `Blocked email compose for "${emailPurpose}": missing purpose/context.`, 'warn');
      return;
    }

    if (!isAIPro && (emailPurpose !== EmailPurpose.PROFESSIONAL_REWRITE && emailPurpose !== EmailPurpose.SIMPLIFY_EMAIL)) {
      addNotification("This email purpose requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `Blocked email compose for "${emailPurpose}": AI Pro feature for Free user.`, 'warn');
      return;
    }
    const isFreeFeature = emailPurpose === EmailPurpose.PROFESSIONAL_REWRITE || emailPurpose === EmailPurpose.SIMPLIFY_EMAIL;
    if (!isAIPro && !isFreeFeature) {
        addNotification("This email purpose requires an AI Pro subscription. Upgrade to unlock!", 'info');
        logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `Blocked email compose for "${emailPurpose}": AI Pro feature for Free user.`, 'warn');
        return;
    }

    setEmailLoading(true);
    try {
      const result = await geminiService.composeEmail(emailPurpose as EmailPurpose, emailContext, profile, currentUser);
      setGeneratedEmail(result);
      addNotification("Email composed!", 'success');
      logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `Email for purpose "${emailPurpose}" composed.`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot compose email: You are offline.", "info");
      } else {
        addNotification("Failed to compose email. Please try again.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Email compose for purpose "${emailPurpose}" failed: ${e.message}`, 'error');
      }
    } finally {
      setEmailLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-full mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Online Presence Builder</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Optimize your digital professional footprint with AI assistance.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10 overflow-x-auto">
          {[
            { id: 'linkedin', label: 'LinkedIn Optimizer', icon: Linkedin },
            { id: 'networking', label: 'Networking Messages', icon: MessageSquare },
            { id: 'email_assistant', label: 'AI Email Assistant', icon: Mail }, 
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap relative
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}
              `}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/50 overflow-y-auto custom-scrollbar relative p-8">
          {activeTab === 'linkedin' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
              {linkedInLoading && <LoadingOverlay message="Optimizing LinkedIn content..." />}
              {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                  <TrendingUp size={64} className="text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                  <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                    This powerful tool is available with an AI Pro subscription.
                  </p>
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Linkedin size={20} className="text-blue-500" /> LinkedIn Profile Optimizer</h3>
                <div className="flex gap-4 mb-6">
                  <button onClick={() => { setLinkedInMode('headline'); setOptimizedText(''); setCurrentText(''); }} className={`flex-1 py-3 rounded-xl font-bold text-sm ${linkedInMode === 'headline' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>Optimize Headline</button>
                  <button onClick={() => { setLinkedInMode('about'); setOptimizedText(''); setCurrentText(''); }} className={`flex-1 py-3 rounded-xl font-bold text-sm ${linkedInMode === 'about' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-slate-700'}`}>Optimize About</button>
                </div>
                <textarea value={currentText} onChange={e => setCurrentText(e.target.value)} rows={linkedInMode === 'headline' ? 2 : 6} placeholder={`Paste your current LinkedIn ${linkedInMode} here...`} className="w-full p-3 border rounded-xl" />
                <button onClick={handleLinkedInOptimize} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Optimize</button>
                {optimizedText && <div className="mt-8 bg-blue-50 p-6 rounded-2xl"><ReactMarkdown>{optimizedText}</ReactMarkdown></div>}
              </div>
            </div>
          )}
          {activeTab === 'networking' && (
            <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
              {networkingLoading && <LoadingOverlay message="Drafting message..." />}
               {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                  <TrendingUp size={64} className="text-purple-500 mb-4" />
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                  <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                    This powerful tool is available with an AI Pro subscription.
                  </p>
                </div>
              )}
              <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                 <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><MessageSquare size={20} className="text-emerald-500" /> Networking Message Assistant</h3>
                 <textarea value={scenario} onChange={e => setScenario(e.target.value)} rows={4} placeholder="e.g., Connecting with a hiring manager..." className="w-full p-3 border rounded-xl mb-4" />
                 <input value={recipientInfo} onChange={e => setRecipientInfo(e.target.value)} placeholder="e.g., Jane Doe, Senior Recruiter..." className="w-full p-3 border rounded-xl" />
                 <button onClick={handleDraftNetworkingMessage} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Draft Message</button>
                 {networkingMessage && <div className="mt-8 bg-emerald-50 p-6 rounded-2xl"><ReactMarkdown>{networkingMessage}</ReactMarkdown></div>}
              </div>
            </div>
          )}
          {activeTab === 'email_assistant' && (
             <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
              {emailLoading && <LoadingOverlay message="Composing email..." />}
               <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Mail size={20} className="text-purple-500" /> AI Email Assistant</h3>
                  <select value={emailPurpose} onChange={e => setEmailPurpose(e.target.value as EmailPurpose)} className="w-full p-3 border rounded-xl mb-4">
                     <option value="">Select a purpose</option>
                     {Object.values(EmailPurpose).map(p => <option key={p} value={p}>{p}{!isAIPro && p !== EmailPurpose.PROFESSIONAL_REWRITE && p !== EmailPurpose.SIMPLIFY_EMAIL && " (AI Pro)"}</option>)}
                  </select>
                  <textarea value={emailContext} onChange={e => setEmailContext(e.target.value)} rows={6} placeholder="Provide context or your draft..." className="w-full p-3 border rounded-xl" />
                  <button onClick={handleComposeEmail} className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">Compose Email</button>
                  {generatedEmail && <div className="mt-8 bg-purple-50 p-6 rounded-2xl"><ReactMarkdown>{generatedEmail}</ReactMarkdown></div>}
               </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnlinePresenceView;
