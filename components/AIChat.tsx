


import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Bot, Send, User, Info, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserProfile, ChatMessage, SubscriptionTier, EmailPurpose, LogActionType } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { logService } from '../services/logService';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in environment variables.");
  return new GoogleGenAI({ apiKey });
};

interface AIChatProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
  // FIX: Add currentUser prop
  currentUser: string; 
}

export const AIChat: React.FC<AIChatProps> = ({ profile, subscriptionTier, currentUser }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { addNotification } = useNotifications();

    const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
    const freeTierChatLimit = 10; // Max chat turns for free users per session
    const chatTurnCountRef = useRef(0); // Track chat turns for free users
    const isOffline = !navigator.onLine;
  
    useEffect(() => {
        const ai = getClient();
        const systemInstruction = `
          You are an expert, encouraging, and professional AI career coach named JobFlow AI.
          Your goal is to assist users throughout their job search journey.
          
          You know the user's name is ${profile.name || 'Job Seeker'} and their target roles are ${profile.targetRoles || 'various roles'}.
          
          You can provide guidance on:
          - Resume optimization (ATS best practices, action verbs, quantifying achievements)
          - Cover letter strategies (tailoring, compelling storytelling)
          - Interview preparation (behavioral, technical, STAR method, mock interviews)
          - Job search strategies (networking, platforms, hidden job market)
          - Career development advice (skill gaps, learning paths)
          - LinkedIn profile optimization and networking messages.
          - Email composing using the following specific prompt types for generating different types of emails:
            1. The Professional Email Writer: “Act as a senior communication specialist. Rewrite this email to sound professional, clear, concise, and polite while keeping my original intent. Improve tone, structure, grammar, and flow. My email: [paste email].”
            2. The Perfect Cold Email: “Write a persuasive, short, high-impact cold email for this purpose: [insert purpose]. Include a strong hook, value proposition, credibility, and a simple CTA. Make it sound human, confident, and non-salesy.”
            3. The Corporate Reply: “Craft a professional reply to this email I received: [paste email]. Maintain a respectful tone, address all points clearly, and write a response that strengthens trust and communication.”
            4. The Apology Email: “Write a sincere, mature apology email for this situation: [describe situation]. Take accountability, express genuine understanding, offer a corrective step, and propose a positive way forward.”
            5. The Follow-Up That Gets Replies: “Write a polite and effective follow-up email reminding [insert person] about [insert context]. Keep it respectful, non-pushy, and clear. Include a simple CTA that encourages a response.”
            6. The Email Simplification: “Rewrite my email to be shorter, clearer, and easier to understand while keeping it professional and respectful. Remove unnecessary wording but increase impact. Email: [paste text].”
            7. The Perfect Sales Email: “Write a high-conversion sales email for my product/service: [describe product]. Include a strong hook, emotional benefits, social proof, clear explanation, and a compelling CTA. Keep it conversational and value-driven, not pushy.”
          
          Always maintain a positive, supportive, and professional tone. Keep responses concise and actionable.
          If the user's master resume content is available in the profile, you can reference it generally but do not reveal personal details.
          When offering advice, encourage the user to use other tools within the JobFlow AI app where appropriate (e.g., "You can use the 'Resume Health Check' in the AI Coach tab for a detailed analysis.").
          
          Avoid giving financial or legal advice.
        `;
        const newChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction }, history: [] });
        setChat(newChat);
        setLoading(true);
  
        newChat.sendMessage({ message: "Introduce yourself and ask how you can help." }).then((result: GenerateContentResponse) => {
            setHistory([{ role: 'model', parts: [{ text: result.text || '' }] }]);
            logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `AI Chat initiated by model.`, 'debug');
            chatTurnCountRef.current += 1; // Count initial model message as a turn
        }).catch(e => {
            console.error(e);
            addNotification("Failed to start chat. Check API key or network.", "error");
            logService.log(currentUser, LogActionType.ERROR_OCCURRED, `AI Chat initiation failed: ${e.message}`, 'error'); // FIX: Log the error
        }).finally(() => { // FIX: Finally block to ensure loading is set to false
            setLoading(false);
        });
    }, [profile, addNotification, currentUser]); // Dependencies: profile, addNotification, currentUser
  
    useEffect(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, [history]);
  
    const sendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || !chat || loading) return;
  
      if (isOffline) {
        addNotification("Cannot send message: You are offline.", "info");
        logService.log(currentUser, LogActionType.EMAIL_COMPOSE, 'Blocked AI Chat message: offline.', 'warn');
        return;
      }
  
      if (!isAIPro && chatTurnCountRef.current >= freeTierChatLimit) {
        addNotification(`Free tier chat limit reached (${freeTierChatLimit} turns). Upgrade to AI Pro for unlimited chat!`, 'info');
        logService.log(currentUser, LogActionType.EMAIL_COMPOSE, 'Blocked AI Chat message: free tier limit.', 'warn');
        return;
      }
  
      const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
      setHistory(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `AI Chat message sent by user: "${input.slice(0, 50)}".`, 'debug');
  
      try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: input });
        const modelResponse: ChatMessage = { role: 'model', parts: [{ text: result.text || '' }] };
        setHistory(prev => [...prev, modelResponse]);
        logService.log(currentUser, LogActionType.EMAIL_COMPOSE, `AI Chat message received from model: "${modelResponse.parts[0].text.slice(0, 50)}".`, 'debug');
        chatTurnCountRef.current += 1; // Increment turn count
      } catch (e: any) {
        console.error(e);
        addNotification("Failed to get response from AI. Please try again.", "error");
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `AI Chat message failed: ${e.message}`, 'error');
      } finally {
        setLoading(false);
      }
    };
  
    const isChatDisabled = loading || !chat || isOffline || (!isAIPro && chatTurnCountRef.current >= freeTierChatLimit);
  
    return (
      <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-900/50 relative">
        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar" ref={chatContainerRef}>
          {history.map((msg, index) => (
            <div key={index} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[70%] p-4 rounded-3xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white dark:bg-slate-800 text-gray-800 dark:text-white rounded-bl-none shadow-md border border-gray-100 dark:border-slate-700'
                }`}
              >
                <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
              </div>
            </div>
          ))}
        </div>
  
        <form onSubmit={sendMessage} className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-4 relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isChatDisabled ? (isOffline ? "You are offline." : (!isAIPro ? "Free tier chat limit reached." : "Loading AI chat...") ) : "Type your message..."}
            className="flex-1 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
            disabled={isChatDisabled}
            title={isOffline ? "Requires internet connection" : !isAIPro ? `Free tier chat limit reached (${freeTierChatLimit} turns). Upgrade to AI Pro for unlimited chat!` : ""}
          />
          <button
            type="submit"
            disabled={isChatDisabled}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
  
          {!isAIPro && (
            <div className="absolute -top-8 right-6 flex items-center gap-1 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full font-bold">
              <Info size={14} /> Free Tier: {chatTurnCountRef.current} / {freeTierChatLimit} turns
            </div>
          )}
          {isOffline && (
              <p className="text-sm text-red-500 dark:text-red-400 absolute -top-8 left-6 flex items-center justify-center gap-1" role="alert">
                <Info size={16} aria-hidden="true"/> Offline: Requires internet connection.
              </p>
            )}
        </form>
      </div>
    );
};