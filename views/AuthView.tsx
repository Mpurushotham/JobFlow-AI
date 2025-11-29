

import React, { useState, useEffect } from 'react';
import { Sparkles, KeyRound, Lock, User, LogIn, ShieldCheck, Mail, Phone, ArrowLeft } from 'lucide-react';
import { authService } from '../services/authService';
import { useNotifications } from '../context/NotificationContext';


interface AuthViewProps {
  initialMode: 'login' | 'signup';
  onLoginSuccess: (username: string, isAdmin: boolean) => void;
  onBack: () => void;
}

const AuthView: React.FC<AuthViewProps> = ({ initialMode, onLoginSuccess, onBack }) => {
  const [authMode, setAuthMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loginStep, setLoginStep] = useState(1); // 1 for pass, 2 for pin
  const [error, setError] = useState('');
  const { addNotification } = useNotifications();

  useEffect(() => {
    // If a user tries to sign up but one already exists, switch to login.
    if (initialMode === 'signup' && authService.doesAnyUserExist()) {
      setAuthMode('login');
      addNotification('An account already exists. Please log in.', 'info');
    }
  }, [initialMode]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginStep === 1) { // Check password
      setLoginStep(2);
    } else { // Check PIN and finalize login
      const result = authService.login(username, password, pin);
      if (result.success && result.username) {
        addNotification(`Welcome back, ${username}!`, 'success');
        onLoginSuccess(result.username, result.isAdmin);
      } else {
        setError('Invalid credentials. Please try again.');
        setLoginStep(1);
        setPassword('');
        setPin('');
      }
    }
  };

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return setError("MFA PIN must be 4 digits.");
    }

    const success = authService.signup(username, password, pin, email, phone);
    if (success) {
      addNotification('Account created successfully!', 'success');
      // After signup, log the user in automatically
      const loginResult = authService.login(username, password, pin);
      if (loginResult.success && loginResult.username) {
        onLoginSuccess(loginResult.username, loginResult.isAdmin);
      } else {
        // This case should ideally not happen if signup was successful
        setError('Login failed after signup. Please try logging in manually.');
        setAuthMode('login');
      }
    } else {
      setError('A user with this username already exists. Please login or choose a different username.');
      setAuthMode('login');
    }
  };
  
  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Welcome Back</h2>
      {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center text-sm">{error}</p>}
      
      {loginStep === 1 ? (
        <>
          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Username</label>
            <div className="relative mt-2">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Password</label>
            <div className="relative mt-2">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            Next <KeyRound size={18} />
          </button>
        </>
      ) : (
        <>
           <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">MFA PIN</label>
            <p className="text-xs text-gray-400 dark:text-slate-500 mb-2">Enter your 4-digit security PIN.</p>
            <div className="relative">
              <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} required autoFocus className="w-full pl-12 pr-4 py-3 tracking-[1em] bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
           <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            Login <LogIn size={18} />
          </button>
           <button type="button" onClick={() => { setLoginStep(1); setPin('');}} className="w-full py-2 text-sm text-gray-500 hover:text-indigo-600">Back to Password</button>
        </>
      )}
       <p className="text-center text-sm">
        Don't have an account?{' '}
        <button type="button" onClick={() => setAuthMode('signup')} className="font-bold text-indigo-600 hover:underline">
          Sign Up
        </button>
      </p>
    </form>
  );

  const renderSignupForm = () => (
    <form onSubmit={handleSignup} className="space-y-4 animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Create Account</h2>
      <p className="text-center text-sm text-gray-500 dark:text-slate-400">Setup your local, secure JobFlow AI profile.</p>
      {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center text-sm">{error}</p>}
      
      <div>
        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Username</label>
        <div className="relative mt-2">
          <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
      <div>
        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Email Address</label>
        <div className="relative mt-2">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
       <div>
        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Phone Number</label>
        <div className="relative mt-2">
          <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Password</label>
            <div className="relative mt-2">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
        </div>
        <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Confirm</label>
            <div className="relative mt-2">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
        </div>
      </div>
       <div>
        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">4-Digit MFA PIN</label>
        <div className="relative mt-2">
          <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} required className="w-full pl-12 pr-4 py-3 tracking-[1em] bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>
      </div>
      <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Create Account</button>
      <p className="text-center text-sm">
        Already have an account?{' '}
        <button type="button" onClick={() => setAuthMode('login')} className="font-bold text-indigo-600 hover:underline">
          Login
        </button>
      </p>
    </form>
  );

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative">
        <button onClick={onBack} className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={16} /> Back to Home
        </button>
        <div className="flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
            <Sparkles size={24} />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white tracking-tight">JobFlow AI</h1>
        </div>
        <div className="w-full max-w-md bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-slate-700">
            {authMode === 'login' ? renderLoginForm() : renderSignupForm()}
        </div>
    </div>
  );
};

export default AuthView;
