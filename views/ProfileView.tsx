


import React, { useState, useRef } from 'react';
import { UserProfile, MasterResumeFitResult, SubscriptionTier, AppBackupData, LogActionType, ResumeData, ViewState } from '../types';
import { UserCircle, Mail, Phone, MapPin, Link as LinkIcon, Briefcase, FileText, Sparkles, Save, Edit2, Github, Globe, RefreshCcw, Target, CheckCircle, XCircle, Info, TrendingUp, UploadCloud, DownloadCloud, Database, FileCheck, ArrowRight } from 'lucide-react'; 
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { CountryCodeInput } from '../components/CountryCodeInput';
import { isValidEmail, isValidPhoneNumber } from '../utils/validationUtils';
import { storageService } from '../services/storageService'; // Import storageService
import { useAuth } from '../context/AuthContext'; // Import useAuth to get currentUser
import { logService } from '../services/logService'; // Import logService
// FIX: Import convertResumeDataToMarkdown from utils
import { convertResumeDataToMarkdown } from '../utils/resumeMarkdown';

interface ProfileViewProps {
  profile: UserProfile;
  onSave: (p: UserProfile) => Promise<void>; // onSave is now async
  currentUser: string; // Add currentUser prop
  setView: (view: ViewState) => void; // FIX: Add setView prop
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile, onSave, currentUser, setView }) => {
  const { isAdmin, subscriptionTier } = useAuth(); // Get currentUser from AuthContext, add setView for navigation
  const [formData, setFormData] = useState(profile);
  const [isEditing, setIsEditing] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generatingStructuredResume, setGeneratingStructuredResume] = useState(false); // New state for structured resume generation
  const [analyzingFit, setAnalyzingFit] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOffline = !navigator.onLine;

  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEmailChange = (value: string, validateNow: boolean = false) => {
    const trimmedValue = value.trim();
    setFormData(prev => ({ ...prev, email: trimmedValue }));
    if (validateNow && trimmedValue && !isValidEmail(trimmedValue)) {
      setEmailError('Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handlePhoneChange = (fullPhoneNumber: string, isValid: boolean) => {
    const trimmedNumber = fullPhoneNumber.trim();
    setFormData(prev => ({ ...prev, phone: trimmedNumber }));
    if (trimmedNumber && !isValid && trimmedNumber !== '') { // Only show error if not empty
      setPhoneError('Please enter a valid phone number, including country code.');
    } else {
      setPhoneError(null);
    }
  };


  const handleSave = async () => {
    if (emailError || phoneError) {
      addNotification('Please correct the errors in your contact information.', 'error');
      logService.log(currentUser, LogActionType.PROFILE_SAVE, 'Attempted to save profile with validation errors.', 'warn');
      return;
    }
    await onSave(formData);
    setIsEditing(false);
    addNotification('Profile saved successfully!', 'success');
    logService.log(currentUser, LogActionType.PROFILE_SAVE, `Profile for "${currentUser}" saved.`, 'info');
  };

  const handleClear = async () => {
    if (confirm("Are you sure you want to clear all profile data? This cannot be undone.")) {
      const emptyProfile: UserProfile = {
        name: currentUser, // Keep current username
        title: '',
        email: '',
        phone: '',
        location: '',
        linkedin: '',
        github: '',
        website: '',
        portfolio: '',
        resumeContent: '',
        targetRoles: '',
        targetJobDescription: '', 
        masterResumeFit: '', 
        structuredResume: null, // Clear structured resume too
        subscriptionTier: profile.subscriptionTier, // Retain the user's current tier
      };
      setFormData(emptyProfile);
      await onSave(emptyProfile);
      setIsEditing(true);
      addNotification('Profile data cleared.', 'info');
      logService.log(currentUser, LogActionType.PROFILE_SAVE, 'Profile data cleared.', 'warn');
    }
  };

  const handleParseResume = async () => {
    if (isOffline) {
      addNotification("Cannot parse resume: You are offline.", "info");
      logService.log(currentUser, LogActionType.RESUME_PARSE, 'Attempted to parse resume while offline.', 'warn');
      return;
    }
    if (!formData.resumeContent) {
      addNotification("Please paste resume text first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_PARSE, 'Attempted to parse empty resume content.', 'warn');
      return;
    }
    setParsing(true);
    try {
      // Corrected call to geminiService.parseResume
      const parsed: ResumeData = await geminiService.parseResume(formData.resumeContent, currentUser);
      
      // Update formData with parsed contact details, which will be saved to structuredResume later
      const updatedFormData: UserProfile = {
        ...formData,
        name: parsed.contact.name || formData.name,
        email: parsed.contact.email || formData.email,
        phone: parsed.contact.phone || formData.phone,
        location: parsed.contact.location || formData.location,
        linkedin: parsed.contact.linkedin || formData.linkedin,
        github: parsed.contact.github || formData.github,
        website: parsed.contact.website || formData.website,
        portfolio: parsed.contact.portfolio || formData.portfolio,
        // The structuredResume will also be updated with the result of parsing if user clicks "Generate Structured Resume"
      };
      setFormData(updatedFormData);
      await onSave(updatedFormData); // Save updated profile immediately
      
      if (parsed.contact.email && !isValidEmail(parsed.contact.email)) setEmailError('Invalid email extracted. Please review.');
      if (parsed.contact.phone && !isValidPhoneNumber(parsed.contact.phone)) setPhoneError('Invalid phone extracted. Please review.');

      addNotification("Auto-filled contact details from resume!", 'success');
      logService.log(currentUser, LogActionType.RESUME_PARSE, 'Resume parsed successfully, contact details updated.', 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Resume parse rate limit exceeded.`, 'warn');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot parse resume: You are offline.", "info");
      } else {
        addNotification("Failed to parse resume. The format might be too complex.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Resume parsing failed: ${e.message}`, 'error');
      }
    } finally {
      setParsing(false);
    }
  };

  const handleGenerateStructuredResume = async () => {
    if (isOffline) {
      addNotification("Cannot generate structured resume: You are offline.", "info");
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Blocked structured resume generation while offline.', 'warn');
      return;
    }
    if (!formData.resumeContent) {
      addNotification("Please paste your raw resume text first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Attempted structured resume generation with empty raw resume.', 'warn');
      return;
    }
    // Tier check for AI Pro feature
    if (subscriptionTier === SubscriptionTier.FREE) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Blocked structured resume generation: AI Pro feature for Free user.', 'warn');
      return;
    }

    setGeneratingStructuredResume(true);
    try {
      const structuredResume: ResumeData = await geminiService.generateStructuredResume(formData.resumeContent, profile, currentUser);
      const updatedFormData = { ...formData, structuredResume };
      setFormData(updatedFormData);
      await onSave(updatedFormData);
      addNotification('Structured resume generated successfully! Now open the Resume Builder.', 'success');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Structured resume generated successfully.', 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Structured resume generation rate limit exceeded.`, 'warn');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot generate structured resume: You are offline.", "info");
      } else {
        addNotification("Failed to generate structured resume. The format might be too complex or an error occurred.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Structured resume generation failed: ${e.message}`, 'error');
      }
    } finally {
      setGeneratingStructuredResume(false);
    }
  };


  const handleAnalyzeMasterResumeFit = async () => {
    if (isOffline) {
      addNotification("Cannot analyze resume fit: You are offline.", "info");
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Attempted master resume fit analysis while offline.', 'warn');
      return;
    }
    if (!formData.resumeContent && !formData.structuredResume) {
      addNotification("Please provide your master resume content or structured resume first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Attempted master resume fit analysis with no resume content.', 'warn');
      return;
    }
    if (!formData.targetJobDescription) {
      addNotification("Please paste a target job description for analysis.", 'error');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Attempted master resume fit analysis with empty target job description.', 'warn');
      return;
    }

    // Tier check for AI Pro feature
    if (subscriptionTier === SubscriptionTier.FREE) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Blocked master resume fit analysis: AI Pro feature for Free user.', 'warn');
      return;
    }

    setAnalyzingFit(true);
    try {
      // FIX: Use the imported convertResumeDataToMarkdown function directly.
      const resumeForAnalysis = formData.structuredResume ? convertResumeDataToMarkdown(formData.structuredResume) : formData.resumeContent;
      const result = await geminiService.analyzeMasterResumeFit(resumeForAnalysis, formData.targetJobDescription, currentUser);
      const updatedFormData = { ...formData, masterResumeFit: JSON.stringify(result) };
      setFormData(updatedFormData);
      await onSave(updatedFormData); // Save updated profile immediately
      addNotification('Master resume fit analysis complete!', 'success');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, `Master resume fit analysis completed with score ${result.score}.`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Master resume fit analysis rate limit exceeded.`, 'warn');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot analyze resume fit: You are offline.", "info");
      } else {
        addNotification("Failed to analyze master resume fit. Please try again.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Master resume fit analysis failed: ${e.message}`, 'error');
      }
    } finally {
      setAnalyzingFit(false);
    }
  };

  const masterResumeFitResult: MasterResumeFitResult | null = formData.masterResumeFit ? JSON.parse(formData.masterResumeFit) : null;
  
  // --- Backup/Restore Handlers ---
  const handleExportData = async () => {
    if (!currentUser) {
      addNotification('Please log in to export your data.', 'error');
      logService.log('guest', LogActionType.ADMIN_DATA_EXPORT, 'Attempted to export data without being logged in.', 'warn');
      return;
    }
    try {
      const data = await storageService.exportAllUserData(currentUser);
      if (data) {
        const filename = `jobflow_backup_${currentUser}_${new Date().toISOString().split('T')[0]}.json`;
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addNotification('Your data has been exported successfully!', 'success');
        logService.log(currentUser, LogActionType.ADMIN_DATA_EXPORT, 'User data exported successfully.', 'info');
      } else {
        addNotification('Failed to export data. No user data found.', 'error');
        logService.log(currentUser, LogActionType.ADMIN_DATA_EXPORT, 'Failed to export user data: no data found.', 'warn');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      addNotification('Failed to export data.', 'error');
      logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Error exporting user data: ${error}`, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const content = event.target?.result as string;
          const backupData: AppBackupData = JSON.parse(content);
          if (currentUser) {
            await storageService.importAllUserData(backupData, currentUser);
            addNotification('Data imported successfully! Reloading application...', 'success');
            logService.log(currentUser, LogActionType.ADMIN_DATA_IMPORT, 'User data imported successfully.', 'info');
            setTimeout(() => window.location.reload(), 1500); 
          } else {
            addNotification('Please log in before importing data.', 'error');
            logService.log('guest', LogActionType.ADMIN_DATA_IMPORT, 'Attempted to import data without being logged in.', 'warn');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          addNotification('Failed to import data. Please ensure it is a valid JobFlow AI JSON backup file.', 'error');
          logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Error importing user data: ${error}`, 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const triggerImport = () => {
    fileInputRef.current?.click();
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
                   <input disabled={!isEditing} value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. John Doe" aria-label="Full Name" />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600">Current Title</label>
                   <input disabled={!isEditing} value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Senior Developer" aria-label="Current Title" />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-indigo-600">Target Roles</label>
                   <input disabled={!isEditing} value={formData.targetRoles || ''} onChange={e => handleChange('targetRoles', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all" placeholder="e.g. Frontend Lead, Tech Lead" aria-label="Target Roles" />
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
                    onBlur={() => handleEmailChange(formData.email || '', true)} // Re-validate on blur
                    className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all" 
                    placeholder="john@example.com" 
                    aria-invalid={emailError ? "true" : "false"}
                    aria-describedby="email-error"
                    aria-label="Email Address"
                   />
                   {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-red-500">{emailError}</p>}
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Phone Number</label>
                   <CountryCodeInput 
                      value={formData.phone || ''}
                      onChange={handlePhoneChange}
                      disabled={!isEditing}
                      error={phoneError}
                      onBlur={(e) => handlePhoneChange(e.currentTarget.value || '', isValidPhoneNumber(e.currentTarget.value || ''))}
                    />
                 </div>
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Location</label>
                   <input disabled={!isEditing} value={formData.location || ''} onChange={e => handleChange('location', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-purple-500 outline-none transition-all" placeholder="City, Country" aria-label="Location" />
                 </div>
                 
                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">LinkedIn URL</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><LinkIcon size={16}/></div>
                     <input disabled={!isEditing} value={formData.linkedin || ''} onChange={e => handleChange('linkedin', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="linkedin.com/in/..." aria-label="LinkedIn URL" />
                   </div>
                 </div>

                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">GitHub URL</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><Github size={16}/></div>
                     <input disabled={!isEditing} value={formData.github || ''} onChange={e => handleChange('github', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="github.com/..." aria-label="GitHub URL" />
                   </div>
                 </div>

                 <div className="group">
                   <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 group-focus-within:text-purple-600">Portfolio Website</label>
                   <div className="flex items-center bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-purple-500 transition-all">
                     <div className="pl-3 text-gray-400"><Globe size={16}/></div>
                     <input disabled={!isEditing} value={formData.website || ''} onChange={e => handleChange('website', e.target.value)} className="w-full bg-transparent p-3 text-gray-900 dark:text-white font-medium outline-none" placeholder="myportfolio.com" aria-label="Portfolio Website" />
                   </div>
                 </div>
              </div>
           </div>

           {/* Data Management Section */}
           <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 transition-colors">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                <Database size={20} className="text-teal-500"/> Data Management
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Export or import your personal JobFlow AI data. This is stored locally in your browser.
              </p>
              <div className="space-y-4">
                 <button onClick={handleExportData} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold shadow-md shadow-teal-200 dark:shadow-none transition-all" aria-label="Export all my data">
                   <DownloadCloud size={18} /> Export My Data
                 </button>
                 <input 
                   type="file" 
                   ref={fileInputRef as React.RefObject<HTMLInputElement>} // Explicitly cast to HTMLInputElement
                   onChange={handleFileChange} 
                   accept=".json" 
                   className="hidden" 
                   aria-label="Upload data file"
                 />
                 <button onClick={triggerImport} className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-all" aria-label="Import data from file">
                   <UploadCloud size={18} /> Import Data
                 </button>
              </div>
           </div>

        </div>

        {/* Right Column: Master Resume & Target Role Fit */}
        <div className="lg:col-span-2 flex flex-col h-full min-h-[600px] space-y-8">
           <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 flex-1 flex-col overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 z-10">
                 <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                       <FileText size={20} className="text-emerald-500"/> Master Resume
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                      Paste your full resume text here. This is the single source of truth for all AI features.
                    </p>
                 </div>
                 <div className="flex gap-2">
                  {isEditing && (
                    <button 
                      onClick={handleParseResume} 
                      disabled={parsing || isOffline} 
                      className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={parsing ? "Analyzing resume" : "Auto-extract information from resume"}
                      title={isOffline ? "Requires internet connection" : (parsing ? "Analyzing resume..." : "Auto-extract information from resume")}
                    >
                      {parsing ? <span className="animate-pulse">Analyzing...</span> : <><Sparkles size={14}/> Auto-Extract Info</>}
                    </button>
                  )}
                  <button 
                    onClick={() => setView('RESUME_BUILDER')}
                    disabled={!formData.structuredResume}
                    className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!formData.structuredResume ? "Generate structured resume first (AI Pro feature)" : "Open resume builder"}
                    aria-label="Open Resume Builder"
                  >
                    Open Resume Builder <ArrowRight size={14}/>
                  </button>
                 </div>
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
                   aria-label="Master Resume Content"
                 />
                 {!formData.resumeContent && !isEditing && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-gray-300 dark:text-slate-600 font-bold text-2xl uppercase tracking-widest">No Resume Data</p>
                   </div>
                 )}
              </div>
              <div className="p-6 border-t border-gray-100 dark:border-slate-700 flex justify-end bg-white dark:bg-slate-800 z-10">
                 {isEditing && (
                   <button 
                     onClick={handleGenerateStructuredResume}
                     disabled={generatingStructuredResume || isOffline || !formData.resumeContent || subscriptionTier === SubscriptionTier.FREE}
                     className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm
                       ${(generatingStructuredResume || isOffline || !formData.resumeContent || subscriptionTier === SubscriptionTier.FREE) 
                         ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400' 
                         : 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 hover:bg-fuchsia-200 dark:hover:bg-fuchsia-900/50'
                       }`}
                       aria-label={generatingStructuredResume ? "Generating structured resume..." : "Generate Structured Resume for Builder"}
                       title={isOffline ? "Requires internet connection" : !formData.resumeContent ? "Paste resume content first" : (subscriptionTier === SubscriptionTier.FREE ? "AI Pro feature. Upgrade to unlock." : "Generate structured data for the resume builder")}
                   >
                     {generatingStructuredResume ? <RefreshCcw size={14} className="animate-spin"/> : <Sparkles size={14}/>} 
                     {generatingStructuredResume ? "Generating..." : "Generate Structured Resume"}
                   </button>
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
                <span 
                  title="This analysis helps identify overarching skill gaps in your master resume, not specific to one job application. These insights will power personalized skill development recommendations."
                  className="ml-2 text-indigo-400 hover:text-indigo-600 transition-colors cursor-help"
                  aria-label="Information about target role fit analysis"
                >
                  <Info size={16} />
                </span>
              </p>
              
              <div className="group mb-5 flex-1">
                <textarea
                  disabled={!isEditing || analyzingFit || isOffline} // Disable if offline
                  value={formData.targetJobDescription || ''}
                  onChange={e => handleChange('targetJobDescription', e.target.value)}
                  className="w-full h-32 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-fuchsia-500 outline-none transition-all resize-none custom-scrollbar"
                  placeholder={isEditing ? "e.g., Senior Frontend Engineer with React expertise, strong problem-solving skills, and experience in scalable web applications." : "No target job description. Click 'Edit Profile' to add one."}
                  aria-label="Target Job Description"
                  title={isOffline ? "Requires internet connection" : ""}
                />
              </div>

              <button
                onClick={handleAnalyzeMasterResumeFit}
                disabled={!isEditing || (!formData.resumeContent && !formData.structuredResume) || !formData.targetJobDescription || analyzingFit || subscriptionTier === SubscriptionTier.FREE || isOffline}
                className={`w-full py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2
                  ${(!isEditing || (!formData.resumeContent && !formData.structuredResume) || !formData.targetJobDescription || subscriptionTier === SubscriptionTier.FREE || isOffline)
                    ? 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none'
                  }`}
                aria-label={analyzingFit ? "Analyzing..." : (masterResumeFitResult ? "Re-analyze Master Resume Fit" : "Analyze Master Resume Fit")}
                title={isOffline ? "Requires internet connection" : (!formData.resumeContent && !formData.structuredResume) ? "Add your master resume in Profile to use this feature" : (!formData.targetJobDescription ? "Add target job description to use this feature" : (subscriptionTier === SubscriptionTier.FREE ? "AI Pro feature. Upgrade to unlock." : ""))}
              >
                {analyzingFit ? <RefreshCcw size={18} className="animate-spin" /> : <Sparkles size={18} />} 
                {analyzingFit ? 'Analyzing...' : (masterResumeFitResult ? 'Re-Analyze Fit' : 'Analyze Master Resume Fit')}
              </button>
              {subscriptionTier === SubscriptionTier.FREE && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1" role="alert">
                  <Info size={16}/> AI Pro feature. Upgrade to unlock this analysis.
                </p>
              )}
              {isOffline && (
                <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1" role="alert">
                  <Info size={16}/> Offline: This feature requires an internet connection.
                </p>
              )}

              {masterResumeFitResult && (
                <div className="mt-8 space-y-6 animate-fade-in border-t border-gray-100 dark:border-slate-700 pt-6">
                  <div className="flex items-center justify-center py-4" role="meter" aria-valuenow={masterResumeFitResult.score} aria-valuemin={0} aria-valuemax={100} aria-label="Overall Fit Score">
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
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><XCircle size={14} className="text-red-400" aria-hidden="true"/> Key Missing Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {masterResumeFitResult.missingSkills.map((s: string) => (
                            <span key={s} className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-bold rounded-lg border border-red-100 dark:border-red-900/30">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {masterResumeFitResult.matchingSkills.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 flex items-center gap-1"><CheckCircle size={14} className="text-green-500" aria-hidden="true"/> Key Matching Skills</h4>
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