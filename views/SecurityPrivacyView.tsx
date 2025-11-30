import React from 'react';
import { Lock, ShieldCheck, Database, Info, Server, Layers, Globe, Fingerprint, CloudOff, Zap, LayoutDashboard, Brush, BellRing, History, Download } from 'lucide-react'; // Added new icons
import ReactMarkdown from 'react-markdown';

const SecurityPrivacyView: React.FC = () => {
  const content = `
## Your Data, Your Device: A Privacy-First Approach

JobFlow AI is designed with your privacy as a top priority. Unlike most online applications, **your personal and sensitive career data never leaves your device.** Everything is stored locally in your web browser.

---

### Our Client-Side Security & Privacy Measures

Because JobFlow AI operates entirely within your browser without a backend server, we implement the following measures to protect your data locally:

*   **Local Data Storage: Zero Server-Side Storage**
    *   **Benefit:** Your profile, master resume, job applications, generated cover letters, tailored resumes, interview prep guides, and activity logs are stored *exclusively* in your browser's [Local Storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) and [Session Storage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).
    *   **Implication:** No data is transmitted to any cloud servers controlled by JobFlow AI or third parties for storage. This inherently removes many common server-side breach risks.

*   **Client-Side Authentication: Hashing & Local 2FA**
    *   **Secure Credential Handling:** Your username, password, and 4-digit Personal Identification Number (PIN) are **never stored in plain text**. Instead, they are hashed using a client-side hashing function (\`simpleHash\`) combined with a unique, randomly generated \`salt\` for each user before being saved to Local Storage. This makes it significantly harder to reverse-engineer your credentials even if your local storage is inspected.
    *   **Local Two-Factor Authentication (2FA):** The 4-digit PIN acts as an additional layer of security. To log in, you need both your password and your PIN, providing a local "something you know" factor beyond just a password.
    *   **Session Management:** Your login session is managed in \`sessionStorage\`, which is automatically cleared when you close your browser tab or window. This ensures your session is not persistent and requires re-authentication for each new session, enhancing security against unauthorized access if you leave your device unattended.

*   **API Key Management (Client-Side Exposure)**
    *   The Google Gemini API key used for AI functionalities is configured as an environment variable (e.g., in Vercel) and injected into the client-side application at runtime. This prevents it from being hardcoded in the public source code.
    *   **Limitation:** While not hardcoded, any API key used directly by a client-side application is ultimately visible in network requests via browser developer tools. We rely on Google's API usage policies and rate limits for managing access and preventing abuse.

---

### Inherent Limitations & Risks (Client-Side Design)

It's important to be transparent about the limitations that come with a purely client-side application:

*   **Local Storage Vulnerabilities:**
    *   **Cross-Site Scripting (XSS):** While we use libraries like \\\`ReactMarkdown\\\\\` that include sanitization, a sophisticated Cross-Site Scripting (XSS) attack (if one were to bypass browser and application defenses) could potentially access or manipulate data in your Local Storage.
    *   **Physical Device Access:** Anyone with direct, unrestricted physical or administrative access to your device can, with sufficient technical expertise, potentially access data stored in your browser's Local Storage.
    *   **Browser Malware:** Malware specifically designed to target browser data on your computer could potentially read or manipulate your locally stored information.
*   **"Simulated" 2FA:** The current PIN system is a *local* second factor. True, external Two-Factor Authentication (e.g., SMS or email OTP sent by a third-party service) fundamentally requires a backend server to send and verify these codes out-of-band. JobFlow AI cannot provide this level of external 2FA without a backend.
*   **Hashing Strength for Demo:** The \\\`simpleHash\\\\\` function used is for demonstration purposes within a client-side context. For production applications with a backend, much more cryptographically robust and computationally intensive hashing algorithms (like bcrypt or scrypt) would be used for password storage to further resist brute-force attacks.

---

### Focus Areas: Maximizing Local-First Capabilities for a Smooth User Experience

Despite operating without a backend, JobFlow AI is meticulously designed to deliver a powerful, intuitive, and private user experience by leveraging cutting-edge frontend technologies and smart local data management. Our focus areas ensure a top-tier experience directly from your browser:

*   **Robust Offline Functionality** <CloudOff size={20} className="text-indigo-500 inline-block align-bottom ml-2" />
    *   All core application features, including data access, job tracking, and profile management, function seamlessly offline. You retain full productivity even without an internet connection.
    *   AI features, while requiring an API call (and thus internet), are gracefully handled with clear messaging.

*   **Blazing-Fast Performance** <Zap size={20} className="text-yellow-500 inline-block align-bottom ml-2" />
    *   With data stored locally, retrieval and processing are near-instantaneous. This eliminates network latency for fetching your jobs and profile, resulting in a highly responsive and fluid application feel.

*   **Intuitive & Engaging UI/UX** <LayoutDashboard size={20} className="text-purple-500 inline-block align-bottom ml-2" />
    *   **Dynamic Kanban Board:** Visualize and manage your job applications with an interactive drag-and-drop board.
    *   **Smart Job Search Filters:** Find relevant jobs quickly with comprehensive filtering options and recent search history.
    *   **Real-time AI Tools:** Generate tailored resumes, compelling cover letters, and detailed interview guides on-demand, directly in your browser.
    *   **AI Coach & Mock Interviews:** Engage in interactive sessions for resume grading and interview practice with immediate feedback.

*   **Personalized Experience** <Brush size={20} className="text-pink-500 inline-block align-bottom ml-2" />
    *   **Adaptive Theming:** Seamlessly switch between light and dark modes to suit your preference, with settings persisted locally.
    *   **Proactive Notifications:** Receive timely and relevant toast notifications for important actions and updates, enhancing usability.

*   **Data Portability & Control** <Download size={20} className="text-emerald-500 inline-block align-bottom ml-2" />
    *   Easily export your entire job tracking data to CSV for external analysis or backup.
    *   Download AI-generated documents (resumes, cover letters) as print-ready PDFs.
    *   Your full data ownership remains transparent, empowering you with control.

---

### Future Enhancements with a Backend (MVP for Robustness)

As mentioned, if JobFlow AI were to scale and incorporate a backend, security and privacy could be significantly enhanced to enterprise-grade standards. This is the next logical step for robustness:

*   **True Multi-Factor Authentication (MFA):** Implementing real 2FA with SMS, email, or authenticator apps, where codes are securely generated and verified by a trusted server.
*   **Server-Side Data Storage & Encryption:** Storing all sensitive user data in a secure, encrypted database on a backend server, protected by industry-standard security practices. This protects data even if the user's local device is compromised.
*   **Secure API Key Management:** All calls to the Gemini API would be proxied through the backend server, keeping the API key completely hidden from client-side exposure.
*   **Cross-Device Synchronization:** Allowing you to securely access and sync your job data across multiple devices.

---

### Your Trust is Our Priority

By choosing JobFlow AI, you're opting for an application where **you retain full control and ownership of your data**, as it remains entirely on your device. We are committed to transparency regarding how your data is handled within our client-side architecture.
`;

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in relative">
      <h1 className="text-4xl font-extrabold text-gray-800 dark:text-white mb-6 text-center">Security & Privacy</h1>
      <p className="text-lg text-gray-600 dark:text-slate-300 mb-10 text-center max-w-2xl mx-auto">
        Understanding how your career data is protected in JobFlow AI.
      </p>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-lg border border-gray-100 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown components={{
          p: ({ children }) => {
            // FIX: Normalize children to an array to safely access length property.
            const childrenArray = React.Children.toArray(children);
            const lastChild = childrenArray[childrenArray.length - 1];
            if (typeof lastChild === 'string' && (lastChild as string).match(/<svg.*?>.*?<\/svg>/)) {
              return <p className="flex items-center gap-2">{children}</p>;
            }
            return <p>{children}</p>;
          }
        }}>{content}</ReactMarkdown>
      </div>

      <div className="mt-12 text-center text-gray-500 dark:text-slate-400 text-sm">
        <p className="flex items-center justify-center gap-2">
          <Info size={16} /> Have more questions? Contact support via <a href="mailto:support@jobflow.ai" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@jobflow.ai</a>
        </p>
      </div>
    </div>
  );
};

export default SecurityPrivacyView;