import React, { useState, useEffect, useCallback } from 'react';
import { UserProfile, ResumeData, ResumeATSScore, SubscriptionTier, LogActionType, ContactInfo, ResumeSection, ExperienceItem, EducationItem, SkillItem, ProjectItem, CertificationItem, AwardItem } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { geminiService } from '../services/geminiService';
import { LoadingOverlay } from '../components/LoadingOverlay';
import ReactMarkdown from 'react-markdown';
import { convertResumeDataToMarkdown } from '../utils/resumeMarkdown';
import { handlePrintPDF, downloadDocx } from '../utils/exportUtils';
import { ResumeMarkdownComponents } from '../utils/resumeMarkdown'; // For live preview
import { UserCircle, Mail, Phone, MapPin, Link as LinkIcon, Briefcase, FileText, Sparkles, Save, Edit2, Github, Globe, RefreshCcw, Target, CheckCircle, XCircle, Info, TrendingUp, UploadCloud, DownloadCloud, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, BookOpen, Terminal, Lightbulb, Award, FileDown, FileType } from 'lucide-react';
import { isValidEmail, isValidPhoneNumber } from '../utils/validationUtils';
import { CountryCodeInput } from '../components/CountryCodeInput';
import { logService } from '../services/logService';

interface ResumeBuilderViewProps {
  profile: UserProfile;
  onSaveProfile: (p: UserProfile) => Promise<void>;
  currentUser: string;
  subscriptionTier: SubscriptionTier | null;
}

const SECTION_ORDER_MAP: Record<ResumeSection['type'], number> = {
  text: 0, // Should rarely be top-level, mostly for generic text blocks
  skills: 10,
  experience: 20,
  projects: 30,
  education: 40,
  certifications: 50,
  awards: 60,
};

const ResumeBuilderView: React.FC<ResumeBuilderViewProps> = ({ profile, onSaveProfile, currentUser, subscriptionTier }) => {
  const [resumeData, setResumeData] = useState<ResumeData | null>(profile.structuredResume || null);
  const [atsScore, setAtsScore] = useState<ResumeATSScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [targetJobDescription, setTargetJobDescription] = useState(''); // For ATS evaluation
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  const isOffline = !navigator.onLine;

  useEffect(() => {
    // If profile.structuredResume is updated externally (e.g., in ProfileView), sync it here
    setResumeData(profile.structuredResume || null);
    logService.log(currentUser, LogActionType.RESUME_BUILDER_OPEN, 'Resume builder opened.', 'info');
  }, [profile.structuredResume, currentUser]);

  const handleUpdateResumeData = useCallback((newData: ResumeData) => {
    setResumeData(newData);
    // Auto-save to profile
    onSaveProfile({ ...profile, structuredResume: newData });
    logService.log(currentUser, LogActionType.RESUME_BUILDER_SECTION_EDIT, `Resume data updated.`, 'debug');
  }, [profile, onSaveProfile, currentUser]);

  const handleAutofillFromRawResume = async () => {
    if (isOffline) {
      addNotification("Cannot auto-fill resume: You are offline.", "info");
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Blocked auto-fill while offline.', 'warn');
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please paste your raw resume text in the Profile section first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Attempted auto-fill with empty raw resume.', 'warn');
      return;
    }
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Blocked auto-fill: AI Pro feature for Free user.', 'warn');
      return;
    }

    setLoading(true);
    try {
      const result = await geminiService.generateStructuredResume(profile.resumeContent, profile, currentUser);
      handleUpdateResumeData(result);
      addNotification("Resume structured successfully from raw text!", 'success');
      logService.log(currentUser, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Structured resume auto-filled from raw text.', 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot auto-fill resume: You are offline.", "info");
      } else {
        addNotification("Failed to auto-fill resume. Please try again or check raw resume format.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `Auto-fill structured resume failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateATSScore = async () => {
    if (isOffline) {
      addNotification("Cannot evaluate ATS score: You are offline.", "info");
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Blocked ATS evaluation while offline.', 'warn');
      return;
    }
    if (!resumeData) {
      addNotification("Please build your resume first.", 'error');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Attempted ATS evaluation with empty resume data.', 'warn');
      return;
    }
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, 'Blocked ATS evaluation: AI Pro feature for Free user.', 'warn');
      return;
    }

    setLoading(true);
    try {
      const score = await geminiService.evaluateATSScore(resumeData, targetJobDescription || undefined, currentUser);
      setAtsScore(score);
      addNotification("ATS score evaluated successfully!", 'success');
      logService.log(currentUser, LogActionType.RESUME_ATS_EVALUATED, `ATS score evaluated with score ${score.score}.`, 'info');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot evaluate ATS score: You are offline.", "info");
      } else {
        addNotification("Failed to evaluate ATS score. Please try again.", 'error');
        logService.log(currentUser, LogActionType.ERROR_OCCURRED, `ATS score evaluation failed: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!resumeData) {
      addNotification("No resume to download. Please build your resume first.", 'error');
      return;
    }
    handlePrintPDF(convertResumeDataToMarkdown(resumeData), `Resume_${resumeData.contact.name || 'JobFlowAI'}`);
    addNotification("Resume PDF initiated!", 'info');
    logService.log(currentUser, LogActionType.RESUME_DOWNLOAD, `Resume PDF downloaded for ${profile.name}.`, 'info');
  };

  const handleDownloadDocx = () => {
    if (!resumeData) {
      addNotification("No resume to download. Please build your resume first.", 'error');
      return;
    }
    downloadDocx(convertResumeDataToMarkdown(resumeData), `Resume_${resumeData.contact.name || 'JobFlowAI'}`);
    addNotification("Resume DOCX initiated! (Note: This is an HTML-based .doc file)", 'info');
    logService.log(currentUser, LogActionType.RESUME_DOWNLOAD_DOCX, `Resume DOCX downloaded for ${profile.name}.`, 'info');
  };


  // Helper for adding/removing/reordering sections (simplified)
  const addSection = (type: ResumeSection['type']) => {
    if (!resumeData) {
      setResumeData({ // Initialize if null
        contact: { name: profile.name || '', email: profile.email || '', phone: profile.phone || '' },
        summary: '',
        sections: []
      });
      addNotification("Resume data initialized. Please fill out contact info.", "info");
      return;
    }

    const newSection: ResumeSection = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // Unique ID
      title: type.charAt(0).toUpperCase() + type.slice(1).replace(/s$/, 's'), // e.g., "Experience" -> "Experiences"
      type: type,
      order: (resumeData?.sections.length || 0) * 10 + (SECTION_ORDER_MAP[type] || 0), // Basic ordering
      content: type === 'text' ? '' : [], // Initialize based on type
    };
    // Ensure title is plural for specific types for consistency
    if (newSection.type === 'experience') newSection.title = 'Work Experience';
    if (newSection.type === 'education') newSection.title = 'Education';
    if (newSection.type === 'projects') newSection.title = 'Projects';
    if (newSection.type === 'certifications') newSection.title = 'Certifications';
    if (newSection.type === 'awards') newSection.title = 'Awards';
    if (newSection.type === 'skills') newSection.title = 'Skills';

    const updatedSections = [...(resumeData?.sections || []), newSection].sort((a,b) => a.order - b.order);
    handleUpdateResumeData({ ...resumeData, sections: updatedSections });
    logService.log(currentUser, LogActionType.RESUME_BUILDER_SECTION_EDIT, `Added new section: ${type}.`, 'info');
  };

  const removeSection = (id: string) => {
    if (!resumeData) return;
    const updatedSections = resumeData.sections.filter(s => s.id !== id);
    handleUpdateResumeData({ ...resumeData, sections: updatedSections });
    logService.log(currentUser, LogActionType.RESUME_BUILDER_SECTION_EDIT, `Removed section with ID ${id}.`, 'info');
  };

  const moveSection = (id: string, direction: 'up' | 'down') => {
    if (!resumeData) return;
    const sections = [...resumeData.sections].sort((a,b) => a.order - b.order); // Ensure sorted for correct index
    const index = sections.findIndex(s => s.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex >= 0 && newIndex < sections.length) {
      const [movedSection] = sections.splice(index, 1);
      sections.splice(newIndex, 0, movedSection);
      // Re-evaluate order based on new array position
      const reorderedSections = sections.map((s, i) => ({ ...s, order: i * 10 }));
      handleUpdateResumeData({ ...resumeData, sections: reorderedSections });
      logService.log(currentUser, LogActionType.RESUME_BUILDER_SECTION_EDIT, `Moved section ${id} ${direction}.`, 'info');
    }
  };
  
  // Conditionally render feature overlay for free users
  const ProFeatureOverlay = ({ children }: { children: React.ReactNode }) => (
    !isAIPro ? (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
        <TrendingUp size={64} className="text-purple-500 mb-4" />
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
        <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
          This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your resume!
        </p>
      </div>
    ) : <>{children}</>
  );

  const updateSectionContent = (sectionIndex: number, newContent: any) => {
    if (!resumeData) return;
    const updatedSections = [...resumeData.sections];
    updatedSections[sectionIndex].content = newContent;
    handleUpdateResumeData({ ...resumeData, sections: updatedSections });
  };

  const updateSectionTitle = (sectionIndex: number, newTitle: string) => {
    if (!resumeData) return;
    const updatedSections = [...resumeData.sections];
    updatedSections[sectionIndex].title = newTitle;
    handleUpdateResumeData({ ...resumeData, sections: updatedSections });
  };

  const handleContactInfoChange = (field: keyof ContactInfo, value: string) => {
    if (!resumeData) return;
    handleUpdateResumeData({ ...resumeData, contact: { ...resumeData.contact, [field]: value } });
  };

  // Helper to ensure unique IDs for new items
  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2, 7);

  const renderSectionContentEditor = (section: ResumeSection, sectionIndex: number) => {
    const commonInputClasses = "w-full p-2 mb-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md";
    const commonTextareaClasses = "w-full p-2 mb-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md resize-none custom-scrollbar";
    const commonAddButtonClasses = "w-full mt-2 py-2 text-sm text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors";

    switch (section.type) {
        case 'text':
            return (
                <textarea 
                    value={section.content as string} 
                    onChange={e => updateSectionContent(sectionIndex, e.target.value)} 
                    rows={4} 
                    className={commonTextareaClasses} 
                    placeholder="Custom text content..." 
                />
            );
        case 'experience':
            return (
                <div className="space-y-4">
                    {(section.content as ExperienceItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.company} onChange={e => {
                                const updated = [...(section.content as ExperienceItem[])]; updated[itemIndex].company = e.target.value; updateSectionContent(sectionIndex, updated);
                            }} placeholder="Company" className={commonInputClasses}/>
                            <input type="text" value={item.title} onChange={e => {
                                const updated = [...(section.content as ExperienceItem[])]; updated[itemIndex].title = e.target.value; updateSectionContent(sectionIndex, updated);
                            }} placeholder="Title" className={commonInputClasses}/>
                            <input type="text" value={item.location} onChange={e => {
                                const updated = [...(section.content as ExperienceItem[])]; updated[itemIndex].location = e.target.value; updateSectionContent(sectionIndex, updated);
                            }} placeholder="Location" className={commonInputClasses}/>
                            <input type="text" value={item.dates} onChange={e => {
                                const updated = [...(section.content as ExperienceItem[])]; updated[itemIndex].dates = e.target.value; updateSectionContent(sectionIndex, updated);
                            }} placeholder="Dates (e.g., Month Year - Present)" className={commonInputClasses}/>
                            <textarea value={item.bulletPoints.join('\n- ')} onChange={e => {
                                const updated = [...(section.content as ExperienceItem[])]; updated[itemIndex].bulletPoints = e.target.value.split('\n- ').filter(Boolean).map(s => s.trim()); updateSectionContent(sectionIndex, updated);
                            }} placeholder="Bullet points (one per line, starting with -)" rows={5} className={commonTextareaClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as ExperienceItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove experience"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as ExperienceItem[]), { id: generateUniqueId(), company: '', title: '', location: '', dates: '', bulletPoints: [''] }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Experience</button>
                </div>
            );
        case 'education':
            return (
                <div className="space-y-4">
                    {(section.content as EducationItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.institution} onChange={e => { const updated = [...(section.content as EducationItem[])]; updated[itemIndex].institution = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Institution" className={commonInputClasses}/>
                            <input type="text" value={item.degree} onChange={e => { const updated = [...(section.content as EducationItem[])]; updated[itemIndex].degree = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Degree" className={commonInputClasses}/>
                            <input type="text" value={item.location} onChange={e => { const updated = [...(section.content as EducationItem[])]; updated[itemIndex].location = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Location" className={commonInputClasses}/>
                            <input type="text" value={item.dates} onChange={e => { const updated = [...(section.content as EducationItem[])]; updated[itemIndex].dates = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Dates (e.g., 2018 - 2022)" className={commonInputClasses}/>
                            <textarea value={item.details || ''} onChange={e => { const updated = [...(section.content as EducationItem[])]; updated[itemIndex].details = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Details (optional)" rows={3} className={commonTextareaClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as EducationItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove education"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as EducationItem[]), { id: generateUniqueId(), degree: '', institution: '', location: '', dates: '' }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Education</button>
                </div>
            );
        case 'skills':
            return (
                <div className="space-y-4">
                    {(section.content as SkillItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.category} onChange={e => { const updated = [...(section.content as SkillItem[])]; updated[itemIndex].category = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Category (e.g., Programming Languages)" className={commonInputClasses}/>
                            <textarea value={item.skills.join(', ')} onChange={e => { const updated = [...(section.content as SkillItem[])]; updated[itemIndex].skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean); updateSectionContent(sectionIndex, updated); }} placeholder="Skills (comma separated)" rows={3} className={commonTextareaClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as SkillItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove skill category"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as SkillItem[]), { id: generateUniqueId(), category: '', skills: [] }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Skill Category</button>
                </div>
            );
        case 'projects':
            return (
                <div className="space-y-4">
                    {(section.content as ProjectItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.name} onChange={e => { const updated = [...(section.content as ProjectItem[])]; updated[itemIndex].name = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Project Name" className={commonInputClasses}/>
                            <input type="text" value={item.dates} onChange={e => { const updated = [...(section.content as ProjectItem[])]; updated[itemIndex].dates = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Dates (e.g., Jan 2023 - Jun 2023)" className={commonInputClasses}/>
                            <input type="text" value={item.link || ''} onChange={e => { const updated = [...(section.content as ProjectItem[])]; updated[itemIndex].link = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Project Link (Optional)" className={commonInputClasses}/>
                            <textarea value={item.description} onChange={e => { const updated = [...(section.content as ProjectItem[])]; updated[itemIndex].description = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Description" rows={3} className={commonTextareaClasses}/>
                            <textarea value={item.bulletPoints?.join('\n- ') || ''} onChange={e => { const updated = [...(section.content as ProjectItem[])]; updated[itemIndex].bulletPoints = e.target.value.split('\n- ').filter(Boolean).map(s => s.trim()); updateSectionContent(sectionIndex, updated);
                            }} placeholder="Bullet points (one per line, starting with -)" rows={3} className={commonTextareaClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as ProjectItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove project"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as ProjectItem[]), { id: generateUniqueId(), name: '', dates: '', description: '', bulletPoints: [''] }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Project</button>
                </div>
            );
        case 'certifications':
            return (
                <div className="space-y-4">
                    {(section.content as CertificationItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.name} onChange={e => { const updated = [...(section.content as CertificationItem[])]; updated[itemIndex].name = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Certification Name" className={commonInputClasses}/>
                            <input type="text" value={item.issuer} onChange={e => { const updated = [...(section.content as CertificationItem[])]; updated[itemIndex].issuer = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Issuer" className={commonInputClasses}/>
                            <input type="text" value={item.date} onChange={e => { const updated = [...(section.content as CertificationItem[])]; updated[itemIndex].date = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Date (e.g., Jan 2023)" className={commonInputClasses}/>
                            <input type="text" value={item.link || ''} onChange={e => { const updated = [...(section.content as CertificationItem[])]; updated[itemIndex].link = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Certificate Link (Optional)" className={commonInputClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as CertificationItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove certification"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as CertificationItem[]), { id: generateUniqueId(), name: '', issuer: '', date: '' }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Certification</button>
                </div>
            );
        case 'awards':
            return (
                <div className="space-y-4">
                    {(section.content as AwardItem[]).map((item, itemIndex) => (
                        <div key={item.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 relative">
                            <input type="text" value={item.name} onChange={e => { const updated = [...(section.content as AwardItem[])]; updated[itemIndex].name = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Award Name" className={commonInputClasses}/>
                            <input type="text" value={item.issuer} onChange={e => { const updated = [...(section.content as AwardItem[])]; updated[itemIndex].issuer = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Issuer" className={commonInputClasses}/>
                            <input type="text" value={item.date} onChange={e => { const updated = [...(section.content as AwardItem[])]; updated[itemIndex].date = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Date (e.g., 2023)" className={commonInputClasses}/>
                            <textarea value={item.description || ''} onChange={e => { const updated = [...(section.content as AwardItem[])]; updated[itemIndex].description = e.target.value; updateSectionContent(sectionIndex, updated); }} placeholder="Description (optional)" rows={3} className={commonTextareaClasses}/>
                            <button onClick={() => {
                                const updated = (section.content as AwardItem[]).filter((_,idx) => idx !== itemIndex); updateSectionContent(sectionIndex, updated);
                            }} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-full" title="Remove award"><Trash2 size={16}/></button>
                        </div>
                    ))}
                    <button onClick={() => {
                        const updated = [...(section.content as AwardItem[]), { id: generateUniqueId(), name: '', issuer: '', date: '' }]; updateSectionContent(sectionIndex, updated);
                    }} className={commonAddButtonClasses}><Plus size={14} className="inline-block mr-1"/> Add Award</button>
                </div>
            );
        default:
            return null;
    }
  };


  return (
    <div className="flex flex-col h-full max-w-full mx-auto animate-fade-in">
      {loading && <LoadingOverlay message="AI is building your resume..." />}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white">AI Resume Builder</h2>
        <p className="text-gray-500 dark:text-slate-400 mt-1">Craft, customize, and optimize your resume for ATS success.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm flex overflow-hidden relative">
        <ProFeatureOverlay>
          <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 relative">
            {/* Left Panel: Editor */}
            <div className="p-8 border-r border-gray-100 dark:border-slate-700 overflow-y-auto custom-scrollbar flex flex-col space-y-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Resume Content</h3>

              {/* AI Auto-Fill */}
              {!resumeData && (
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-center space-y-3">
                  <Sparkles size={32} className="text-indigo-500 mx-auto" />
                  <p className="font-bold text-indigo-700 dark:text-indigo-300">Auto-fill your resume with AI!</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    Use your raw resume text from your Profile to automatically structure your resume.
                  </p>
                  <button 
                    onClick={handleAutofillFromRawResume} 
                    disabled={loading || isOffline || !profile.resumeContent}
                    className="mt-4 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Generate from Raw Resume
                  </button>
                  {isOffline && <p className="text-sm text-red-500 dark:text-red-400 mt-2">Offline: Requires internet.</p>}
                  {!profile.resumeContent && <p className="text-sm text-red-500 dark:text-red-400 mt-2">Paste raw resume text in Profile first.</p>}
                </div>
              )}
{/* FIX: Properly close fragment and conditional rendering block */}
              {resumeData && (           
                <> 
                  {/* Use React.Fragment to wrap multiple sibling elements */}
                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2"><UserCircle size={20} className="text-indigo-500"/> Contact Information</h4>
                    <input type="text" value={resumeData.contact.name} onChange={e => handleContactInfoChange('name', e.target.value.trim())} placeholder="Full Name" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                    
                    <input type="email" value={resumeData.contact.email} onChange={e => {
                        const val = e.target.value.trim();
                        handleContactInfoChange('email', val);
                        if (val && !isValidEmail(val)) setEmailError('Invalid email format'); else setEmailError(null);
                    }} onBlur={() => handleContactInfoChange('email', resumeData.contact.email?.trim() || '')} placeholder="Email" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                    {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                    
                    <CountryCodeInput 
                      value={resumeData.contact.phone} 
                      onChange={(num, isValid) => {
                        handleContactInfoChange('phone', num);
                        if (num && !isValid) setPhoneError('Invalid phone format'); else setPhoneError(null);
                      }}
                      error={phoneError}
                      onBlur={(e) => handleContactInfoChange('phone', e.currentTarget.value.trim())}
                    />
                    
                    <input type="text" value={resumeData.contact.linkedin || ''} onChange={e => handleContactInfoChange('linkedin', e.target.value.trim())} placeholder="LinkedIn URL" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                    <input type="text" value={resumeData.contact.github || ''} onChange={e => handleContactInfoChange('github', e.target.value.trim())} placeholder="GitHub URL" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                    <input type="text" value={resumeData.contact.website || ''} onChange={e => handleContactInfoChange('website', e.target.value.trim())} placeholder="Portfolio Website" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                    <input type="text" value={resumeData.contact.location || ''} onChange={e => handleContactInfoChange('location', e.target.value.trim())} placeholder="Location" className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl" />
                  </div>

                  {/* Summary */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2"><FileText size={20} className="text-emerald-500"/> Summary</h4>
                    <textarea value={resumeData.summary} onChange={e => handleUpdateResumeData({ ...resumeData, summary: e.target.value })} placeholder="Professional summary..." rows={4} className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl resize-none custom-scrollbar" />
                  </div>

                  {/* Dynamic Sections */}
                  {resumeData.sections.sort((a,b) => a.order - b.order).map((section, sectionIndex) => (
                    <div key={section.id} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 relative group">
                       <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => moveSection(section.id, 'up')} disabled={sectionIndex === 0} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700" title="Move up"><ArrowUp size={16}/></button>
                         <button onClick={() => moveSection(section.id, 'down')} disabled={sectionIndex === resumeData.sections.length - 1} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-slate-700" title="Move down"><ArrowDown size={16}/></button>
                         <button onClick={() => removeSection(section.id)} className="p-1 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20" title="Remove section"><Trash2 size={16}/></button>
                       </div>
                       <h4 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2 mb-3">
                         <input type="text" value={section.title} onChange={e => updateSectionTitle(sectionIndex, e.target.value)} className="bg-transparent border-none focus:ring-0 outline-none text-lg font-bold p-0 m-0" />
                         <button onClick={() => {/* AI refine specific section */}} className="ml-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"><Sparkles size={14}/> AI Refine</button>
                       </h4>
                       {/* Render content based on section.type */}
                       {renderSectionContentEditor(section, sectionIndex)}
                    </div>
                  ))}
                  <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                    <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-3">Add New Section</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {[
                        { type: 'experience', label: 'Work Experience', icon: Briefcase },
                        { type: 'education', label: 'Education', icon: BookOpen },
                        { type: 'skills', label: 'Skills', icon: Lightbulb },
                        { type: 'projects', label: 'Projects', icon: Terminal },
                        { type: 'certifications', label: 'Certifications', icon: Award },
                        { type: 'awards', label: 'Awards', icon: Award },
                        { type: 'text', label: 'Custom Text', icon: FileText },
                      ].map((typeOption) => (
                        <button key={typeOption.type} onClick={() => addSection(typeOption.type as ResumeSection['type'])} className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                          <typeOption.icon size={16}/> {typeOption.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Right Panel: Live Preview & ATS Dashboard */}
            <div className="p-8 bg-gray-50/50 dark:bg-slate-900/50 relative overflow-y-auto custom-scrollbar flex flex-col transition-colors">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Live Preview & ATS Score</h3>
              
              {/* ATS Score Dashboard */}
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6 sticky top-0 z-10">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 dark:text-white text-lg">ATS Score</h4>
                  <button 
                    onClick={handleEvaluateATSScore} 
                    disabled={loading || !resumeData || isOffline}
                    className="text-xs px-4 py-2 rounded-lg font-bold transition-colors shadow-sm flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={16}/> Evaluate
                  </button>
                </div>
                {!atsScore ? (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    <Target size={32} className="mx-auto mb-2 opacity-20"/>
                    <p>Evaluate your resume's ATS compatibility.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center py-2" role="meter" aria-valuenow={atsScore.score} aria-valuemin={0} aria-valuemax={100} aria-label="Overall ATS Score">
                      <div className="relative h-28 w-28 flex items-center justify-center">
                          <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 36 36"><path className="text-gray-100 dark:text-slate-700" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" /><path className={`${atsScore.score >= 85 ? 'text-green-500' : atsScore.score >= 60 ? 'text-yellow-500' : 'text-red-500'}`} strokeDasharray={`${atsScore.score}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                          <div className="absolute"><span className="text-3xl font-bold text-gray-800 dark:text-white">{atsScore.score}</span><span className="text-xl text-gray-800 dark:text-white">%</span></div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-slate-300 italic text-center">"{atsScore.summary}"</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(atsScore).map(([key, value]) => {
                            if (typeof value === 'object' && value !== null && 'pass' in value && 'feedback' in value) {
                                return (
                                    <div key={key} className="flex items-start gap-2">
                                        {value.pass ? <CheckCircle size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
                                        <div>
                                            <p className="font-bold text-gray-800 dark:text-white capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                            <p className="text-xs text-gray-600 dark:text-slate-400">{value.feedback}</p>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                  </div>
                )}
                <div className="mt-6 border-t border-gray-100 dark:border-slate-700 pt-4">
                  <label htmlFor="target-job-desc" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Target Job Description (for specific ATS score)</label>
                  <textarea id="target-job-desc" value={targetJobDescription} onChange={e => setTargetJobDescription(e.target.value)} rows={4} placeholder="Paste a job description here for a tailored ATS score..." className="w-full p-2 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md resize-none custom-scrollbar"></textarea>
                </div>
              </div>

              {/* Download Buttons */}
              <div className="flex gap-4 sticky bottom-0 bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-b-2xl border-t border-gray-100 dark:border-slate-700">
                <button 
                  onClick={handleDownloadPdf} 
                  disabled={!resumeData}
                  className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileDown size={18}/> Download PDF
                </button>
                <button 
                  onClick={handleDownloadDocx} 
                  disabled={!resumeData}
                  className="flex-1 py-3 bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  title="Note: This creates an HTML-based .doc file, not a true .docx. Formatting may vary."
                >
                  <FileType size={18}/> Download DOC (HTML)
                </button>
              </div>

              {/* Live Preview */}
              <div className="flex-1 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-inner border border-gray-100 dark:border-slate-700 mt-6">
                <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Resume Preview</h4>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-slate-300">
                  {resumeData ? (
                    <ReactMarkdown components={ResumeMarkdownComponents}>{convertResumeDataToMarkdown(resumeData)}</ReactMarkdown>
                  ) : (
                    <p className="text-center text-gray-400 text-sm">Resume content will appear here as you build it.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ProFeatureOverlay>
      </div>
    </div>
  );
};

export default ResumeBuilderView;
