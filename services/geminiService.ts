
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { InterviewQA, SearchResult, SearchFilters, UserProfile, ResumeGrade, MasterResumeFitResult, LearningPath, EmailPurpose, LogActionType, ResumeData, ResumeATSScore, SkillItem } from '../types';
import { logService } from './logService';
import { convertResumeDataToMarkdown } from '../utils/resumeMarkdown';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    // This case is handled on app startup, but as a fallback:
    throw new Error("API Key is missing or not configured.");
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_FAST = 'gemini-2.5-flash';

const extractJSON = (text: string) => {
  try {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]);
    }
    // Fallback for cases where AI doesn't use markdown block
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text, e);
    // Attempt to return null or an empty object/array based on expected output, or re-throw
    return null;
  }
};

const handleApiCall = async <T>(apiCall: () => Promise<T>, actionType: LogActionType, details: string, username: string | 'system' | 'guest'): Promise<T> => {
  if (!navigator.onLine) {
    logService.log(username, LogActionType.OFFLINE_EVENT, `AI call "${actionType}" failed: No internet connection.`, 'warn');
    throw new Error('OFFLINE');
  }
  try {
    const result = await apiCall();
    logService.log(username, actionType, `AI call "${actionType}" succeeded. ${details}`, 'debug');
    return result;
  } catch (e: any) {
    const errorMessage = e.toString().toLowerCase();
    let logDetails = `AI call "${actionType}" failed: ${e.message || 'Unknown error.'}`;
    let logSeverity: 'warn' | 'error' = 'error';

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      logDetails = `AI call "${actionType}" failed: Rate limit or quota exceeded.`;
      logSeverity = 'warn';
      logService.log(username, LogActionType.ERROR_OCCURRED, logDetails, logSeverity);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    logService.log(username, LogActionType.ERROR_OCCURRED, logDetails, logSeverity);
    throw e;
  }
};

export const geminiService = {
  searchJobs: async (filters: SearchFilters, currentUser: string): Promise<{ text: string, results: SearchResult[], wasFallback: boolean }> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const numJobsToFetch = 30;

        const dateMap: Record<SearchFilters['datePosted'], string> = { 
          '24h': 'past 24 hours', 
          'week': 'past week', 
          'month': 'past month', 
          'any': 'anytime' 
        };

        let primaryPrompt = `
          You are a highly efficient job search engine assistant.
          Find up to ${numJobsToFetch} active, recent job postings.
          Target Sites: Search specifically on legitimate and popular job boards like LinkedIn, Indeed, Glassdoor, Google Careers, We Work Remotely, Stack Overflow Jobs.
          Strictly adhere to ALL the following criteria:
          - Keywords: "${filters.query}"
        `;

        if (filters.location) primaryPrompt += `- Location: "${filters.location}"\n`;
        if (filters.datePosted !== 'any') primaryPrompt += `- Posted within: "${dateMap[filters.datePosted]}"\n`;
        if (filters.experienceLevel !== 'any') primaryPrompt += `- Experience Level: "${filters.experienceLevel}"\n`;
        if (filters.jobType !== 'any') primaryPrompt += `- Job Type: "${filters.jobType}"\n`;
        if (filters.remote !== 'any') primaryPrompt += `- Work Arrangement: "${filters.remote}"\n`;
        if (filters.companySize !== 'any') primaryPrompt += `- Company Size: "${filters.companySize}"\n`;
        if (filters.educationLevel !== 'any') primaryPrompt += `- Education Level: "${filters.educationLevel}"\n`;
        if (filters.salaryRange !== 'any') primaryPrompt += `- Salary Range: "${filters.salaryRange}"\n`;
        if (filters.seniority !== 'any') primaryPrompt += `- Seniority: "${filters.seniority}"\n`;

        primaryPrompt += `
          AFTER searching, format the results as a strict JSON array inside a markdown code block.
          Each JSON object for a job MUST have these exact keys and types:
          - "title" (string)
          - "company" (string)
          - "location" (string)
          - "url" (string, MUST be a direct, valid link to the job posting, not a generic search result page. If no valid link is found, use "N/A".)
          - "summary" (string, a brief 1-2 sentence summary of the role.)
          - "postedDate" (string, e.g., "1 day ago", "2 weeks ago", "2024-05-20". If not found, use "-")
          - "source" (string, e.g., "LinkedIn", "Indeed". If not found, use "-")
        `;

        const primaryResponse: GenerateContentResponse = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: primaryPrompt,
          config: { tools: [{googleSearch: {}}] }
        });

        let primaryResults: SearchResult[] = extractJSON(primaryResponse.text || '') || [];

        if (primaryResults.length === 0) {
            const fallbackPrompt = `
              No jobs were found with specific filters. Now, find up to ${numJobsToFetch} recent, active job postings for: "${filters.query}" from various reputable sources like LinkedIn, Indeed, etc.
              Format the results as a strict JSON array inside a markdown code block with the same keys as before.
            `;
            const fallbackResponse: GenerateContentResponse = await ai.models.generateContent({
              model: MODEL_FAST,
              contents: fallbackPrompt,
              config: { tools: [{googleSearch: {}}] }
            });

            let fallbackResults: SearchResult[] = extractJSON(fallbackResponse.text || '') || [];
            logService.log(currentUser, LogActionType.JOB_SEARCH, `Fallback search for "${filters.query}" yielded ${fallbackResults.length} results.`, 'info');
            return { text: fallbackResponse.text || '', results: fallbackResults, wasFallback: true };
        } else {
            logService.log(currentUser, LogActionType.JOB_SEARCH, `Primary search for "${filters.query}" yielded ${primaryResults.length} results.`, 'info');
            return { text: primaryResponse.text || '', results: primaryResults, wasFallback: false };
        }
    }, LogActionType.JOB_SEARCH, `Searching for jobs with query "${filters.query}"`, currentUser);
  },

  analyzeJob: async (resumeContent: string, jobTitle: string, jobSummary: string, currentUser: string): Promise<MasterResumeFitResult> => { 
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Act as a senior recruiter. Analyze the provided resume against the job description to calculate a match score.
        Your output must be a JSON object.
        Job Title: ${jobTitle}
        Job Summary: ${jobSummary}
        Resume Content: ${resumeContent}
        `;
        const schema = {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'summary', 'missingSkills', 'matchingSkills']
        };
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
        return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_ANALYSIS, `Job analysis for "${jobTitle}"`, currentUser);
  },

  analyzeMasterResumeFit: async (resumeContent: string, targetJobDescription: string, currentUser: string): Promise<MasterResumeFitResult> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Act as a senior recruiter. Analyze the provided master resume against the target job description to identify strengths and weaknesses.
        Your output must be a JSON object.
        Target Job Description: ${targetJobDescription}
        Master Resume: ${resumeContent}
        `;
        const schema = {
            type: Type.OBJECT,
            properties: {
                score: { type: Type.INTEGER },
                summary: { type: Type.STRING },
                missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
                matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ['score', 'summary', 'missingSkills', 'matchingSkills']
        };
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema } });
        return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_ANALYSIS, `Master resume fit analysis`, currentUser);
  },

  generateSkillDevelopmentPath: async (missingSkills: string[], currentUser: string): Promise<LearningPath> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Generate a learning path for these skills: ${missingSkills.join(', ')}. Provide a summary and a list of resources for each skill. Output as JSON.`;
        const schema = { /* complex schema for LearningPath */ };
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' /*, responseSchema: schema */ } });
        return JSON.parse(response.text || '{}');
    }, LogActionType.SKILL_DEV_PATH_GENERATE, `Skill dev path for: ${missingSkills.join(', ')}`, currentUser);
  },

  generateStructuredResume: async (masterResumeContent: string, profile: UserProfile, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `
        Parse the following resume text into a structured JSON ResumeData object.
        Resume Text: ${masterResumeContent}
        Use the user's profile for contact info: ${JSON.stringify(profile)}
      `;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_BUILDER_AI_AUTOFILL, `AI auto-filled structured resume`, currentUser);
  },

  evaluateATSScore: async (resumeData: ResumeData, currentUser: string, jobDescription?: string): Promise<ResumeATSScore> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeMarkdown = convertResumeDataToMarkdown(resumeData);
      let prompt = `Evaluate this resume for ATS readiness. Output JSON. Resume: ${resumeMarkdown}`;
      if (jobDescription) {
        prompt += `\nTarget Job Description: ${jobDescription}`;
      }
      const schema = { /* complex schema for ResumeATSScore */ };
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' /*, responseSchema: schema */ } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_ATS_EVALUATED, `ATS score evaluation`, currentUser);
  },

  tailorResume: async (jobDescription: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const resumeContentForAI = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const prompt = `Rewrite this resume for the job description provided. Output in Markdown.
          Job Description: ${jobDescription}
          Resume: ${resumeContentForAI}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return (response.text || "Failed to generate resume.").replace(/^```markdown\n?/, '').replace(/\n```$/, '');
    }, LogActionType.RESUME_TAILOR, `Resume tailoring for job`, currentUser);
  },

  generateCoverLetter: async (jobDescription: string, company: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const resumeContentForAI = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const prompt = `Draft a personalized cover letter for the role at ${company}.
          Job Description: ${jobDescription}
          My Resume: ${resumeContentForAI}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return (response.text || "Failed to generate cover letter.").replace(/^```markdown\n?/, '').replace(/\n```$/, '');
    }, LogActionType.COVER_LETTER_GENERATE, `Cover letter for ${company}`, currentUser);
  },

  generateInterviewPrep: async (jobDescription: string, profile: UserProfile, currentUser: string): Promise<InterviewQA[]> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const resumeContentForAI = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const prompt = `Generate interview questions and answers based on this job and resume. Output as JSON array.
          Job Description: ${jobDescription}
          My Resume: ${resumeContentForAI}
        `;
        const schema = { /* complex schema for InterviewQA[] */ };
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' /*, responseSchema: schema */ } });
        return JSON.parse(response.text || '[]');
    }, LogActionType.INTERVIEW_PREP_GENERATE, `Interview prep generation`, currentUser);
  },

  parseResume: async (resumeText: string, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Parse this resume text into a structured JSON ResumeData object.
          Resume Text: ${resumeText}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
        return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_PARSE, `Resume parsing for profile`, currentUser);
  },
  
  getWeatherByCoords: async (latitude: number, longitude: number, currentUser: string): Promise<{ city: string; country: string; description: string; temperature: number } | null> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Provide the current weather for latitude ${latitude}, longitude ${longitude}. Output in a JSON markdown block with keys: city, country, description, temperature (celsius).`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { tools: [{ googleSearch: {} }] } });
        const data = extractJSON(response.text || 'null');
        if (data && data.city && data.country && data.description && typeof data.temperature === 'number') {
          return data;
        }
        return null;
    }, LogActionType.GEOLOCATION_FETCH, `Weather fetch for coords`, currentUser);
  },

  gradeResume: async (profile: UserProfile, currentUser: string): Promise<ResumeGrade> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const resumeContentForAI = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const prompt = `Grade this resume on ATS-friendliness, action verbs, metrics, and clarity. Output JSON.
          Resume: ${resumeContentForAI}
        `;
        const schema = { /* complex schema for ResumeGrade */ };
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' /*, responseSchema: schema */ } });
        return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_GRADE, `Resume grading for profile`, currentUser);
  },

  analyzeInterviewAnswer: async (question: string, answer: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const resumeContext = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const prompt = `Analyze this interview answer for clarity and STAR method usage.
          Question: ${question}
          Answer: ${answer}
          My Resume (for context): ${resumeContext}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || "Could not analyze the answer.";
    }, LogActionType.MOCK_INTERVIEW_FEEDBACK, `Feedback for question: "${question}"`, currentUser);
  },

  optimizeLinkedInProfile: async (section: 'headline' | 'about', currentText: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Rewrite this LinkedIn ${section} to be more impactful.
          Current Text: ${currentText}
          My Resume (for context): ${profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || `Failed to generate a new ${section}.`;
    }, LogActionType.LINKEDIN_OPTIMIZE, `LinkedIn ${section} optimization`, currentUser);
  },

  draftNetworkingMessage: async (scenario: string, recipientInfo: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Draft a networking message.
          Scenario: ${scenario}
          Recipient: ${recipientInfo}
          My Profile (for context): ${profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent}
        `;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || "Failed to draft the message.";
    }, LogActionType.NETWORKING_MESSAGE_DRAFT, `Networking message for: "${scenario}"`, currentUser);
  },

  composeEmail: async (emailPurpose: EmailPurpose, context: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      let prompt: string;
      // Construct prompt based on EmailPurpose
      switch (emailPurpose) {
        // ... (prompt logic from previous correct version)
        default: prompt = `Compose an email for the following purpose: ${emailPurpose}. Context: ${context}`;
      }
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return (response.text || "Failed to generate email.").replace(/^```markdown\n?/, '').replace(/\n```$/, '');
    }, LogActionType.EMAIL_COMPOSE, `Email for purpose: "${emailPurpose}"`, currentUser);
  },
};
