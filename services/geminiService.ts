
import { GoogleGenAI, Type, GenerateContentResponse } from '@google/genai';
import { InterviewQA, SearchResult, ParsedResume, SearchFilters, UserProfile, ResumeGrade, MasterResumeFitResult, LearningPath, EmailPurpose } from '../types';

// Helper to get client using the environment variables
const getClient = () => {
  // As per deployment strategy, the API key is expected to be in the environment.
  // The main App component will handle cases where this is not configured.
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const MODEL_FAST = 'gemini-2.5-flash';

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

// NEW: Centralized API call handler for robust error management
const handleApiCall = async <T>(apiCall: () => Promise<T>): Promise<T> => {
  try {
    return await apiCall();
  } catch (e: any) {
    const errorMessage = e.toString().toLowerCase();
    if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
      // Re-throw a custom, identifiable error for rate limiting.
      throw new Error('RATE_LIMIT_EXCEEDED');
    }
    // Re-throw other errors as they are.
    throw e;
  }
};

export const geminiService = {
  /**
   * Searches for jobs using Google Search Grounding with advanced filters.
   * Includes a fallback mechanism if initial filtered search yields no results.
   */
  searchJobs: async (filters: SearchFilters): Promise<{ text: string, results: SearchResult[], wasFallback: boolean }> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const numJobsToFetch = 30; // Request more jobs initially

        // FIX: Moved dateMap definition outside the conditional block to correctly infer its type
        // and used explicit type from SearchFilters to include all possible values.
        const dateMap: Record<SearchFilters['datePosted'], string> = { 
          '24h': 'past 24 hours', 
          'week': 'past week', 
          'month': 'past month', 
          'any': 'anytime' 
        };

        // --- Primary Search: Uses all specified filters ---
        let primaryPrompt = `
          You are a job search assistant. Find ${numJobsToFetch} recent, active job postings for: "${filters.query}".
          
          Apply the following filters strictly to find relevant job posts from various sources:
        `;

        if (filters.location) primaryPrompt += `- Location: "${filters.location}"\n`;
        if (filters.industry) primaryPrompt += `- Industry: "${filters.industry}"\n`;

        if (filters.datePosted !== 'any') {
          primaryPrompt += `- Date Posted: Within the ${dateMap[filters.datePosted]}\n`;
        }
        if (filters.experienceLevel !== 'any') primaryPrompt += `- Experience Level: "${filters.experienceLevel}"\n`;
        if (filters.jobType !== 'any') primaryPrompt += `- Job Type: "${filters.jobType}"\n`;
        if (filters.remote !== 'any') primaryPrompt += `- Work Arrangement: "${filters.remote}"\n`;
        if (filters.salaryRange !== 'any') primaryPrompt += `- Salary Range: "${filters.salaryRange.replace(/_/g, ' ')}"\n`; // Added salaryRange
        if (filters.seniority !== 'any') primaryPrompt += `- Seniority: "${filters.seniority.replace(/_/g, ' ')}"\n`; // Added seniority
        
        primaryPrompt += `
          Use the Google Search tool to find actual open roles that match ALL these criteria. 
          
          CRITICAL: For each job, provide a direct URL to the *actual job posting* on a reputable job site. If a direct, valid link cannot be found, use "N/A" for the URL. Do not provide generic search result links or company career page links unless they are the direct posting. Prioritize direct and current links.

          AFTER searching, output the results in a strict JSON array format inside a markdown code block.
          The JSON object for each job must have these keys:
          - title (string)
          - company (string)
          - location (string)
          - url (string - MUST be a direct URL to the job posting from any reputable job site, or N/A if not found. Prioritize direct links.)
          - summary (string - max 2 sentences)

          Example output format:
          \`\`\`json
          [
            { "title": "Software Engineer", "company": "Tech Corp", "location": "Remote", "url": "https://examplejobs.com/job/...", "summary": "..." }
          ]
          \`\`\`
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
              You are a job search assistant. Find ${numJobsToFetch} recent, active job postings for: "${filters.query}" from various sources.
              Focus only on the primary keyword and ignore other specific filters (like location, date posted, experience level, job type, remote, industry, salary range, and seniority) for this broad search.
              
              Use the Google Search tool to find actual open roles. 
              
              CRITICAL: For each job, provide a direct URL to the *actual job posting* on a reputable job site. If a direct, valid link cannot be found, use "N/A" for the URL. Do not provide generic search result links or company career page links unless they are the direct posting. Prioritize direct and current links.

              AFTER searching, output the results in a strict JSON array format inside a markdown code block.
              The JSON object for each job must have these keys:
              - title (string)
              - company (string)
              - location (string)
              - url (string - MUST be a direct URL to the job posting from any reputable job site, or N/A if not found. Prioritize direct links.)
              - summary (string - max 2 sentences)
              
              Example output format:
              \`\`\`json
              [
                { "title": "Software Engineer", "company": "Tech Corp", "location": "Remote", "url": "https://examplejobs.com/job/...", "summary": "..." }
              ]
              \`\`\`
            `;

            let fallbackResponse: GenerateContentResponse = await ai.models.generateContent({
              model: MODEL_FAST,
              contents: fallbackPrompt,
              config: { tools: [{googleSearch: {}}] }
            });

            let fallbackParsedData = extractJSON(fallbackResponse.text || '');
            let fallbackResults: SearchResult[] = Array.isArray(fallbackParsedData) ? fallbackParsedData : [];

            return { text: fallbackResponse.text || '', results: fallbackResults, wasFallback: true };
        } else {
            return { text: primaryResponse.text || '', results: primaryResults, wasFallback: false };
        }
    });
  },

  /**
   * Analyzes the job description against the resume to provide a match score and insights.
   */
  analyzeJob: async (resume: string, jobTitle: string, jobSummary: string) => { // Modified to take jobTitle and jobSummary
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          You are an expert career coach.
          Resume: "${resume.slice(0, 10000)}"
          Job Title: "${jobTitle}"
          Job Summary: "${jobSummary.slice(0, 10000)}"
          
          Analyze the fit between the resume and this job title/summary. Return a JSON object with:
          1. score: number (0-100)
          2. summary: string (2 sentences max)
          3. missingSkills: string[] (key missing skills, max 5)
          4. matchingSkills: string[] (key matching skills, max 5)
        `;

        const schema = {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    });
  },

  /**
   * Analyzes the master resume against a target job description to provide a match score and insights.
   */
  analyzeMasterResumeFit: async (resumeContent: string, targetJobDescription: string): Promise<MasterResumeFitResult> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const prompt = `
        You are an expert career coach.
        Master Resume: "${resumeContent.slice(0, 10000)}"
        Target Job Description: "${targetJobDescription.slice(0, 10000)}"

        Analyze the fit between the master resume and this target job description. Return a JSON object with:
        1. score: number (0-100)
        2. summary: string (2 sentences max)
        3. missingSkills: string[] (key missing skills, max 5)
        4. matchingSkills: string[] (key matching skills, max 5)
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          missingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
          matchingSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
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
    });
  },

  /**
   * Generates a skill development path for a list of missing skills.
   */
  generateSkillDevelopmentPath: async (missingSkills: string[]): Promise<LearningPath> => {
    return handleApiCall(async () => {
      const ai = getClient();

      const prompt = `
        You are an expert career development coach. For the following skills: [${missingSkills.join(', ')}],
        generate a comprehensive learning path. For each skill, suggest 2-3 practical ways to acquire or improve it, focusing on actionable resources like online courses, personal projects, key concepts, or relevant tools.

        Return a JSON object with the following structure:
        - summary: string (a brief intro to the learning path, 2 sentences max)
        - skillTopics: array of objects, each with:
          - skill: string (the name of the skill)
          - resources: array of objects, each with:
            - type: "Course" | "Project" | "Concept" | "Tool"
            - title: string (name of the resource/project/concept)
            - description: string (brief explanation)
            - link?: string (optional URL for courses/tools, GitHub for projects etc.)
      `;

      const schema = {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          skillTopics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                skill: { type: Type.STRING },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, enum: ['Course', 'Project', 'Concept', 'Tool'] },
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      link: { type: Type.STRING },
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
    });
  },

  /**
   * Rewrites the user's resume for a specific job.
   */
  tailorResume: async (resume: string, jobDescription: string, profile: UserProfile) => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          Act as an expert resume writer and career coach, specializing in creating ATS-optimized documents.

          Original Resume:
          ---
          ${resume}
          ---

          Target Job Description:
          ---
          ${jobDescription}
          ---

          User Profile (for Contact Info - ONLY include if value is provided):
          Name: ${profile.name || '[Candidate Name]'}
          Email: ${profile.email ? profile.email : ''}
          Phone: ${profile.phone ? profile.phone : ''}
          LinkedIn: ${profile.linkedin ? profile.linkedin : ''}
          GitHub: ${profile.github ? profile.github : ''}
          Website: ${profile.website ? profile.website : ''}

          **CRITICAL ATS-OPTIMIZATION RULES:**

          1.  **KEYWORD INTEGRATION**:
              -   Analyze the 'Target Job Description' for key skills, technologies, and qualifications.
              -   Naturally and logically incorporate these keywords throughout the rewritten resume, especially in the 'SUMMARY', 'SKILLS', and 'WORK EXPERIENCE' sections.
              -   Mirror the language of the job description where appropriate (e.g., if they say "team collaboration," use that phrase).

          2.  **STRUCTURE & FORMATTING**:
              -   Use a clean, single-column layout. **Do NOT use tables, multi-column formats, or embedded images/icons.**
              -   **HEADER**: The resume must start with a clear, concise header.
                  -   The very first line must be the candidate's full name as a Markdown H1 (e.g., # JANE DOE).
                  -   Immediately following, on a single line, include contact information separated by pipes. Only include the fields for which data is available from the 'User Profile'.
                      Example: Email | Phone | LinkedIn URL | GitHub URL | Portfolio Website
              -   **STANDARD SECTION HEADERS**: Use these exact Markdown H2 headers for primary sections. Omit sections if no relevant content can be extracted from the original resume or profile.
                  ## SUMMARY
                  ## SKILLS
                  ## WORK EXPERIENCE
                  ## PROJECTS
                  ## EDUCATION
                  ## CERTIFICATIONS
                  ## AWARDS
              -   **SKILLS SECTION**: Group skills by relevant categories (e.g., **Programming Languages:** Java, Python; **Databases:** SQL, MongoDB; **Tools:** Jira, Figma).
              -   **WORK EXPERIENCE FORMAT**: For each position, follow this precise format:
                  **Company Name** | City, State
                  *Job Title* | Month Year – Month Year
                  -   Use bullet points (hyphens) starting with strong action verbs (e.g., Engineered, Managed, Led, Developed).
                  -   Quantify achievements with metrics wherever possible (e.g., "Increased user engagement by 15%," "Reduced server costs by 25%").
                  -   Tailor the bullet points to reflect the responsibilities and impact listed in the job description.

          3.  **FINAL INSTRUCTIONS**:
              -   The entire output must be in Markdown.
              -   Do NOT include any conversational text, introductions, or explanations like "Here is the tailored resume."
              -   Do NOT wrap the final output in Markdown code fences (\`\`\`).
              -   Start the response DIRECTLY with the H1 name.
              -   Keep the resume concise, ideally 1-2 pages for most roles.
        `;

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });

        let text = response.text || "Failed to generate resume.";
        text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        return text;
    });
  },

  /**
   * Generates a cover letter.
   */
  generateCoverLetter: async (resume: string, jobDescription: string, company: string, userPhone?: string, userEmail?: string) => {
    return handleApiCall(async () => {
        const ai = getClient();
        const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        
        const prompt = `
          Write a compelling, professional cover letter for the company "${company}".
          
          Resume Context:
          ${resume}

          Job Description:
          ${jobDescription}
          
          User Contact Info:
          Phone: ${userPhone || '[Phone Number]'}
          Email: ${userEmail || '[Email Address]'}

          Current Date: ${today}

          CRITICAL RULES:
          1. HEADER: Start with the Applicant's Name (extracted from resume) and Contact Info (Phone, Email) at the top, followed by the Date: "${today}".
          2. Follow standard business letter format (Hiring Manager, Company Address).
          3. Do NOT include conversational filler like "Here is the letter".
          4. Do NOT wrap in code blocks.
          5. Keep it concise (under 400 words), enthusiastic, and professional.
        `;

        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });

        let text = response.text || "Failed to generate cover letter.";
        text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
        return text;
    });
  },

  /**
   * Generates interview questions and answers.
   */
  generateInterviewPrep: async (resume: string, jobDescription: string): Promise<InterviewQA[]> => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          Generate 5 behavioral and technical interview questions tailored to this specific job and resume.
          For each question, provide a suggested answer (STAR method) and a "tip".
          
          Resume: ${resume.slice(0, 5000)}
          Job: ${jobDescription.slice(0, 5000)}
        `;

        const schema = {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              answer: { type: Type.STRING },
              tip: { type: Type.STRING }
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
    });
  },

  /**
   * Parses raw resume text into structured data.
   */
  parseResume: async (resumeText: string): Promise<ParsedResume> => {
    return handleApiCall(async () => {
        const ai = getClient();
        
        const prompt = `
          Extract structured data from this resume text:
          "${resumeText.slice(0, 15000)}"

          Return JSON with:
          - fullName
          - email
          - phone
          - skills (array of strings)
          - experienceSummary (short summary of experience)
          - educationSummary (short summary of education)
        `;

        const schema = {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } },
            experienceSummary: { type: Type.STRING },
            educationSummary: { type: Type.STRING },
          },
          required: ['fullName', 'skills']
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
    });
  },
  
  /**
   * Gets the current weather for a location using coordinates.
   */
  // FIX: Updated return type to include `country`
  getWeatherByCoords: async (latitude: number, longitude: number): Promise<{ city: string; country: string; description: string; temperature: number } | null> => {
    return handleApiCall(async () => {
        const ai = getClient();
        // FIX: Updated prompt to explicitly ask for `country`
        const prompt = `What is the current city name, country, weather description, and temperature in Celsius for latitude ${latitude} and longitude ${longitude}? Use Google Search for real-time data. Return a JSON object inside a markdown code block with keys "city" (string), "country" (string), "description" (e.g., "Sunny", "Partly Cloudy", "Rain"), and "temperature" (a number).`;
        
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        return extractJSON(response.text || 'null');
    });
  },

  /**
   * Grades a resume based on several metrics.
   */
  gradeResume: async (resumeText: string): Promise<ResumeGrade> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          As an expert career coach and ATS specialist, analyze and grade this resume on a scale of 0-100.
          Resume: "${resumeText.slice(0, 15000)}"
          
          Provide a comprehensive analysis in a strict JSON format. Evaluate the following four key areas, providing a 'pass' (boolean) and 'feedback' (string, 1-2 sentences) for each:
          1. atsFriendly: Is the format clean, single-column, and easily parsable by an Applicant Tracking System? Penalize for tables, multi-column layouts, and excessive graphics.
          2. actionVerbs: Does the resume use strong, varied action verbs instead of passive phrases like "responsible for"?
          3. quantifiableMetrics: Are achievements backed by numbers, percentages, or concrete data to show impact?
          4. clarity: Is the language clear, concise, and free of jargon? Is it easy to understand the candidate's value proposition?

          Also provide an overall 'score' (number, 0-100) and a brief 'summary' (string, 2-3 sentences) of the resume's strengths and weaknesses.
        `;

        const schema = {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            atsFriendly: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } },
            actionVerbs: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } },
            quantifiableMetrics: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } },
            clarity: { type: Type.OBJECT, properties: { pass: { type: Type.BOOLEAN }, feedback: { type: Type.STRING } } },
          },
          required: ['score', 'summary', 'atsFriendly', 'actionVerbs', 'quantifiableMetrics', 'clarity']
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
    });
  },

  /**
   * Analyzes a user's answer to an interview question.
   */
  analyzeInterviewAnswer: async (question: string, answer: string, resumeContext: string): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          You are an interview coach. The user is practicing for an interview.
          Their resume summary is: "${resumeContext.slice(0, 2000)}"
          
          You asked the question: "${question}"
          The user responded: "${answer}"

          Provide concise, constructive feedback on their answer. Focus on:
          - Clarity and conciseness.
          - Use of the STAR (Situation, Task, Action, Result) method for behavioral questions.
          - Relevance to the question.
          - Confidence and impact.
          
          Keep the feedback to 2-3 short paragraphs in Markdown format. Start with a positive reinforcement, then provide areas for improvement.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || "Could not analyze the answer. Please try again.";
    });
  },

  /**
   * Optimizes a LinkedIn profile section.
   */
  optimizeLinkedInProfile: async (section: 'headline' | 'about', currentText: string, profile: UserProfile): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          Act as a LinkedIn branding expert. The user wants to optimize their profile's ${section} section.

          User's Profile Context:
          - Name: ${profile.name}
          - Current/Target Title: ${profile.title || profile.targetRoles}
          - Resume Summary: ${profile.resumeContent.slice(0, 3000)}

          Current ${section} section text: "${currentText}"

          Task: Rewrite the user's ${section} section to be more impactful, professional, and keyword-rich for their target roles.
          - For a 'headline', make it descriptive and attention-grabbing (around 120-220 characters).
          - For an 'about' section, write a compelling narrative in the first person (2-4 paragraphs).
          
          Output only the rewritten text, without any introductory phrases like "Here is the new headline...". Do not wrap in code blocks.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || `Failed to generate a new ${section}.`;
    });
  },

  /**
   * Drafts a professional networking message.
   */
  draftNetworkingMessage: async (scenario: string, recipientInfo: string, profile: UserProfile): Promise<string> => {
    return handleApiCall(async () => {
        const ai = getClient();
        const prompt = `
          You are a career communications expert. Draft a professional networking message.

          User's Profile:
          - Name: ${profile.name}
          - Current/Target Title: ${profile.title || profile.targetRoles}

          Message Details:
          - Scenario: "${scenario}"
          - Recipient Info: "${recipientInfo}"

          Task: Write a concise, polite, and professional message (e.g., for LinkedIn) that fits the scenario. 
          The message should be under 150 words.
          
          Output only the message text. Do not include a subject line or any introductory phrases.
        `;
        const response = await ai.models.generateContent({
          model: MODEL_FAST,
          contents: prompt,
        });
        return response.text || "Failed to draft the message.";
    });
  },

  /**
   * Composes various types of emails using specific prompts.
   */
  composeEmail: async (emailPurpose: EmailPurpose, context: string, profile: UserProfile): Promise<string> => {
    return handleApiCall(async () => {
      const ai = getClient();
      let prompt: string;
      const userName = profile.name || 'Job Seeker';
      const userEmail = profile.email || 'your_email@example.com';
      const userPhone = profile.phone || 'your_phone_number';
      const userTitle = profile.title || profile.targetRoles || 'job seeker';
      const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      // Dynamically construct prompt based on EmailPurpose
      switch (emailPurpose) {
        case EmailPurpose.PROFESSIONAL_REWRITE:
          prompt = `Act as a senior communication specialist. Rewrite this email to sound professional, clear, concise, and polite while keeping my original intent. Improve tone, structure, grammar, and flow. My email: ${context}`;
          break;
        case EmailPurpose.COLD_EMAIL:
          prompt = `Write a persuasive, short, high-impact cold email for this purpose: ${context}. Include a strong hook, value proposition, credibility (mentioning expertise as a ${userTitle}), and a simple CTA. Make it sound human, confident, and non-salesy.
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
          prompt = `Write a sincere, mature apology email for this situation: ${context}. Take accountability, express genuine understanding, offer a corrective step, and propose a positive way forward.
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
          prompt = `Rewrite my email to be shorter, clearer, and easier to understand while keeping it professional and respectful. Remove unnecessary wording but increase impact. Email: ${context}`;
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
    });
  },
};