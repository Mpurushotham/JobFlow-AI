

import React, { useState, useRef, useEffect } from 'react';
import { Code, Sparkles, BrainCircuit, TrendingUp, Info, CheckCircle, XCircle } from 'lucide-react';
import { UserProfile, SubscriptionTier, CodeEvaluation, LogActionType } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { logService } from '../services/logService';
import applySyntaxHighlighting from '../utils/syntaxHighlighter';

interface CodePlaygroundViewProps {
  profile: UserProfile;
  subscriptionTier: SubscriptionTier | null;
  currentUser: string;
}

const CodePlaygroundView: React.FC<CodePlaygroundViewProps> = ({ profile, subscriptionTier, currentUser }) => {
    const [language, setLanguage] = useState('javascript');
    const [difficulty, setDifficulty] = useState('medium');
    const [problem, setProblem] = useState('');
    const [solution, setSolution] = useState('');
    const [evaluation, setEvaluation] = useState<CodeEvaluation | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('AI is working...');
    const [lineNumbers, setLineNumbers] = useState('1');
    
    const { addNotification } = useNotifications();
    const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
    const isOffline = !navigator.onLine;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const preRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        const lineCount = solution.split('\n').length;
        const newNumbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
        setLineNumbers(newNumbers);
    }, [solution]);

    const syncScroll = () => {
        if(textareaRef.current && preRef.current) {
            preRef.current.scrollTop = textareaRef.current.scrollTop;
            preRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    };

    const handleGenerateProblem = async () => {
        if (isOffline) { addNotification("Cannot generate problem: You are offline.", "info"); return; }
        if (!isAIPro) { addNotification("This feature requires an AI Pro subscription.", "info"); return; }
        setLoading(true);
        setLoadingMessage("Generating coding problem...");
        setProblem(''); setSolution(''); setEvaluation(null);
        try {
            const result = await geminiService.generateResumeTemplate(`a ${difficulty} ${language} coding problem with a title and description`, currentUser); // Using generateResumeTemplate as a generic text generator
            setProblem(result.summary); // Using summary field for the problem text
            logService.log(currentUser, LogActionType.CODE_PROBLEM_GENERATE, `Generated ${difficulty} ${language} problem.`, 'info');
        } catch (e) { addNotification("Failed to generate a coding problem.", "error"); } 
        finally { setLoading(false); }
    };
    
    const handleEvaluateCode = async () => {
        if (isOffline) { addNotification("Cannot evaluate code: You are offline.", "info"); return; }
        if (!isAIPro) { addNotification("This feature requires an AI Pro subscription.", "info"); return; }
        if (!problem || !solution) { addNotification("Please generate a problem and write a solution first.", "error"); return; }
        setLoading(true);
        setLoadingMessage("Evaluating your solution...");
        try {
            const result = await geminiService.evaluateCode(language, problem, solution, currentUser);
            setEvaluation(result);
            addNotification("Code evaluation complete!", "success");
            logService.log(currentUser, LogActionType.CODE_EVALUATE, `Evaluated ${language} code solution.`, 'info');
        } catch (e) { addNotification("Failed to evaluate code.", "error"); } 
        finally { setLoading(false); }
    };

    const highlightedCode = applySyntaxHighlighting(solution + '\n', language);

    return (
        <div className="flex flex-col h-full max-w-full mx-auto animate-fade-in relative">
            {loading && <LoadingOverlay message={loadingMessage} />}
            {!isAIPro && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
                    <TrendingUp size={64} className="text-purple-500 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
                    <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
                        The Interactive Code Playground is an AI Pro feature. Upgrade to practice your coding skills with AI feedback.
                    </p>
                </div>
            )}
            <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Interactive Code Playground</h2>
                <p className="text-gray-500 dark:text-slate-400 mt-1">Practice coding problems and get instant AI-powered feedback.</p>
            </div>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
                {/* Left Panel: Problem & Controls */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Setup</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600">
                                <option value="javascript">JavaScript</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                            </select>
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-700 border-gray-200 dark:border-slate-600">
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                            <button onClick={handleGenerateProblem} disabled={!isAIPro || isOffline || loading} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50">Generate Problem</button>
                        </div>
                    </div>
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {problem ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <h3>Problem Statement</h3>
                                <p>{problem}</p>
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 flex flex-col items-center justify-center h-full">
                                <BrainCircuit size={48} className="opacity-20 mb-4" />
                                <p>Generate a problem to get started.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Code Editor & Evaluation */}
                <div className="bg-gray-900 dark:bg-black rounded-3xl border border-gray-700 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden relative">
                    <div className="p-4 bg-gray-800/50 dark:bg-black/50 border-b border-gray-700 dark:border-slate-800 flex justify-between items-center text-xs text-gray-400 font-mono">
                        <span>{language.toUpperCase()}</span>
                        <button onClick={handleEvaluateCode} disabled={!isAIPro || isOffline || loading || !solution} className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                            <Sparkles size={16} /> Evaluate
                        </button>
                    </div>
                    <div className="flex-1 relative overflow-hidden font-mono text-sm">
                        <pre ref={preRef} className="absolute top-0 left-0 w-12 h-full p-4 text-right text-gray-500 select-none bg-gray-800 dark:bg-slate-900 overflow-hidden custom-scrollbar">
                            <code>{lineNumbers}</code>
                        </pre>
                        <textarea
                            ref={textareaRef}
                            value={solution}
                            onChange={e => setSolution(e.target.value)}
                            onScroll={syncScroll}
                            className="absolute top-0 left-12 w-[calc(100%-3rem)] h-full p-4 bg-transparent text-transparent caret-white outline-none resize-none custom-scrollbar"
                            spellCheck="false"
                            disabled={!problem || loading}
                        />
                        <pre className="absolute top-0 left-12 w-[calc(100%-3rem)] h-full p-4 overflow-auto pointer-events-none custom-scrollbar">
                            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
                        </pre>
                    </div>
                    {evaluation && (
                        <div className="p-6 border-t border-gray-700 dark:border-slate-800 overflow-y-auto max-h-48 custom-scrollbar">
                            <h4 className="font-bold text-white mb-2">Evaluation Feedback</h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2">{evaluation.correctness.pass ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />} <strong>Correctness:</strong> {evaluation.correctness.feedback}</div>
                                <div className="flex items-center gap-2">{evaluation.efficiency.pass ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />} <strong>Efficiency:</strong> {evaluation.efficiency.feedback}</div>
                                <div className="flex items-center gap-2">{evaluation.style.pass ? <CheckCircle size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />} <strong>Style:</strong> {evaluation.style.feedback}</div>
                                <div className="mt-2"><strong>Suggestions:</strong> {evaluation.suggestions}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodePlaygroundView;
