

import React from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import { ViewState } from '../types';

interface ContactViewProps {
  onNavigate: (view: ViewState) => void;
}

const ContactView: React.FC<ContactViewProps> = ({ onNavigate }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 relative">
            <button 
                onClick={() => window.history.back()} // Go back to the previous page (e.g., welcome)
                className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors"
            >
                <ArrowLeft size={16} /> Back
            </button>
            <div className="w-full max-w-md bg-white dark:bg-slate-800 p-10 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700 text-center animate-fade-in">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl shadow-sm text-indigo-500 mb-8">
                    <Mail size={40} />
                </div>
                <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-4">Contact Us</h1>
                <p className="text-gray-600 dark:text-slate-300 mb-6">
                    Have questions, feedback, or need support? We'd love to hear from you. Please reach out to us via email.
                </p>
                <div className="bg-gray-50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-200 dark:border-slate-700">
                    <a 
                        href="mailto:support@jobflow.ai" 
                        className="text-lg font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                        support@jobflow.ai
                    </a>
                </div>
            </div>
        </div>
    );
};

export default ContactView;
