import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Bot, Send, Sparkles, User, FileHeart, Mic, BrainCircuit, CheckCircle, XCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserProfile, ChatMessage, ResumeGrade } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { geminiService } from '../services/geminiService';
import { LoadingOverlay } from '../components/LoadingOverlay';

// Speech Recognition instance
// FIX: Cast window to 'any' to access vendor-prefixed SpeechRecognition APIs and rename the constructor variable to avoid shadowing the 'SpeechRecognition' type.
const SpeechRecognitionImpl = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
// FIX: Changed type from 'SpeechRecognition' to 'any' to resolve type error for browser-specific API.
let recognition: any | null = null;
if (SpeechRecognitionImpl) {
    recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
}

interface AICoachViewProps {
  profile: UserProfile;
}

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key is missing in environment variables.");
  return new GoogleGenAI({ apiKey });
};

// --- AI Chat Component ---
const AIChat: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const [chat, setChat] = useState<Chat | null>(null);
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
  
    useEffect(() => {
        const ai = getClient();
        const systemInstruction = `You are an expert, encouraging, and professional AI career coach...`; // same as before
        const newChat = ai.chats.create({ model: 'gemini-2.5-flash', config: { systemInstruction }, history: [] });
        setChat(newChat);
        setLoading(true);
  
        newChat.sendMessage({ message: "Introduce yourself and ask how you can help." }).then((result: GenerateContentResponse) => {
            setHistory([{ role: 'model', parts: [{ text: result.text || '' }] }]);
        }).catch(e => {
            console.error(e);
            setHistory([{ role: 'model', parts: [{ text: "Hello! I'm your AI Interview Coach. How can I help?" }] }]);
        }).finally(() => setLoading(false));
    }, [profile]);
  
    useEffect(() => {
        chatContainerRef.current?.scrollTo(0, chatContainerRef.current.scrollHeight);
    }, [history]);

    const handleSend = async () => {
      if (!input.trim() || !chat) return;
      const userMessage: ChatMessage = { role: 'user', parts: [{ text: input }] };
      setHistory(prev => [...prev, userMessage]);
      setInput('');
      setLoading(true);
      try {
        const result: GenerateContentResponse = await chat.sendMessage({ message: input });
        const modelMessage: ChatMessage = { role: 'model', parts: [{ text: result.text || 'Sorry, I encountered an issue.' }] };
        setHistory(prev => [...prev, modelMessage]);
      } catch (error: any) {
        console.error('Gemini chat error:', error);
         if (error.message && error.message.includes('RATE_LIMIT_EXCEEDED')) {
             setHistory(prev => [...prev, { role: 'model', parts: [{ text: "Looks like we're chatting a lot! The free tier has a limit, so let's pause for a minute." }] }]);
         } else {
            setHistory(prev => [...prev, { role: 'model', parts: [{ text: "Oops! I couldn't connect to the AI." }] }]);
         }
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className="flex flex-col h-full">
            <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Chat history rendering... */}
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
                <div className="relative">
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()} placeholder="Ask a question..." className="w-full p-4 pr-14 bg-gray-50 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" disabled={loading} />
                    <button onClick={handleSend} disabled={loading || !input.trim()} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50"><Send size={18} /></button>
                </div>
            </div>
        </div>
    );
};

// --- Resume Grader Component ---
const ResumeGrader: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const [grade, setGrade] = useState<ResumeGrade | null>(null);
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifications();

    const handleGrade = async () => {
        if (!profile.resumeContent) {
            addNotification("Please add your resume in the Profile section first.", 'error');
            return;
        }
        setLoading(true);
        try {
            const result = await geminiService.gradeResume(profile.resumeContent);
            setGrade(result);
        } catch (e: any) {
            if (e.message === 'RATE_LIMIT_EXCEEDED') {
              addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
            } else {
              addNotification("Failed to grade resume. Please try again.", 'error');
            }
        } finally {
            setLoading(false);
        }
    };
    
    const GradePill: React.FC<{ pass: boolean, label: string }> = ({ pass, label }) => (
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${pass ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'}`}>
            {pass ? <CheckCircle size={14} /> : <XCircle size={14} />} {label}
        </span>
    );
    
    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            {loading && <LoadingOverlay message="Grading your resume..." />}
            {!grade ? (
                <div className="text-center flex flex-col items-center justify-center h-full">
                    <FileHeart size={64} className="text-gray-300 dark:text-slate-600 mb-6" />
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Resume Health Check</h3>
                    <p className="text-gray-500 dark:text-slate-400 mt-2 max-w-md">Get an AI-powered analysis of your master resume. We'll check for ATS compatibility, clarity, action verbs, and quantifiable results.</p>
                    <button onClick={handleGrade} className="mt-8 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg"><Sparkles size={18} /> Analyze My Resume</button>
                </div>
            ) : (
                <div className="max-w-3xl mx-auto animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="relative h-40 w-40 mx-auto flex items-center justify-center">
                            <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36"><path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" /><path className={`${grade.score >= 85 ? 'text-green-500' : grade.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${grade.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                            <div className="absolute"><span className="text-4xl font-bold">{grade.score}</span><span className="text-2xl">%</span></div>
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
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm mb-1">ATS Compatibility</h4><p className="text-sm">{grade.atsFriendly.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm mb-1">Action Verbs</h4><p className="text-sm">{grade.actionVerbs.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm mb-1">Quantifiable Metrics</h4><p className="text-sm">{grade.quantifiableMetrics.feedback}</p></div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 p-4 rounded-lg"><h4 className="font-bold text-sm mb-1">Clarity & Conciseness</h4><p className="text-sm">{grade.clarity.feedback}</p></div>
                    </div>
                    <button onClick={handleGrade} className="mt-8 w-full py-3 bg-gray-200 dark:bg-slate-700 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600">Re-analyze</button>
                </div>
            )}
        </div>
    );
};

// --- Mock Interview Component ---
const MockInterview: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const { addNotification } = useNotifications();
    const questions = ["Tell me about yourself.", "What is your greatest weakness?", "Why do you want to work for our company?", "Describe a challenging situation you've faced at work and how you handled it."];
    const [currentQuestion, setCurrentQuestion] = useState(questions[0]);

    const handleListen = () => {
        if (!recognition) {
            addNotification('Speech recognition is not supported in your browser.', 'error');
            return;
        }
        if (isListening) {
            recognition.stop();
            setIsListening(false);
            if (transcript) handleAnalyzeAnswer();
        } else {
            setTranscript('');
            setFeedback('');
            setIsListening(true);
            recognition.start();
        }
    };

    const handleNextQuestion = () => {
        const nextIndex = (questions.indexOf(currentQuestion) + 1) % questions.length;
        setCurrentQuestion(questions[nextIndex]);
        setTranscript('');
        setFeedback('');
        if (isListening) recognition.stop();
        setIsListening(false);
    };

    const handleAnalyzeAnswer = async () => {
        setLoading(true);
        try {
            const result = await geminiService.analyzeInterviewAnswer(currentQuestion, transcript, profile.resumeContent);
            setFeedback(result);
        } catch (e: any) {
            if (e.message === 'RATE_LIMIT_EXCEEDED') {
              addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
            } else {
              addNotification("Failed to analyze answer.", "error");
            }
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if (!recognition) return;
        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => prev + finalTranscript);
        };
        recognition.onend = () => setIsListening(false);
        return () => { if (recognition) recognition.onend = null; };
    }, []);

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col items-center">
            {loading && <LoadingOverlay message="Analyzing your answer..." />}
            <div className="w-full max-w-3xl">
                <div className="text-center mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Mock Interview Simulator</h3>
                    <p className="text-gray-500 dark:text-slate-400 mt-1">Practice your answers out loud.</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-700/50 p-6 rounded-2xl mb-6 text-center">
                    <p className="text-sm font-bold text-gray-500 dark:text-slate-400">AI Question:</p>
                    <p className="text-lg font-semibold text-gray-800 dark:text-white mt-2">"{currentQuestion}"</p>
                </div>

                <div className="text-center mb-6">
                    <button onClick={handleListen} className={`px-8 py-4 rounded-full font-bold text-white transition-all shadow-lg flex items-center gap-3 mx-auto ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                        <Mic size={20} className={isListening ? 'animate-pulse' : ''} />
                        {isListening ? 'Stop Recording' : 'Record Answer'}
                    </button>
                </div>
                
                <div className="min-h-[100px] bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 mb-6">
                    <p className="text-xs font-bold text-gray-400 mb-2">Your Answer (Live Transcript):</p>
                    <p className="text-gray-700 dark:text-slate-300">{transcript || '...'}</p>
                </div>

                {feedback && (
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 animate-fade-in">
                         <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-3">Feedback:</h4>
                         <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{feedback}</ReactMarkdown></div>
                    </div>
                )}
                
                 <div className="text-center mt-6">
                    <button onClick={handleNextQuestion} className="text-sm font-bold text-gray-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Next Question &rarr;</button>
                </div>
            </div>
        </div>
    );
};


const AICoachView: React.FC<AICoachViewProps> = ({ profile }) => {
  const [activeTab, setActiveTab] = useState<'CHAT' | 'GRADER' | 'INTERVIEW'>('GRADER');

  const tabs = [
    { id: 'GRADER', label: 'Resume Health Check', icon: FileHeart },
    { id: 'INTERVIEW', label: 'Mock Interview', icon: Mic },
    { id: 'CHAT', label: 'AI Chat', icon: Bot },
  ];

  return (
    <div className="flex flex-col h-full max-w-full mx-auto animate-fade-in">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">AI Coach</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Your personal suite of career preparation tools.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-slate-700 px-6 bg-white dark:bg-slate-800 z-10">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 py-4 px-5 text-sm font-bold border-b-2 transition-all ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
                >
                    <tab.icon size={16} /> {tab.label}
                </button>
            ))}
        </div>
        
        <div className="flex-1 bg-gray-50/50 dark:bg-slate-900/50 overflow-hidden">
           {activeTab === 'CHAT' && <AIChat profile={profile} />}
           {activeTab === 'GRADER' && <ResumeGrader profile={profile} />}
           {activeTab === 'INTERVIEW' && <MockInterview profile={profile} />}
        </div>
      </div>
    </div>
  );
};

export default AICoachView;