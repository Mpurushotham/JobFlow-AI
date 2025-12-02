
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
  text: 0,
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
  const [targetJobDescription, setTargetJobDescription] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  
  // New state for custom section form
  const [newCustomSectionTitle, setNewCustomSectionTitle] = useState('');
  const [newCustomSectionType, setNewCustomSectionType] = useState<ResumeSection['type']>('experience');


  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  const isOffline = !navigator.onLine;

  useEffect(() => {
    setResumeData(profile.structuredResume || null);
    logService.log(currentUser, LogActionType.RESUME_BUILDER_OPEN, 'Resume builder opened.', 'info');
  }, [profile.structuredResume, currentUser]);

  const handleUpdateResumeData = useCallback((newData: ResumeData) => {
    setResumeData(newData);
    onSaveProfile({ ...profile, structuredResume: newData });
    logService.log(currentUser, LogActionType.RESUME_BUILDER_SECTION_EDIT, `Resume data updated.`, 'debug');
  }, [profile, onSaveProfile, currentUser]);

  const handleAutofillFromRawResume = async () => {
    if (isOffline) {
      addNotification("Cannot auto-fill resume: You are offline.", "info");
      return;
    }
    if (!profile.resumeContent) {
      addNotification("Please paste your raw resume text in the Profile section first.", 'error');
      return;
    }
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoading(true);
    try {
      const result = await geminiService.generateStructuredResume(profile.resumeContent, profile, currentUser);
      handleUpdateResumeData(result);
      addNotification("Resume structured successfully from raw text!", 'success');
    } catch (e: any) {
      addNotification("Failed to auto-fill resume. Please try again or check raw resume format.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluateATSScore = async () => {
    if (isOffline) {
      addNotification("Cannot evaluate ATS score: You are offline.", "info");
      return;
    }
    if (!resumeData) {
      addNotification("Please build your resume first.", 'error');
      return;
    }
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoading(true);
    try {
      const score = await geminiService.evaluateATSScore(resumeData, targetJobDescription || undefined, currentUser);
      setAtsScore(score);
      addNotification("ATS score evaluated successfully!", 'success');
    } catch (e: any) {
      addNotification("Failed to evaluate ATS score. Please try again.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!resumeData) return;
    handlePrintPDF(convertResumeDataToMarkdown(resumeData), `Resume_${resumeData.contact.name || 'JobFlowAI'}`);
  };

  const handleDownloadDocx = () => {
    if (!resumeData) return;
    downloadDocx(convertResumeDataToMarkdown(resumeData), `Resume_${resumeData.contact.name || 'JobFlowAI'}`);
  };

  const addSection = (type: ResumeSection['type'], title: string) => {
    if (!resumeData) {
        setResumeData({
            contact: { name: profile.name || '', email: profile.email || '', phone: profile.phone || '' },
            summary: '',
            sections: []
        });
    }

    const newSection: ResumeSection = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      title: title,
      type: type,
      order: (resumeData?.sections.length || 0) * 10 + (SECTION_ORDER_MAP[type] || 0),
      content: type === 'text' ? '' : [],
    };

    const updatedSections = [...(resumeData?.sections || []), newSection].sort((a,b) => a.order - b.order);
    handleUpdateResumeData({ ...(resumeData || { contact: { name: '' , email: '', phone: '' }, summary: '', sections: [] }), sections: updatedSections });
  };
  
  const handleAddCustomSection = () => {
    if (!newCustomSectionTitle.trim()) {
        addNotification("Please enter a title for your custom section.", "error");
        return;
    }
    addSection(newCustomSectionType, newCustomSectionTitle);
    setNewCustomSectionTitle('');
    setNewCustomSectionType('experience');
  };

  const removeSection = (id: string) => {
    if (!resumeData) return;
    const updatedSections = resumeData.sections.filter(s => s.id !== id);
    handleUpdateResumeData({ ...resumeData, sections: updatedSections });
  };

  const moveSection = (draggedSectionId: string, targetSectionId: string) => {
    if (!resumeData) return;

    const sections = [...resumeData.sections];
    const draggedIndex = sections.findIndex(s => s.id === draggedSectionId);
    const targetIndex = sections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = sections.splice(draggedIndex, 1);
    sections.splice(targetIndex, 0, draggedItem);
    
    const reorderedSections = sections.map((s, i) => ({ ...s, order: i * 10 }));
    handleUpdateResumeData({ ...resumeData, sections: reorderedSections });
  };
  
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    e.preventDefault();
    if (draggedSectionId !== sectionId) {
        setDragOverSectionId(sectionId);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, sectionId: string) => {
    e.preventDefault();
    if (draggedSectionId && draggedSectionId !== sectionId) {
        moveSection(draggedSectionId, sectionId);
    }
    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDraggedSectionId(null);
    setDragOverSectionId(null);
  };


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

  const generateUniqueId = () => Date.now().toString() + Math.random().toString(36).substring(2, 7);

  const renderSectionContentEditor = (section: ResumeSection, sectionIndex: number) => {
    // ... existing implementation ...
  };
  
  // Return the main JSX of the component
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
                        {/* ... existing editor UI ... */}
                        {resumeData && resumeData.sections.sort((a,b) => a.order - b.order).map((section, sectionIndex) => (
                          <div
                            key={section.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, section.id)}
                            onDragOver={(e) => handleDragOver(e, section.id)}
                            onDrop={(e) => handleDrop(e, section.id)}
                            onDragEnd={handleDragEnd}
                            onDragLeave={() => setDragOverSectionId(null)}
                            className={`bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 relative group transition-all duration-300
                              ${draggedSectionId === section.id ? 'opacity-30' : ''}
                            `}
                          >
                            {dragOverSectionId === section.id && draggedSectionId !== section.id && (
                                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500 z-10 animate-pulse"></div>
                            )}
                            {/* ... existing section editor UI ... */}
                          </div>
                        ))}
                        
                        {/* Add New Section Area */}
                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                          <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-3">Add New Section</h4>
                          <div className="space-y-4">
                            {/* Predefined Sections */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
                              {[
                                { type: 'experience', label: 'Work Experience', icon: Briefcase },
                                { type: 'education', label: 'Education', icon: BookOpen },
                                { type: 'skills', label: 'Skills', icon: Lightbulb },
                                { type: 'projects', label: 'Projects', icon: Terminal },
                                { type: 'certifications', label: 'Certifications', icon: Award },
                                { type: 'awards', label: 'Awards', icon: Award },
                                { type: 'text', label: 'Custom Text', icon: FileText },
                              ].map((typeOption) => (
                                <button key={typeOption.type} onClick={() => addSection(typeOption.type as ResumeSection['type'], typeOption.label)} className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                                  <typeOption.icon size={16}/> {typeOption.label}
                                </button>
                              ))}
                            </div>
                            {/* Custom Section Form */}
                            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-3">
                                <h5 className="text-sm font-bold text-indigo-800 dark:text-indigo-300">Add Custom Section</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input 
                                        type="text" 
                                        value={newCustomSectionTitle}
                                        onChange={e => setNewCustomSectionTitle(e.target.value)}
                                        placeholder="Custom Section Title"
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md"
                                    />
                                    <select 
                                        value={newCustomSectionType}
                                        onChange={e => setNewCustomSectionType(e.target.value as ResumeSection['type'])}
                                        className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md"
                                    >
                                        <option value="experience">Experience Type</option>
                                        <option value="education">Education Type</option>
                                        <option value="skills">Skills Type</option>
                                        <option value="projects">Projects Type</option>
                                        <option value="certifications">Certifications Type</option>
                                        <option value="awards">Awards Type</option>
                                        <option value="text">Simple Text</option>
                                    </select>
                                </div>
                                <button 
                                    onClick={handleAddCustomSection}
                                    className="w-full py-2 text-sm text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
                                >
                                    Add Custom Section
                                </button>
                            </div>
                          </div>
                        </div>

                    </div>
                    {/* ... existing right panel UI ... */}
                </div>
            </ProFeatureOverlay>
        </div>
    </div>
  );
};

export default ResumeBuilderView;
