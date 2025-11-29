// FIX: Corrected import statement for React and its hooks.
import React, { useState, useEffect, lazy, Suspense } from 'react';

// Import types
import { Job, UserProfile, ViewState } from './types';

// Import services
import { storageService } from './services/storageService';
import { authService } from './services/authService';

// Import context and providers
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider, useNotifications } from './context/NotificationContext';

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
const AppContent: React.FC<{ onLogout: () => void; isAdmin: boolean; currentUser: string; }> = ({ onLogout, isAdmin, currentUser }) => {
  const [view, setView] = useState<ViewState>('HOME');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [profile, setProfile] = useState<UserProfile>({ name: '', resumeContent: '', targetRoles: '' });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (currentUser) {
        setJobs(storageService.getJobs(currentUser));
        setProfile(storageService.getProfile(currentUser));
    }
  }, [currentUser]);

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
                  onAddJob={() => setIsAddModalOpen(true)}
                />;
      case 'PROFILE':
        return <ProfileView profile={profile} onSave={handleSaveProfile} />;
      case 'JOB_SEARCH':
        return <JobSearchView onAddJobFound={handleUpdateJob} />;
      case 'JOBS':
        return <JobsView 
                  jobs={jobs} 
                  onSelectJob={(j) => { setSelectedJob(j); setView('WORKSPACE'); }} 
                  onAddJob={() => setIsAddModalOpen(true)}
                  onDeleteJob={handleDeleteJob}
                  onUpdateJob={handleUpdateJob}
                />;
      case 'TRACKER':
        return <TrackerView jobs={jobs} onSelectJob={(j) => { setSelectedJob(j); setView('WORKSPACE'); }} />;
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
                  />;
        }
        // Fallback if no job is selected
        setView('JOBS'); 
        return null;
      case 'DONATE':
        return <DonateView />;
      case 'AI_COACH':
        return <AICoachView profile={profile} />;
      case 'ONLINE_PRESENCE':
        return <OnlinePresenceView profile={profile} />;
      case 'ADMIN':
        return <AdminView />;
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
      
      <ToastContainer />

      <AddJobModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onSave={(job) => { handleUpdateJob(job); setIsAddModalOpen(false); }} 
      />
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authFlowState, setAuthFlowState] = useState<'welcome' | 'login' | 'signup'>('welcome');
  const [apiKeyStatus, setApiKeyStatus] = useState<'loading' | 'present' | 'missing'>('loading');

  useEffect(() => {
    // Check for API Key
    const key = process.env.API_KEY;
    if (!key || key === "YOUR_GEMINI_API_KEY_HERE") {
      setApiKeyStatus('missing');
    } else {
      setApiKeyStatus('present');
    }

    // Check for auth status
    const authStatus = authService.isAuthenticated();
    setIsAuthenticated(authStatus.authenticated);
    setIsAdmin(authStatus.isAdmin);
    setCurrentUser(authStatus.username);
    setIsLoading(false);
  }, []);
  
  const handleLoginSuccess = (username: string, isAdminLogin: boolean) => {
    setIsAuthenticated(true);
    setIsAdmin(isAdminLogin);
    setCurrentUser(username);
    setAuthFlowState('welcome'); // Reset flow state on successful login
  };

  const handleLogout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setAuthFlowState('welcome'); // Return to welcome page on logout
  };

  if (isLoading || apiKeyStatus === 'loading') {
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

  return (
    <ThemeProvider>
      <NotificationProvider>
        <Suspense fallback={<div className="w-full h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center"><p className="text-slate-400 font-semibold animate-pulse">Loading Application...</p></div>}>
          {isAuthenticated && currentUser ? (
            <AppContent onLogout={handleLogout} isAdmin={isAdmin} currentUser={currentUser} />
          ) : (
            <>
              {authFlowState === 'welcome' && (
                <WelcomeView onNavigateToAuth={(mode) => setAuthFlowState(mode)} />
              )}
              {(authFlowState === 'login' || authFlowState === 'signup') && (
                <AuthView
                  initialMode={authFlowState}
                  onLoginSuccess={handleLoginSuccess}
                  onBack={() => setAuthFlowState('welcome')}
                />
              )}
            </>
          )}
        </Suspense>
        <ToastContainer />
      </NotificationProvider>
    </ThemeProvider>
  );
};

export default App;