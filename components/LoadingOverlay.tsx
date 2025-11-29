
import React from 'react';

export const LoadingOverlay = ({ message }: { message: string }) => (
  <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-3xl transition-all duration-300">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4 shadow-lg shadow-indigo-200 dark:shadow-none"></div>
    <p className="text-indigo-900 dark:text-indigo-300 font-bold animate-pulse text-lg">{message}</p>
  </div>
);
