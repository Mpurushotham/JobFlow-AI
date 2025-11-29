import React, { useState } from 'react';
import { Linkedin, MessageSquare, Sparkles, Send } from 'lucide-react';
import { UserProfile } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import ReactMarkdown from 'react-markdown';

interface OnlinePresenceViewProps {
  profile: UserProfile;
}

const OnlinePresenceView: React.FC<OnlinePresenceViewProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'networking'>('linkedin');
  
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

  const { addNotification } = useNotifications();

  const handleOptimizeLinkedIn = async () => {
    if (!profile.resumeContent) {
      addNotification("Please add your master resume in Profile first.", 'error');
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


  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto animate-fade-in">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Online Presence Optimizer</h2>
            <p className="text-gray-500 dark:text-slate-400 mt-1">Craft a compelling professional brand that gets you noticed.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 self-center flex gap-2">
            <button onClick={() => setActiveTab('linkedin')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${activeTab === 'linkedin' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>
                <Linkedin size={16} /> LinkedIn Optimizer
            </button>
            <button onClick={() => setActiveTab('networking')} className={`px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${activeTab === 'networking' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-400'}`}>
                <MessageSquare size={16} /> Networking Assistant
            </button>
        </div>

        {activeTab === 'linkedin' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                {/* Input Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col">
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
                    />
                    <button onClick={handleOptimizeLinkedIn} disabled={loadingLinkedIn} className="mt-4 w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                        <Sparkles size={18} /> Optimize
                    </button>
                </div>
                {/* Output Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
                    {loadingLinkedIn && <LoadingOverlay message="Optimizing..." />}
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
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col gap-4">
                    <h3 className="text-xl font-bold">Draft a Networking Message</h3>
                    <div>
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Scenario</label>
                        <input type="text" value={scenario} onChange={e => setScenario(e.target.value)} placeholder="e.g., Contacting recruiter after applying" className="mt-1 w-full p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700"/>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="text-sm font-bold text-gray-500 dark:text-slate-400">Recipient Info</label>
                        <textarea 
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            placeholder="e.g., Jane Doe, Senior Recruiter at TechCorp"
                            className="mt-1 w-full flex-1 p-3 bg-gray-50 dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 resize-none custom-scrollbar"
                        />
                    </div>
                    <button onClick={handleDraftMessage} disabled={loadingNetworking} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
                        <Send size={18} /> Draft Message
                    </button>
                </div>
                {/* Output Column */}
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 relative">
                    {loadingNetworking && <LoadingOverlay message="Drafting..." />}
                    <h3 className="text-xl font-bold mb-4">Generated Message</h3>
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl h-full border border-gray-100 dark:border-slate-700">
                        {/* FIX: Wrap ReactMarkdown in a div and apply className to the div. */}
                        {draftedMessage ? <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{draftedMessage}</ReactMarkdown></div> : <p className="text-gray-400 text-center self-center pt-24">Your drafted message will appear here...</p>}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default OnlinePresenceView;