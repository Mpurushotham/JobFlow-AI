

import React, { useState } from 'react';
import { Linkedin, MessageSquare, Sparkles, Send, TrendingUp, Info, Mail } from 'lucide-react'; // Added Mail icon
import { UserProfile, SubscriptionTier, EmailPurpose } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import ReactMarkdown from 'react-markdown';

interface OnlinePresenceViewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
}

const OnlinePresenceView: React.FC<OnlinePresenceViewProps> = ({ profile, subscriptionTier }) => {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'networking' | 'email_assistant'>('linkedin'); // Added email_assistant
  
  // LinkedIn State
  const [linkedInMode, setLinkedInMode] = useState<'headline' | 'about'>('headline');
  const [currentText, setCurrentText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [loadingLinkedIn, setLoadingLinkedIn] = useState(false);

  // Networking State
  const [scenario, setScenario] = useState('');
  const [recipient, setRecipient] = useState('');
  const [draftedMessage, setDraftedMessage] = useState('');
  const [loadingNetworking, setLoadingNetworking] = useState(false);

  // Email Assistant State
  const [emailPurpose, setEmailPurpose] = useState<EmailPurpose | ''>('');
  const [emailContext, setEmailContext] = useState('');
  const [generatedEmail, setGeneratedEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  const { addNotification } = useNotifications();

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;

  const handleOptimizeLinkedIn = async () => {
    if (!profile.resumeContent) {
      addNotification("Please add your master resume in Profile first.", 'error');
      return;
    }
    // Tier check
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoadingLinkedIn(true);
    setOptimizedText('');
    try {
      const result = await geminiService.optimizeLinkedInProfile(linkedInMode, currentText, profile);
      setOptimizedText(result);
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification(`Failed to optimize LinkedIn ${linkedInMode}.`, 'error');
      }
    } finally {
      setLoadingLinkedIn(false);
    }
  };

  const handleDraftMessage = async () => {
    if (!scenario || !recipient) {
      addNotification("Please provide a scenario and recipient info.", 'error');
      return;
    }
    // Tier check
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoadingNetworking(true);
    setDraftedMessage('');
    try {
      const result = await geminiService.draftNetworkingMessage(scenario, recipient, profile);
      setDraftedMessage(result);
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to draft networking message.", 'error');
      }
    } finally {
      setLoadingNetworking(false);
    }
  };

  const handleGenerateEmail = async () => {
    if (!emailPurpose || !emailContext.trim()) {
      addNotification("Please select an email purpose and provide context.", 'error');
      return;
    }
    // Tier check
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoadingEmail(true);
    setGeneratedEmail('');
    try {
      const result = await geminiService.composeEmail(emailPurpose as EmailPurpose, emailContext, profile);
      setGeneratedEmail(result);
      addNotification("Email drafted successfully!", "success");
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to draft email. Please try again.", 'error');
      }
    } finally {
      setLoadingEmail(false);
    }
  };


  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto animate-fade-in">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Online Presence Optimizer</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Craft a compelling professional brand that gets you noticed.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 self-center flex gap-2">
            <button onClick={() => setActiveTab('linkedin')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 relative
              ${activeTab === 'linkedin' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}
            `}>
                <Linkedin size={16} /> LinkedIn Optimizer
                {!isAIPro && <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><TrendingUp size={10}/> Pro</span>}
            </button>
            <button onClick={() => setActiveTab('networking')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 relative
              ${activeTab === 'networking' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}
            `}>
                <MessageSquare size={16} /> Networking Assistant
                {!isAIPro && <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><TrendingUp size={10}/> Pro</span>}
            </button>
            <button onClick={() => setActiveTab('email_assistant')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 relative
              ${activeTab === 'email_assistant' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}
            `}>
                <Mail size={16} /> Email Assistant
                {!isAIPro && <span className="absolute -top-1 -right-2 bg-purple-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><TrendingUp size={10}/> Pro</span>}
            </button>
        </div>

        {activeTab === 'linkedin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                {/* Input Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col relative">
                    {loadingLinkedIn && <LoadingOverlay message="Optimizing..." />}
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                        <TrendingUp size={48} className="text-purple-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock LinkedIn optimization tools.</p>
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-4">Optimize Your Profile</h3>
                    <div className="flex bg-gray-100 dark:bg-slate-700 p-1 rounded-lg mb-4">
                        <button onClick={() => setLinkedInMode('headline')} className={`flex-1 p-2 text-sm rounded-md font-bold ${linkedInMode === 'headline' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}>Headline</button>
                        <button onClick={() => setLinkedInMode('about')} className={`flex-1 p-2 text-sm rounded-md font-bold ${linkedInMode === 'about' ? 'bg-white dark:bg-slate-800 shadow' : ''}`}>About Section</button>
                    </div>
                    <textarea 
                        value={currentText}
                        onChange={e => setCurrentText(e.target.value)}
                        placeholder={`Paste your current LinkedIn ${linkedInMode} here...`}
                        className="w-full flex-1 p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 resize-none custom-scrollbar focus:ring-2 focus:ring-indigo-500 outline-none"
                        disabled={!isAIPro}
                    />
                    <button onClick={handleOptimizeLinkedIn} disabled={loadingLinkedIn || !isAIPro} className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles size={18} /> Optimize
                    </button>
                </div>
                {/* Output Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                         {/* This overlay is handled by the parent overlay */}
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-4">AI-Powered Suggestion</h3>
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl h-full border border-gray-100 dark:border-slate-700">
                        {/* FIX: Wrap ReactMarkdown in a div and apply className to the div. */}
                        {optimizedText ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{optimizedText}</ReactMarkdown></div> : <p className="text-gray-400 text-center self-center pt-24">Your optimized text will appear here...</p>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'networking' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                {/* Input Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4 relative">
                    {loadingNetworking && <LoadingOverlay message="Drafting..." />}
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                        <TrendingUp size={48} className="text-purple-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock networking assistant tools.</p>
                      </div>
                    )}
                    <h3 className="text-xl font-bold">Draft a Networking Message</h3>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Scenario</label>
                        <input type="text" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="e.g., Contacting recruiter after applying" className="mt-1 w-full p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700" disabled={!isAIPro}/>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Recipient Info</label>
                        <textarea 
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            placeholder="e.g., Jane Doe, Senior Recruiter at TechCorp"
                            className="mt-1 w-full flex-1 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 resize-none custom-scrollbar"
                            disabled={!isAIPro}
                        />
                    </div>
                    <button onClick={handleDraftMessage} disabled={loadingNetworking || !isAIPro} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send size={18} /> Draft Message
                    </button>
                </div>
                {/* Output Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                         {/* This overlay is handled by the parent overlay */}
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-4">Generated Message</h3>
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl h-full border border-gray-100 dark:border-slate-700">
                        {/* FIX: Wrap ReactMarkdown in a div and apply className to the div. */}
                        {draftedMessage ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{draftedMessage}</ReactMarkdown></div> : <p className="text-gray-400 text-center self-center pt-24">Your drafted message will appear here...</p>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'email_assistant' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                {/* Input Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4 relative">
                    {loadingEmail && <LoadingOverlay message="Drafting email..." />}
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                        <TrendingUp size={48} className="text-purple-500 mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">AI Pro Feature</h3>
                        <p className="text-gray-600 dark:text-slate-300 text-sm text-center max-w-xs">Upgrade to AI Pro to unlock email assistant tools.</p>
                      </div>
                    )}
                    <h3 className="text-xl font-bold">AI Email Assistant</h3>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Email Purpose</label>
                        <select
                          value={emailPurpose}
                          onChange={e => setEmailPurpose(e.target.value as EmailPurpose)}
                          className="mt-1 w-full p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                          disabled={!isAIPro}
                        >
                            <option value="">Select Purpose...</option>
                            {Object.values(EmailPurpose).map(purpose => (
                                <option key={purpose} value={purpose}>{purpose}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Context / Details</label>
                        <textarea 
                            value={emailContext}
                            onChange={e => setEmailContext(e.target.value)}
                            placeholder="Provide details for your email: e.g., 'the email I received...', 'my product is...', 'situation for apology...'"
                            className="mt-1 w-full flex-1 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 resize-none custom-scrollbar"
                            disabled={!isAIPro}
                        />
                    </div>
                    <button onClick={handleGenerateEmail} disabled={loadingEmail || !isAIPro || !emailPurpose || !emailContext.trim()} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Sparkles size={18} /> Generate Email
                    </button>
                </div>
                {/* Output Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
                    {!isAIPro && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                         {/* This overlay is handled by the parent overlay */}
                      </div>
                    )}
                    <h3 className="text-xl font-bold mb-4">Generated Email Draft</h3>
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl h-full border border-gray-100 dark:border-slate-700">
                        {generatedEmail ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{generatedEmail}</ReactMarkdown></div> : <p className="text-gray-400 text-center self-center pt-24">Your email draft will appear here...</p>}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default OnlinePresenceView;