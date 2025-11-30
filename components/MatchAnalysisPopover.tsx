import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

interface MatchAnalysisPopoverProps {
  analysis: {
    score: number;
    summary: string;
    missingSkills: string[];
    matchingSkills: string[];
  } | null;
  score: number;
  children: React.ReactNode;
}

export const MatchAnalysisPopover: React.FC<MatchAnalysisPopoverProps> = ({ analysis, score, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 100); // Small delay to allow moving mouse to popover itself
  };

  if (!analysis) return <>{children}</>;

  return (
    <div className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isOpen && (
        <div 
          ref={popoverRef}
          className="absolute z-50 w-80 p-4 bg-white dark:bg-slate-700 rounded-xl shadow-lg border border-gray-200 dark:border-slate-600 top-full mt-2 left-1/2 -translate-x-1/2 animate-scale-in"
          onMouseEnter={handleMouseEnter} // Keep open if mouse enters popover
          onMouseLeave={handleMouseLeave} // Close if mouse leaves popover
        >
          <div className="text-center mb-3">
            <span className={`text-2xl font-extrabold ${score >= 80 ? 'text-green-500' : score >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
              {score}% Match
            </span>
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 italic">"{analysis.summary}"</p>
          </div>

          {analysis.matchingSkills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500"/> Matching Skills</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.matchingSkills.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}

          {analysis.missingSkills.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><XCircle size={14} className="text-red-500"/> Missing Skills</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((s: string) => (
                  <span key={s} className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
