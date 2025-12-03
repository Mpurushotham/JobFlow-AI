


import React, { useEffect, useState } from 'react';
import { Sparkles, Target, FileText, MessageSquare, PieChart, Lock, ArrowRight, Bot, Sun, Cloud, CloudRain, CloudSnow, Wind, Globe, Briefcase, TrendingUp, Zap, Heart } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { geminiService } from '../services/geminiService';


interface WelcomeViewProps {
  onNavigateToAuth: (mode: 'login' | 'signup' | 'pricing' | 'security_privacy' | 'contact') => void;
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

// Simple component for animated number counting
const AnimatedNumber: React.FC<{ value: number; suffix?: string; duration?: number }> = ({ value, suffix = '', duration = 1500 }) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setCurrentValue(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        requestAnimationFrame(animate);
        observer.disconnect(); // Stop observing once animation starts
      }
    });
    // Check if element exists before observing
    const targetElement = document.getElementById(`animated-number-${value}${suffix}`);
    if (targetElement) {
      observer.observe(targetElement);
    }


    return () => {
      if (observer) observer.disconnect();
    };
  }, [value, duration, suffix]);

  return <span id={`animated-number-${value}${suffix}`}>{currentValue.toLocaleString()}{suffix}</span>;
};


const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigateToAuth }) => {
  // Removed weatherData state and useEffect for fetching weather.

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
              {/* Removed weatherData display from here */}
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {/* New Pricing Plans button */}
              <button onClick={() => onNavigateToAuth('login')} className="hidden sm:block text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
                Login
              </button>
              <button onClick={() => onNavigateToAuth('pricing')} className="hidden sm:block text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors">
                Pricing Plans
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
                  {/* FIX: Added children to FeatureCard components */}
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

          {/* New: Trust & Impact Section */}
          <section className="py-20 px-4 md:px-8 bg-slate-800 dark:bg-slate-900/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Our Impact & Global Reach</h3>
                <p className="mt-4 text-lg text-slate-300 max-w-2xl mx-auto">Join a thriving community of job seekers achieving success worldwide.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="bg-white/5 dark:bg-slate-800/30 p-8 rounded-3xl border border-white/10 dark:border-slate-700 backdrop-blur-lg flex flex-col items-center text-center">
                  <Globe size={48} className="text-indigo-400 mb-6" />
                  <p className="text-5xl font-extrabold text-white mb-2"><AnimatedNumber value={100000} suffix="+" /></p>
                  <p className="text-lg text-slate-300">Users Worldwide</p>
                </div>
                <div className="bg-white/5 dark:bg-slate-800/30 p-8 rounded-3xl border border-white/10 dark:border-slate-700 backdrop-blur-lg flex flex-col items-center text-center">
                  <Briefcase size={48} className="text-emerald-400 mb-6" />
                  <p className="text-5xl font-extrabold text-white mb-2"><AnimatedNumber value={500000} suffix="+" /></p>
                  <p className="text-lg text-slate-300">Jobs Tracked</p>
                </div>
                <div className="bg-white/5 dark:bg-slate-800/30 p-8 rounded-3xl border border-white/10 dark:border-slate-700 backdrop-blur-lg flex flex-col items-center text-center">
                  <TrendingUp size={48} className="text-yellow-400 mb-6" />
                  <p className="text-5xl font-extrabold text-white mb-2"><AnimatedNumber value={85} suffix="%" /></p>
                  <p className="text-lg text-slate-300">Interview Rate Increase</p>
                </div>
                <div className="bg-white/5 dark:bg-slate-800/30 p-8 rounded-3xl border border-white/10 dark:border-slate-700 backdrop-blur-lg flex flex-col items-center text-center">
                  <Zap size={48} className="text-purple-400 mb-6" />
                  <p className="text-5xl font-extrabold text-white mb-2"><AnimatedNumber value={70} suffix="%" /></p>
                  <p className="text-lg text-slate-300">Faster Job Search</p>
                </div>
              </div>
              <div className="mt-16 text-center">
                <p className="text-xl text-slate-200 mb-8 max-w-2xl mx-auto">
                  Ready to take control of your career? Join JobFlow AI today and unlock your full potential.
                </p>
                <button onClick={() => onNavigateToAuth('signup')} className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-bold shadow-2xl shadow-indigo-500/30 transition-all transform hover:scale-105 flex items-center gap-2 mx-auto">
                  Start Your Journey Now <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 md:px-8 border-t border-white/10 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-slate-400 text-sm gap-4">
              <p>&copy; {new Date().getFullYear()} JobFlow AI Built with <Heart size={16} className="text-red-500 fill-red-500 inline" /> by <span className="text-white font-bold">Purushotham Muktha</span>.</p>
              <div className="flex gap-4">
                <button onClick={() => onNavigateToAuth('security_privacy')} className="font-bold text-indigo-300 hover:underline transition-colors">
                  Security & Privacy
                </button>
                <button onClick={() => onNavigateToAuth('contact')} className="font-bold text-indigo-300 hover:underline transition-colors">
                  Contact Us
                </button>
              </div>
          </div>
      </footer>
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

export default WelcomeView;