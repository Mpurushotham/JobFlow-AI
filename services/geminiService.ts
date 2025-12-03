


import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { InterviewQA, SearchResult, SearchFilters, UserProfile, ResumeGrade, MasterResumeFitResult, LearningPath, EmailPurpose, LogActionType, ResumeData, ResumeATSScore, SkillItem, CodeEvaluation, InterviewTips, JobSkillAnalysis } from '../types';
import { logService } from './logService';
import { convertResumeDataToMarkdown } from '../utils/resumeMarkdown';

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
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
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text, e);
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
  getWeatherByCoords: async (lat: number, lon: number, currentUser: string): Promise<{ city: string; country: string; description: string; temperature: number } | null> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Get the current weather for latitude ${lat} and longitude ${lon}. Respond in a strict JSON format within a markdown block with keys: "city", "country", "description", "temperature" (in Celsius).`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { tools: [{googleSearch: {}}] } });
      const data = extractJSON(response.text || '');
      return data;
    }, LogActionType.GEOLOCATION_FETCH, `Fetching weather for coords ${lat},${lon}`, currentUser);
  },

  parseResume: async (resumeContent: string, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Parse the following resume text into a structured ResumeData JSON object. The output must be a valid JSON object matching the ResumeData interface. Resume text: ${resumeContent}`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_PARSE, 'Parsing resume text to structured data', currentUser);
  },

  generateStructuredResume: async (resumeContent: string, profile: UserProfile, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Convert the following raw resume text into a complete, structured ResumeData JSON object. This will be used for an interactive resume builder. The response MUST be a valid JSON object adhering to the ResumeData interface structure. Recognize sections like "Work Experience", "Professional Experience", "Education", "Skills", "Projects", "Certifications", "Awards", "Publications", "Volunteer Experience". Classify custom sections intelligently (e.g., 'Volunteer' is 'experience'). If a section is unparsable, put its content in a 'text' type section. Use the user's profile info as a reference: Target Roles: ${profile.targetRoles}. Raw resume text: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_BUILDER_AI_AUTOFILL, 'Generating structured resume from raw text', currentUser);
  },

  analyzeMasterResumeFit: async (resumeContent: string, jobDescription: string, currentUser: string): Promise<MasterResumeFitResult> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Analyze the fit between the master resume and the target job description. Provide a score from 0-100, a brief summary, a list of matching skills, and a list of missing skills. The output must be a valid JSON object matching the MasterResumeFitResult interface. Resume: """${resumeContent}""" Job Description: """${jobDescription}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_ATS_EVALUATED, 'Analyzing master resume against target JD', currentUser);
  },

  searchJobs: async (filters: SearchFilters, currentUser: string): Promise<{ results: SearchResult[], wasFallback: boolean }> => {
    return handleApiCall(async () => {
      const ai = getClient();
      let prompt = `Find up to 30 recent job postings for a "${filters.query}". Search legitimate sites like LinkedIn, Indeed, Glassdoor, and company career pages. For each job, extract the title, company, location, a direct URL to the job posting, a brief summary, the posted date (e.g., "1 day ago", "2 weeks ago"), and the source (e.g., "LinkedIn").`;
      if (filters.location) prompt += ` in or near "${filters.location}"`;
      if (filters.datePosted !== 'any') prompt += ` posted within the last ${filters.datePosted === '24h' ? '24 hours' : filters.datePosted === 'week' ? 'week' : 'month'}.`;
      
      prompt += ` The output must be a valid JSON array of SearchResult objects within a markdown block. If no direct URL is found, use "N/A".`;
      
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { tools: [{googleSearch: {}}] } });
      let results = extractJSON(response.text || '[]');
      let wasFallback = false;

      if (!results || results.length === 0) {
        wasFallback = true;
        const fallbackPrompt = `Find up to 30 recent job postings for a "${filters.query}". Search legitimate sites like LinkedIn, Indeed, Glassdoor, and company career pages. For each job, extract the title, company, location, a direct URL, a brief summary, the posted date, and the source. The output must be a valid JSON array of SearchResult objects within a markdown block.`;
        const fallbackResponse = await ai.models.generateContent({ model: MODEL_FAST, contents: fallbackPrompt, config: { tools: [{googleSearch: {}}] } });
        results = extractJSON(fallbackResponse.text || '[]');
      }
      
      return { results: results || [], wasFallback };
    }, LogActionType.JOB_SEARCH, `Searching for: ${filters.query}`, currentUser);
  },

  analyzeJob: async (resumeContent: string, jobTitle: string, jobSummary: string, currentUser: string): Promise<{ score: number; summary: string; missingSkills: string[]; matchingSkills: string[] }> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Analyze the match between the resume and the job. Provide a score (0-100), a summary, and lists of missing/matching skills. Respond in JSON format with keys: "score", "summary", "missingSkills", "matchingSkills". Resume: """${resumeContent}""" Job: """${jobTitle} - ${jobSummary}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_ANALYSIS, `Analyzing job: ${jobTitle}`, currentUser);
  },

  tailorResume: async (profile: UserProfile, jobTitle: string, jobDescription: string, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Rewrite the following resume to be perfectly tailored for the role of "${jobTitle}". Use the job description provided. The output should be a professional, ATS-friendly, single-column resume in Markdown format. Start with a large, centered H1 for the name. The line below should be a centered, pipe-separated list of contact info with icons (e.g., ICON_MAIL, ICON_PHONE). Section headers (e.g., PROFESSIONAL SUMMARY, WORK EXPERIENCE) must be centered, uppercase H2s with a line break before and after. For experience, the format is "**Title** | Dates" on one line and "*Company* | *Location*" on the next. Focus on achievements, use action verbs, and quantify results. Resume: """${resumeContent}""" Job Description: """${jobDescription}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return response.text || '';
    }, LogActionType.RESUME_TAILOR, `Tailoring resume for: ${jobTitle}`, currentUser);
  },

  generateCoverLetter: async (profile: UserProfile, jobTitle: string, company: string, jobDescription: string, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Write a compelling, professional cover letter for the role of "${jobTitle}" at "${company}". Keep it personal, enthusiastic, and under 250 words. Use the provided resume and job description to highlight 2-3 key matching experiences and skills. Address it generically if no hiring manager is known. The output should be in Markdown format. Resume: """${resumeContent}""" Job Description: """${jobDescription}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return response.text || '';
    }, LogActionType.COVER_LETTER_GENERATE, `Generating cover letter for: ${jobTitle} at ${company}`, currentUser);
  },

  generateInterviewPrep: async (profile: UserProfile, jobTitle: string, jobDescription: string, currentUser: string): Promise<InterviewQA[]> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Generate a list of 10 likely interview questions (mix of behavioral and technical) for the role of "${jobTitle}". For each question, provide a suggested answer using the STAR method, tailored from the user's resume. Also provide a brief tip for each answer. The output must be a valid JSON array of objects, each with "question", "answer", and "tip" keys. Resume: """${resumeContent}""" Job Description: """${jobDescription}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '[]');
    }, LogActionType.INTERVIEW_PREP_GENERATE, `Generating interview prep for: ${jobTitle}`, currentUser);
  },

  gradeResume: async (profile: UserProfile, currentUser: string): Promise<ResumeGrade> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Act as an expert career coach. Grade the following resume on a scale of 0-100. Provide feedback on ATS friendliness, use of action verbs, quantifiable metrics, and clarity. The response must be a valid JSON object with keys "score", "summary", and objects for "atsFriendly", "actionVerbs", "quantifiableMetrics", "clarity", and "keywords", each containing "pass" (boolean) and "feedback" (string). Resume: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_GRADE, 'Grading master resume', currentUser);
  },

  analyzeInterviewAnswer: async (question: string, answer: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `The user was asked the interview question: "${question}". They gave the following answer: "${answer}". Analyze this answer. Provide constructive feedback on its clarity, use of the STAR method, and relevance to common job roles. Reference their resume for context. The output should be a concise feedback summary in Markdown format. Resume: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return response.text || '';
    }, LogActionType.MOCK_INTERVIEW_FEEDBACK, `Analyzing answer for question: ${question}`, currentUser);
  },
  
  evaluateATSScore: async (resumeData: ResumeData, currentUser: string, jobDescription?: string): Promise<ResumeATSScore> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = convertResumeDataToMarkdown(resumeData);
      const prompt = `Evaluate the following resume for ATS compatibility and overall effectiveness. If a job description is provided, evaluate against it. Provide a score from 0-100 and detailed feedback for each category. The output must be a valid JSON object matching the ResumeATSScore interface. Resume: """${resumeContent}""" ${jobDescription ? `Job Description: """${jobDescription}"""` : ''}`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.ATS_SCORE_EVALUATED, 'Evaluating resume ATS score', currentUser);
  },

  // ... other new AI functions from AI Power Tools
  spotResumeFlaws: async (industry: string, resume: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Act as a senior recruiter for the ${industry} industry. Review this resume and provide brutally honest feedback. Highlight weak areas, overused buzzwords, and missing quantifiable metrics. Output in Markdown format. Resume: """${resume}"""`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.RESUME_GRADE, 'Spotting resume flaws', currentUser);
  },

  rewriteResumeForImpact: async (targetRole: string, resume: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Rewrite this resume to be more results-driven, quantifiable, and compelling for a ${targetRole}. Focus on achievements, not just duties. Use action verbs. Output in Markdown format. Resume: """${resume}"""`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.RESUME_TAILOR, 'Rewriting resume for impact', currentUser);
  },

  craftResumeHook: async (resume: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Using this resume, write a powerful, 3-line professional summary that hooks a recruiter in under 10 seconds. Prioritize impact, clarity, and value. Output in Markdown. Resume: """${resume}"""`;
        // FIX: Replaced undefined MODEL_LITE with MODEL_FAST
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.RESUME_TAILOR, 'Crafting resume hook/summary', currentUser);
  },

  revampBulletPoint: async (bullet: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Revamp this resume bullet point to highlight achievements and impact. Make it more quantifiable if possible. Original bullet: "${bullet}"`;
        // FIX: Replaced undefined MODEL_LITE with MODEL_FAST
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.RESUME_TAILOR, 'Revamping resume bullet point', currentUser);
  },

  extractKeywordsFromJD: async (jd: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Extract the most important keywords, skills, and responsibilities from this job description. Categorize them into "Technical Skills" and "Soft Skills". Output in Markdown format. Job Description: """${jd}"""`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.JOB_ANALYSIS, 'Extracting keywords from JD', currentUser);
  },

  highlightSkillsForInterview: async (jobTitle: string, industry: string, resume: string, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `Based on this resume, what are the top 3-5 skills I should highlight in an interview for a ${jobTitle} role in the ${industry} industry? Provide the skills and a brief explanation for each. Output in Markdown. Resume: """${resume}"""`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
        return response.text || '';
    }, LogActionType.INTERVIEW_PREP_GENERATE, 'Highlighting skills for interview', currentUser);
  },

  generateResumeTemplate: async (role: string, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Generate a complete, structured ResumeData JSON object for an ideal candidate applying for a "${role}" position. Include realistic but impressive placeholder content for all sections (summary, experience with bullet points, education, skills, projects). The output must be a valid JSON object.`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_TEMPLATE_GENERATE, `Generating resume template for ${role}`, currentUser);
  },

  evaluateCode: async (language: string, problem: string, solution: string, currentUser: string): Promise<CodeEvaluation> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Act as a senior software engineer conducting a code review. The user was given this ${language} problem: "${problem}". They provided this solution: "${solution}". Evaluate the solution for correctness, efficiency, and style. Provide feedback and a 'pass' boolean for each category, and overall suggestions for improvement. The output must be a valid JSON object matching the CodeEvaluation interface.`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.CODE_EVALUATE, `Evaluating ${language} code`, currentUser);
  },
  
  generateInterviewTips: async (currentUser: string): Promise<InterviewTips> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Generate a comprehensive list of smart, actionable interview tips for a job seeker. Organize them into two categories: "before" the interview and "after" the interview. Provide at least 5 tips for each. The output must be a valid JSON object with keys "before" and "after", each containing an array of strings.`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { tools: [{googleSearch: {}}], responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.INTERVIEW_TIPS_GENERATE, 'Generating interview tips', currentUser);
  },
  
  analyzeJobSkillsForInterview: async (jobDescription: string, profile: UserProfile, currentUser: string): Promise<JobSkillAnalysis> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Analyze the job description against the user's resume. Identify: 1. "keySkills" to highlight (skills the user has that are critical for the role), 2. "gaps" (skills in the JD missing from the resume), and 3. "talkingPoints" (suggestions on how to frame their existing experience to align with required skills). The output must be a valid JSON object matching the JobSkillAnalysis interface. Job Description: """${jobDescription}""" Resume: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_SKILL_ANALYSIS, 'Analyzing job skills for interview', currentUser);
  },
// FIX: Added missing geminiService methods
  optimizeLinkedInProfile: async (mode: 'headline' | 'about', text: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Act as a professional branding expert. Rewrite the following LinkedIn ${mode} to be more impactful and engaging for recruiters. Focus on keywords relevant to ${profile.targetRoles || 'the user\'s target roles'}. Use the user's resume for context. Current ${mode}: """${text}""" Resume: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return response.text || '';
    }, LogActionType.LINKEDIN_OPTIMIZE, `Optimizing LinkedIn ${mode}`, currentUser);
  },

  draftNetworkingMessage: async (scenario: string, recipientInfo: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
      const prompt = `Draft a professional and concise networking message for LinkedIn or email. Scenario: "${scenario}". Recipient: "${recipientInfo}". Keep it personal and focused on creating a connection or asking for advice, not just asking for a job. Use my resume for context. My name is ${profile.name}. Resume: """${resumeContent}"""`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt });
      return response.text || '';
    }, LogActionType.NETWORKING_MESSAGE_DRAFT, `Drafting networking message for scenario: ${scenario}`, currentUser);
  },

  generateSkillDevelopmentPath: async (skills: string[], currentUser: string): Promise<LearningPath> => {
    return handleApiCall(async () => {
      const ai = getClient();
      const prompt = `Generate a structured learning path for the following skills: ${skills.join(', ')}. Provide a brief summary and then for each skill, suggest a mix of learning resources like courses, projects, concepts to master, and tools to learn. The output must be a valid JSON object matching the LearningPath interface.`;
      const response = await ai.models.generateContent({ model: MODEL_FAST, contents: prompt, config: { responseMimeType: 'application/json' } });
      return JSON.parse(response.text || '{}');
    }, LogActionType.SKILL_DEV_PATH_GENERATE, `Generating learning path for skills: ${skills.join(', ')}`, currentUser);
  },

  composeEmail: async (purpose: EmailPurpose, context: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        let promptBase = '';
        switch (purpose) {
            case EmailPurpose.PROFESSIONAL_REWRITE:
                promptBase = `Act as a senior communication specialist. Rewrite this email to sound professional, clear, concise, and polite while keeping my original intent. Improve tone, structure, grammar, and flow. My email: "${context}"`;
                break;
            case EmailPurpose.COLD_EMAIL:
                promptBase = `Write a persuasive, short, high-impact cold email for this purpose: "${context}". Include a strong hook, value proposition, credibility, and a simple CTA. Make it sound human, confident, and non-salesy. Use my resume for context.`;
                break;
            case EmailPurpose.FOLLOW_UP:
                promptBase = `Write a polite and effective follow-up email reminding someone about this context: "${context}". Keep it respectful, non-pushy, and clear. Include a simple CTA that encourages a response.`;
                break;
            // ... add other cases
            default:
                promptBase = `Compose an email for the purpose of: ${purpose}. Here is the context: "${context}"`;
        }
        const resumeContent = profile.structuredResume ? convertResumeDataToMarkdown(profile.structuredResume) : profile.resumeContent;
        const finalPrompt = `${promptBase}\n\nMy name is ${profile.name} and my resume for context is: """${resumeContent}"""`;
        const response = await ai.models.generateContent({ model: MODEL_FAST, contents: finalPrompt });
        return response.text || '';
    }, LogActionType.EMAIL_COMPOSE, `Composing email for purpose: ${purpose}`, currentUser);
  },
};