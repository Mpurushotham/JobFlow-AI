


import React, { useState, useEffect } from 'react';
import { Sparkles, BrainCircuit, Plus, RefreshCcw, BookOpen, Terminal, Lightbulb, Link as LinkIcon, AlertCircle, TrendingUp, Info } from 'lucide-react';
import { UserProfile, LearningPath, MasterResumeFitResult, SkillTopic, SubscriptionTier } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from './LoadingOverlay';
import ReactMarkdown from 'react-markdown';

interface SkillDevelopmentProps {
  profile: UserProfile;
  // FIX: Added subscriptionTier prop to the interface.
  subscriptionTier: SubscriptionTier | null; 
  // FIX: Add currentUser prop
  currentUser: string;
}

const SkillDevelopment: React.FC<SkillDevelopmentProps> = ({ profile, subscriptionTier, currentUser }) => {
  const [inputSkills, setInputSkills] = useState<string[]>([]);
  const [currentSkillInput, setCurrentSkillInput] = useState('');
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;
  const isOffline = !navigator.onLine;

  // Suggest missing skills from profile analysis if available
  useEffect(() => {
    if (profile.masterResumeFit) {
      const masterResumeFitResult: MasterResumeFitResult = JSON.parse(profile.masterResumeFit);
      if (masterResumeFitResult.missingSkills && masterResumeFitResult.missingSkills.length > 0) {
        setInputSkills(masterResumeFitResult.missingSkills);
      }
    }
  }, [profile.masterResumeFit]);

  const handleAddSkill = () => {
    const skill = currentSkillInput.trim();
    if (skill && !inputSkills.includes(skill)) {
      setInputSkills(prev => [...prev, skill]);
      setCurrentSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setInputSkills(prev => prev.filter(skill => skill !== skillToRemove));
  };

  const handleGeneratePath = async () => {
    if (isOffline) {
        addNotification("Cannot generate learning path: You are offline.", "info");
        return;
    }
    if (inputSkills.length === 0) {
      addNotification("Please add at least one skill to generate a learning path.", 'error');
      return;
    }
    // Tier check for AI Pro feature
    if (!isAIPro) {
      addNotification("This feature requires an AI Pro subscription. Upgrade to unlock!", 'info');
      return;
    }

    setLoading(true);
    setLearningPath(null); // Clear previous path
    try {
      // FIX: Pass currentUser to geminiService.generateSkillDevelopmentPath
      const path = await geminiService.generateSkillDevelopmentPath(inputSkills, currentUser);
      setLearningPath(path);
      addNotification("Learning path generated!", 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else if (e.message === 'OFFLINE') {
        addNotification("Cannot generate learning path: You are offline.", "info");
      } else {
        addNotification("Failed to generate learning path. Please try again.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const resourceTypeIcons = {
    'Course': <BookOpen size={16} className="text-blue-500" aria-hidden="true" />,
    'Project': <Terminal size={16} className="text-green-500" aria-hidden="true" />,
    'Concept': <Lightbulb size={16} className="text-yellow-500" aria-hidden="true" />,
    'Tool': <Terminal size={16} className="text-purple-500" aria-hidden="true" />,
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col items-center relative">
      {loading && <LoadingOverlay message="Generating your learning path..." />}
      
      {/* Overlay for Free users on Pro tabs */}
      {!isAIPro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
          <TrendingUp size={64} className="text-purple-500 mb-4" aria-hidden="true" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
          <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
            This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your career prep!
          </p>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BrainCircuit size={20} className="text-indigo-500" aria-hidden="true" /> Build Your Skills
          </h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
            Enter skills you want to learn or improve. We'll generate a personalized learning path.
          </p>

          <div className="flex flex-wrap gap-2 mb-4" role="list">
            {inputSkills.map(skill => (
              <span key={skill} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2" role="listitem">
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} className="text-indigo-500 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-500" aria-label={`Remove skill ${skill}`}>
                  <Plus size={14} className="rotate-45" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={currentSkillInput}
              onChange={e => setCurrentSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
              placeholder="Add a skill (e.g., Python, AWS, React)"
              className="flex-1 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
              disabled={loading || !isAIPro || isOffline}
              aria-label="Skill input"
              title={isOffline ? "Requires internet connection" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
            />
            <button
              onClick={handleAddSkill}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !currentSkillInput.trim() || !isAIPro || isOffline}
              aria-label="Add skill"
              title={isOffline ? "Requires internet connection" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : ""}
            >
              <Plus size={18} aria-hidden="true" /> Add
            </button>
          </div>
          <button
            onClick={handleGeneratePath}
            className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200 dark:shadow-none"
            disabled={loading || inputSkills.length === 0 || !isAIPro || isOffline}
            aria-label={learningPath ? "Re-generate learning path" : "Generate learning path"}
            title={isOffline ? "Requires internet connection" : !isAIPro ? "AI Pro feature. Upgrade to unlock." : inputSkills.length === 0 ? "Add skills first" : ""}
          >
            <Sparkles size={18} aria-hidden="true" /> {learningPath ? 'Re-Generate Path' : 'Generate Learning Path'}
          </button>
          {!isAIPro && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1" role="alert">
              <Info size={16} aria-hidden="true"/> AI Pro feature. Upgrade to unlock this tool.
            </p>
          )}
          {isOffline && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1" role="alert">
              <Info size={16} aria-hidden="true"/> Offline: This feature requires an internet connection.
            </p>
          )}
        </div>

        {learningPath && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in" role="region" aria-labelledby="learning-path-heading">
            <h3 id="learning-path-heading" className="text-xl font-bold text-gray-800 dark:text-white mb-4">Your Personalized Learning Path</h3>
            <p className="text-gray-700 dark:text-slate-300 mb-6 leading-relaxed"><ReactMarkdown>{learningPath.summary}</ReactMarkdown></p>

            <div className="space-y-8">
              {learningPath.skillTopics.map((topic, topicIdx) => (
                <div key={topic.skill} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700" role="listitem">
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-3">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg px-3 py-1 text-sm font-bold">Skill {topicIdx + 1}</span>
                    {topic.skill}
                  </h4>
                  <div className="space-y-4" role="list">
                    {topic.resources.map((resource, resIdx) => (
                      <div key={resIdx} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700" role="listitem">
                        <div className="flex-shrink-0 mt-1" aria-hidden="true">
                          {resourceTypeIcons[resource.type]}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{resource.type}</p>
                          <h5 className="font-bold text-gray-800 dark:text-white mt-1">{resource.title}</h5>
                          <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 leading-relaxed">{resource.description}</p>
                          {resource.link && (
                            <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1 mt-2 hover:underline" aria-label={`Learn more about ${resource.title}`}>
                              Learn More <LinkIcon size={14} aria-hidden="true" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!loading && !learningPath && inputSkills.length > 0 && (
            <div className="text-center py-20 text-gray-400 dark:text-slate-500 flex flex-col items-center">
                <AlertCircle size={48} className="mb-4 opacity-10" aria-hidden="true" />
                <p>Click "Generate Learning Path" to see your personalized recommendations!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SkillDevelopment;