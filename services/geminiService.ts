// FIX: Removed deprecated 'Schema' import as it is no longer available from @google/genai.
import { GoogleGenAI, Type } from '@google/genai';
import { InterviewQA, SearchResult, ParsedResume, SearchFilters, UserProfile, ResumeGrade } from '../types';

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

export const geminiService = {
  /**
   * Searches for jobs using Google Search Grounding with advanced filters.
   */
  searchJobs: async (filters: SearchFilters): Promise<{ text: string, results: SearchResult[] }> => {
    const ai = getClient();
    
    // Constructing a detailed prompt from filters
    let prompt = `
      You are a job search assistant. Find 5 recent, active job postings for: "${filters.query}".
      
      Apply the following filters STRICTLY:
      - The search results MUST be from linkedin.com. Use "site:linkedin.com" in your search.
    `;

    if (filters.location) prompt += `- Location: "${filters.location}"\n`;
    if (filters.industry) prompt += `- Industry: "${filters.industry}"\n`;

    if (filters.datePosted !== 'any') {
      const dateMap = { '24h': 'past 24 hours', 'week': 'past week', 'month': 'past month' };
      prompt += `- Date Posted: Within the ${dateMap[filters.datePosted]}\n`;
    }
    if (filters.experienceLevel !== 'any') prompt += `- Experience Level: "${filters.experienceLevel}"\n`;
    if (filters.jobType !== 'any') prompt += `- Job Type: "${filters.jobType}"\n`;
    if (filters.remote !== 'any') prompt += `- Work Arrangement: "${filters.remote}"\n`;
    
    prompt += `
      Use the Google Search tool to find actual open roles that match ALL these criteria. 
      
      AFTER searching, output the results in a strict JSON array format inside a markdown code block.
      The JSON object for each job must have these keys:
      - title (string)
      - company (string)
      - location (string)
      - url (string - MUST be the direct LinkedIn job URL)
      - summary (string - max 2 sentences)

      Example output format:
      \`\`\`json
      [
        { "title": "Software Engineer", "company": "Tech Corp", "location": "Remote", "url": "https://www.linkedin.com/jobs/view/...", "summary": "..." }
      ]
      \`\`\`
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      }
    });

    const text = response.text || '';
    let results: SearchResult[] = [];
    
    const parsedData = extractJSON(text);
    if (Array.isArray(parsedData)) {
      results = parsedData;
    } else {
      console.warn("Could not parse structured job data from response.");
    }

    return { text, results };
  },

  /**
   * Analyzes the job description against the resume to provide a match score and insights.
   */
  analyzeJob: async (resume: string, jobDescription: string) => {
    const ai = getClient();
    
    const prompt = `
      You are an expert career coach.
      Resume: "${resume.slice(0, 10000)}"
      Job Description: "${jobDescription.slice(0, 10000)}"
      
      Analyze the fit. Return a JSON object with:
      1. score: number (0-100)
      2. summary: string (2 sentences max)
      3. missingSkills: string[] (key missing skills, max 5)
      4. matchingSkills: string[] (key matching skills, max 5)
    `;

    // FIX: Removed deprecated 'Schema' type annotation.
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
  },

  /**
   * Rewrites the user's resume for a specific job.
   */
  tailorResume: async (resume: string, jobDescription: string) => {
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

      Task: Rewrite the 'Original Resume' to be perfectly tailored for the 'Target Job Description' and to pass successfully through any Applicant Tracking System (ATS).

      **CRITICAL ATS-OPTIMIZATION RULES:**

      1.  **KEYWORD INTEGRATION**:
          -   Analyze the 'Target Job Description' for key skills, technologies, and qualifications.
          -   Naturally and logically incorporate these keywords throughout the rewritten resume, especially in the 'SUMMARY', 'SKILLS', and 'WORK EXPERIENCE' sections.
          -   Mirror the language of the job description where appropriate (e.g., if they say "team collaboration," use that phrase).

      2.  **STRUCTURE & FORMATTING**:
          -   Use a clean, single-column layout. Do NOT use tables or multi-column formats.
          -   **HEADER**: The first line must be the candidate's name as a Markdown H1 (e.g., # JANE DOE). The second line must contain contact info: Email | Phone | LinkedIn URL.
          -   **SUMMARY SECTION**: Start with a "## SUMMARY" section. This must be a concise, 2-3 sentence paragraph that immediately highlights the candidate's most relevant qualifications and experience for THIS specific job.
          -   **STANDARD SECTION HEADERS**: Use these exact Markdown H2 headers: ## SUMMARY, ## SKILLS, ## WORK EXPERIENCE, ## PROJECTS, ## EDUCATION.
          -   **SKILLS SECTION**: Group skills by category (e.g., **Programming Languages:** Java, Python; **Databases:** SQL, MongoDB).
          -   **WORK EXPERIENCE FORMAT**: For each position, follow this precise format:
              **Company Name** | City, State
              *Job Title* | Month Year - Month Year
              - Use bullet points starting with strong action verbs (e.g., Engineered, Managed, Led, Developed).
              - Quantify achievements with metrics wherever possible (e.g., "Increased user engagement by 15%," "Reduced server costs by 25%").
              - Tailor the bullet points to reflect the responsibilities listed in the job description.

      3.  **FINAL INSTRUCTIONS**:
          -   The entire output must be in Markdown.
          -   Do NOT include any conversational text, introductions, or explanations like "Here is the tailored resume."
          -   Do NOT wrap the final output in Markdown code fences (\`\`\`).
          -   Start the response DIRECTLY with the H1 name.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });

    // Strip code fences if the model still adds them despite instructions
    let text = response.text || "Failed to generate resume.";
    text = text.replace(/^```markdown\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
    return text;
  },

  /**
   * Generates a cover letter.
   */
  generateCoverLetter: async (resume: string, jobDescription: string, company: string, userPhone?: string, userEmail?: string) => {
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
  },

  /**
   * Generates interview questions and answers.
   */
  generateInterviewPrep: async (resume: string, jobDescription: string): Promise<InterviewQA[]> => {
    const ai = getClient();
    
    const prompt = `
      Generate 5 behavioral and technical interview questions tailored to this specific job and resume.
      For each question, provide a suggested answer (STAR method) and a "tip".
      
      Resume: ${resume.slice(0, 5000)}
      Job: ${jobDescription.slice(0, 5000)}
    `;

    // FIX: Removed deprecated 'Schema' type annotation.
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
  },

  /**
   * Parses raw resume text into structured data.
   */
  parseResume: async (resumeText: string): Promise<ParsedResume> => {
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

    // FIX: Removed deprecated 'Schema' type annotation.
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
  },
  
  /**
   * Gets the current weather for a location using coordinates.
   */
  getWeatherByCoords: async (latitude: number, longitude: number): Promise<{ city: string; description: string; temperature: number } | null> => {
    try {
      const ai = getClient();
      // FIX: Updated prompt to request JSON in a markdown block as responseSchema cannot be used with googleSearch tool.
      const prompt = `What is the current city name, weather description, and temperature in Celsius for latitude ${latitude} and longitude ${longitude}? Use Google Search for real-time data. Return a JSON object inside a markdown code block with keys "city" (string), "description" (e.g., "Sunny", "Partly Cloudy", "Rain"), and "temperature" (a number).`;
      
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          // FIX: Removed responseMimeType and responseSchema as they are not allowed with the googleSearch tool.
          tools: [{ googleSearch: {} }],
        },
      });

      // FIX: Use extractJSON helper to parse the response text.
      return extractJSON(response.text || 'null');
    } catch (e) {
      console.error("Failed to get weather by coords", e);
      return null;
    }
  },

  /**
   * Gets the current weather for a location.
   */
  getWeather: async (city: string, country: string): Promise<{ description: string; temperature: number } | null> => {
    try {
      const ai = getClient();
      // FIX: Updated prompt to request JSON in a markdown block as responseSchema cannot be used with googleSearch tool.
      const prompt = `What is the current weather and temperature in Celsius for ${city}, ${country}? Use Google Search for real-time data. Return a JSON object inside a markdown code block with keys "description" (e.g., "Sunny", "Partly Cloudy", "Rain") and "temperature" (a number).`;
      
      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: {
          // FIX: Removed responseMimeType and responseSchema as they are not allowed with the googleSearch tool.
          tools: [{ googleSearch: {} }],
        },
      });
      
      // FIX: Use extractJSON helper to parse the response text.
      return extractJSON(response.text || 'null');
    } catch (e) {
      console.error("Failed to get weather", e);
      return null;
    }
  },

  /**
   * Grades a resume based on several metrics.
   */
  gradeResume: async (resumeText: string): Promise<ResumeGrade> => {
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
  },

  /**
   * Analyzes a user's answer to an interview question.
   */
  analyzeInterviewAnswer: async (question: string, answer: string, resumeContext: string): Promise<string> => {
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
  },

  /**
   * Optimizes a LinkedIn profile section.
   */
  optimizeLinkedInProfile: async (section: 'headline' | 'about', currentText: string, profile: UserProfile): Promise<string> => {
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
  },

  /**
   * Drafts a professional networking message.
   */
  draftNetworkingMessage: async (scenario: string, recipientInfo: string, profile: UserProfile): Promise<string> => {
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
  },
};