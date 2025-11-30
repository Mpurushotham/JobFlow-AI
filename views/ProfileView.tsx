import React, { useState } from 'react';
import { UserProfile, MasterResumeFitResult, SubscriptionTier } from '../types';
import { UserCircle, Mail, Phone, MapPin, Link as LinkIcon, Briefcase, FileText, Sparkles, Save, Edit2, Github, Globe, RefreshCcw, Target, CheckCircle, XCircle, Info, TrendingUp } from 'lucide-react';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay'; // Assuming this component exists
import { CountryCodeInput } from '../components/CountryCodeInput'; // Import new component
import { isValidEmail } from '../utils/validationUtils'; // Import new utility

interface ProfileViewProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSave }) => {
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [analyzingFit, setAnalyzingFit] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmailChange = (value: string) => {
    setFormData(prev => ({ ...prev, email: value }));
    if (value && !isValidEmail(value)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (fullPhoneNumber: string, isValid: boolean) => {
    setFormData(prev => ({ ...prev, phone: fullPhoneNumber }));
    if (fullPhoneNumber && !isValid) {
      setPhoneError('Please enter a valid phone number, including country code.');
    } else {
      setPhoneError(null);
    }
  };


  const handleSave = () => {
    if (emailError || phoneError) {
      addNotification('Please correct the errors in your contact information.', 'error');
      return;
    }
    onSave(formData);
    setIsEditing(false);
    addNotification('Profile saved successfully!', 'success');
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all profile data? This cannot be undone.")) {
      const emptyProfile: UserProfile = {
        name: '',
        title: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: '',
        resumeContent: '',
        targetRoles: '',
        targetJobDescription: '', // Clear this too
        masterResumeFit: '', // Clear this too
        // FIX: Ensure it always uses the profile's tier before resetting.
        subscriptionTier: profile.subscriptionTier, // Retain the user's current tier
      };
      setFormData(emptyProfile);
      onSave(emptyProfile);
      setIsEditing(true);
      addNotification('Profile data cleared.', 'info');
    }
  };

  const handleParseResume = async () => {
    if (!formData.resumeContent) {
      addNotification("Please paste resume text first.", 'error');
      return;
    }
    setParsing(true);
    try {
      const parsed = await geminiService.parseResume(formData.resumeContent);
      setFormData(prev => ({
        ...prev,
        name: parsed.fullName || prev.name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        parsedData: parsed
      }));
      if (parsed.email && !isValidEmail(parsed.email)) setEmailError('Invalid email extracted. Please review.');
      if (parsed.phone && !isValidPhoneNumber(parsed.phone)) setPhoneError('Invalid phone number extracted. Please review.');
      addNotification("Auto-filled contact details from resume!", 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to parse resume. The format might be too complex.", 'error');
      }
    } finally {
      setParsing(false);
    }
  };

  const handleAnalyzeMasterResumeFit = async () => {
    if (!formData.resumeContent) {
      addNotification("Please provide your master resume content first.", 'error');
      return;
    }
    if (!formData.targetJobDescription) {
      addNotification("Please paste a target job description for analysis.", 'error');
      return;
    }

    // Tier check for AI Pro feature
    if (profile.subscriptionTier === SubscriptionTier.FREE) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setAnalyzingFit(true);
    try {
      const result = await geminiService.analyzeMasterResumeFit(formData.resumeContent, formData.targetJobDescription);
      const updatedFormData = { ...formData, masterResumeFit: JSON.stringify(result) };
      setFormData(updatedFormData);
      onSave(updatedFormData); // Save updated profile immediately
      addNotification('Master resume fit analysis complete!', 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to analyze master resume fit. Please try again.", 'error');
      }
    } finally {
      setAnalyzingFit(false);
    }
  };

  const masterResumeFitResult: MasterResumeFitResult | null = formData.masterResumeFit ? JSON.parse(formData.masterResumeFit) : null;
  
  // Helper for basic phone number validation, to be used with parsed data
  const isValidPhoneNumber = (phoneNumber: string): boolean => {
    return /^\+?[0-9]{7,15}$/.test(phoneNumber);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-4">
      {/* Header / Identity Section */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 opacity-50"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
           <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg ring-4 ring-white dark:ring-slate-800">
                <UserCircle size={48} />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                  {formData.name || 'Your Name'}
                </h1>
                <div className="flex items-center gap-3">
                  <p className="text-lg text-indigo-600 dark:text-indigo-400 font-medium">
                    {formData.title || 'Job Title / Role'}
                  </p>
                  {profile.subscriptionTier && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${profile.subscriptionTier === SubscriptionTier.AI_PRO ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700/50 dark:text-slate-400'}`}>
                      <TrendingUp size={14} /> {profile.subscriptionTier === SubscriptionTier.AI_PRO ? 'AI Pro' : 'Free User'}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-slate-400">
                  {formData.location && <span className="flex items-center gap-1"><MapPin size={14}/> {formData.location}</span>}
                  {formData.email && <span className="flex items-center gap-1"><Mail size={14}/> {formData.email}</span>}
                  {formData.phone && <span className="flex items-center gap-1"><Phone size={14}/> {formData.phone}</span>}
                </div>
              </div>
           </div>
           
           <div className="flex gap-3 self-end md:self-center">
             {!isEditing ? (
               <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all">
                 <Edit2 size={18} /> Edit Profile
               </button>
             ) : (
               <>
                 <button onClick={handleClear} className="px-5 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors font-medium flex items-center gap-2">
                    <RefreshCcw size={16} /> Clear
                 </button>
                 <button onClick={() => setIsEditing(false)} className="px-5 py-3 text-gray-600 dark:text-slate-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
                 <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-all">
                   <Save size={18} /> Save Changes
                 </button>
               </>
             )}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Personal Details & Preferences */}
        <div className="space-y-8">
           <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Briefcase size={20} className="text-indigo-500"/> Professional Details
              </h3>
              
              <div className="space-y-5">
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600">Full Name</label>
                   <input disabled={!isEditing} value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. John Doe" />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600">Current Title</label>
                   <input disabled={!isEditing} value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Senior Developer" />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600">Target Roles</label>
                   <input disabled={!isEditing} value={formData.targetRoles || ''} onChange={e => handleChange('targetRoles', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Frontend Lead, Tech Lead" />
                 </div>
              </div>
           </div>

           <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Mail size={20} className="text-purple-500"/> Contact Info
              </h3>
              
              <div className="space-y-5">
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Email Address</label>
                   <input 
                    disabled={!isEditing} 
                    value={formData.email || ''} 
                    onChange={e => handleEmailChange(e.target.value)} 
                    onBlur={() => handleEmailChange(formData.email || '')} // Re-validate on blur
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                    placeholder="john@example.com" 
                   />
                   {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Phone Number</label>
                   <CountryCodeInput 
                      value={formData.phone || ''}
                      onChange={handlePhoneChange}
                      disabled={!isEditing}
                      error={phoneError}
                    />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Location</label>
                   <input disabled={!isEditing} value={formData.location || ''} onChange={e => handleChange('location', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="City, Country" />
                 </div>
                 
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">LinkedIn URL</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><LinkIcon size={16}/></div>
                     <input disabled={!isEditing} value={formData.linkedin || ''} onChange={e => handleChange('linkedin', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="linkedin.com/in/..." />
                   </div>
                 </div>

                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">GitHub URL</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><Github size={16}/></div>
                     <input disabled={!isEditing} value={formData.github || ''} onChange={e => handleChange('github', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="github.com/..." />
                   </div>
                 </div>

                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Portfolio Website</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><Globe size={16}/></div>
                     <input disabled={!isEditing} value={formData.website || ''} onChange={e => handleChange('website', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="myportfolio.com" />
                   </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: Master Resume & Target Role Fit */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[600px] space-y-8">
           <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex-1 flex flex-col overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 z-10">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <FileText size={20} className="text-emerald-500"/> Master Resume
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                      Paste your full resume text here. We use this to generate everything else.
                    </p>
                 </div>
                 {isEditing && (
                    <button 
                      onClick={handleParseResume} 
                      disabled={parsing}
                      className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors"
                    >
                      {parsing ? <span className="animate-pulse">Analyzing...</span> : <><Sparkles size={14}/> Auto-Extract Info</>}
                    </button>
                 )}
              </div>
              
              <div className="flex-1 p-6 bg-gray-50/50 dark:bg-slate-900/50 relative">
                 <textarea 
                   disabled={!isEditing}
                   className={`w-full h-full p-5 rounded-2xl border transition-all resize-none outline-none font-mono text-sm leading-relaxed custom-scrollbar
                      ${isEditing 
                        ? 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-gray-900 dark:text-white shadow-sm' 
                        : 'bg-transparent border-transparent text-gray-600 dark:text-slate-400'
                      }
                   `}
                   value={formData.resumeContent}
                   onChange={(e) => handleChange('resumeContent', e.target.value)}
                   placeholder={isEditing ? "Paste your full, detailed resume content here. This is the single source of truth for all AI features like match analysis, resume tailoring, and cover letter generation." : "No resume content has been added. Click 'Edit Profile' to paste your resume."}
                 />
                 {!formData.resumeContent && !isEditing && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-gray-300 dark:text-slate-600 font-bold text-2xl uppercase tracking-widest">No Resume Data</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Target Role Fit Analysis Section */}
           <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col overflow-hidden relative">
              {analyzingFit && <LoadingOverlay message="Analyzing master resume fit..." />}
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                 <Target size={20} className="text-fuchsia-500"/> Target Role Fit Analysis
              </h3>
              <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
                Paste a generic job description for your ideal role. We'll analyze your master resume against it to identify key strengths and gaps.
                <button 
                  title="This analysis helps identify overarching skill gaps in your master resume, not specific to one job application. These insights will power personalized skill development recommendations."
                  className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  <Info size={16} />
                </button>
              </p>
              
              <div className="group mb-5 flex-1">
                <textarea
                  disabled={!isEditing || analyzingFit}
                  value={formData.targetJobDescription || ''}
                  onChange={e => handleChange('targetJobDescription', e.target.value)}
                  className="w-full h-32 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all resize-none custom-scrollbar"
                  placeholder={isEditing ? "e.g., Senior Frontend Engineer with React expertise, strong problem-solving skills, and experience in scalable web applications." : "No target job description. Click 'Edit Profile' to add one."}
                />
              </div>

              <button
                onClick={handleAnalyzeMasterResumeFit}
                disabled={!isEditing || !formData.resumeContent || !formData.targetJobDescription || analyzingFit || profile.subscriptionTier === SubscriptionTier.FREE}
                className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2
                  ${!isEditing || !formData.resumeContent || !formData.targetJobDescription || profile.subscriptionTier === SubscriptionTier.FREE
                    ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none'
                  }`}
              >
                {analyzingFit ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />} 
                {analyzingFit ? 'Analyzing...' : (masterResumeFitResult ? 'Re-Analyze Fit' : 'Analyze Master Resume Fit')}
              </button>
              {profile.subscriptionTier === SubscriptionTier.FREE && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1">
                  <Info size={16}/> AI Pro feature. Upgrade to unlock this analysis.
                </p>
              )}

              {masterResumeFitResult && (
                <div className="mt-8 space-y-6 animate-fade-in border-t border-gray-100 dark:border-slate-700 pt-6">
                  <div className="flex items-center justify-center py-4">
                    <div className="relative h-40 w-40 flex items-center justify-center">
                       <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36">
                          <path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" />
                          <path className={`${masterResumeFitResult.score >= 80 ? 'text-green-500' : masterResumeFitResult.score >= 50 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`} strokeDasharray={`${masterResumeFitResult.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                       </svg>
                       <div className="absolute flex flex-col items-center">
                          <span className="text-4xl font-extrabold text-gray-800 dark:text-white">{masterResumeFitResult.score}%</span>
                          <span className="text-xs text-gray-400 uppercase font-bold tracking-wider mt-1">Overall Fit</span>
                       </div>
                    </div>
                  </div>
                  
                  <div className="bg-fuchsia-50/50 dark:bg-fuchsia-900/20 p-5 rounded-2xl border border-fuchsia-100 dark:border-fuchsia-800">
                    <p className="text-sm text-gray-700 dark:text-slate-300 italic leading-relaxed text-center">"{masterResumeFitResult.summary}"</p>
                  </div>

                  <div className="space-y-4">
                    {masterResumeFitResult.missingSkills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><XCircle size={14} className="text-red-400"/> Key Missing Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {masterResumeFitResult.missingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {masterResumeFitResult.matchingSkills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500"/> Key Matching Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {masterResumeFitResult.matchingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs font-bold rounded-lg border border-green-100 dark:border-green-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;