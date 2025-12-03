
import React, { useEffect, useState, useRef } from 'react';
import { useTour } from '../context/TourContext';
import { X, ArrowRight, Lightbulb } from 'lucide-react';

export const TourPopover: React.FC = () => {
  const { isTourActive, currentStepIndex, tourSteps, nextStep, skipTour } = useTour();
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isTourActive) {
      const step = tourSteps[currentStepIndex];
      const targetElement = document.querySelector(step.selector);

      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        
        // Add a highlight class to the target element
        targetElement.classList.add('tour-highlight');

        // Calculate position
        const popoverHeight = popoverRef.current?.offsetHeight || 200;
        let top = rect.bottom + 10;
        let left = rect.left + rect.width / 2;

        if (top + popoverHeight > window.innerHeight) {
            top = rect.top - popoverHeight - 10;
        }

        setPosition({ top, left, width: rect.width, height: rect.height });
      }

      // Cleanup function to remove highlight
      return () => {
        if (targetElement) {
          targetElement.classList.remove('tour-highlight');
        }
      };
    }
  }, [isTourActive, currentStepIndex, tourSteps]);

  if (!isTourActive) return null;

  const currentStep = tourSteps[currentStepIndex];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[1000]" onClick={skipTour} />
      <div 
        ref={popoverRef}
        className="fixed z-[1001] w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 animate-scale-in"
        style={{ 
            top: `${position.top}px`, 
            left: `${position.left}px`,
            transform: 'translateX(-50%)'
        }}
      >
        <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-yellow-400/20 text-yellow-500 flex items-center justify-center rounded-full flex-shrink-0">
                <Lightbulb size={20} />
            </div>
            <div>
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">Smart Tip</h3>
                <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">{currentStep.content}</p>
            </div>
        </div>

        <div className="flex justify-between items-center mt-6">
          <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
            {currentStepIndex + 1} / {tourSteps.length}
          </span>
          <div className="flex gap-2">
            <button onClick={skipTour} className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-white px-4 py-2 rounded-lg transition-colors">
              Skip
            </button>
            <button onClick={nextStep} className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 transition-colors">
              {currentStepIndex === tourSteps.length - 1 ? 'Finish' : 'Next'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <button onClick={skipTour} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
            <X size={14} />
        </button>
      </div>
      <style>{`
        .tour-highlight {
          position: relative;
          z-index: 1001;
          background-color: white; /* Lift the element color */
          box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
          border-radius: 8px;
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </>
  );
};
