

import React from 'react';
import { 
  Home, 
  UserCircle, 
  Search, 
  Briefcase, 
  List, 
  MessageSquare, 
  PieChart, 
  Sparkles, 
  ChevronRight,
  Bot,
  Settings,
  LogOut,
  Globe,
  Sun, Cloud, CloudRain, CloudSnow, Wind, RefreshCw, BrainCircuit, Wallet, Mail // Import weather icons and refresh, BrainCircuit, Wallet for pricing, Mail for email assistant
} from 'lucide-react';
import { ViewState, SubscriptionTier } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  view: ViewState;
  setView: (view: ViewState) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onLogout: () => void;
  isAdmin: boolean;
  globalWeather: { city: string; description: string; temperature: number } | null; // New prop for global weather
  refetchGlobalWeather: (force?: boolean) => void; // New prop for refetching weather
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
}

const getWeatherIcon = (description: string): React.ReactElement => {
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return <Sun size={16} className="text-yellow-500" />;
    if (desc.includes('cloud')) return <Cloud size={16} className="text-slate-400" />;
    if (desc.includes('rain') || desc.includes('drizzle')) return <CloudRain size={16} className="text-blue-500" />;
    if (desc.includes('snow')) return <CloudSnow size={16} className="text-cyan-300" />;
    if (desc.includes('storm') || desc.includes('thunder')) return <CloudRain size={16} className="text-indigo-500" />;
    if (desc.includes('mist') || desc.includes('fog')) return <Wind size={16} className="text-slate-400" />;
    return <Cloud size={16} className="text-slate-400" />;
};

export const Sidebar: React.FC<SidebarProps> = ({ view, setView, sidebarOpen, setSidebarOpen, onLogout, isAdmin, globalWeather, refetchGlobalWeather, subscriptionTier }) => {
  const NavItem = ({ id, icon: Icon, label }: { id: ViewState, icon: any, label: string }) => (
    <button 
      onClick={() => { setView(id); setSidebarOpen(false); }}
      className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-sm group ${view === id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
    >
      <Icon size={20} className={`${view === id ? 'text-indigo-100' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'} transition-colors`} />
      <span>{label}</span>
      {view === id && <ChevronRight size={14} className="ml-auto opacity-50" />}
    </button>
  );

  return (
    <aside className={`fixed md:relative z-30 w-72 h-full bg-[#f8fafc] dark:bg-[#0f172a] border-r border-gray-200/60 dark:border-slate-800 p-6 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="flex items-center justify-between mb-10 px-2 mt-2">
         <div className="flex items-center space-x-3">
           <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
             <Sparkles size={20} />
           </div>
           <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">JobFlow AI</h1>
         </div>
         <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar pr-2">
        <NavItem id="HOME" icon={Home} label="Home" />
        <NavItem id="PROFILE" icon={UserCircle} label="Profile" />
        
        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Workflow</div>
        <NavItem id="JOB_SEARCH" icon={Search} label="Find Jobs" />
        <NavItem id="JOBS" icon={Briefcase} label="My Board" />
        <NavItem id="TRACKER" icon={List} label="Tracker" />
        <NavItem id="INTERVIEWS" icon={MessageSquare} label="Interviews" />
        
        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Insights</div>
        <NavItem id="ANALYTICS" icon={PieChart} label="Analytics" />
        <NavItem id="AI_COACH" icon={Bot} label="AI Coach" />
        <NavItem id="ONLINE_PRESENCE" icon={Globe} label="Online Presence" />

        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Account</div>
        <NavItem id="PRICING" icon={Wallet} label="Pricing Plans" /> {/* New: Pricing Plan Nav Item */}

        {isAdmin && (
          <>
            <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">Management</div>
            <NavItem id="ADMIN" icon={Settings} label="Admin Panel" />
          </>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t border-gray-200/60 dark:border-slate-800 space-y-3">
         {subscriptionTier && (
            <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors ${subscriptionTier === SubscriptionTier.AI_PRO ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800' : 'bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700'}`}>
              <Sparkles size={20} className={subscriptionTier === SubscriptionTier.AI_PRO ? 'text-purple-500' : 'text-gray-400'} />
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-white mb-0.5">Subscription</p>
                <p className={`text-xs font-bold ${subscriptionTier === SubscriptionTier.AI_PRO ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-slate-400'} uppercase`}>
                  {subscriptionTier === SubscriptionTier.AI_PRO ? 'AI Pro' : 'Free User'}
                </p>
              </div>
            </div>
         )}

         <button 
           onClick={onLogout}
           className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm text-gray-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-500 transition-colors"
         >
           <LogOut size={18} /> Logout
         </button>

         {/* Global Weather Display */}
         {globalWeather && globalWeather.city && typeof globalWeather.temperature === 'number' ? (
            <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900`}>
              {getWeatherIcon(globalWeather.description)}
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-white mb-0.5">
                  {globalWeather.city}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                  {Math.round(globalWeather.temperature)}°C, {globalWeather.description}
                </p>
              </div>
              <button onClick={() => refetchGlobalWeather(true)} className="ml-auto p-1.5 text-gray-400 hover:text-indigo-500 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors" title="Refresh weather">
                <RefreshCw size={16} />
              </button>
            </div>
         ) : (
            <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900`}>
                <div className={`w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]`}></div>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-white mb-0.5">AI System Status</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                    Online
                  </p>
                </div>
            </div>
         )}
      </div>
    </aside>
  );
};