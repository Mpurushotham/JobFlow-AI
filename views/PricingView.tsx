import React, { useState } from 'react';
import { CheckCircle, XCircle, Sparkles, TrendingUp, DollarSign, CreditCard, Banknote, Smartphone, ArrowRight, X, ArrowLeft } from 'lucide-react'; // Added ArrowLeft
import { SubscriptionTier } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay'; // Re-use LoadingOverlay

interface PricingViewProps {
  currentTier: SubscriptionTier | null;
  currentUser: string | null;
  onUpgrade: (newTier: SubscriptionTier) => void;
  onBackToHome: () => void; // New prop for back to home navigation
}

// Payment method icons for visual appeal
const StripeIcon = () => <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor"><path d="M12.0001 2.00003C6.48003 2.00003 2.00003 6.48003 2.00003 12.0001C2.00003 17.5201 6.48003 22.0001 12.0001 22.0001C17.5201 22.0001 22.0001 17.5201 22.0001 12.0001C22.0001 6.48003 17.5201 2.00003 12.0001 2.00003ZM12.0001 4.00003C14.1201 4.00003 16.0351 4.70003 17.4701 5.86503L12.9201 10.415C12.4451 10.8901 12.0001 11.3351 12.0001 12.0001C12.0001 12.6651 12.4451 13.1101 12.9201 13.5851L17.4701 18.135C16.0351 19.2951 14.1201 20.0001 12.0001 20.0001C7.58003 20.0001 4.00003 16.4201 4.00003 12.0001C4.00003 7.58003 7.58003 4.00003 12.0001 4.00003ZM10.4151 12.0001C10.4151 11.3351 10.8601 10.8901 11.3351 10.4151L6.78503 5.86503C5.62003 7.30003 4.92003 9.21503 4.92003 12.0001C4.92003 14.7851 5.62003 16.7001 6.78503 18.1351L11.3351 13.5851C10.8601 13.1101 10.4151 12.6651 10.4151 12.0001Z"/></svg>;
const PayPalIcon = () => <svg viewBox="0 0 24 24" fill="#0070BA" className="w-7 h-7"><path d="M7.483 18.014h3.206l.563-3.373.111-.665.186-1.112.015-.087.037-.222.04-.239.045-.27.033-.195.02-.123c-.004 0-.008-.002-.012-.004l-.007-.003-.005-.002a.498.498 0 00-.47-.282H7.28l-.348 2.083-.178 1.065zm5.06-7.85l.228-1.366c.07-.417.396-.713.818-.713h2.368c2.11 0 3.325 1.045 2.94 3.19-.34 1.896-1.745 2.91-3.69 2.91h-1.51l-.31 1.855-.042.247-.03.178-.06.357-.107.643-.01.06-.006.035a.5.5 0 00.485.553h.013l3.201-.002c.404 0 .75-.303.813-.704l.233-1.396.79-4.723c.12-.72-.345-1.37-1.07-1.37h-2.367c-.772 0-1.44.48-1.688 1.189l-.794 4.757zm-4.325 6.772l.96-5.753.112-.668c.07-.416.396-.712.818-.712h3.26c.433 0 .796.33.82.76l-.23 1.373c-.066.392-.38.67-.78.67h-2.91c-.432 0-.795.33-.82.76l-.733 4.387c-.017.102-.102.175-.205.175h-3.26c-.404 0-.75-.302-.813-.703z"/></svg>;
const PhonePeIcon = () => <svg viewBox="0 0 24 24" fill="#5f259f" className="w-7 h-7"><path d="M4.329 2.683c-.852.369-1.517.9-1.99 1.625-.516.795-.783 1.77-.783 2.927V16.7c0 1.144.267 2.112.8 2.9.475.72 1.137 1.25 1.983 1.62.89.4 1.95.603 3.18.603h8.34c1.237 0 2.3-.203 3.186-.603.84-.37 1.493-.9 1.968-1.62.533-.788.8-1.756.8-2.9V7.235c0-1.157-.266-2.132-.783-2.927-.474-.725-1.14-1.256-1.99-1.625C17.919 2.28 16.86 2.08 15.63 2.08h-8.34c-1.23 0-2.29.203-3.16.603zM12 5.17c3.41 0 6.18 2.77 6.18 6.18s-2.77 6.18-6.18 6.18S5.82 14.76 5.82 11.35 8.59 5.17 12 5.17z"/></svg>;
const SwishIcon = () => <svg viewBox="0 0 24 24" fill="#C5003E" className="w-7 h-7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.15 13.64c-.45.31-.98.48-1.57.48-1.38 0-2.47-.79-2.82-1.89H15.5v-.01c0-2.09-1.5-3.87-3.5-3.87-1.81 0-3.23 1.42-3.46 3.19H6.5v.01c.21 2.35 2.19 4.19 4.65 4.19 1.05 0 2-.31 2.76-.85l-1.07-1.61z"/></svg>;

const PricingView: React.FC<PricingViewProps> = ({ currentTier, currentUser, onUpgrade, onBackToHome }) => {
  const { addNotification } = useNotifications();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);

  const handleSimulatePayment = async (method: string) => {
    setLoadingPayment(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000)); 
    
    if (currentUser) {
      onUpgrade(SubscriptionTier.AI_PRO);
      addNotification(`Successfully upgraded to AI Pro via ${method}!`, 'success');
    } else {
      addNotification('Could not upgrade. User not logged in.', 'error');
    }
    setLoadingPayment(false);
    setShowPaymentModal(false);
  };

  const features = [
    { name: "Basic Job Search (10 results/search)", free: true, pro: true },
    { name: "Job Board & Tracker (Unlimited Jobs)", free: true, pro: true },
    { name: "Profile Management", free: true, pro: true },
    { name: "AI Chat (Limited daily turns)", free: true, pro: "Unlimited" },
    { name: "Resume Health Check (Limited daily checks)", free: true, pro: "Unlimited" },
    { name: "Export Job Data (CSV)", free: true, pro: true },
    { name: "AI Match Analysis (Unlimited)", free: false, pro: true },
    { name: "Tailored Resume Generation", free: false, pro: true },
    { name: "Cover Letter Generation", free: false, pro: true },
    { name: "Interview Prep Guide", free: false, pro: true },
    { name: "Live Mock Interview Simulator", free: false, pro: true },
    { name: "AI-Powered Skill Development", free: false, pro: true },
    { name: "LinkedIn Profile Optimizer", free: false, pro: true },
    { name: "Networking Message Assistant", free: false, pro: true },
    { name: "Download AI-Generated PDFs", free: false, pro: true },
  ];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 animate-fade-in relative">
      <button 
        onClick={onBackToHome} 
        className="absolute top-0 left-0 lg:-left-24 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Home
      </button>

      {loadingPayment && <LoadingOverlay message="Processing your upgrade..." />}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-4">Choose Your Plan</h2>
        <p className="text-lg text-gray-600 dark:text-slate-300 max-w-2xl mx-auto">
          Unlock your full career potential with AI Pro. Experience unlimited access to all advanced AI features.
        </p>
        {currentTier === SubscriptionTier.AI_PRO && (
          <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full font-bold text-sm">
            <Sparkles size={16}/> You are currently an AI Pro subscriber!
          </p>
        )}
        {currentTier === SubscriptionTier.FREE && (
          <p className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full font-bold text-sm">
            <TrendingUp size={16}/> You are currently a Free user. Upgrade for more!
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Free Plan Card */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-xl border border-gray-100 dark:border-slate-700 flex flex-col transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <DollarSign size={32} className="text-emerald-500"/>
            <h3 className="text-3xl font-bold text-gray-800 dark:text-white">Free Plan</h3>
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-lg mb-8">Get started with essential tools.</p>
          <div className="text-5xl font-extrabold text-gray-800 dark:text-white mb-8">
            $0<span className="text-lg font-medium text-gray-400">/month</span>
          </div>

          <ul className="space-y-4 flex-1 mb-8">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-gray-700 dark:text-slate-300">
                {feature.free ? <CheckCircle size={20} className="text-emerald-500 flex-shrink-0"/> : <XCircle size={20} className="text-red-400 flex-shrink-0"/>}
                <span className={!feature.free ? "line-through text-gray-400 dark:text-slate-500" : ""}>{feature.name}</span>
                {typeof feature.pro === 'string' && feature.free ? <span className="text-xs text-gray-500 dark:text-slate-400 ml-auto">({feature.pro} on Pro)</span> : null}
              </li>
            ))}
          </ul>
          
          <button
            disabled={currentTier === SubscriptionTier.FREE}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-colors
              ${currentTier === SubscriptionTier.FREE 
                ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none'
              }`}
          >
            Current Plan
          </button>
        </div>

        {/* AI Pro Plan Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-[2rem] shadow-xl border border-indigo-500 flex flex-col text-white relative overflow-hidden transition-colors">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/4 blur-3xl"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <Sparkles size={32} className="text-yellow-300"/>
            <h3 className="text-3xl font-bold">AI Pro Plan</h3>
          </div>
          <p className="text-indigo-100 text-lg mb-8 relative z-10">Unlock your ultimate AI career assistant.</p>
          <div className="text-5xl font-extrabold mb-8 relative z-10">
            $9.99<span className="text-lg font-medium text-indigo-100">/month</span>
          </div>

          <ul className="space-y-4 flex-1 mb-8 relative z-10">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-white">
                {feature.pro ? <CheckCircle size={20} className="text-yellow-300 flex-shrink-0"/> : <XCircle size={20} className="text-white/50 flex-shrink-0"/>}
                <span>{feature.name}</span>
              </li>
            ))}
          </ul>
          
          {currentTier === SubscriptionTier.AI_PRO ? (
            <button
              disabled
              className="w-full py-4 rounded-xl font-bold text-lg bg-white/20 text-white cursor-not-allowed flex items-center justify-center gap-2 shadow-inner"
            >
              <CheckCircle size={20}/> Active Plan
            </button>
          ) : (
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-4 rounded-xl font-bold text-lg bg-white text-indigo-600 hover:bg-indigo-50 transition-colors shadow-2xl shadow-indigo-900/40 transform hover:scale-[1.02] flex items-center justify-center gap-2 relative z-10"
            >
              Upgrade to AI Pro <ArrowRight size={20} />
            </button>
          )}
        </div>
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-scale-in transition-colors">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white text-center w-full">Complete Upgrade</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 -mr-4 -mt-4 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors absolute right-6 top-6"><X size={20} className="text-gray-500 dark:text-slate-400" /></button>
            </div>
            <p className="text-gray-500 dark:text-slate-400 mb-6 text-center text-sm">
                This is a simulated payment gateway. Your subscription will be upgraded locally.
            </p>
            
            <div className="space-y-4">
              <button disabled={loadingPayment} onClick={() => handleSimulatePayment('Stripe')} className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl transition-all hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed">
                <StripeIcon />
                <span className="block font-bold text-lg text-gray-800 dark:text-slate-200">Stripe</span>
                <ArrowRight className="text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 ml-auto" />
              </button>
              <button disabled={loadingPayment} onClick={() => handleSimulatePayment('PayPal')} className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl transition-all hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed">
                <PayPalIcon />
                <span className="block font-bold text-lg text-gray-800 dark:text-slate-200">PayPal</span>
                <ArrowRight className="text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 ml-auto" />
              </button>
              <button disabled={loadingPayment} onClick={() => handleSimulatePayment('PhonePe')} className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl transition-all hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed">
                <PhonePeIcon />
                <span className="block font-bold text-lg text-gray-800 dark:text-slate-200">PhonePe</span>
                <ArrowRight className="text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 ml-auto" />
              </button>
              <button disabled={loadingPayment} onClick={() => handleSimulatePayment('Swish')} className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl transition-all hover:shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed">
                <SwishIcon />
                <span className="block font-bold text-lg text-gray-800 dark:text-slate-200">Swish</span>
                <ArrowRight className="text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1 ml-auto" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingView;