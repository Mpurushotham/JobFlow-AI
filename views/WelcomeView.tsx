
import React, { useEffect, useState } from 'react';
import { Sparkles, Target, FileText, MessageSquare, PieChart, Lock, ArrowRight, Bot, Sun, Cloud, CloudRain, CloudSnow, Wind } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { geminiService } from '../services/geminiService';
import { Heart } from 'lucide-react';

interface WelcomeViewProps {
  onNavigateToAuth: (mode: 'login' | 'signup') => void;
}

const FeatureCard = ({ icon, title, children }: { icon: React.ReactNode, title: string, children: React.ReactNode }) => (
  <div className="bg-white/5 dark:bg-slate-800/30 p-8 rounded-3xl border border-white/10 dark:border-slate-700 backdrop-blur-lg hover:-translate-y-2 transition-transform duration-300">
    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center rounded-2xl text-white mb-6 shadow-lg shadow-indigo-500/30">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
    <p className="text-slate-300 leading-relaxed">{children}</p>
  </div>
);

const getWeatherIcon = (description: string): React.ReactElement => {
    const desc = description.toLowerCase();
    if (desc.includes('sun') || desc.includes('clear')) return <Sun size={16} className="text-yellow-400" />;
    if (desc.includes('cloud')) return <Cloud size={16} className="text-slate-400" />;
    if (desc.includes('rain') || desc.includes('drizzle')) return <CloudRain size={16} className="text-blue-400" />;
    if (desc.includes('snow')) return <CloudSnow size={16} className="text-cyan-300" />;
    if (desc.includes('storm') || desc.includes('thunder')) return <CloudRain size={16} className="text-indigo-400" />;
    if (desc.includes('mist') || desc.includes('fog')) return <Wind size={16} className="text-slate-400" />;
    return <Cloud size={16} className="text-slate-400" />;
};


export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigateToAuth }) => {
  const [weatherData, setWeatherData] = useState<{ city: string; description: string; temperature: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const data = await geminiService.getWeatherByCoords(latitude, longitude);
            setWeatherData(data);
          } catch (error) {
            console.error("Error fetching weather data:", error);
          }
        },
        (error) => {
          console.warn(`Geolocation error: ${error.message}`);
        }
      );
    }
  }, []);

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white font-sans overflow-y-auto custom-scrollbar flex flex-col">
      <div className="absolute inset-0 z-0 opacity-20">
         <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-3xl animate-blob"></div>
         <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-2000"></div>
         <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-600 rounded-full mix-blend-screen filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>
      
      <div className="relative z-10 flex-grow flex flex-col">
        {/* Header */}
        <header className="py-6 px-4 md:px-8">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={20} />
              </div>
              <h1 className="text-xl font-bold tracking-tight">JobFlow AI</h1>
              {weatherData && (
                <div className="hidden sm:flex items-center gap-2.5 text-sm text-slate-300 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm ml-4">
                    {getWeatherIcon(weatherData.description)}
                    <span>{weatherData.city}</span>
                    <span className="font-bold text-white">{Math.round(weatherData.temperature)}°C</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button onClick={() => onNavigateToAuth('login')} className="hidden sm:block text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
                Login
              </button>
              <button onClick={() => onNavigateToAuth('signup')} className="text-sm font-bold px-5 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-200 transition-colors shadow-lg">
                Get Started
              </button>
            </div>
          </div>
        </header>
        
        <div className="flex-grow">
          {/* Hero Section */}
          <main className="py-20 md:py-32 px-4 md:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-medium backdrop-blur-sm mb-6">
                <Sparkles size={12} className="text-yellow-300" /> End-to-End Career Copilot
              </div>
              <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
                Land Your Dream Job, Faster.
              </h2>
              <p className="mt-6 text-lg md:text-xl max-w-2xl mx-auto text-slate-300 leading-relaxed">
                JobFlow AI is your personal career assistant. Track applications, tailor your resume, generate cover letters, and ace interviews with the power of Gemini. All your data stays private, stored locally on your device.
              </p>
              <div className="mt-10 flex justify-center items-center gap-4">
                <button onClick={() => onNavigateToAuth('signup')} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2">
                  Get Started for Free <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </main>
          
          {/* Features Section */}
          <section className="py-20 px-4 md:px-8">
            <div className="max-w-7xl mx-auto">
               <div className="text-center mb-16">
                  <h3 className="text-3xl md:text-4xl font-bold tracking-tight">Your AI-Powered Toolkit</h3>
                  <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Everything you need to streamline your job search and stand out.</p>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <FeatureCard icon={<Target size={24} />} title="AI Match Analysis">
                      Instantly see how your resume stacks up against a job description. Get a compatibility score and a detailed breakdown of matching and missing skills.
                  </FeatureCard>
                   <FeatureCard icon={<FileText size={24} />} title="Tailored Resumes">
                      Automatically rewrite your master resume to perfectly align with the keywords and requirements of a specific job, optimized for any ATS.
                  </FeatureCard>
                   <FeatureCard icon={<MessageSquare size={24} />} title="Cover Letter Generation">
                      Create a compelling, professional, and personalized cover letter in seconds. No more staring at a blank page.
                  </FeatureCard>
                  <FeatureCard icon={<Bot size={24} />} title="Interview Prep Guide">
                      Generate a list of tailored behavioral and technical questions based on the job, complete with suggested answers using the STAR method.
                  </FeatureCard>
                   <FeatureCard icon={<PieChart size={24} />} title="Application Tracker">
                      Visualize your job pipeline with an intuitive Kanban board and track your progress with insightful analytics.
                  </FeatureCard>
                   <FeatureCard icon={<Lock size={24} />} title="100% Private & Local">
                      Your profile, jobs, and all generated content are stored exclusively in your browser. No data ever leaves your computer.
                  </FeatureCard>
               </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 md:px-8 border-t border-white/10 mt-auto">
          <div className="max-w-7xl mx-auto text-center text-slate-400 text-sm">
              <p>&copy; {new Date().getFullYear()} JobFlow AI Built with <Heart size={12} className="text-red-500 fill-red-500" /> by <span className="text-gray-900 dark:text-white font-bold">Purushotham Muktha</span>. All Rights Reserved.</p>
          </div>
      </footer>
{/* FIX: Removed non-standard `jsx` prop from the <style> tag to resolve TypeScript error. */}
      <style>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: -2s;
        }
        .animation-delay-4000 {
          animation-delay: -4s;
        }
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
      `}</style>
    </div>
  );
};