import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { LayoutDashboard, FileText, Briefcase, Search, Settings, LogOut, Menu, X, Plus, Trash2, ChevronRight, ExternalLink, MapPin, Building, Clock, CheckCircle, AlertCircle, Send, Sparkles, ChevronLeft, Edit3, Target, MessageSquare, History, UserCircle, Download } from 'lucide-react';
import { Job, JobStatus, ViewState, UserProfile, SubscriptionTier, User, LogActionType } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { authService } from './services/authService';
import { logService } from './services/logService';
import { migrateFromLocalStorage } from './services/indexedDbService';

import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { Toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { AddJobModal } from './components/AddJobModal';

// Lazy load views for code splitting
const WelcomeView = lazy(() => import('./views/WelcomeView'));
const AuthView = lazy(() => import('./views/AuthView'));
const HomeView = lazy(() => import('./views/HomeView'));
const ProfileView = lazy(() => import('./views/ProfileView'));
const JobSearchView = lazy(() => import('./views/JobSearchView'));
const JobsView = lazy(() => import('./views/JobsView'));
const TrackerView = lazy(() => import('./views/TrackerView'));
const InterviewsView = lazy(() => import('./views/InterviewsView'));
const AnalyticsView = lazy(() => import('./views/AnalyticsView'));
const WorkspaceView = lazy(() => import('./views/WorkspaceView'));
const DonateView = lazy(() => import('./views/DonateView'));
const AICoachView = lazy(() => import('./views/AICoachView'));
const AdminView = lazy(() => import('./views/AdminView'));
const OnlinePresenceView = lazy(() => import('./views/OnlinePresenceView'));
const PricingView = lazy(() => import('./views/PricingView'));
const SecurityPrivacyView = lazy(() => import('./views/SecurityPrivacyView'));
const ResumeBuilderView = lazy(() => import('./views/ResumeBuilderView'));

const AppContent: React.FC<{
  currentUser: string;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  onLogout: () => void;
  onUpgrade: () => void;
  setView: (view: ViewState) => void;
  view: ViewState;
}> = ({ currentUser, isAdmin, subscriptionTier, onLogout, onUpgrade, setView, view }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [globalWeather, setGlobalWeather] = useState<{ city: string; description: string; temperature: number; country: string } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  
  const { addNotification } = useNotifications();

  const loadUserData = useCallback(async () => {
    if (currentUser) {
      setJobs(await storageService.getJobs(currentUser));
      setProfile(await storageService.getProfile(currentUser) || null);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);
  
  const refetchGlobalWeather = useCallback(async (force = false) => {
    if ((globalWeather && !force) || isFetchingLocation) return;
    setIsFetchingLocation(true);
    logService.log(currentUser, LogActionType.GEOLOCATION_FETCH, 'Attempting to fetch geolocation for weather.', 'info');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weather = await geminiService.getWeatherByCoords(position.coords.latitude, position.coords.longitude, currentUser);
          if (weather) {
            setGlobalWeather(weather);
            logService.log(currentUser, LogActionType.GEOLOCATION_FETCH, `Weather fetched for ${weather.city}`, 'info');
          }
        } catch (error: any) {
          if (error.message !== 'RATE_LIMIT_EXCEEDED' && error.message !== 'OFFLINE') {
            logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Failed to fetch weather: ${error.message}`, 'error');
          }
        } finally {
          setIsFetchingLocation(false);
        }
      },
      (error) => {
        setIsFetchingLocation(false);
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Geolocation permission denied or failed: ${error.message}`, 'warn');
      },
      { timeout: 10000 }
    );
  }, [globalWeather, isFetchingLocation, currentUser]);

  useEffect(() => {
    refetchGlobalWeather();
  }, [refetchGlobalWeather]);

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await storageService.saveProfile(currentUser, newProfile);
    setProfile(newProfile);
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  
  const openAddJobModal = () => setIsAddJobModalOpen(true);

  const renderView = () => {
    if (!profile) {
      return <div className="p-8">Loading profile...</div>;
    }
    switch (view) {
      case 'HOME': return <HomeView profile={profile} jobs={jobs} onNavigate={setView} onAddJob={openAddJobModal} />;
      case 'PROFILE': return <ProfileView profile={profile} onSave={handleSaveProfile} currentUser={currentUser} setView={setView} />;
      case 'JOB_SEARCH': return <JobSearchView onAddJobFound={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'JOBS': return <JobsView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} onAddJob={openAddJobModal} onDeleteJob={async (id) => { await storageService.deleteJob(id); loadUserData(); }} onUpdateJob={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} />;
      case 'TRACKER': return <TrackerView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} />;
      case 'INTERVIEWS': return <InterviewsView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} />;
      case 'ANALYTICS': return <AnalyticsView jobs={jobs} />;
      case 'WORKSPACE': return selectedJob ? <WorkspaceView job={selectedJob} profile={profile} onUpdateJob={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} onBack={() => { setSelectedJobId(null); setView('JOBS'); }} subscriptionTier={subscriptionTier} currentUser={currentUser} /> : null;
      case 'DONATE': return <DonateView />;
      case 'AI_COACH': return <AICoachView profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'ADMIN': return isAdmin ? <AdminView currentUserSubscriptionTier={subscriptionTier} currentUser={currentUser} /> : null;
      case 'ONLINE_PRESENCE': return <OnlinePresenceView profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'PRICING': return <PricingView currentTier={subscriptionTier} currentUser={currentUser} onUpgrade={onUpgrade} onBackToHome={() => setView('HOME')} />;
      case 'SECURITY_PRIVACY': return <SecurityPrivacyView />;
      case 'RESUME_BUILDER': return <ResumeBuilderView profile={profile} onSaveProfile={handleSaveProfile} currentUser={currentUser} subscriptionTier={subscriptionTier} />;
      default: return <div>Not found</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">
      <Sidebar view={view} setView={setView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={onLogout} isAdmin={isAdmin} globalWeather={globalWeather} refetchGlobalWeather={refetchGlobalWeather} subscriptionTier={subscriptionTier} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button onClick={() => setSidebarOpen(true)}><Menu /></button>
          <span className="font-bold text-indigo-600">JobFlow AI</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Suspense fallback={<div className="p-8">Loading view...</div>}>
            {renderView()}
          </Suspense>
        </main>
      </div>
      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onSave={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} currentUser={currentUser} />
    </div>
  );
};

const MainApplicationWrapper = () => {
  // FIX: Call useAuth() only once and destructure all needed values
  const { isAuthenticated, isAdmin, currentUser, subscriptionTier, isLoading, login, logout } = useAuth();
  const [authFlowState, setAuthFlowState] = useState<'welcome' | 'login' | 'signup' | 'pricing' | 'security_privacy' | 'forgot_credentials' | 'otp_verify'>('welcome');
  const [view, setView] = useState<ViewState>('HOME');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const checkApiKey = () => {
      if (!process.env.API_KEY || process.env.API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        addNotification('Gemini API Key is not configured. AI features will be disabled.', 'error');
        logService.log('system', LogActionType.API_KEY_MISSING, 'API_KEY is not configured in environment.', 'error');
        return false;
      }
      return true;
    };

    const initializeApp = async () => {
      await migrateFromLocalStorage();
      checkApiKey();
      logService.log('system', LogActionType.APP_INIT, 'Application initialized.', 'info');
      setIsAppLoading(false);
    };
    initializeApp();
  }, [addNotification]);
  
  const handleLoginSuccess = useCallback((username: string, isAdminLogin: boolean, userSubscriptionTier: SubscriptionTier) => {
    login(username, isAdminLogin, userSubscriptionTier);
    setView('HOME');
  }, [login]);

  const handleLogout = useCallback(() => {
    logService.log(currentUser || 'unknown', LogActionType.USER_LOGOUT, 'User logged out.', 'info');
    logout();
    setView('HOME');
    setAuthFlowState('welcome');
  }, [logout, currentUser]);
  
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.slice(1);
    const validViews: ViewState[] = ['HOME', 'PROFILE', 'JOB_SEARCH', 'JOBS', 'TRACKER', 'INTERVIEWS', 'ANALYTICS', 'WORKSPACE', 'DONATE', 'AI_COACH', 'ADMIN', 'ONLINE_PRESENCE', 'PRICING', 'SECURITY_PRIVACY', 'RESUME_BUILDER'];
    
    if ((validViews as string[]).includes(hash.toUpperCase())) {
      const targetView = hash.toUpperCase() as ViewState;
      if (isAuthenticated) {
        setView(targetView);
      } else {
        if (targetView === 'PRICING' || targetView === 'SECURITY_PRIVACY') {
          setAuthFlowState(targetView === 'PRICING' ? 'pricing' : 'security_privacy');
        } else {
          setAuthFlowState('login');
        }
      }
    }
  }, [isAuthenticated, setView, setAuthFlowState]);
  
  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Check hash on initial load
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  const onNavigateToAuth = (mode: 'login' | 'signup' | 'pricing' | 'security_privacy') => {
    setAuthFlowState(mode);
  };
  
  if (isLoading || isAppLoading) {
    return <div className="flex items-center justify-center h-screen">Loading application...</div>;
  }
  
  if (!isAuthenticated) {
    if (authFlowState === 'pricing') {
      return <Suspense fallback={<div>Loading...</div>}><PricingView currentTier={null} currentUser={null} onUpgrade={() => {}} onBackToHome={() => setAuthFlowState('welcome')} /></Suspense>;
    }
    if (authFlowState === 'security_privacy') {
      return <Suspense fallback={<div>Loading...</div>}><SecurityPrivacyView /></Suspense>;
    }
    if (authFlowState === 'login' || authFlowState === 'signup' || authFlowState === 'forgot_credentials' || authFlowState === 'otp_verify') {
      return <Suspense fallback={<div>Loading...</div>}><AuthView initialMode="login" onLoginSuccess={handleLoginSuccess} onBack={() => setAuthFlowState('welcome')} authFlowState={authFlowState} setAuthFlowState={setAuthFlowState} /></Suspense>;
    }
    return <Suspense fallback={<div>Loading...</div>}><WelcomeView onNavigateToAuth={onNavigateToAuth} /></Suspense>;
  }

  // FIX: Add a safety check to ensure user data is loaded before rendering AppContent
  if (!currentUser || !subscriptionTier) {
    return <div className="flex items-center justify-center h-screen">Loading user session...</div>;
  }

  // FIX: Pass destructured values and remove second useAuth() call and non-null assertions
  return <AppContent currentUser={currentUser} isAdmin={isAdmin} subscriptionTier={subscriptionTier} onLogout={handleLogout} onUpgrade={() => setView('PRICING')} setView={setView} view={view} />;
};

const App = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <MainApplicationWrapper />
          <ToastContainer />
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};

const ToastContainer = () => {
  const { notifications, removeNotification } = useNotifications();
  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3">
      {notifications.map(n => (
        <Toast key={n.id} notification={n} onClose={removeNotification} />
      ))}
    </div>
  );
};

export default App;
