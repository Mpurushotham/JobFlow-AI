

import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Job, ViewState, UserProfile, SubscriptionTier, LogActionType } from './types';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { logService } from './services/logService';
import { migrateFromLocalStorage } from './services/indexedDbService';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { TourProvider, useTour } from './context/TourContext';
import { Toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { AddJobModal } from './components/AddJobModal';
import { TourPopover } from './components/TourPopover';

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
const CodePlaygroundView = lazy(() => import('./views/CodePlaygroundView'));
const ContactView = lazy(() => import('./views/ContactView'));

const AppContent: React.FC<{
  currentUser: string;
  isAdmin: boolean;
  subscriptionTier: SubscriptionTier;
  onLogout: () => void;
  setView: (view: ViewState) => void;
  view: ViewState;
}> = ({ currentUser, isAdmin, subscriptionTier, onLogout, setView, view }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [globalWeather, setGlobalWeather] = useState<{ city: string; country: string; description: string; temperature: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  
  const { addNotification } = useNotifications();
  const { startTour } = useTour();

  const loadUserData = useCallback(async () => {
    if (currentUser) {
      const userJobs = await storageService.getJobs(currentUser);
      const userProfile = await storageService.getProfile(currentUser) || null;
      setJobs(userJobs);
      setProfile(userProfile);

      if (userProfile && !userProfile.hasCompletedTour) {
        startTour([
          { selector: '#nav-PROFILE', content: 'Welcome to JobFlow AI! Let\'s start by setting up your profile. Your master resume is the key to all AI features.' },
          { selector: '#nav-JOB_SEARCH', content: 'Great! Now, let\'s find some jobs. Use our AI-powered search to discover new opportunities.' },
          { selector: '#nav-JOBS', content: 'You can track all your applications on this board. Drag and drop jobs to update their status.' },
          { selector: '#nav-AI_COACH', content: 'Finally, head to the AI Coach to check your resume\'s health or practice for interviews. Good luck!' },
        ]);
      }
    }
  }, [currentUser, startTour]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);
  
  const refetchGlobalWeather = useCallback(async (force = false) => {
    if ((globalWeather && !force) || isFetchingLocation) return;
    setIsFetchingLocation(true);
    logService.log(currentUser, LogActionType.GEOLOCATION_FETCH, 'Attempting to fetch geolocation.', 'info');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const weather = await geminiService.getWeatherByCoords(position.coords.latitude, position.coords.longitude, currentUser);
          if (weather) setGlobalWeather(weather);
        } catch (error: any) {} 
        finally { setIsFetchingLocation(false); }
      },
      (error) => {
        setIsFetchingLocation(false);
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Geolocation failed: ${error.message}`, 'warn');
      }
    );
  }, [globalWeather, isFetchingLocation, currentUser]);

  useEffect(() => {
    refetchGlobalWeather();
  }, [refetchGlobalWeather]);

  const handleSaveProfile = async (newProfile: UserProfile) => {
    await storageService.saveProfile(currentUser, newProfile);
    setProfile(newProfile);
    loadUserData();
    if(newProfile.hasCompletedTour){
        const { startTour } = useTour();
        startTour([]); // This effectively stops the tour if it's running
    }
  };
  
  const handleUpdateJob = async (job: Job) => {
    await storageService.saveJob(currentUser, job);
    loadUserData();
  };
  
  const handleDeleteJob = async (id: string) => {
    await storageService.deleteJob(id);
    loadUserData();
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;
  
  const openAddJobModal = () => setIsAddJobModalOpen(true);

  const renderView = () => {
    if (!profile) return <div className="p-8">Loading profile...</div>;
    
    switch (view) {
      case 'HOME': return <HomeView profile={profile} jobs={jobs} onNavigate={setView} onAddJob={openAddJobModal} />;
      case 'PROFILE': return <ProfileView profile={profile} onSave={handleSaveProfile} currentUser={currentUser} setView={setView} />;
      case 'RESUME_BUILDER': return <ResumeBuilderView profile={profile} onSaveProfile={handleSaveProfile} currentUser={currentUser} subscriptionTier={subscriptionTier} />;
      case 'JOB_SEARCH': return <JobSearchView onAddJobFound={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'JOBS': return <JobsView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} onAddJob={openAddJobModal} onDeleteJob={handleDeleteJob} onUpdateJob={handleUpdateJob} />;
      case 'TRACKER': return <TrackerView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} />;
      case 'INTERVIEWS': return <InterviewsView jobs={jobs} onSelectJob={(j) => { setSelectedJobId(j.id); setView('WORKSPACE'); }} />;
      case 'ANALYTICS': return <AnalyticsView jobs={jobs} />;
      case 'WORKSPACE': return selectedJob ? <WorkspaceView job={selectedJob} profile={profile} onUpdateJob={handleUpdateJob} onBack={() => { setSelectedJobId(null); setView('JOBS'); }} subscriptionTier={subscriptionTier} currentUser={currentUser} /> : null;
      case 'AI_COACH': return <AICoachView profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'ONLINE_PRESENCE': return <OnlinePresenceView profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'CODE_PLAYGROUND': return <CodePlaygroundView profile={profile} subscriptionTier={subscriptionTier} currentUser={currentUser} />;
      case 'CONTACT': return <ContactView onNavigate={() => setView('HOME')} />;
      case 'ADMIN': return isAdmin ? <AdminView currentUserSubscriptionTier={subscriptionTier} currentUser={currentUser} /> : null;
      case 'PRICING': return <PricingView currentTier={subscriptionTier} currentUser={currentUser} onUpgrade={(newTier) => { /* Handle upgrade logic */ }} onBackToHome={() => setView('HOME')} />;
      case 'SECURITY_PRIVACY': return <SecurityPrivacyView />;
      default: return <HomeView profile={profile} jobs={jobs} onNavigate={setView} onAddJob={openAddJobModal} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans">
      <Sidebar view={view} setView={setView} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} onLogout={onLogout} isAdmin={isAdmin} globalWeather={globalWeather} refetchGlobalWeather={refetchGlobalWeather} subscriptionTier={subscriptionTier} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Suspense fallback={<div className="p-8">Loading...</div>}>
            {renderView()}
          </Suspense>
        </div>
      </main>
      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onSave={async (job) => { await storageService.saveJob(currentUser, job); loadUserData(); }} currentUser={currentUser} />
      <TourPopover />
    </div>
  );
};

const MainApplicationWrapper = () => {
  const { isAuthenticated, isAdmin, currentUser, subscriptionTier, isLoading, login, logout } = useAuth();
  const [authFlowState, setAuthFlowState] = useState<'welcome' | 'login' | 'signup' | 'pricing' | 'security_privacy' | 'forgot_credentials' | 'otp_verify' | 'contact'>('welcome');
  const [view, setView] = useState<ViewState>('HOME');
  const [isAppLoading, setIsAppLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    const initializeApp = async () => {
      await migrateFromLocalStorage();
      if (!process.env.API_KEY || process.env.API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        addNotification('Gemini API Key is not configured. AI features will be disabled.', 'error');
        logService.log('system', LogActionType.API_KEY_MISSING, 'API_KEY not configured.', 'error');
      }
      logService.log('system', LogActionType.APP_INIT, 'Application initialized.', 'info');
      setIsAppLoading(false);
    };
    initializeApp();
  }, [addNotification]);
  
  const handleLoginSuccess = useCallback((username: string, isAdminLogin: boolean, userSubscriptionTier: SubscriptionTier) => {
    login(username, isAdminLogin, userSubscriptionTier);
    setView('HOME');
    setAuthFlowState('welcome');
  }, [login]);

  const handleLogout = useCallback(() => {
    logService.log(currentUser || 'unknown', LogActionType.USER_LOGOUT, 'User logged out.', 'info');
    logout();
    setView('HOME');
    setAuthFlowState('welcome');
  }, [logout, currentUser]);
  
  const handleHashChange = useCallback(() => {
    const hash = window.location.hash.slice(1);
    const validViews: ViewState[] = ['HOME', 'PROFILE', 'JOB_SEARCH', 'JOBS', 'TRACKER', 'INTERVIEWS', 'ANALYTICS', 'WORKSPACE', 'DONATE', 'AI_COACH', 'ADMIN', 'ONLINE_PRESENCE', 'PRICING', 'SECURITY_PRIVACY', 'RESUME_BUILDER', 'CODE_PLAYGROUND', 'CONTACT'];
    
    if ((validViews as string[]).includes(hash.toUpperCase())) {
      const targetView = hash.toUpperCase() as ViewState;
      if (isAuthenticated) {
        setView(targetView);
      } else {
        if (targetView === 'PRICING') setAuthFlowState('pricing');
        else if (targetView === 'SECURITY_PRIVACY') setAuthFlowState('security_privacy');
        else if (targetView === 'CONTACT') setAuthFlowState('contact');
        else setAuthFlowState('login');
      }
    }
  }, [isAuthenticated]);
  
  useEffect(() => {
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [handleHashChange]);

  const onNavigate = (target: ViewState) => {
      window.location.hash = target.toLowerCase();
  };
  
  const onNavigateUnauth = (target: 'welcome' | 'login' | 'signup' | 'pricing' | 'security_privacy' | 'contact') => {
    if (target === 'pricing') window.location.hash = 'pricing';
    else if (target === 'security_privacy') window.location.hash = 'security_privacy';
    else if (target === 'contact') window.location.hash = 'contact';
    else setAuthFlowState(target);
  };

  if (isLoading || isAppLoading) return <div className="flex items-center justify-center h-screen">Loading application...</div>;
  
  if (!isAuthenticated) {
    const hash = window.location.hash.slice(1);
    if (hash === 'pricing') return <Suspense fallback={<div>Loading...</div>}><PricingView currentTier={null} currentUser={null} onUpgrade={() => {}} onBackToHome={() => onNavigate('HOME')} /></Suspense>;
    if (hash === 'security_privacy') return <Suspense fallback={<div>Loading...</div>}><SecurityPrivacyView /></Suspense>;
    if (hash === 'contact') return <Suspense fallback={<div>Loading...</div>}><ContactView onNavigate={() => onNavigate('HOME')} /></Suspense>;

    switch (authFlowState) {
        case 'login':
        case 'signup':
        case 'forgot_credentials':
        case 'otp_verify':
            return <Suspense fallback={<div>Loading...</div>}><AuthView initialMode="login" onLoginSuccess={handleLoginSuccess} onBack={() => setAuthFlowState('welcome')} authFlowState={authFlowState} setAuthFlowState={setAuthFlowState} /></Suspense>;
        default:
            return <Suspense fallback={<div>Loading...</div>}><WelcomeView onNavigateToAuth={onNavigateUnauth} /></Suspense>;
    }
  }

  if (!currentUser || !subscriptionTier) return <div className="flex items-center justify-center h-screen">Loading user session...</div>;

  return <AppContent currentUser={currentUser} isAdmin={isAdmin} subscriptionTier={subscriptionTier} onLogout={handleLogout} setView={onNavigate} view={view} />;
};

const App = () => (
  <ThemeProvider>
    <NotificationProvider>
      <AuthProvider>
        <TourProvider>
          <MainApplicationWrapper />
          <ToastContainer />
        </TourProvider>
      </AuthProvider>
    </NotificationProvider>
  </ThemeProvider>
);

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
