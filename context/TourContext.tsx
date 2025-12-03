

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { logService } from '../services/logService';
import { useAuth } from './AuthContext';
// FIX: Import LogActionType to use enum members instead of string literals for logging.
import { LogActionType } from '../types';

interface TourStep {
  selector: string;
  content: string;
}

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  tourSteps: TourStep[];
  startTour: (steps: TourStep[]) => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [tourSteps, setTourSteps] = useState<TourStep[]>([]);
  const { currentUser } = useAuth();

  const startTour = useCallback((steps: TourStep[]) => {
    if (steps.length > 0) {
      setTourSteps(steps);
      setCurrentStepIndex(0);
      setIsTourActive(true);
      // FIX: Use LogActionType enum member for type safety.
      logService.log(currentUser || 'new_user', LogActionType.TOUR_START, 'User guidance tour started.', 'info');
    }
  }, [currentUser]);

  const endTour = useCallback((completed: boolean) => {
    setIsTourActive(false);
    setCurrentStepIndex(0);
    setTourSteps([]);
    if (currentUser) {
        // FIX: Use LogActionType enum members for type safety.
        logService.log(currentUser, completed ? LogActionType.TOUR_COMPLETE : LogActionType.TOUR_SKIP, `User tour ${completed ? 'completed' : 'skipped'}.`, 'info');
    }
  }, [currentUser]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
      // FIX: Use LogActionType enum member for type safety.
      logService.log(currentUser || 'new_user', LogActionType.TOUR_STEP, `User advanced to tour step ${currentStepIndex + 2}.`, 'debug');
    } else {
      endTour(true);
    }
  }, [currentStepIndex, tourSteps.length, endTour, currentUser]);

  const skipTour = useCallback(() => {
    endTour(false);
  }, [endTour]);

  return (
    <TourContext.Provider value={{ isTourActive, currentStepIndex, tourSteps, startTour, nextStep, skipTour }}>
      {children}
    </TourContext.Provider>
  );
};

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};