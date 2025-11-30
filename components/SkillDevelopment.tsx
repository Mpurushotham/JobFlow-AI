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
}

const SkillDevelopment: React.FC<SkillDevelopmentProps> = ({ profile, subscriptionTier }) => {
  const [inputSkills, setInputSkills] = useState<string[]>([]);
  const [currentSkillInput, setCurrentSkillInput] = useState('');
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const isAIPro = subscriptionTier === SubscriptionTier.AI_PRO;

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
      const path = await geminiService.generateSkillDevelopmentPath(inputSkills);
      setLearningPath(path);
      addNotification("Learning path generated!", 'success');
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to generate learning path. Please try again.", 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const resourceTypeIcons = {
    'Course': <BookOpen size={16} className="text-blue-500" />,
    'Project': <Terminal size={16} className="text-green-500" />,
    'Concept': <Lightbulb size={16} className="text-yellow-500" />,
    'Tool': <Terminal size={16} className="text-purple-500" />,
  };

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar flex flex-col items-center relative">
      {loading && <LoadingOverlay message="Generating your learning path..." />}
      
      {/* Overlay for Free users on Pro tabs */}
      {!isAIPro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm z-20 rounded-3xl">
          <TrendingUp size={64} className="text-purple-500 mb-4" />
          <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Unlock AI Pro Features!</h3>
          <p className="text-gray-600 dark:text-slate-300 text-lg mb-6 text-center max-w-md">
            This powerful tool is available with an AI Pro subscription. Upgrade now to supercharge your career prep!
          </p>
        </div>
      )}

      <div className="w-full max-w-4xl space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <BrainCircuit size={20} className="text-indigo-500" /> Build Your Skills
          </h3>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">
            Enter skills you want to learn or improve. We'll generate a personalized learning path.
          </p>

          <div className="flex flex-wrap gap-2 mb-4">
            {inputSkills.map(skill => (
              <span key={skill} className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2">
                {skill}
                <button onClick={() => handleRemoveSkill(skill)} className="text-indigo-500 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-500">
                  <Plus size={14} className="rotate-45" />
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
              disabled={loading || !isAIPro}
            />
            <button
              onClick={handleAddSkill}
              className="px-5 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !currentSkillInput.trim() || !isAIPro}
            >
              <Plus size={18} /> Add
            </button>
          </div>
          <button
            onClick={handleGeneratePath}
            className="mt-6 w-full py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200 dark:shadow-none"
            disabled={loading || inputSkills.length === 0 || !isAIPro}
          >
            <Sparkles size={18} /> {learningPath ? 'Re-Generate Path' : 'Generate Learning Path'}
          </button>
          {!isAIPro && (
            <p className="text-sm text-red-500 dark:text-red-400 mt-3 text-center flex items-center justify-center gap-1">
              <Info size={16}/> AI Pro feature. Upgrade to unlock this tool.
            </p>
          )}
        </div>

        {learningPath && (
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Your Personalized Learning Path</h3>
            <p className="text-gray-700 dark:text-slate-300 mb-6 leading-relaxed"><ReactMarkdown>{learningPath.summary}</ReactMarkdown></p>

            <div className="space-y-8">
              {learningPath.skillTopics.map((topic, topicIdx) => (
                <div key={topic.skill} className="bg-gray-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-gray-100 dark:border-slate-700">
                  <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-3">
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg px-3 py-1 text-sm font-bold">Skill {topicIdx + 1}</span>
                    {topic.skill}
                  </h4>
                  <div className="space-y-4">
                    {topic.resources.map((resource, resIdx) => (
                      <div key={resIdx} className="flex gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
                        <div className="flex-shrink-0 mt-1">
                          {resourceTypeIcons[resource.type]}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{resource.type}</p>
                          <h5 className="font-bold text-gray-800 dark:text-white mt-1">{resource.title}</h5>
                          <p className="text-sm text-gray-700 dark:text-slate-300 mt-1 leading-relaxed">{resource.description}</p>
                          {resource.link && (
                            <a href={resource.link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 text-sm flex items-center gap-1 mt-2 hover:underline">
                              Learn More <LinkIcon size={14} />
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
                <AlertCircle size={48} className="mb-4 opacity-10" />
                <p>Click "Generate Learning Path" to see your personalized recommendations!</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default SkillDevelopment;