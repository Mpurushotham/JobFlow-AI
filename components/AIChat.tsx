

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Bot, Send, User, Info, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserProfile, ChatMessage, SubscriptionTier, EmailPurpose } from '../types';
import { useNotifications } from '../context/NotificationContext';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in environment variables.");
  return new GoogleGenAI({ apiKey });
};

interface AIChatProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
}

const AIChat: React.FC<AIChatProps> = ({ profile, subscriptionTier }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const { addNotification } = useNotifications();

    const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
    const freeTierChatLimit = 10; // Max chat turns for free users per session
    const chatTurnCountRef = useRef(0); // Track chat turns for free users
  
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
            chatTurnCountRef.current += 1; // Count initial model message as a turn
        }).catch(e => {
            console.error(e);
            addNotification("Failed to start chat. Check API key or network.", "error");
            setHistory([{ role: 'model', parts: [{ text: "Hello! I'm your AI Career Coach. How can I help?" }] }]);
        }).finally(() => setLoading(false));
    }, [profile, addNotification]);
  
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [history]);

    const handleSend = async () => {
      if (!input.trim() || !chat) return;

      if (subscriptionTier === SubscriptionTier.FREE && chatTurnCountRef.current >= freeTierChatLimit) {
        addNotification(`Free tier chat limit reached (${freeTierChatLimit} turns per session). Upgrade to AI Pro for unlimited chat!`, 'info');
        return;
      }
      if (subscriptionTier === SubscriptionTier.FREE) {
        addNotification(`Free tier chat turn: ${chatTurnCountRef.current + 1}/${freeTierChatLimit}`, 'info');
      }

      const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
      setHistory(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: input });
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: result.text || 'Sorry, I encountered an issue.' }] };
        setHistory(prev => [...prev, modelMessage]);
        chatTurnCountRef.current += 1; // Increment count on successful model response
      } catch (error: any) {
        console.error('Gemini chat error:', error);
         if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
             addNotification("Chat API limit reached. Please wait a minute before trying again.", 'info');
             setHistory(prev => [...prev, { role: 'model', parts: [{ text: "Looks like we're chatting a lot! The free tier has a limit, so let's pause for a minute." }] }]);
         } else {
            addNotification("Oops! I couldn't connect to the AI.", 'error');
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: "Oops! I couldn't connect to the AI." }] }]);
         }
      } finally {
        setLoading(false);
      }
    };

    const isFreeTierLimitReached = subscriptionTier === SubscriptionTier.FREE && chatTurnCountRef.current >= freeTierChatLimit;

    return (
        <div className="flex flex-col h-full">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {history.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'model' && <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md"><Bot size={20} /></div>}
                    <div className={`max-w-xl p-4 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-lg prose-invert' : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-bl-lg'} prose prose-sm dark:prose-invert max-w-none prose-p:my-1`}>
                      <ReactMarkdown>{msg.parts[0].text}</ReactMarkdown>
                    </div>
                    {msg.role === 'user' && <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-slate-600 flex items-center justify-center text-gray-600 dark:text-slate-300 flex-shrink-0"><User size={20} /></div>}
                  </div>
                ))}
                {loading && <div className="flex items-start gap-4"><div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0"><Bot size={20} /></div><div className="p-4 rounded-2xl bg-gray-100 dark:bg-slate-700 animate-pulse">...</div></div>}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                {isFreeTierLimitReached && (
                  <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800 text-purple-900 dark:text-purple-300 mb-4 animate-fade-in">
                    <Info size={18} className="text-purple-500 flex-shrink-0" />
                    <p className="text-sm">Free tier chat limit reached. Upgrade to AI Pro for unlimited conversations!</p>
                    <TrendingUp size={18} className="ml-auto flex-shrink-0" />
                  </div>
                )}
                <div className="relative">
                    <input 
                      type="text" 
                      value={input} 
                      onChange={(e) => setInput(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()} 
                      placeholder="Ask a question..." 
                      className="w-full p-4 pr-14 bg-gray-50 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white" 
                      disabled={loading || isFreeTierLimitReached} 
                    />
                    <button 
                      onClick={handleSend} 
                      disabled={loading || !input.trim() || isFreeTierLimitReached} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIChat;