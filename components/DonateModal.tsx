
import React from 'react';
import { X, ArrowRight } from 'lucide-react';

export const DonateModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;

  const PayPalIcon = () => (
    <svg viewBox="0 0 24 24" fill="#0070BA" className="w-7 h-7"><path d="M7.483 18.014h3.206l.563-3.373.111-.665.186-1.112.015-.087.037-.222.04-.239.045-.27.033-.195.02-.123c-.004 0-.008-.002-.012-.004l-.007-.003-.005-.002a.498.498 0 00-.47-.282H7.28l-.348 2.083-.178 1.065zm5.06-7.85l.228-1.366c.07-.417.396-.713.818-.713h2.368c2.11 0 3.325 1.045 2.94 3.19-.34 1.896-1.745 2.91-3.69 2.91h-1.51l-.31 1.855-.042.247-.03.178-.06.357-.107.643-.01.06-.006.035a.5.5 0 00.485.553h.013l3.201-.002c.404 0 .75-.303.813-.704l.233-1.396.79-4.723c.12-.72-.345-1.37-1.07-1.37h-2.367c-.772 0-1.44.48-1.688 1.189l-.794 4.757zm-4.325 6.772l.96-5.753.112-.668c.07-.416.396-.712.818-.712h3.26c.433 0 .796.33.82.76l-.23 1.373c-.066.392-.38.67-.78.67h-2.91c-.432 0-.795.33-.82.76l-.733 4.387c-.017.102-.102.175-.205.175h-3.26c-.404 0-.75-.302-.813-.703z"/></svg>
  );
  const PhonePeIcon = () => (
    <svg viewBox="0 0 24 24" fill="#5f259f" className="w-7 h-7"><path d="M4.329 2.683c-.852.369-1.517.9-1.99 1.625-.516.795-.783 1.77-.783 2.927V16.7c0 1.144.267 2.112.8 2.9.475.72 1.137 1.25 1.983 1.62.89.4 1.95.603 3.18.603h8.34c1.237 0 2.3-.203 3.186-.603.84-.37 1.493-.9 1.968-1.62.533-.788.8-1.756.8-2.9V7.235c0-1.157-.266-2.132-.783-2.927-.474-.725-1.14-1.256-1.99-1.625C17.919 2.28 16.86 2.08 15.63 2.08h-8.34c-1.23 0-2.29.203-3.16.603zM12 5.17c3.41 0 6.18 2.77 6.18 6.18s-2.77 6.18-6.18 6.18S5.82 14.76 5.82 11.35 8.59 5.17 12 5.17z"/></svg>
  );
  const SwishIcon = () => (
    <svg viewBox="0 0 24 24" fill="#C5003E" className="w-7 h-7"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.15 13.64c-.45.31-.98.48-1.57.48-1.38 0-2.47-.79-2.82-1.89H15.5v-.01c0-2.09-1.5-3.87-3.5-3.87-1.81 0-3.23 1.42-3.46 3.19H6.5v.01c.21 2.35 2.19 4.19 4.65 4.19 1.05 0 2-.31 2.76-.85l-1.07-1.61z"/></svg>
  );

  // FIX: Changed JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
  const PaymentButton = ({ href, icon, platform, isMobileOnly = false }: { href: string, icon: React.ReactElement, platform: string, isMobileOnly?: boolean }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="w-full flex items-center gap-4 p-5 bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl transition-all hover:shadow-lg hover:scale-[1.02] group">
      {icon}
      <div className="flex-1">
        <span className="text-sm text-gray-500 dark:text-slate-400">Pay with</span>
        <span className="block font-bold text-lg text-gray-800 dark:text-slate-200">{platform}</span>
      </div>
      <ArrowRight className="text-gray-300 dark:text-slate-500 group-hover:text-indigo-500 transition-transform group-hover:translate-x-1" />
    </a>
  );

  return (
    <div className="fixed inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-scale-in transition-colors">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-3xl font-extrabold text-gray-800 dark:text-white text-center w-full">SECURE DONATION</h3>
          <button onClick={onClose} className="p-2 -mr-4 -mt-4 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors absolute right-6 top-6"><X size={20} className="text-gray-500 dark:text-slate-400" /></button>
        </div>
        <p className="text-gray-500 dark:text-slate-400 mb-8 text-center">Your support is greatly appreciated!</p>
        
        <div className="space-y-4">
          <PaymentButton href="https://paypal.me/mukthapurushotham" icon={<PayPalIcon />} platform="PayPal" />
          <PaymentButton href="phonepe://pay?pa=9741777435@ybl&pn=Purushotham%20Muktha&cu=INR" icon={<PhonePeIcon />} platform="PhonePe" isMobileOnly />
          <PaymentButton href="swish://payment?number=46764561036" icon={<SwishIcon />} platform="Swish" isMobileOnly />
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-6 text-center">
            Note: PhonePe and Swish links work best on mobile devices with the apps installed.
        </p>
      </div>
    </div>
  );
};
