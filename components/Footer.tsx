
import React from 'react';
import { Heart } from 'lucide-react';
import { ViewState } from '../types';

interface FooterProps {
  onNavigate: (view: ViewState) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => (
  <footer className="w-full bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-6 mt-auto transition-colors">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500 dark:text-slate-400 gap-4">
       <div className="font-medium flex items-center gap-4">
          <span>© 2026 Purushotham Muktha. All rights reserved.</span>
          <button onClick={() => onNavigate('DONATE')} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-5 py-2.5 rounded-full text-xs font-extrabold uppercase tracking-wider hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-all hover:scale-105 shadow-sm">
            Donate Now
          </button>
       </div>
       <div className="flex items-center gap-3">
         <div className="flex items-center gap-1.5 font-medium text-gray-600 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 px-3 py-1 rounded-full border border-gray-100 dark:border-slate-600">
           Built with <Heart size={16} className="text-red-500 fill-red-500" /> by <span className="text-gray-900 dark:text-white font-bold">Purushotham Muktha</span>
         </div>
       </div>
    </div>
  </footer>
);
