
# JobFlow AI ✨

**JobFlow AI** is an intelligent, end-to-end job application assistant powered by the Google Gemini API. It's designed to streamline every step of your job search, from discovery to interview preparation. The entire application runs in your browser, ensuring your data remains private and secure on your local machine.

## 🚀 Core Features

-   **🏠 Proactive Dashboard:** Get a quick overview of your application pipeline and track progress towards weekly, achievable goals to stay motivated.
-   **👤 Profile Management:** Store your master resume, contact details, and professional links in one central place. The AI uses this profile as the source of truth.
-   **🔍 AI-Powered Job Search:** Utilizes Google Search grounding to find recent, relevant job postings.
-   **📋 Job Board & Tracker:** Manage applications with a Kanban board or a detailed, exportable table view.
-   **🤖 AI Workspace (The Core Engine):**
    -   **Match Analysis:** Get an instant compatibility score and a detailed breakdown of matching and missing skills.
    -   **Tailored Resume Generation:** Automatically rewrite your resume to align with a specific job, optimized for ATS.
    -   **Cover Letter Generation:** Create a compelling, professional cover letter in seconds.
    -   **Interview Prep Guide:** Generate tailored interview questions with STAR-method answers.
-   **🧠 AI Coach 2.0:**
    -   **Resume Health Check:** Get an AI-powered "health score" for your master resume with actionable feedback on ATS compatibility, action verbs, and more.
    -   **Live Mock Interview Simulator:** An interactive practice session where the AI asks questions, listens to your spoken answers via microphone, and provides instant feedback.
-   **🌐 Online Presence Optimizer:** A new workspace to polish your professional brand.
    -   **LinkedIn Optimizer:** Get AI-rewritten suggestions for your LinkedIn headline and "About" section.
    -   **Networking Message Drafter:** Generate professional messages for recruiters and hiring managers.
    -   **AI Email Assistant:** Compose or rewrite professional emails for various scenarios.
-   **📊 Analytics:** Track your progress with visual charts showing your application status distribution and success rates.
-   **🔒 Privacy First:** All your data is stored exclusively in your browser's IndexedDB and Local Storage. No data is ever sent to a server.
-   **📄 Export Functionality:** Export your job list to `.csv` or download generated documents as print-ready PDFs.
-   **🚨 Admin Panel (for developers/power users):** Manage user accounts, subscription tiers, view raw data, and monitor a comprehensive **Activity Log** of all actions within the application.

## ⚙️ Deployment & Configuration

JobFlow AI is designed to be deployed on modern hosting platforms like Vercel. It requires a single environment variable to be configured for the Gemini API to function.

**Setting up your API Key:**

1.  Go to your project settings on your hosting provider (e.g., Vercel).
2.  Navigate to the "Environment Variables" section.
3.  Create a new environment variable with the following name and value:
    -   **Name:** `API_KEY`
    -   **Value:** `YOUR_GEMINI_API_KEY_HERE` (Replace this with your actual Google Gemini API key).

The application will read this key at runtime. If the key is not found, the app will display a configuration error on startup.

**Note:** For local development, you may need to use a tool that loads environment variables (like `dotenv`).

## 🛠️ How It Works

JobFlow AI is a completely serverless, client-side application built with:

-   **React & TypeScript:** For a robust and modern user interface.
-   **Tailwind CSS:** For rapid, utility-first styling.
-   **@google/genai:** The official SDK for leveraging the power of the Gemini API.
-   **Web Speech API:** Powers the interactive mock interview simulator.
-   **IndexedDB & Local Storage:** Used as the database to ensure user data privacy. All data is stored in your browser.

**Security & Privacy Deep Dive:**
For a detailed breakdown of our privacy-first approach, local data handling, and security measures, please visit the **[Security & Privacy](/security-privacy)** section within the application.

## 🏁 Getting Started

1.  **Configure your API Key:** Set up the `API_KEY` environment variable as described in the section above.
2.  **Navigate to the Profile Tab:** Go to "Profile" and paste your complete master resume. Fill in your details and save.
3.  **Check Your Resume Health:** Go to the **"AI Coach"** tab and run the "Resume Health Check" for foundational feedback.
4.  **Find or Add a Job:** Use the **"Find Jobs"** tab or manually add jobs via the **"Add Job"** button.
5.  **Open the Workspace:** Click any job to open the AI Workspace and use the tools to tailor your resume and cover letter.
6.  **Practice Interviewing:** Return to the **"AI Coach"** to run a live mock interview session.
7.  **Polish Your Brand:** Use the **"Online Presence"** tools to refine your LinkedIn profile.
8.  **Track Your Progress:** Drag and drop job cards on the Kanban board to update their status.

---

Built with ❤️ by Purushotham Muktha