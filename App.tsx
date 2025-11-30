

// FIX: Corrected import statement for React and its hooks.
import React, { useState, useEffect, lazy, Suspense, useCallback } from 'react';

// Import types
import { Job, UserProfile, ViewState, SubscriptionTier } from './types';

// Import services
import { storageService } from './services/storageService';
import { authService } from './services/authService';
import { geminiService } from './services/geminiService';

// Import context and providers
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';
import { AuthProvider, useAuth } from './context/AuthContext'; // Import AuthProvider and useAuth

// Import components
import { Sidebar } from './components/Sidebar';
import { Footer } from './components/Footer';
import { AddJobModal } from './components/AddJobModal';
import { ThemeToggle } from './components/ThemeToggle';
import { Menu } from 'lucide-react';
import { Toast } from './components/Toast';


// --- Lazy Loaded Views ---
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
const AuthView = lazy(() => import('./views/AuthView'));
const AdminView = lazy(() => import('./views/AdminView'));
const WelcomeView = lazy(() => import('./views/WelcomeView'));
const OnlinePresenceView = lazy(() => import('./views/OnlinePresenceView'));
const PricingView = lazy(() => import('./views/PricingView')); // New: Pricing View
const SecurityPrivacyView = lazy(() => import('./views/SecurityPrivacyView')); // New: Security & Privacy View

// --- Suspense Fallback Loader ---
const ViewLoader = () => (
  <div className="w-full h-full flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
  </div>
);


// --- Toast Notification Container ---
const ToastContainer = () => {
  const { notifications, removeNotification } = useNotifications();
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <Toast
            key={notification.id}
            notification={notification}
            onClose={removeNotification}
          />
        ))}
      </div>
    </div>
  );
};


// --- Main App Content (Protected) ---
const AppContent: React.FC<{ onLogout: () => void; isAdmin: boolean; currentUser: string; globalWeather: { city: string; description: string; temperature: number } | null; refetchGlobalWeather: (force?: boolean) => void; subscriptionTier: SubscriptionTier | null; login: (username: string, isAdmin: boolean, subscriptionTier: SubscriptionTier) => void; view: ViewState; setView: (view: ViewState) => void; }> = ({ onLogout, isAdmin, currentUser, globalWeather, refetchGlobalWeather, subscriptionTier, login, view, setView }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', resumeContent: '', targetRoles: '' });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
        setJobs(storageService.getJobs(currentUser));
        // Ensure profile also gets the subscriptionTier. It will be saved by authService/login.
        const userProfile = storageService.getProfile(currentUser);
        if (subscriptionTier && userProfile.subscriptionTier !== subscriptionTier) {
          userProfile.subscriptionTier = subscriptionTier; // Sync profile tier with auth tier
          storageService.saveProfile(currentUser, userProfile);
        }
        setProfile(userProfile);
    }
  }, [currentUser, subscriptionTier]); // Re-run if tier changes while logged in

  const handleUpdateJob = (updatedJob: Job) => {
    storageService.saveJob(currentUser, updatedJob);
    setJobs(prev => {
      const idx = prev.findIndex(j => j.id === updatedJob.id);
      if (idx === -1) return [...prev, updatedJob];
      const newJobs = [...prev];
      newJobs[idx] = updatedJob;
      return newJobs;
    });
    if (selectedJob?.id === updatedJob.id) {
      setSelectedJob(updatedJob);
    }
  };

  const handleDeleteJob = (id: string) => {
    if (confirm('Are you sure you want to delete this job?')) {
      storageService.deleteJob(currentUser, id);
      setJobs(prev => prev.filter(j => j.id !== id));
      if (selectedJob?.id === id) {
        setSelectedJob(null);
        setView('JOBS');
      }
    }
  };

  const handleSaveProfile = (newProfile: UserProfile) => {
    storageService.saveProfile(currentUser, newProfile);
    setProfile(newProfile);
  };

  const renderView = () => {
    switch (view) {
      case 'HOME':
        return <HomeView 
                  profile={profile} 
                  jobs={jobs} 
                  onNavigate={(v) => { setView(v); }}
                  // FIX: Added the `onAddJob` prop.
                  onAddJob={() => setIsAddModalOpen(true)}
                />;
      case 'PROFILE':
        return <ProfileView profile={profile} onSave={handleSaveProfile} />;
      case 'JOB_SEARCH':
        return <JobSearchView onAddJobFound={handleUpdateJob} profile={profile} subscriptionTier={subscriptionTier} />;
      case 'JOBS':
        return <JobsView 
                  jobs={jobs} 
                  onSelectJob={(j) => { setSelectedJob(j); setView('WORKSPACE'); }} 
                  onAddJob={() => setIsAddModalOpen(true)}
                  onDeleteJob={handleDeleteJob}
                  onUpdateJob={handleUpdateJob}
                />;
      case 'TRACKER':
        return <TrackerView 
                  jobs={jobs} 
                  onSelectJob={(j) => { setSelectedJob(j); setView('WORKSPACE'); }} 
                />;
      case 'INTERVIEWS':
        return <InterviewsView 
                  jobs={jobs}
                  onSelectJob={(j) => { setSelectedJob(j); setView('WORKSPACE'); }}
                />;
      case 'ANALYTICS':
        return <AnalyticsView jobs={jobs} />;
      case 'WORKSPACE':
        if (selectedJob) {
          return <WorkspaceView 
                    job={selectedJob} 
                    profile={profile}
                    onUpdateJob={handleUpdateJob}
                    onBack={() => { setSelectedJob(null); setView('JOBS'); }}
                    subscriptionTier={subscriptionTier}
                  />;
        }
        // Fallback if no job is selected
        setView('JOBS'); 
        return null;
      case 'DONATE':
        return <DonateView />;
      case 'AI_COACH':
        return <AICoachView profile={profile} subscriptionTier={subscriptionTier} />;
      case 'ONLINE_PRESENCE':
        return <OnlinePresenceView profile={profile} subscriptionTier={subscriptionTier} />;
      case 'ADMIN':
        return <AdminView currentUserSubscriptionTier={subscriptionTier} />;
      case 'PRICING': // New: Pricing View
        return <PricingView 
                  currentTier={subscriptionTier} 
                  currentUser={currentUser} 
                  onUpgrade={(newTier) => {
                    // Manually update local auth context after simulated upgrade
                    // This ensures the AppContent re-renders with the new tier
                    authService.updateUserSubscription(currentUser!, newTier);
                    // FIX: Pass all required arguments to login function.
                    login(currentUser!, isAdmin, newTier); // Update AuthContext state
                    setView('HOME'); // Navigate home after upgrade
                  }} 
                  onBackToHome={() => setView('HOME')} // Pass onBackToHome to PricingView
                />;
      case 'SECURITY_PRIVACY': // New: Security & Privacy View
        return <SecurityPrivacyView />;
      default:
        return <HomeView 
                  profile={profile} 
                  jobs={jobs} 
                  onNavigate={setView}
                  onAddJob={() => setIsAddModalOpen(true)}
                />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] dark:bg-[#0f172a] text-gray-900 dark:text-white font-sans overflow-hidden transition-colors duration-300">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-20 md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)}></div>}

      <Sidebar 
        view={view} 
        setView={setView} 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        onLogout={onLogout}
        isAdmin={isAdmin}
        globalWeather={globalWeather}
        refetchGlobalWeather={refetchGlobalWeather}
        subscriptionTier={subscriptionTier} // Pass tier to Sidebar
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4 flex justify-between items-center z-20 sticky top-0">
          <div className="flex items-center gap-2 font-bold text-gray-800 dark:text-white">JobFlow AI</div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 dark:text-slate-400"><Menu/></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto custom-scrollbar flex flex-col">
          <div className="flex-1 p-4 md:p-8">
            <div className="max-w-7xl mx-auto h-full flex flex-col">
              <Suspense fallback={<ViewLoader />}>
                {renderView()}
              </Suspense>
            </div>
          </div>
          
          {/* Footer inside scroll container */}
          <Footer onNavigate={setView} />
        </div>
      </main>
    </div>
  );
};

// --- Wrapper for the main application logic, ensures NotificationProvider is active ---
const MainApplicationWrapper: React.FC = () => {
  const {isAuthenticated, isAdmin, currentUser, subscriptionTier, isLoading: isAuthLoading, login, logout} = useAuth(); // Use AuthContext
  const [authFlowState, setAuthFlowState] = useState<'welcome' | 'login' | 'signup' | 'forgot_credentials' | 'otp_verify'>('welcome'); // Added forgot_credentials, otp_verify
  const [view, setView] = useState<ViewState>('HOME'); // Moved view state here
  const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'present' | 'missing'>('loading');
  const [globalWeather, setGlobalWeather] = useState<{ city: string; description: string; temperature: number } | null>(null);
  const [isFetchingWeather, setIsFetchingWeather] = useState(false);
  const { addNotification } = useNotifications(); // Access notifications here, now safely within provider.

  // Handle URL hash for navigation (moved here)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      const validViews: ViewState[] = ['HOME', 'PROFILE', 'JOB_SEARCH', 'JOBS', 'TRACKER', 'INTERVIEWS', 'ANALYTICS', 'WORKSPACE', 'DONATE', 'AI_COACH', 'ADMIN', 'ONLINE_PRESENCE', 'PRICING', 'SECURITY_PRIVACY'];
      
      const targetView = (hash.toUpperCase() as ViewState);
      const isTargetViewProtected = validViews.includes(targetView) && !['HOME', 'PRICING', 'SECURITY_PRIVACY'].includes(targetView);

      if (isAuthenticated) {
          if (validViews.includes(targetView)) {
              setView(targetView);
          } else {
              setView('HOME'); // Default for authenticated users
          }
      } else { // Not authenticated
          if (targetView === 'PRICING' || targetView === 'SECURITY_PRIVACY') { // Allow unauthenticated access to Pricing and Security/Privacy
              setView(targetView);
              setAuthFlowState('welcome'); // Ensure auth flow isn't blocking these views
          } else if (targetView === 'HOME' || !validViews.includes(targetView)) {
              setView('HOME'); // WelcomeView will render for HOME
              setAuthFlowState('welcome');
          } else if (isTargetViewProtected) {
              // Trying to access protected view when unauthenticated
              setView('HOME'); // Redirect to HOME (which renders WelcomeView)
              setAuthFlowState('login'); // Prompt for login
              addNotification('Please log in to access this feature.', 'error');
          }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Call on initial load

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isAuthenticated, setView, setAuthFlowState, addNotification]); // Added setView, setAuthFlowState, addNotification to dependencies.


  const fetchGlobalWeather = useCallback(async (force = false) => {
    if (!isAuthenticated && !force) return; // Only fetch if authenticated or forced
    setIsFetchingWeather(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const data = await geminiService.getWeatherByCoords(latitude, longitude);
            setGlobalWeather(data);
          } catch (error: any) {
            if (error.message === 'RATE_LIMIT_EXCEEDED') {
              addNotification("Weather API limit reached. Please wait a minute before refreshing.", 'info');
            } else {
              console.error("Error fetching global weather data:", error);
            }
          } finally {
            setIsFetchingWeather(false);
          }
        },
        (error) => {
          console.warn(`Geolocation error for global weather: ${error.message}`);
          setIsFetchingWeather(false);
        }
      );
    } else {
      console.warn("Geolocation not supported for global weather.");
      setIsFetchingWeather(false);
    }
  }, [isAuthenticated, addNotification]); // Depend on isAuthenticated and addNotification

  useEffect(() => {
    // Check for API Key
    const key = process.env.API_KEY;
    if (!key || key === "YOUR_GEMINI_API_KEY_HERE") {
      setApiKeyStatus('missing');
    } else {
      setApiKeyStatus('present');
    }

    // Initial weather fetch if authenticated
    if (isAuthenticated) {
      fetchGlobalWeather();
    }

  }, [isAuthenticated, fetchGlobalWeather]); // Rerun when isAuthenticated changes to handle initial login weather fetch

  const handleLoginSuccess = (username: string, isAdminLogin: boolean, userSubscriptionTier: SubscriptionTier) => {
    login(username, isAdminLogin, userSubscriptionTier); // Update AuthContext state
    setAuthFlowState('welcome'); // Reset flow state on successful login
    setView('HOME'); // Ensure view is reset to home after login
    fetchGlobalWeather(); // Fetch weather on login
  };

  const handleLogout = () => {
    logout(); // Clear AuthContext state
    setAuthFlowState('welcome'); // Return to welcome page on logout
    setView('HOME'); // Ensure view is reset for unauthenticated state
    setGlobalWeather(null); // Clear weather on logout
  };

  if (isAuthLoading || apiKeyStatus === 'loading') {
    return <div className="w-full h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><p className="text-slate-400 font-semibold animate-pulse">Loading Application...</p></div>;
  }
  
  if (apiKeyStatus === 'missing') {
     return (
        <div className="w-full h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-8">
            <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-red-200 dark:border-red-800 max-w-lg">
                <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Configuration Error</h2>
                <p className="text-slate-600 dark:text-slate-300">
                    The Gemini API Key is missing.
                </p>
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                   To fix this, go to your project settings in Vercel (or your hosting provider) and add an Environment Variable.
                </p>
                <div className="mt-4 text-left text-xs bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg font-mono space-y-1">
                   <p><strong>Name:</strong> API_KEY</p>
                   <p><strong>Value:</strong> YOUR_GEMINI_API_KEY_HERE</p>
                </div>
                 <p className="text-xs text-slate-400 mt-2">After adding the key, you may need to redeploy the application.</p>
            </div>
        </div>
     );
  }

  // Render content based on authentication and current view
  const renderUnauthenticatedContent = () => {
    if (view === 'PRICING') {
      return <PricingView currentTier={null} currentUser={null} onUpgrade={() => {}} onBackToHome={() => setView('HOME')} />;
    }
    if (view === 'SECURITY_PRIVACY') {
      return <SecurityPrivacyView />;
    }

    switch (authFlowState) {
      case 'welcome':
        return <WelcomeView onNavigateToAuth={(mode) => {
          if (mode === 'pricing') {
            window.location.hash = '#/pricing'; // Let hashchange listener handle it
          } else if (mode === 'security_privacy') { // New mode for Security & Privacy
            window.location.hash = '#/security-privacy';
          } else {
            setAuthFlowState(mode);
          }
        }} />;
      case 'login':
      case 'signup':
      case 'forgot_credentials':
      case 'otp_verify':
        return (
          <AuthView
            initialMode={authFlowState === 'otp_verify' ? 'signup' : authFlowState as 'login' | 'signup'}
            onLoginSuccess={handleLoginSuccess}
            onBack={() => setAuthFlowState('welcome')}
            authFlowState={authFlowState}
            setAuthFlowState={setAuthFlowState}
          />
        );
      default:
        return null;
    }
  };


  return (
    <Suspense fallback={<div className="w-full h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><p className="text-slate-400 font-semibold animate-pulse">Loading Application...</p></div>}>
      {isAuthenticated && currentUser ? (
        <AppContent 
          onLogout={handleLogout} 
          isAdmin={isAdmin} 
          currentUser={currentUser} 
          globalWeather={globalWeather}
          refetchGlobalWeather={fetchGlobalWeather}
          subscriptionTier={subscriptionTier} // Pass subscription tier to AppContent
          login={login} // Pass login function to AppContent
          view={view} // Pass view state
          setView={setView} // Pass setView function
        />
      ) : (
        renderUnauthenticatedContent()
      )}
    </Suspense>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider> {/* Wrap with AuthProvider */}
          <MainApplicationWrapper />
        </AuthProvider>
        <ToastContainer />
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;
