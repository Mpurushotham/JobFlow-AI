#  JobFlow AI ✨

**JobFlow AI** is an intelligent, end-to-end job application assistant powered by the Google Gemini API. It's designed to streamline every step of your job search, from discovery to interview preparation. The entire application runs in your browser, ensuring your data remains private and secure on your local machine.

## 🚀 Core Features

- **🏠 Proactive Dashboard:** Get a quick overview of your application pipeline and track progress towards weekly, achievable goals to stay motivated.
- **👤 Profile Management:** Store your master resume, contact details, and professional links in one central place. The AI uses this profile as the source of truth.
- **🔍 AI-Powered Job Search:** Utilizes Google Search grounding to find recent, relevant job postings.
- **📋 Job Board & Tracker:** Manage applications with a Kanban board or a detailed, exportable table view.
- **🤖 AI Workspace (The Core Engine):**
  - **Match Analysis:** Get an instant compatibility score and a detailed breakdown of matching and missing skills.
  - **Tailored Resume Generation:** Automatically rewrite your resume to align with a specific job, optimized for ATS.
  - **Cover Letter Generation:** Create a compelling, professional cover letter in seconds.
  - **Interview Prep Guide:** Generate tailored interview questions with STAR-method answers.
- **🧠 AI Coach 2.0:**
  - **Resume Health Check:** Get an AI-powered "health score" for your master resume with actionable feedback on ATS compatibility, action verbs, and more.
  - **Live Mock Interview Simulator:** An interactive practice session where the AI asks questions, listens to your spoken answers via microphone, and provides instant feedback.
- **🌐 Online Presence Optimizer:** A new workspace to polish your professional brand.
  - **LinkedIn Optimizer:** Get AI-rewritten suggestions for your LinkedIn headline and "About" section.
  - **Networking Message Drafter:** Generate professional messages for recruiters and hiring managers.
- **📊 Analytics:** Track your progress with visual charts showing your application status distribution and success rates.
- **🔒 Privacy First:** All your data is stored exclusively in your browser's Local Storage. No data is ever sent to a server.
- **📄 Export Functionality:** Export your job list to `.csv` or download generated documents as print-ready PDFs.

## ⚙️ Configuration

JobFlow AI loads its Gemini API key from a `config.json` file located in the root of the application. This allows you to set your API key at deployment time without storing it in the source code.

1.  Create a file named `config.json` in the project's root directory.
2.  Add the following content to the file:

    ```json
    {
      "API_KEY": "YOUR_GEMINI_API_KEY_HERE"
    }
    ```

3.  Replace `"YOUR_GEMINI_API_KEY_HERE"` with your actual Google Gemini API key.

**Note:** The application will fail to make API calls if this file is not present and correctly configured. For security, do not commit `config.json` to version control.

## 🛠️ How It Works

JobFlow AI is a completely serverless, client-side application built with:

- **React & TypeScript:** For a robust and modern user interface.
- **Tailwind CSS:** For rapid, utility-first styling.
- **@google/genai:** The official SDK for leveraging the power of the Gemini API.
- **Web Speech API:** Powers the interactive mock interview simulator.
- **Local Storage:** Used as the database to ensure user data privacy.

## 🏁 Getting Started

1.  **Configure your API Key:** Create a `config.json` file as described in the Configuration section above.
2.  **Navigate to the Profile Tab:** Go to "Profile" and paste your complete master resume. Fill in your details and save.
3.  **Check Your Resume Health:** Go to the **"AI Coach"** tab and run the "Resume Health Check" for foundational feedback.
4.  **Find or Add a Job:** Use the **"Find Jobs"** tab or manually add jobs via the **"Add Job"** button.
5.  **Open the Workspace:** Click any job to open the AI Workspace and use the tools to tailor your resume and cover letter.
6.  **Practice Interviewing:** Return to the **"AI Coach"** to run a live mock interview session.
7.  **Polish Your Brand:** Use the **"Online Presence"** tools to refine your LinkedIn profile.
8.  **Track Your Progress:** Drag and drop job cards on the Kanban board to update their status.

---

Built with ❤️ by Purushotham Muktha
