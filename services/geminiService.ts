

import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
// FIX: Import missing types
import { InterviewQA, SearchResult, ParsedResume, SearchFilters, UserProfile, ResumeGrade, MasterResumeFitResult, LearningPath, EmailPurpose, LogActionType, ResumeData, ResumeATSScore, ExperienceItem, EducationItem, SkillItem, ProjectItem, CertificationItem, AwardItem } from '../types';
import { logService } from './logService'; // Import new logService

// Helper to get client using the environment variables
const getClient = () => {
  // As per deployment strategy, the API key is expected to be in the environment.
  // The main App component will handle cases where this is not configured.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const MODEL_FAST = 'gemini-2.5-flash'; // Optimized for cost and speed

// Helper to extract JSON from markdown code blocks
const extractJSON = (text: string) => {
  try {
    // Try to find JSON inside ```json ... ``` or just ``` ... ```
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      return JSON.parse(match[1]);
    }
    // Fallback: try parsing the whole text
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON response:", text);
    return null;
  }
};

// NEW: Centralized API call handler for robust error management and offline check
const handleApiCall = async <T>(apiCall: () => Promise<T>, actionType: LogActionType, details: string, username: string | 'system' | 'guest'): Promise<T> => {
  if (!navigator.onLine) {
    logService.log(username, LogActionType.OFFLINE_EVENT, `AI call "${actionType}" failed: No internet connection.`, 'warn');
    throw new Error('OFFLINE');
  }
  try {
    const result = await apiCall();
    // Log successful AI calls as debug or info, depending on verbosity needed
    logService.log(username, actionType, `AI call "${actionType}" succeeded. ${details}`, 'debug');
    return result;
  } catch (e: any) {
    const errorMessage = e.toString().toLowerCase();
    let logSeverity: 'warn' | 'error' = 'error';
    let logDetails = `AI call "${actionType}" failed: ${e.message || 'Unknown error.'}`;

    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      logDetails = `AI call "${actionType}" failed: Rate limit or quota exceeded.`;
      logSeverity = 'warn'; // Rate limits are often transient, so warn might be appropriate
      logService.log(username, LogActionType.ERROR_OCCURRED, logDetails, logSeverity);
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    logService.log(username, LogActionType.ERROR_OCCURRED, logDetails, logSeverity);
    throw e;
  }
};

export const geminiService = {
  /**
   * Searches for jobs using Google Search Grounding with advanced filters.
   * Includes a fallback mechanism if initial filtered search yields no results.
   */
  searchJobs: async (filters: SearchFilters, currentUser: string): Promise<{ text: string, results: SearchResult[], wasFallback: boolean }> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const numJobsToFetch = 30; // Request more jobs initially

        const dateMap: Record<SearchFilters['datePosted'], string> = { 
          '24h': 'past 24 hours', 
          'week': 'past week', 
          'month': 'past month', 
          'any': 'anytime' 
        };

        // --- Primary Search: Uses all specified filters ---
        let primaryPrompt = `
          You are a highly efficient job search engine assistant.
          Find ${numJobsToFetch} active, recent job postings.
          
          Target Sites: Search specifically on LinkedIn, Indeed, Glassdoor, Google Careers, We Work Remotely, Stack Overflow Jobs, and other legitimate job boards.
          
          Strictly adhere to ALL the following criteria:
          - Keywords: "${filters.query}"
        `;

        if (filters.location) primaryPrompt += `- Location: "${filters.location}"\n`;
        if (filters.companySize !== 'any') primaryPrompt += `- Company Size: "${filters.companySize}"\n`;
        if (filters.educationLevel !== 'any') primaryPrompt += `- Education Level: "${filters.educationLevel}"\n`;

        if (filters.datePosted !== 'any') {
          primaryPrompt += `- Date Posted: Within the ${dateMap[filters.datePosted]}\n`;
        }
        if (filters.experienceLevel !== 'any') primaryPrompt += `- Experience Level: "${filters.experienceLevel}"\n`;
        if (filters.jobType !== 'any') primaryPrompt += `- Job Type: "${filters.jobType}"\n`;
        if (filters.remote !== 'any') primaryPrompt += `- Work Arrangement: "${filters.remote}"\n`;
        if (filters.salaryRange !== 'any') primaryPrompt += `- Salary Range: "${filters.salaryRange.replace(/_/g, ' ')}"\n`;
        if (filters.seniority !== 'any') primaryPrompt += `- Seniority: "${filters.seniority.replace(/_/g, ' ')}"\n`;
        
        primaryPrompt += `
          Use the Google Search tool to find actual, currently open job postings that precisely match ALL these criteria. 
          
          CRITICAL: For each job, provide a direct, valid URL to the *original job posting* on a reputable job site. If a direct link is absolutely not found after a thorough search, use "N/A" for the URL.

          AFTER searching, format the results as a strict JSON array inside a markdown code block.
          Each JSON object for a job MUST have these exact keys and types:
          - title (string): The exact job title.
          - company (string): The company name.
          - location (string): City, State, or Country.
          - url (string): Direct URL to the job posting, or "N/A".
          - summary (string): A concise 1-2 sentence description of the role.
          - postedDate (string): The date posted (e.g., "1 day ago", "Oct 12, 2023"). If unknown, use "Recently".
          - source (string): The platform name (e.g., "LinkedIn", "Indeed", "Company Site").

          Example output format:
          \`\`\`json
          [
            { "title": "Software Engineer", "company": "Tech Corp", "location": "Remote", "url": "https://linkedin.com/jobs/...", "summary": "Develops software...", "postedDate": "1 day ago", "source": "LinkedIn" }
          ]
          \`\`\`
          Ensure the JSON is perfectly valid and only includes the specified keys. DO NOT include any conversational text outside the markdown block.
        `;

        let primaryResponse: GenerateContentResponse = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: primaryPrompt,
          config: {
            tools: [{googleSearch: {}}],
          }
        });

        let primaryParsedData = extractJSON(primaryResponse.text || '');
        let primaryResults: SearchResult[] = Array.isArray(primaryParsedData) ? primaryParsedData : [];

        if (primaryResults.length === 0) {
            // --- Fallback Search: If primary search yields no results, perform a broader search ---
            const fallbackPrompt = `
              You are a highly efficient job search engine assistant.
              No jobs were found with the specific filters. Now, find ${numJobsToFetch} recent, active job postings for: "${filters.query}" from various reputable sources like LinkedIn, Indeed, Glassdoor, Google Jobs, etc.
              For this broader search, focus primarily on the keywords and ignore other specific filters.
              
              Use the Google Search tool to find actual, currently open job postings.
              
              CRITICAL: For each job, provide a direct, valid URL. If a direct link is absolutely not found after a thorough search, use "N/A" for the URL.

              AFTER searching, format the results as a strict JSON array inside a markdown code block.
              Each JSON object for a job MUST have these exact keys and types:
              - title (string): The exact job title.
              - company (string): The company name.
              - location (string): City, State, or Country.
              - url (string): Direct URL to the job posting, or "N/A".
              - summary (string): A concise 1-2 sentence description.
              - postedDate (string): The approximate date posted.
              - source (string): The platform name.
              
              Example output format:
              \`\`\`json
              [
                { "title": "Software Engineer", "company": "Tech Corp", "location": "Remote", "url": "https://linkedin.com/jobs/...", "summary": "Develops software...", "postedDate": "1 day ago", "source": "LinkedIn" }
              ]
              \`\`\`
              Ensure the JSON is perfectly valid and only includes the specified keys. DO NOT include any conversational text outside the markdown block.
            `;

            let fallbackResponse: GenerateContentResponse = await ai.models.generateContent({
              model: MODEL_FAST,
              contents: fallbackPrompt,
              config: { tools: [{googleSearch: {}}] }
            });

            let fallbackResults: SearchResult[] = Array.isArray(extractJSON(fallbackResponse.text || '')) ? extractJSON(fallbackResponse.text || '') : [];
            logService.log(currentUser, LogActionType.JOB_SEARCH, `Fallback search for "${filters.query}" yielded ${fallbackResults.length} results.`, 'info');
            return { text: fallbackResponse.text || '', results: fallbackResults, wasFallback: true };
        } else {
            logService.log(currentUser, LogActionType.JOB_SEARCH, `Primary search for "${filters.query}" yielded ${primaryResults.length} results.`, 'info');
            return { text: primaryResponse.text || '', results: primaryResults, wasFallback: false };
        }
    }, LogActionType.JOB_SEARCH, `Searching for jobs with query "${filters.query}"`, currentUser);
  },

  /**
   * Analyzes the job description against the resume to provide a match score and insights.
   */
  // FIX: Reordered parameters to place required 'currentUser' last, and corrected type of 'resume'
  analyzeJob: async (resumeContent: string, jobTitle: string, jobSummary: string, currentUser: string): Promise<MasterResumeFitResult> => { 
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          You are an expert career coach and Applicant Tracking System (ATS) specialist.
          Your task is to analyze the compatibility between a candidate's resume and a specific job posting.

          Candidate's Master Resume (summarized for context):
          ---
          ${resumeContent.slice(0, 8000)}
          ---

          Target Job Details:
          - Title: "${jobTitle}"
          - Summary: "${jobSummary.slice(0, 5000)}"
          
          Based on the provided resume content and job details, perform a comprehensive fit analysis.
          Return a JSON object with the following strict structure:
          1.  score: number (0-100, representing overall compatibility, higher is better).
          2.  summary: string (2-3 sentences max, explaining the overall fit, highlighting top 2-3 strengths and main 1-2 gaps in relation to the job).
          3.  missingSkills: string[] (list up to 5 critical skills explicitly mentioned or strongly implied in the job summary that are *not* clearly present or demonstrated in the resume).
          4.  matchingSkills: string[] (list up to 5 key skills from the job summary that *are* clearly present and demonstrated in the resume).

          Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
        `;

        const schema = {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Overall compatibility score (0-100).' },
            summary: { type: Type.STRING, description: '2-3 sentence summary of the overall fit.' },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of up to 5 critical missing skills.' },
            matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of up to 5 key matching skills.' },
          },
          required: ['score', 'summary', 'missingSkills', 'matchingSkills']
        };

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          }
        });

        return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_ANALYSIS, `Job analysis for "${jobTitle}"`, currentUser);
  },

  /**
   * Analyzes the master resume against a target job description to provide a match score and insights.
   */
  analyzeMasterResumeFit: async (resumeContent: string, targetJobDescription: string, currentUser: string): Promise<MasterResumeFitResult> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const prompt = `
        You are an expert career coach.
        Analyze the overarching fit between this master resume and the *general requirements* of the target job description. This analysis is for identifying broad skill alignment and gaps for an ideal role, not for a specific application.
        
        Master Resume (for context): "${resumeContent.slice(0, 8000)}"
        Target Job Description (for ideal role - general requirements): "${targetJobDescription.slice(0, 5000)}"

        Return a JSON object with the following strict structure:
        1. score: number (0-100, overall match for the ideal role)
        2. summary: string (2-3 sentences max, summarizing the general fit, strengths, and primary skill areas to develop for the target role).
        3. missingSkills: string[] (list up to 5 key skills/competencies from the target job description that are most notably absent or weak in the master resume).
        4. matchingSkills: string[] (list up to 5 key skills/competencies from the target job description that are strongly demonstrated in the master resume).

        Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: 'Overall match score for the ideal role (0-100).' },
          summary: { type: Type.STRING, description: '2-3 sentence summary of the general fit.' },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of up to 5 key missing skills for the target role.' },
          matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'List of up to 5 key matching skills for the target role.' },
        },
        required: ['score', 'summary', 'missingSkills', 'matchingSkills']
      };

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });

      return JSON.parse(response.text || '{}');
    }, LogActionType.JOB_ANALYSIS, `Master resume fit analysis for target roles`, currentUser);
  },

  /**
   * Generates a skill development path for a list of missing skills.
   */
  generateSkillDevelopmentPath: async (missingSkills: string[], currentUser: string): Promise<LearningPath> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const prompt = `
        You are an expert career development coach specializing in actionable learning paths.
        For the following skills identified as missing or needing improvement: [${missingSkills.join(', ')}],
        generate a comprehensive and practical learning path.
        
        For each skill, suggest 2-3 concrete and actionable resources or steps to acquire or improve it. Focus on resources that are highly effective and widely accessible. Provide specific examples where possible (e.g., Coursera courses, specific types of projects, essential tools).

        Return a JSON object with the following strict structure:
        - summary: string (A concise introduction to the learning path, 2 sentences max. Focus on empowerment and strategy.)
        - skillTopics: array of objects, each representing a skill, with:
          - skill: string (The exact name of the skill from the input list).
          - resources: array of objects, each describing a learning resource, with:
            - type: "Course" | "Project" | "Concept" | "Tool" (Categorize the resource clearly).
            - title: string (A descriptive name for the resource/project/concept/tool, e.g., "Coursera: Advanced Python", "Build a REST API with Node.js", "Understanding Data Structures").
            - description: string (A brief, 1-2 sentence explanation of what the resource offers or why it's useful for learning the skill).
            - link?: string (Optional: a direct, valid URL to the course, project repository, documentation, or relevant article. Only include if a specific, high-quality, and publicly accessible link is available. Do NOT generate placeholder links).
        
        Example JSON format:
        \`\`\`json
        {
          "summary": "This path will guide you through acquiring critical skills. Focus on practical application to accelerate your growth.",
          "skillTopics": [
            {
              "skill": "Python",
              "resources": [
                {
                  "type": "Course",
                  "title": "Python for Everybody Specialization (Coursera)",
                  "description": "Comprehensive Coursera specialization covering Python basics to advanced data structures and web programming. Ideal for beginners to intermediate learners.",
                  "link": "https://www.coursera.org/specializations/python"
                },
                {
                  "type": "Project",
                  "title": "Build a Web Scraper with Python",
                  "description": "Hands-on project to learn Python libraries like BeautifulSoup and Requests for data extraction from websites. Practical application of Python fundamentals.",
                  "link": "https://www.example.com/build-python-scraper-project"
                }
              ]
            }
          ]
        }
        \`\`\`
        Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING, description: 'A concise introduction to the learning path.' },
          skillTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING, description: 'The name of the skill.' },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['Course', 'Project', 'Concept', 'Tool'], description: 'Category of the learning resource.' },
                      title: { type: Type.STRING, description: 'Descriptive title for the resource.' },
                      description: { type: Type.STRING, description: 'Brief explanation of the resource.' },
                      link: { type: Type.STRING, description: 'Optional: URL to the resource.' },
                    },
                    required: ['type', 'title', 'description'],
                  },
                },
              },
              required: ['skill', 'resources'],
            },
          },
        },
        required: ['summary', 'skillTopics'],
      };

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema,
        }
      });
      return JSON.parse(response.text || '{}');
    }, LogActionType.SKILL_DEV_PATH_GENERATE, `Skill development path for skills: ${missingSkills.join(', ')}`, currentUser);
  },

  /**
   * Generates a structured resume from raw text for the builder.
   */
  generateStructuredResume: async (masterResumeContent: string, profile: UserProfile, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const prompt = `
        You are an expert resume parser and formatter. Your task is to take raw resume text and convert it into a highly structured JSON format, suitable for an Applicant Tracking System (ATS) friendly builder.

        Raw Resume Text:
        ---
        ${masterResumeContent.slice(0, 10000)}
        ---

        User's Profile Info (for cross-referencing contact details if missing in raw text):
        Name: ${profile.name || ''}
        Email: ${profile.email || ''}
        Phone: ${profile.phone || ''}
        LinkedIn: ${profile.linkedin || ''}
        GitHub: ${profile.github || ''}
        Website: ${profile.website || ''}
        Location: ${profile.location || ''}
        
        CRITICAL INSTRUCTIONS:
        1.  Extract information into the exact JSON structure provided below.
        2.  If a field is not found in the raw resume text OR in the provided profile info, omit that key entirely from the JSON. Do NOT use "N/A", "null", or empty strings for missing fields unless specified.
        3.  Ensure dates are parsed clearly (e.g., "Month Year - Month Year" or "Month Year - Present").
        4.  For bullet points in experience and projects, extract them as separate strings within the 'bulletPoints' array.
        5.  The 'order' field in sections should reflect a logical resume flow (e.g., Contact/Summary first, then Experience, Education, etc.).
        6.  'type' in sections should be 'text', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards'.
        7.  Assign a unique 'id' (e.g., UUID or timestamp-based) to each ResumeSection, ExperienceItem, EducationItem, etc., for tracking in the builder.

        Return a JSON object with the following strict structure:
        \`\`\`json
        {
          "contact": {
            "name": "string",
            "email": "string",
            "phone": "string",
            "linkedin": "string (optional)",
            "github": "string (optional)",
            "website": "string (optional)",
            "portfolio": "string (optional)",
            "location": "string (optional)"
          },
          "summary": "string (1-3 sentences, candidate's professional summary)",
          "sections": [
            {
              "id": "string (unique ID)",
              "title": "string (e.g., Work Experience, Education, Skills, Projects, Certifications, Awards, Additional Information)",
              "type": "string ('text' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards')",
              "order": "number (e.g., 10, 20, 30 for sorting)",
              "content": "string | array of objects (structure depends on type)"
            }
          ]
        }
        \`\`\`

        Specifically for 'content' within sections:
        -   If type is 'text': content is a string.
        -   If type is 'experience': content is an array of ExperienceItem objects:
            \`\`\`json
            [{
              "id": "string (unique ID)",
              "company": "string",
              "title": "string",
              "location": "string",
              "dates": "string",
              "bulletPoints": ["string"]
            }]
            \`\`\`
        -   If type is 'education': content is an array of EducationItem objects:
            \`\`\`json
            [{
              "id": "string (unique ID)",
              "degree": "string",
              "institution": "string",
              "location": "string",
              "dates": "string",
              "details": "string (optional)"
            }]
            \`\`\`
        -   If type is 'skills': content is an array of SkillItem objects:
            \`\`\`json
            [{
              "id": "string (unique ID)",
              "category": "string (e.g., Programming Languages, Cloud Platforms)",
              "skills": ["string"]
            }]
            \`\`\`
        -   If type is 'projects': content is an array of ProjectItem objects:
            \`\`\`json
            [{
                "id": "string (unique ID)",
              "name": "string",
              "dates": "string",
              "description": "string (brief summary)",
              "link": "string (optional)",
              "bulletPoints": ["string (optional)"]
            }]
            \`\`\`
        -   If type is 'certifications': content is an array of CertificationItem objects:
            \`\`\`json
            [{
              "id": "string (unique ID)",
              "name": "string",
              "issuer": "string",
              "date": "string",
              "link": "string (optional)"
            }]
            \`\`\`
        -   If type is 'awards': content is an array of AwardItem objects:
            \`\`\`json
            [{
              "id": "string (unique ID)",
              "name": "string",
              "issuer": "string",
              "date": "string",
              "description": "string (optional)"
            }]
            \`\`\`
        
        Ensure the final JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON block.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          // No responseSchema here because the structure is too complex and dynamic.
          // We rely on the prompt to enforce it.
        }
      });
      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_BUILDER_AI_AUTOFILL, `AI auto-filled structured resume`, currentUser);
  },

  /**
   * Evaluates the ATS compatibility and effectiveness of a structured resume.
   */
  evaluateATSScore: async (resumeData: ResumeData, jobDescription?: string, currentUser?: string): Promise<ResumeATSScore> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const resumeMarkdown = geminiService.convertResumeDataToMarkdown(resumeData);

      const prompt = `
        As an expert career coach and Applicant Tracking System (ATS) specialist, analyze and grade the following resume content.
        ${jobDescription ? `Compare it against this specific job description:\n---\n${jobDescription.slice(0, 5000)}\n---` : 'Provide a general ATS health check.'}
        
        Resume Content (derived from structured data):
        ---
        ${resumeMarkdown.slice(0, 10000)}
        ---
        
        Provide a comprehensive analysis in a strict JSON format. Evaluate the following five key areas, providing a 'pass' (boolean, true if meets standard, false if needs significant improvement) and 'feedback' (string, 1-2 concise sentences for actionable advice) for each:
        1.  atsFriendly: Does the format (e.g., single-column, no tables/graphics, standard fonts) make it easily parsable by an Applicant Tracking System? Penalize for complex layouts.
        2.  actionVerbs: Does the resume consistently use strong, dynamic action verbs at the start of bullet points, avoiding passive language (e.g., "responsible for")?
        3.  quantifiableMetrics: Are achievements backed by specific numbers, percentages, or concrete data to clearly demonstrate impact and results?
        4.  keywords: If a job description was provided, how well are relevant keywords integrated? If not, how well does it use general industry keywords?
        5.  clarity: Is the language clear, concise, and professional, free of excessive jargon? Is the candidate's value proposition and career narrative easy to understand?

        Finally, provide an overall 'score' (number, 0-100) and a brief 'summary' (string, 2-3 sentences) of the resume's greatest strengths and most critical areas for improvement.

        Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER, description: 'Overall ATS score (0-100).' },
          summary: { type: Type.STRING, description: '2-3 sentence summary of strengths and areas for improvement.' },
          atsFriendly: { 
            type: Type.OBJECT, 
            properties: { 
              pass: { type: Type.BOOLEAN, description: 'True if ATS friendly, false otherwise.' }, 
              feedback: { type: Type.STRING, description: 'Actionable feedback for ATS compatibility.' } 
            },
            required: ['pass', 'feedback']
          },
          actionVerbs: { 
            type: Type.OBJECT, 
            properties: { 
              pass: { type: Type.BOOLEAN, description: 'True if strong action verbs are used, false otherwise.' }, 
              feedback: { type: Type.STRING, description: 'Actionable feedback for action verb usage.' } 
            },
            required: ['pass', 'feedback']
          },
          quantifiableMetrics: { 
            type: Type.OBJECT, 
            properties: { 
              pass: { type: Type.BOOLEAN, description: 'True if achievements are quantified, false otherwise.' }, 
              feedback: { type: Type.STRING, description: 'Actionable feedback for quantifiable metrics.' } 
            },
            required: ['pass', 'feedback']
          },
          keywords: { 
            type: Type.OBJECT, 
            properties: { 
              pass: { type: Type.BOOLEAN, description: 'True if keywords are well integrated, false otherwise.' }, 
              feedback: { type: Type.STRING, description: 'Actionable feedback for keyword optimization.' } 
            },
            required: ['pass', 'feedback']
          },
          clarity: { 
            type: Type.OBJECT, 
            properties: { 
              pass: { type: Type.BOOLEAN, description: 'True if language is clear and concise, false otherwise.' }, 
              feedback: { type: Type.STRING, description: 'Actionable feedback for clarity and conciseness.' } 
            },
            required: ['pass', 'feedback']
          },
        },
        required: ['score', 'summary', 'atsFriendly', 'actionVerbs', 'quantifiableMetrics', 'keywords', 'clarity']
      };

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schema
        }
      });

      return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_ATS_EVALUATED, `ATS score evaluation for resume`, currentUser || 'guest');
  },


  /**
   * Rewrites the user's resume for a specific job.
   */
  tailorResume: async (resume: string, jobDescription: string, profile: UserProfile, currentUser: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        // Use structured resume if available, otherwise raw content
        const resumeContentForAI = profile.structuredResume 
            ? geminiService.convertResumeDataToMarkdown(profile.structuredResume)
            : profile.resumeContent;

        const prompt = `
          Act as an expert resume writer and career coach, specializing in creating ATS-optimized documents.
          Your task is to rewrite the provided "Original Resume Content" to perfectly match the "Target Job Description".

          Original Resume Content:
          ---
          ${resumeContentForAI.slice(0, 8000)}
          ---

          Target Job Description:
          ---
          ${jobDescription.slice(0, 8000)}
          ---

          User Profile Contact Info (ONLY include if value is provided and valid, otherwise omit the field completely):
          Name: ${profile.name || '[Candidate Name]'}
          Email: ${profile.email ? profile.email : ''}
          Phone: ${profile.phone ? profile.phone : ''}
          LinkedIn: ${profile.linkedin ? profile.linkedin : ''}
          GitHub: ${profile.github ? profile.github : ''}
          Website: ${profile.website ? profile.website : ''}
          Portfolio: ${profile.portfolio ? profile.portfolio : ''}
          Location: ${profile.location ? profile.location : ''}

          **CRITICAL ATS-OPTIMIZATION RULES:**

          1.  **KEYWORD INTEGRATION**:
              -   Thoroughly analyze the 'Target Job Description' for specific keywords, phrases, required skills, technologies, and qualifications.
              -   Naturally and logically integrate these exact keywords and concepts throughout the rewritten resume. Prioritize sections like 'SUMMARY', 'SKILLS', and 'WORK EXPERIENCE'.
              -   Mirror the language of the job description where appropriate (e.g., if they say "team collaboration," use that specific phrase). Ensure a high density of relevant keywords without keyword stuffing.

          2.  **STRUCTURE & FORMATTING**:
              -   Use a clean, professional, single-column layout. **Absolutely DO NOT use tables, multi-column formats, text boxes, or embedded images/icons.** This is crucial for ATS parsing.
              -   **HEADER**: The resume must start with a clear, concise header for contact information.
                  -   The very first line must be the candidate's full name as a Markdown H1 (e.g., # JANE DOE).
                  -   Immediately following, on a single line, include all *provided* and *valid* contact information separated by pipes (e.g., "Email | Phone | LinkedIn URL | GitHub URL | Portfolio Website | Location"). Omit any field if data is not provided.
              -   **STANDARD SECTION HEADERS**: Use these exact Markdown H2 headers for primary sections. Omit any section if no relevant content can be extracted from the original resume or profile for that section.
                  ## SUMMARY
                  ## SKILLS
                  ## WORK EXPERIENCE
                  ## PROJECTS (if applicable)
                  ## EDUCATION
                  ## CERTIFICATIONS (if applicable)
                  ## AWARDS (if applicable)
              -   **SKILLS SECTION**: Group skills logically by relevant categories (e.g., **Programming Languages:** Python, Java; **Cloud Platforms:** AWS, Azure; **Tools:** Jira, Docker; **Methodologies:** Agile, Scrum). Use bolding for categories.
              -   **WORK EXPERIENCE FORMAT**: For each position, follow this precise Markdown format:
                  **Company Name** | City, State
                  *Job Title* | Month Year – Month Year (or Present)
                  -   Use strong, quantifiable bullet points (hyphens) starting with powerful action verbs (e.g., "Engineered", "Managed", "Led", "Developed", "Implemented").
                  -   Quantify achievements with metrics (numbers, percentages, monetary values) wherever possible to demonstrate impact (e.g., "Increased user engagement by 15%", "Reduced server costs by 25%", "Managed a team of 5").
                  -   Tailor each bullet point to explicitly address responsibilities and impacts listed in the 'Target Job Description'.

          3.  **FINAL INSTRUCTIONS**:
              -   The entire output must be in valid Markdown format.
              -   Do NOT include any conversational text, introductory phrases, or explanations (e.g., "Here is the tailored resume.").
              -   Do NOT wrap the final output in Markdown code fences (\`\`\`).
              -   Start the response DIRECTLY with the H1 name.
              -   Keep the resume concise and impactful, ideally 1-2 pages for most professional roles. Prioritize relevance over exhaustive detail.
        `;

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });

        let text = response.text || "Failed to generate resume.";
        text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        return text;
    }, LogActionType.RESUME_TAILOR, `Resume tailoring for job: "${jobDescription.split('\n')[0]}"`, currentUser);
  },

  /**
   * Generates a cover letter.
   */
  generateCoverLetter: async (resume: string, jobDescription: string, company: string, userPhone?: string, userEmail?: string, currentUser?: string, profile?: UserProfile) => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        // Use structured resume if available, otherwise raw content
        const resumeContentForAI = profile?.structuredResume 
            ? geminiService.convertResumeDataToMarkdown(profile.structuredResume)
            : resume;

        // Extract applicant name from the beginning of the resume content (assuming H1 format)
        const applicantNameMatch = resumeContentForAI.match(/^#\s*(.+?)\n/);
        const applicantName = applicantNameMatch ? applicantNameMatch[1].trim() : profile?.name || 'Valued Applicant';

        // Prefer profile contact info if provided
        const finalUserPhone = profile?.phone || userPhone || '[Your Phone Number]';
        const finalUserEmail = profile?.email || userEmail || '[Your Email Address]';
        
        const prompt = `
          You are an expert career communications specialist.
          Write a compelling, professional, and personalized cover letter for the company "${company}", applying for the role implied by the "Job Description".

          Applicant Name: ${applicantName}
          Applicant Phone: ${finalUserPhone}
          Applicant Email: ${finalUserEmail}
          Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

          Relevant Resume Context (for skills & experience):
          ${resumeContentForAI.slice(0, 5000)}

          Target Job Description:
          ${jobDescription.slice(0, 5000)}
          
          **CRITICAL RULES:**
          1.  **HEADER**: Begin with the Applicant's Name, followed by their Phone, and Email, each on a new line. Then include the Current Date.
              Example:
              John Doe
              (123) 456-7890
              john.doe@example.com

              [Current Date]
          2.  **FORMAT**: Follow standard business letter format (address to "Hiring Manager" or "Hiring Team" if no specific name is known, use the Company Name).
          3.  **PERSONALIZATION**: Explicitly reference 2-3 key requirements from the job description and clearly link them to specific accomplishments or skills from the resume. Quantify impact where possible.
          4.  **TONE**: Maintain a confident, enthusiastic, and professional tone throughout.
          5.  **CONCISENESS**: Keep the letter concise, ideally under 400 words (1 page).
          6.  **OUTPUT**: Do NOT include any conversational filler (e.g., "Here is the letter"). Do NOT wrap the output in Markdown code blocks. Start directly with the Applicant's Name.
        `;

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });

        let text = response.text || "Failed to generate cover letter.";
        text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        return text;
    }, LogActionType.COVER_LETTER_GENERATE, `Cover letter generation for company: "${company}"`, currentUser || 'guest');
  },

  /**
   * Generates interview questions and answers.
   */
  generateInterviewPrep: async (resume: string, jobDescription: string, currentUser: string, profile?: UserProfile): Promise<InterviewQA[]> => {
    return handleApiCall(async () => {
        const ai = getClient();

        // Use structured resume if available, otherwise raw content
        const resumeContentForAI = profile?.structuredResume 
            ? geminiService.convertResumeDataToMarkdown(profile.structuredResume)
            : resume;
        
        const prompt = `
          You are an expert interview coach.
          Generate 5 diverse interview questions specifically tailored to this job description and the provided candidate resume.
          Include a mix of behavioral (requiring STAR method answers) and technical/situational questions.

          For each question, provide:
          1.  A suggested ideal answer (brief, following the STAR method for behavioral questions where appropriate).
          2.  A concise "tip" (1-2 sentences) for how the candidate should approach answering, or what the interviewer is looking for.
          
          Candidate's Master Resume (for context):
          ${resumeContentForAI.slice(0, 5000)}
          
          Target Job Description:
          ${jobDescription.slice(0, 5000)}

          Return a JSON array of objects, where each object has the following strict structure:
          - question: string (The interview question).
          - answer: string (A suggested example answer. For behavioral, use STAR method format. For technical, provide a direct, concise response).
          - tip: string (Coaching advice for the candidate, 1-2 sentences).

          Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
        `;

        const schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: 'The interview question.' },
              answer: { type: Type.STRING, description: 'A suggested example answer.' },
              tip: { type: Type.STRING, description: 'Coaching advice for the candidate.' }
            },
            required: ['question', 'answer', 'tip']
          }
        };

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema
          }
        });

        return JSON.parse(response.text || '[]');
    }, LogActionType.INTERVIEW_PREP_GENERATE, `Interview prep generation for job: "${jobDescription.split('\n')[0]}"`, currentUser);
  },

  /**
   * Parses raw resume text into structured data.
   */
  parseResume: async (resumeText: string, currentUser: string): Promise<ResumeData> => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          You are an expert resume parser and formatter. Your task is to take raw resume text and convert it into a highly structured JSON format, suitable for an Applicant Tracking System (ATS) friendly builder.

          Raw Resume Text:
          ---
          ${resumeText.slice(0, 10000)}
          ---
        
          CRITICAL INSTRUCTIONS:
          1.  Extract information into the exact JSON structure provided below.
          2.  If a field is not found in the raw resume text, omit that key entirely from the JSON. Do NOT use "N/A", "null", or empty strings for missing fields unless specified.
          3.  Ensure dates are parsed clearly (e.g., "Month Year - Month Year" or "Month Year - Present").
          4.  For bullet points in experience and projects, extract them as separate strings within the 'bulletPoints' array.
          5.  The 'order' field in sections should reflect a logical resume flow (e.g., Contact/Summary first, then Experience, Education, etc.).
          6.  'type' in sections should be 'text', 'experience', 'education', 'skills', 'projects', 'certifications', 'awards'.
          7.  Assign a unique 'id' (e.g., UUID or timestamp-based, like Date.now() + Math.random().toString(36).substring(2, 7)) to each ResumeSection, ExperienceItem, EducationItem, etc., for tracking in the builder. This ID is essential.

          Return a JSON object with the following strict structure:
          \`\`\`json
          {
            "contact": {
              "name": "string",
              "email": "string",
              "phone": "string",
              "linkedin": "string (optional)",
              "github": "string (optional)",
              "website": "string (optional)",
              "portfolio": "string (optional)",
              "location": "string (optional)"
            },
            "summary": "string (1-3 sentences, candidate's professional summary)",
            "sections": [
              {
                "id": "string (unique ID)",
                "title": "string (e.g., Work Experience, Education, Skills, Projects, Certifications, Awards, Additional Information)",
                "type": "string ('text' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards')",
                "order": "number (e.g., 10, 20, 30 for sorting)",
                "content": "string | array of objects (structure depends on type)"
              }
            ]
          }
          \`\`\`

          Specifically for 'content' within sections:
          -   If type is 'text': content is a string.
          -   If type is 'experience': content is an array of ExperienceItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "company": "string",
                "title": "string",
                "location": "string",
                "dates": "string",
                "bulletPoints": ["string"]
              }]
              \`\`\`
          -   If type is 'education': content is an array of EducationItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "degree": "string",
                "institution": "string",
                "location": "string",
                "dates": "string",
                "details": "string (optional)"
              }]
              \`\`\`
          -   If type is 'skills': content is an array of SkillItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "category": "string (e.g., Programming Languages, Cloud Platforms)",
                "skills": ["string"]
              }]
              \`\`\`
          -   If type is 'projects': content is an array of ProjectItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "name": "string",
                "dates": "string",
                "description": "string (brief summary)",
                "link": "string (optional)",
                "bulletPoints": ["string (optional)"]
              }]
              \`\`\`
          -   If type is 'certifications': content is an array of CertificationItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "name": "string",
                "issuer": "string",
                "date": "string",
                "link": "string (optional)"
              }]
              \`\`\`
          -   If type is 'awards': content is an array of AwardItem objects:
              \`\`\`json
              [{
                "id": "string (unique ID)",
                "name": "string",
                "issuer": "string",
                "date": "string",
                "description": "string (optional)"
              }]
              \`\`\`
          
          Ensure the final JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON block.
        `;

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            // No responseSchema here because the structure is too complex and dynamic.
            // We rely on the prompt to enforce it.
          }
        });

        return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_PARSE, `Resume parsing for profile`, currentUser);
  },
  
  /**
   * Gets the current weather for a location using coordinates.
   */
  getWeatherByCoords: async (latitude: number, longitude: number, currentUser: string): Promise<{ city: string; country: string; description: string; temperature: number } | null> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `What is the current city name, country, weather description, and temperature in Celsius for latitude ${latitude} and longitude ${longitude}? Use Google Search for real-time, accurate data. Return a strict JSON object inside a markdown code block with keys "city" (string), "country" (string), "description" (e.g., "Sunny", "Partly Cloudy", "Rain"), and "temperature" (a number, rounded to nearest whole number). DO NOT include any conversational text outside the markdown block.`;
        
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        // FIX: Access `data.country` directly as its type has been updated in geminiService.ts
        const parsedData = extractJSON(response.text || 'null') as { city: string; country: string; description: string; temperature: number } | null;
        if (parsedData && parsedData.city && parsedData.country && parsedData.description && typeof parsedData.temperature === 'number') {
          return parsedData;
        }
        return null;
    }, LogActionType.GEOLOCATION_FETCH, `Weather fetch for coords ${latitude}, ${longitude}`, currentUser);
  },

  /**
   * Grades a resume based on several metrics.
   */
  gradeResume: async (resumeText: string, currentUser: string): Promise<ResumeGrade> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          As an expert career coach and Applicant Tracking System (ATS) specialist, analyze and grade the following resume on a scale of 0-100.
          
          Resume Content:
          "${resumeText.slice(0, 10000)}"
          
          Provide a comprehensive analysis in a strict JSON format. Evaluate the following five key areas, providing a 'pass' (boolean, true if meets standard, false if needs significant improvement) and 'feedback' (string, 1-2 concise sentences for actionable advice) for each:
          1.  atsFriendly: Does the format (e.g., single-column, no tables/graphics, standard fonts) make it easily parsable by an Applicant Tracking System? Penalize for complex layouts.
          2.  actionVerbs: Does the resume consistently use strong, dynamic action verbs at the start of bullet points, avoiding passive language (e.g., "responsible for")?
          3.  quantifiableMetrics: Are achievements backed by specific numbers, percentages, or concrete data to clearly demonstrate impact and results?
          4.  keywords: How well are relevant keywords integrated into the resume based on general industry best practices?
          5.  clarity: Is the language clear, concise, and professional, free of excessive jargon? Is the candidate's value proposition and career narrative easy to understand?

          Finally, provide an overall 'score' (number, 0-100) and a brief 'summary' (string, 2-3 sentences) of the resume's greatest strengths and most critical areas for improvement.

          Ensure the JSON is perfectly valid and directly parsable. DO NOT include any conversational text outside the JSON.
        `;

        const schema = {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER, description: 'Overall resume health score (0-100).' },
            summary: { type: Type.STRING, description: '2-3 sentence summary of strengths and areas for improvement.' },
            atsFriendly: { 
              type: Type.OBJECT, 
              properties: { 
                pass: { type: Type.BOOLEAN, description: 'True if ATS friendly, false otherwise.' }, 
                feedback: { type: Type.STRING, description: 'Actionable feedback for ATS compatibility.' } 
              },
              required: ['pass', 'feedback']
            },
            actionVerbs: { 
              type: Type.OBJECT, 
              properties: { 
                pass: { type: Type.BOOLEAN, description: 'True if strong action verbs are used, false otherwise.' }, 
                feedback: { type: Type.STRING, description: 'Actionable feedback for action verb usage.' } 
              },
              required: ['pass', 'feedback']
            },
            quantifiableMetrics: { 
              type: Type.OBJECT, 
              properties: { 
                pass: { type: Type.BOOLEAN, description: 'True if achievements are quantified, false otherwise.' }, 
                feedback: { type: Type.STRING, description: 'Actionable feedback for quantifiable metrics.' } 
              },
              required: ['pass', 'feedback']
            },
            keywords: { 
              type: Type.OBJECT, 
              properties: { 
                pass: { type: Type.BOOLEAN, description: 'True if keywords are well integrated, false otherwise.' }, 
                feedback: { type: Type.STRING, description: 'Actionable feedback for keyword optimization.' } 
              },
              required: ['pass', 'feedback']
            },
            clarity: { 
              type: Type.OBJECT, 
              properties: { 
                pass: { type: Type.BOOLEAN, description: 'True if language is clear and concise, false otherwise.' }, 
                feedback: { type: Type.STRING, description: 'Actionable feedback for clarity and conciseness.' } 
              },
              required: ['pass', 'feedback']
            },
          },
          required: ['score', 'summary', 'atsFriendly', 'actionVerbs', 'quantifiableMetrics', 'keywords', 'clarity']
        };

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema
          }
        });

        return JSON.parse(response.text || '{}');
    }, LogActionType.RESUME_GRADE, `Resume grading for profile`, currentUser);
  },

  /**
   * Analyzes a user's answer to an interview question.
   */
  analyzeInterviewAnswer: async (question: string, answer: string, resumeContext: string, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          You are an expert, constructive interview coach. The user is practicing for an interview.
          
          Candidate's Resume Summary (for context): "${resumeContext.slice(0, 1500)}"
          
          You asked the question: "${question}"
          The user responded: "${answer}"

          Provide concise, constructive feedback on their answer. Focus on the following key areas:
          -   **Clarity and Conciseness:** Was the answer easy to understand and to the point?
          -   **STAR Method Application:** For behavioral questions, did they effectively use the STAR (Situation, Task, Action, Result) method?
          -   **Relevance:** Was the answer directly relevant to the question asked and the job context (if applicable)?
          -   **Impact & Confidence:** Did the answer highlight their achievements and demonstrate confidence?
          
          Keep the feedback to 2-3 short, clear paragraphs in Markdown format. Start with positive reinforcement, then provide 1-2 specific, actionable areas for improvement. Avoid generic statements.
          DO NOT include any conversational text or introductory phrases outside the feedback.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || "Could not analyze the answer. Please try again.";
    }, LogActionType.MOCK_INTERVIEW_FEEDBACK, `Mock interview feedback for question: "${question}"`, currentUser);
  },

  /**
   * Optimizes a LinkedIn profile section.
   */
  optimizeLinkedInProfile: async (section: 'headline' | 'about', currentText: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          Act as a LinkedIn branding and career expert. The user wants to optimize their LinkedIn profile's "${section}" section.
          
          User's Key Profile Information (for context and personalization):
          - Name: ${profile.name || 'Job Seeker'}
          - Current/Target Title: ${profile.title || profile.targetRoles || 'Experienced Professional'}
          - Core Skills from Master Resume (if available): ${profile.structuredResume ? (profile.structuredResume.sections.find(s => s.type === 'skills')?.content as SkillItem[] || []).flatMap(s => s.skills).join(', ') : profile.resumeContent.slice(0, 2000) || 'N/A'}
          - General Resume Summary: ${profile.structuredResume?.summary || profile.resumeContent.slice(0, 2000) || 'N/A'}

          Current LinkedIn "${section}" section text:
          "${currentText.slice(0, 2000)}"

          Task: Rewrite the user's "${section}" section to be highly impactful, professional, keyword-rich for their target roles, and engaging.
          - If the section is 'headline', make it descriptive, attention-grabbing, and keyword-optimized (around 120-220 characters, max 3-4 distinct phrases separated by | or commas). Incorporate target title and key skills.
          - If the section is 'about', write a compelling narrative in the first person (2-4 concise paragraphs). Highlight achievements, core competencies, passion, and career aspirations, integrating relevant keywords naturally.

          Output ONLY the rewritten text for the "${section}" section. Do NOT include any introductory phrases (e.g., "Here is your new headline:"). Do NOT wrap the output in Markdown code blocks.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || `Failed to generate a new ${section}.`;
    }, LogActionType.LINKEDIN_OPTIMIZE, `LinkedIn ${section} optimization`, currentUser);
  },

  /**
   * Drafts a professional networking message.
   */
  draftNetworkingMessage: async (scenario: string, recipientInfo: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        // Use structured resume if available
        const userSkills = profile.structuredResume ? (profile.structuredResume.sections.find(s => s.type === 'skills')?.content as SkillItem[] || []).flatMap(s => s.skills).join(', ') : 'N/A';
        const userSummary = profile.structuredResume?.summary || profile.resumeContent.slice(0, 2000) || 'N/A';

        const prompt = `
          You are an expert career communications strategist. Your task is to draft a concise, professional, and effective networking message for the user.

          User's Profile Context (for personalization):
          - Name: ${profile.name || 'Job Seeker'}
          - Current/Target Title: ${profile.title || profile.targetRoles || 'Professional'}
          - LinkedIn Profile: ${profile.linkedin || 'N/A'}
          - Core Skills: ${userSkills}
          - Professional Summary: ${userSummary}

          Networking Scenario: "${scenario.slice(0, 1000)}" (e.g., "Connecting with a hiring manager after applying", "Reaching out to an alumnus for an informational interview")
          Recipient Information: "${recipientInfo.slice(0, 1000)}" (e.g., "Jane Doe, Senior Recruiter at TechCorp, who I met at the XYZ conference")

          Based on the scenario and recipient, write a polite, personalized, and professional message (suitable for LinkedIn InMail or a brief email).
          The message should be under 150 words and include:
          - A clear, concise opening stating the purpose of the message and how you know/found them.
          - A brief, relevant connection point or value proposition (why you're reaching out to THIS person specifically, and what value you offer or seek).
          - A clear, low-friction Call-to-Action (CTA) (e.g., "Would you be open to a brief virtual chat next week?", "Any advice you could offer on [specific topic]?").

          Output ONLY the message text. Do NOT include a subject line, salutation (e.g., "Hi [Recipient Name],"), closing (e.g., "Sincerely,"), or any introductory/explanatory phrases. The message should be ready to paste after a greeting.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || "Failed to draft the message.";
    }, LogActionType.NETWORKING_MESSAGE_DRAFT, `Networking message draft for scenario: "${scenario.slice(0, 50)}"`, currentUser);
  },

  /**
   * Composes various types of emails using specific prompts.
   */
  composeEmail: async (emailPurpose: EmailPurpose, context: string, profile: UserProfile, currentUser: string): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      let prompt: string;
      const userName = profile.name || 'Job Seeker';
      const userEmail = profile.email || 'your_email@example.com';
      const userPhone = profile.phone || 'your_phone_number';
      const userTitle = profile.title || profile.targetRoles || 'job seeker';
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Use structured resume summary if available
      const userSummary = profile.structuredResume?.summary || profile.resumeContent.slice(0, 2000) || 'N/A';

      // Dynamically construct prompt based on EmailPurpose
      switch (emailPurpose) {
        case EmailPurpose.PROFESSIONAL_REWRITE:
          prompt = `Act as a senior communication specialist. Rewrite this email to sound professional, clear, concise, and polite while keeping my original intent. Improve tone, structure, grammar, and flow. My email: "${context}"`;
          break;
        case EmailPurpose.COLD_EMAIL:
          prompt = `Write a persuasive, short, high-impact cold email for this purpose: "${context}". Include a strong hook, value proposition (mentioning relevant experience/skills from: ${userSummary}), credibility (mentioning expertise as a ${userTitle}), and a simple CTA. Make it sound human, confident, and non-salesy.
          Sender Info:
          Name: ${userName}
          Email: ${userEmail}
          Phone: ${userPhone}
          Current Date: ${currentDate}`;
          break;
        case EmailPurpose.CORPORATE_REPLY:
          prompt = `Craft a professional reply to this email I received: "${context}". Maintain a respectful tone, address all points clearly, and write a response that strengthens trust and communication.
          Sender Info:
          Name: ${userName}
          Email: ${userEmail}
          Phone: ${userPhone}`;
          break;
        case EmailPurpose.APOLOGY_EMAIL:
          prompt = `Write a sincere, mature apology email for this situation: "${context}". Take accountability, express genuine understanding, offer a corrective step, and propose a positive way forward.
          Sender Info:
          Name: ${userName}
          Email: ${userEmail}`;
          break;
        case EmailPurpose.FOLLOW_UP:
          prompt = `Write a polite and effective follow-up email reminding about: "${context}". Keep it respectful, non-pushy, and clear. Include a simple CTA that encourages a response.
          Sender Info:
          Name: ${userName}
          Email: ${userEmail}
          Phone: ${userPhone}`;
          break;
        case EmailPurpose.SIMPLIFY_EMAIL:
          prompt = `Rewrite my email to be shorter, clearer, and easier to understand while keeping it professional and respectful. Remove unnecessary wording but increase impact. Email: "${context}"`;
          break;
        case EmailPurpose.SALES_EMAIL:
          prompt = `Write a high-conversion sales email for my product/service described as: "${context}". Include a strong hook, emotional benefits, social proof, clear explanation, and a compelling CTA. Keep it conversational and value-driven, not pushy.
          Sender Info:
          Name: ${userName}
          Email: ${userEmail}
          Phone: ${userPhone}`;
          break;
        default:
          throw new Error('Invalid email purpose provided.');
      }

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
      });

      let text = response.text || "Failed to generate email.";
      text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
      return text;
    }, LogActionType.EMAIL_COMPOSE, `Email composition for purpose: "${emailPurpose}"`, currentUser);
  },

  // Helper to convert structured ResumeData to Markdown for AI processing
  // This is a client-side helper, not an AI call.
  convertResumeDataToMarkdown: (resumeData: ResumeData): string => {
    if (!resumeData || !resumeData.contact) return "";

    const contactInfoArray = [];
    if (resumeData.contact.email) contactInfoArray.push(resumeData.contact.email);
    if (resumeData.contact.phone) contactInfoArray.push(resumeData.contact.phone);
    if (resumeData.contact.linkedin) contactInfoArray.push(`[LinkedIn](${resumeData.contact.linkedin})`);
    if (resumeData.contact.github) contactInfoArray.push(`[GitHub](${resumeData.contact.github})`);
    if (resumeData.contact.website) contactInfoArray.push(`[Portfolio](${resumeData.contact.website})`);
    if (resumeData.contact.location) contactInfoArray.push(resumeData.contact.location);

    let markdown = `# ${resumeData.contact.name || 'Candidate Name'}\n`;
    if (contactInfoArray.length > 0) {
        markdown += `${contactInfoArray.join(' | ')}\n\n`;
    }

    if (resumeData.summary) {
        markdown += `## SUMMARY\n${resumeData.summary}\n\n`;
    }

    resumeData.sections.sort((a, b) => a.order - b.order).forEach(section => {
        markdown += `## ${section.title}\n`;
        if (section.type === 'text' && typeof section.content === 'string') {
            markdown += `${section.content}\n\n`;
        } else if (section.type === 'experience' && Array.isArray(section.content)) {
            (section.content as ExperienceItem[]).forEach(item => {
                markdown += `**${item.company}** | ${item.location}\n`;
                markdown += `*${item.title}* | ${item.dates}\n`;
                item.bulletPoints.forEach(bp => {
                    markdown += `- ${bp}\n`;
                });
                markdown += '\n';
            });
        } else if (section.type === 'education' && Array.isArray(section.content)) {
            (section.content as EducationItem[]).forEach(item => {
                markdown += `**${item.institution}** | ${item.location}\n`;
                markdown += `*${item.degree}* | ${item.dates}\n`;
                if (item.details) markdown += `${item.details}\n`;
                markdown += '\n';
            });
        } else if (section.type === 'skills' && Array.isArray(section.content)) {
            (section.content as SkillItem[]).forEach(item => {
                markdown += `**${item.category}:** ${item.skills.join(', ')}\n`;
            });
            markdown += '\n';
        } else if (section.type === 'projects' && Array.isArray(section.content)) {
            (section.content as ProjectItem[]).forEach(item => {
                markdown += `**${item.name}** | ${item.dates}\n`;
                if (item.link) markdown += `[Link](${item.link})\n`;
                markdown += `${item.description}\n`;
                if (item.bulletPoints) {
                    item.bulletPoints.forEach(bp => {
                        markdown += `- ${bp}\n`;
                    });
                }
                markdown += '\n';
            });
        } else if (section.type === 'certifications' && Array.isArray(section.content)) {
            (section.content as CertificationItem[]).forEach(item => {
                markdown += `**${item.name}** | ${item.issuer}\n`;
                markdown += `*${item.date}*\n`;
                if (item.link) markdown += `[Link](${item.link})\n`;
                markdown += '\n';
            });
        } else if (section.type === 'awards' && Array.isArray(section.content)) {
            (section.content as AwardItem[]).forEach(item => {
                markdown += `**${item.name}** | ${item.issuer}\n`;
                markdown += `*${item.date}*\n`;
                if (item.description) markdown += `${item.description}\n`;
                markdown += '\n';
            });
        }
    });

    return markdown;
  },

};