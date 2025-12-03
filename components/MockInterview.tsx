



import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Send, User, RefreshCcw, Info, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { UserProfile, SubscriptionTier } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { geminiService } from '../services/geminiService';
import { LoadingOverlay } from './LoadingOverlay';

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

interface MockInterviewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
  // FIX: Add currentUser prop
  currentUser: string; 
}

export const MockInterview: React.FC<MockInterviewProps> = ({ profile, subscriptionTier, currentUser }) => { // FIX: Exported MockInterview as a named export.
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [feedback, setFeedback] = useState('');
    const [loading, setLoading] = useState(false);
    const [showStarTip, setShowStarTip] = useState(true); // State to toggle STAR tip visibility
    const { addNotification } = useNotifications();
    
    // Initial questions, can be expanded or dynamically generated
    const initialQuestions = [
        "Tell me about yourself.", 
        "What is your greatest weakness?", 
        "Why do you want to work for our company?", 
        "Describe a challenging situation you've faced at work and how you handled it (STAR method).",
        "How do you handle conflict or disagreement with team members?",
        "Where do you see yourself in five years?",
        "What are your salary expectations?",
        "Do you have any questions for me?"
    ];
    const [questions, setQuestions] = useState<string[]>(initialQuestions);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

    const currentQuestion = questions[currentQuestionIndex];
    const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
    const isOffline = !navigator.onLine;

    // FIX: Define handleAnalyzeAnswer as a useCallback to ensure stability and correct closure
    const handleAnalyzeAnswer = useCallback(async () => {
        if (isOffline) {
            addNotification("Cannot get feedback: You are offline.", "info");
            return;
        }
        if (!profile.resumeContent) {
            addNotification("Please add your master resume in the Profile section to analyze your answer.", 'info');
            return;
        }
        if (!isAIPro) {
            addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
            return;
        }
        if (!transcript.trim()) {
            addNotification("Please speak your answer first.", 'error');
            return;
        }

        setLoading(true);
        try {
            // FIX: Pass the full profile object instead of just resumeContent string
            const result = await geminiService.analyzeInterviewAnswer(currentQuestion, transcript, profile, currentUser);
            setFeedback(result);
            addNotification("Answer analysis complete!", "success");
        } catch (e: any) {
            if (e.message === 'RATE_LIMIT_EXCEEDED') {
                addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
            } else if (e.message === 'OFFLINE') {
                addNotification("Cannot analyze answer: You are offline.", "info");
            } else {
                addNotification("Failed to analyze answer. Please try again.", 'error');
            }
        } finally {
            setLoading(false);
        }
    }, [profile, isAIPro, transcript, currentQuestion, addNotification, isOffline, currentUser]); // Dependencies for useCallback

    useEffect(() => {
        if (!recognition || !isAIPro || isOffline) return; // Only enable if AI Pro and online

        recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            setTranscript(prev => prev + finalTranscript + interimTranscript);
        };
        recognition.onend = () => {
            setIsListening(false);
            if (transcript.trim()) { // Only analyze if there's actual speech
                // FIX: Call the useCallback version of handleAnalyzeAnswer
                handleAnalyzeAnswer();
            }
        };
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            addNotification(`Speech recognition error: ${event.error}`, 'error');
            setIsListening(false);
        };
        return () => { 
            if (recognition) {
                recognition.onresult = null; 
                recognition.onend = null; 
                recognition.onerror = null;
            }
        };
    }, [transcript, addNotification, isAIPro, handleAnalyzeAnswer, isOffline]); // Depend on handleAnalyzeAnswer and isOffline

    const handleListen = () => {
        if (isOffline) {
            addNotification("Cannot use microphone: You are offline.", "info");
            return;
        }
        if (!isAIPro) {
          addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
          return;
        }
        if (!recognition) {
            addNotification('Speech recognition is not supported in your browser.', 'error');
            return;
        }
        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            setFeedback('');
            setIsListening(true);
            recognition.start();
            addNotification('Listening for your answer...', 'info');
        }
    };

    const handleNextQuestion = () => {
        if (!isAIPro) {
          addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
          return;
        }
        const nextIndex = (currentQuestionIndex + 1) % questions.length;
        setCurrentQuestionIndex(nextIndex);
        setTranscript('');
        // FIX: Reset feedback on next question
        setFeedback(''); 
        setIsListening(false);
        if (recognition) recognition.stop(); // Stop listening if active
    };

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col items-center relative">
            {loading && <LoadingOverlay message="Analyzing your answer..." />}
            {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-10 rounded-3xl">
                    <TrendingUp size={64} className="text-purple-500 mb-4" aria-hidden="true" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                    <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                        This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your interview prep!
                    </p>
                </div>
            )}

            <div className="w-full max-w-3xl space-y-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <User size={20} className="text-purple-500" aria-hidden="true" /> Mock Interview
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
                        Practice common interview questions. Speak your answer, and AI will provide instant feedback.
                        <span 
                            title="Ensure your master resume is updated in the Profile section for the most relevant analysis."
                            className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help"
                            aria-label="Information about mock interview"
                        >
                            <Info size={16} aria-hidden="true" />
                        </span>
                    </p>

                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 relative">
                        <span className="absolute -top-3 left-4 px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">Question</span>
                        <p className="text-xl font-bold text-gray-800 dark:text-white mt-2 leading-relaxed" aria-live="polite">
                            {currentQuestion}
                        </p>
                    </div>

                    {/* STAR Method Tip */}
                    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800" role="region" aria-labelledby="star-tip-toggle">
                        <button 
                            onClick={() => setShowStarTip(prev => !prev)} 
                            className="w-full flex justify-between items-center text-blue-700 dark:text-blue-400 font-bold text-sm"
                            aria-expanded={showStarTip}
                            aria-controls="star-tip-content"
                            id="star-tip-toggle"
                        >
                            <span>STAR Method Tip</span>
                            {showStarTip ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                        </button>
                        {showStarTip && (
                            <div id="star-tip-content" className="mt-3 text-sm text-blue-900 dark:text-blue-300 leading-relaxed">
                                <p><strong className="text-blue-800 dark:text-blue-200">S</strong>ituation: Briefly describe the context.</p>
                                <p><strong className="text-blue-800 dark:text-blue-200">T</strong>ask: Explain your responsibility in that situation.</p>
                                <p><strong className="text-blue-800 dark:text-blue-200">A</strong>ction: Detail what *you* did to address the task.</p>
                                <p><strong className="text-blue-800 dark:text-blue-200">R</strong>esult: Describe the positive outcome of your actions.</p>
                            </div>
                        )}
                    </div>
                    {isOffline && (
                        <p className="text-sm text-red-500 dark:text-red-400 mt-4 text-center flex items-center justify-center gap-1" role="alert">
                            <Info size={16} aria-hidden="true"/> Offline: AI features and microphone input require an internet connection.
                        </p>
                    )}

                    <div className="mt-6 flex justify-between gap-4">
                        <button
                            onClick={handleListen}
                            disabled={loading || !isAIPro || isOffline}
                            className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors
                                ${isListening 
                                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' // Added animate-pulse
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            aria-label={isListening ? 'Stop listening' : 'Speak answer'}
                            title={isOffline ? "Requires internet connection" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                        >
                            {isListening ? <Mic size={18} className="animate-spin-fast" aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />} {/* Added animate-spin-fast */}
                            {isListening ? 'Stop Listening' : 'Speak Answer'}
                        </button>
                        <button
                            onClick={() => {
                                if (isListening) {
                                    recognition.stop();
                                    setIsListening(false);
                                }
                                handleAnalyzeAnswer();
                            }}
                            disabled={loading || !transcript.trim() || !isAIPro || isOffline}
                            className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-green-200 dark:shadow-none"
                            aria-label="Get feedback on answer"
                            title={isOffline ? "Requires internet connection" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : !transcript.trim() ? "Speak an answer first" : ""}
                        >
                            <Send size={18} aria-hidden="true" /> Get Feedback
                        </button>
                    </div>
                    <button
                        onClick={handleNextQuestion}
                        disabled={loading || isListening || !isAIPro}
                        className="mt-3 w-full py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-slate-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Next question"
                        title={!isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
                    >
                        <RefreshCcw size={18} aria-hidden="true" /> Next Question
                    </button>
                </div>

                {transcript && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in" role="region" aria-labelledby="your-answer-heading">
                        <h4 id="your-answer-heading" className="text-lg font-bold text-gray-800 dark:text-white mb-4">Your Answer</h4>
                        <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                            <p className="text-gray-700 dark:text-slate-300 whitespace-pre-wrap">{transcript}</p>
                        </div>
                    </div>
                )}

                {feedback && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-8 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-800 animate-fade-in" role="region" aria-labelledby="ai-feedback-heading">
                        <h4 id="ai-feedback-heading" className="text-lg font-bold text-purple-800 dark:text-purple-300 mb-4 flex items-center gap-2">
                            <Info size={20} aria-hidden="true" /> AI Feedback
                        </h4>
                        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-purple-200 leading-relaxed">
                            <ReactMarkdown>{feedback}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>
             {/* Custom styles for faster spin */}
             {/* FIX: Removed 'jsx' prop from style tag. */}
             <style>{`
                @keyframes spin-fast {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-fast {
                    animation: spin-fast 0.5s linear infinite;
                }
            `}</style>
        </div>
    );
};