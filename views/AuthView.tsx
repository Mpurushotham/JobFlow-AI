

import React, { useState, useEffect } from 'react';
import { Sparkles, KeyRound, Lock, User, LogIn, ShieldCheck, Mail, Phone, ArrowLeft, RefreshCw, CheckCircle, Smartphone, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import { useNotifications } from '../context/NotificationContext';
import { SubscriptionTier } from '../types'; // Import SubscriptionTier
import { CountryCodeInput } from '../components/CountryCodeInput'; // Import new component
import { isValidEmail, isValidPin } from '../utils/validationUtils'; // Import new utility

interface AuthViewProps {
  initialMode: 'login' | 'signup';
  // FIX: Updated onLoginSuccess type to include subscriptionTier
  onLoginSuccess: (username: string, isAdmin: boolean, subscriptionTier: SubscriptionTier) => void;
  onBack: () => void;
  authFlowState: 'welcome' | 'login' | 'signup' | 'forgot_credentials' | 'otp_verify'; // Added authFlowState
  setAuthFlowState: (state: 'welcome' | 'login' | 'signup' | 'forgot_credentials' | 'otp_verify') => void; // Added setAuthFlowState
}

const AuthView: React.FC<AuthViewProps> = ({ initialMode, onLoginSuccess, onBack, authFlowState, setAuthFlowState }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loginStep, setLoginStep] = useState(1); // 1 for pass, 2 for pin
  const [resetStep, setResetStep] = useState(1); // 1 for verify, 2 for new credentials
  const [simulatedOtp, setSimulatedOtp] = useState(''); // Simulated OTP state
  const [otpInput, setOtpInput] = useState(''); // User entered OTP
  
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [pinInputError, setPinInputError] = useState<string | null>(null); // For PIN in signup/reset
  const { addNotification } = useNotifications();

  // Removed the problematic useEffect that was preventing new signups.
  // The username uniqueness check is handled by authService.signup internally.

  // Reset states when switching between login/signup/forgot
  useEffect(() => {
    setError('');
    setEmailError(null);
    setPhoneError(null);
    setPinInputError(null);
    setLoginStep(1);
    setResetStep(1);
    setUsername('');
    setPassword('');
    setPin('');
    setEmail('');
    setPhone('');
    setConfirmPassword('');
    setSimulatedOtp('');
    setOtpInput('');
  }, [authFlowState]);

  const handleEmailChange = (value: string, validateNow: boolean = false) => {
    setEmail(value);
    if (validateNow && value && !isValidEmail(value)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (fullPhoneNumber: string, isValid: boolean) => {
    setPhone(fullPhoneNumber);
    if (fullPhoneNumber && !isValid) {
      setPhoneError('Please enter a valid phone number, including country code.');
    } else {
      setPhoneError(null);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPin = e.target.value;
    setPin(newPin);
    if (newPin && !isValidPin(newPin)) {
      setPinInputError('PIN must be 4 digits.');
    } else {
      setPinInputError(null);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (loginStep === 1) { // Check password
      setLoginStep(2);
    } else { // Check PIN and finalize login
      if (!isValidPin(pin)) {
        setError("MFA PIN must be 4 digits.");
        return;
      }

      const result = authService.login(username, password, pin);
      if (result.success && result.username && result.subscriptionTier) {
        addNotification(`Welcome back, ${username}!`, 'success');
        onLoginSuccess(result.username, result.isAdmin, result.subscriptionTier);
      } else {
        setError('Invalid credentials. Please try again.');
        setLoginStep(1); // Reset to password step if PIN fails
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
    if (!isValidPin(pin)) {
      return setError("MFA PIN must be 4 digits.");
    }
    if (emailError || phoneError) {
      return setError("Please correct the errors in your contact information.");
    }
    
    // Simulate OTP generation
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setSimulatedOtp(generatedOtp);
    addNotification(`A simulated OTP has been sent to ${email} / ${phone}. OTP: ${generatedOtp}`, 'info');
    setAuthFlowState('otp_verify');
  };

  const handleOtpVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Clear OTP states after attempt
    const currentOtpInput = otpInput;
    setOtpInput(''); 
    setSimulatedOtp('');

    if (currentOtpInput === simulatedOtp) {
        const success = authService.signup(username, password, pin, email, phone);
        if (success) {
            addNotification('Account created successfully!', 'success');
            const loginResult = authService.login(username, password, pin);
            if (loginResult.success && loginResult.username && loginResult.subscriptionTier) {
                onLoginSuccess(loginResult.username, loginResult.isAdmin, loginResult.subscriptionTier);
            } else {
                setError('Login failed after signup. Please try logging in manually.');
                setAuthFlowState('login');
            }
        } else {
            // This means signup failed due to username already existing
            setError('A user with this username already exists. Please login or choose a different username.');
            setAuthFlowState('login'); // Redirect to login for existing username
        }
    } else {
        setError('Invalid OTP. Please try again.');
    }
  };

  const handleForgotCredentialsVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (emailError || phoneError) {
      return setError("Please correct the errors in your contact information.");
    }
    // For client-side, we assume verification means matching existing user details
    const users = authService.getAllUsers();
    const userExists = users.some(u => u.username === username && u.email === email && u.phone === phone);

    if (userExists) {
        addNotification('User details verified. Please set your new credentials.', 'success');
        setResetStep(2);
    } else {
        setError('User not found or contact details do not match.');
    }
  };

  const handleForgotCredentialsReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    if (!isValidPin(pin)) {
      return setError("New MFA PIN must be 4 digits.");
    }

    if (authService.resetCredentialsByContact(username, email, phone, password, pin)) {
      addNotification('Your password and PIN have been reset successfully!', 'success');
      setAuthFlowState('login');
    } else {
      setError('Failed to reset credentials. Please verify your details and try again.');
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
           <button type="button" onClick={() => setAuthFlowState('forgot_credentials')} className="w-full text-sm text-gray-500 hover:text-indigo-600 mt-2">
              Forgot Password/PIN?
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
        <button type="button" onClick={() => setAuthFlowState('signup')} className="font-bold text-indigo-600 hover:underline">
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
          <input 
            type="email" 
            value={email} 
            onChange={e => handleEmailChange(e.target.value)} 
            onBlur={() => handleEmailChange(email, true)} // Validate on blur
            required 
            className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
      </div>
       <div>
        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Phone Number</label>
        <div className="relative mt-2">
          <CountryCodeInput 
            value={phone}
            onChange={handlePhoneChange}
            error={phoneError}
          />
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
          <input 
            type="password" 
            value={pin} 
            onChange={handlePinChange} 
            onBlur={() => handlePinChange({target: {value: pin}} as React.ChangeEvent<HTMLInputElement>)} // Validate on blur
            maxLength={4} 
            required 
            className="w-full pl-12 pr-4 py-3 tracking-[1em] bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
          />
        </div>
        {pinInputError && <p className="mt-1 text-xs text-red-500">{pinInputError}</p>}
      </div>
      <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors">Create Account</button>
      <p className="text-center text-sm">
        Already have an account?{' '}
        <button type="button" onClick={() => setAuthFlowState('login')} className="font-bold text-indigo-600 hover:underline">
          Login
        </button>
      </p>
    </form>
  );

  const renderOtpVerificationForm = () => (
    <form onSubmit={handleOtpVerification} className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Verify Your Account</h2>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            A simulated OTP has been sent. Please enter it to complete signup.
        </p>
        {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center text-sm">{error}</p>}

        <div>
            <label className="text-sm font-bold text-gray-600 dark:text-slate-400">OTP</label>
            <div className="relative mt-2">
                <Smartphone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} maxLength={6} required autoFocus className="w-full pl-12 pr-4 py-3 tracking-widest bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
        </div>
        <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            Verify <CheckCircle size={18} />
        </button>
         <p className="text-center text-sm">
            Didn't receive OTP?{' '}
            <button type="button" onClick={() => addNotification(`New simulated OTP: ${simulatedOtp}`, 'info')} className="font-bold text-indigo-600 hover:underline">
              Resend OTP
            </button>
          </p>
    </form>
  );

  const renderForgotCredentialsForm = () => (
    <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">Reset Credentials</h2>
        <p className="text-center text-sm text-gray-500 dark:text-slate-400">
            {resetStep === 1 ? 'Enter your username and registered contact details to verify your identity.' : 'Set your new password and 4-digit PIN.'}
        </p>
        {error && <p className="text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg text-center text-sm">{error}</p>}
        
        {resetStep === 1 ? (
            <form onSubmit={handleForgotCredentialsVerify} className="space-y-4">
                <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Username</label>
                    <div className="relative mt-2">
                        <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Registered Email</label>
                    <div className="relative mt-2">
                        <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="email" 
                          value={email} 
                          onChange={e => handleEmailChange(e.target.value)} 
                          onBlur={() => handleEmailChange(email, true)} // Validate on blur
                          required 
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>
                    {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Registered Phone</label>
                    <div className="relative mt-2">
                        <CountryCodeInput 
                          value={phone}
                          onChange={handlePhoneChange}
                          error={phoneError}
                        />
                    </div>
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    Verify & Continue <ArrowRight size={18} />
                </button>
            </form>
        ) : (
            <form onSubmit={handleForgotCredentialsReset} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">New Password</label>
                        <div className="relative mt-2">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-600 dark:text-slate-400">Confirm Password</label>
                        <div className="relative mt-2">
                        <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="text-sm font-bold text-gray-600 dark:text-slate-400">New 4-Digit MFA PIN</label>
                    <div className="relative mt-2">
                        <ShieldCheck size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                          type="password" 
                          value={pin} 
                          onChange={handlePinChange} 
                          onBlur={() => handlePinChange({target: {value: pin}} as React.ChangeEvent<HTMLInputElement>)} // Validate on blur
                          maxLength={4} 
                          required 
                          className="w-full pl-12 pr-4 py-3 tracking-[1em] bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                        />
                    </div>
                    {pinInputError && <p className="mt-1 text-xs text-red-500">{pinInputError}</p>}
                </div>
                <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                    Set New Credentials <RefreshCw size={18} />
                </button>
            </form>
        )}
        <p className="text-center text-sm">
            Remembered your credentials?{' '}
            <button type="button" onClick={() => setAuthFlowState('login')} className="font-bold text-indigo-600 hover:underline">
                Back to Login
            </button>
        </p>
    </div>
  );


  const renderAuthFlow = () => {
    switch (authFlowState) {
      case 'login':
        return renderLoginForm();
      case 'signup':
        return renderSignupForm();
      case 'otp_verify':
        return renderOtpVerificationForm();
      case 'forgot_credentials':
        return renderForgotCredentialsForm();
      default:
        return null; // Should not happen
    }
  };

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
            {renderAuthFlow()}
        </div>
    </div>
  );
};

export default AuthView;