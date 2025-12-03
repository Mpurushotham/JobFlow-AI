
export enum JobStatus {
  WISHLIST = 'WISHLIST',
  APPLIED = 'APPLIED',
  INTERVIEWING = 'INTERVIEWING',
  OFFER = 'OFFER',
  REJECTED = 'REJECTED'
}

export type JobActivityType = 'NOTE' | 'SUBMISSION' | 'INTERVIEW' | 'FOLLOW_UP' | 'OFFER' | 'REJECTION';

export interface JobActivity {
  id: string;
  date: number;
  type: JobActivityType;
  content: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  status: JobStatus;
  dateAdded: number;
  city?: string;
  country?: string;
  salary?: string;
  url?: string;
  source?: string;
  applicationDeadline?: string;
  comments?: string;
  relocation?: boolean;
  availability?: string;
  matchScore?: number;
  analysis?: string;
  tailoredResume?: string;
  coverLetter?: string;
  interviewPrep?: InterviewQA[];
  activity?: JobActivity[];
  username: string;
}

export interface InterviewQA {
  question: string;
  answer: string;
  tip: string;
}

// NEW: Resume Data for Builder
export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  linkedin?: string;
  github?: string;
  website?: string;
  portfolio?: string;
  location?: string;
}

export interface ExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  dates: string;
  bulletPoints: string[];
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  dates: string;
  details?: string;
}

export interface SkillItem {
  id: string;
  category: string;
  skills: string[];
}

export interface ProjectItem {
  id: string;
  name: string;
  dates: string;
  description: string;
  link?: string;
  bulletPoints?: string[];
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link?: string;
}

export interface AwardItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  description?: string;
}

export interface ResumeSection {
  id: string;
  title: string;
  content: string | ExperienceItem[] | EducationItem[] | SkillItem[] | ProjectItem[] | CertificationItem[] | AwardItem[];
  order: number;
  type: 'text' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards';
}

export interface ResumeData {
  contact: ContactInfo;
  summary: string;
  sections: ResumeSection[];
}

export interface MasterResumeFitResult {
  score: number;
  summary: string;
  missingSkills: string[];
  matchingSkills: string[];
}

export interface SkillTopic {
  skill: string;
  resources: {
    type: 'Course' | 'Project' | 'Concept' | 'Tool';
    title: string;
    description: string;
    link?: string;
  }[];
}

export interface LearningPath {
  summary: string;
  skillTopics: SkillTopic[];
}

export enum SubscriptionTier {
  FREE = 'FREE',
  AI_PRO = 'AI_PRO',
}

export interface UserProfile {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  portfolio?: string;
  location?: string;
  resumeContent: string;
  targetRoles: string;
  structuredResume?: ResumeData | null;
  targetJobDescription?: string;
  masterResumeFit?: string;
  subscriptionTier?: SubscriptionTier;
}

export interface ResumeATSScore {
  score: number;
  summary: string;
  atsFriendly: { feedback: string; pass: boolean; };
  actionVerbs: { feedback: string; pass: boolean; };
  quantifiableMetrics: { feedback: string; pass: boolean; };
  keywords: { feedback: string; pass: boolean; };
  clarity: { feedback: string; pass: boolean; };
}

export interface SearchResult {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
  postedDate?: string;
  source?: string;
  matchScore?: number;
  analysis?: string;
}

export interface SearchFilters {
  query: string;
  location: string;
  datePosted: 'any' | '24h' | 'week' | 'month';
  experienceLevel: 'any' | 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'senior' | 'lead' | 'staff';
  jobType: 'any' | 'full-time' | 'part-time' | 'contract';
  remote: 'any' | 'on-site' | 'hybrid' | 'remote';
  companySize: 'any' | 'startup' | 'small' | 'mid' | 'large' | 'mnc';
  educationLevel: 'any' | 'high_school' | 'bachelors' | 'masters' | 'phd';
  salaryRange: 'any' | 'below_50k' | '50k_80k' | '80k_120k' | '120k_150k' | '150k_plus';
  seniority: 'any' | 'junior' | 'mid' | 'senior' | 'lead_staff';
}

export interface RecentSearchQuery {
  query: string;
  timestamp: number;
}

export type ViewState = 'HOME' | 'PROFILE' | 'JOB_SEARCH' | 'JOBS' | 'TRACKER' | 'INTERVIEWS' | 'ANALYTICS' | 'WORKSPACE' | 'DONATE' | 'AI_COACH' | 'ADMIN' | 'ONLINE_PRESENCE' | 'PRICING' | 'SECURITY_PRIVACY' | 'RESUME_BUILDER';

export type ThemeMode = 'light' | 'dark';

export interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface ResumeGrade {
  score: number;
  atsFriendly: { feedback: string; pass: boolean; };
  actionVerbs: { feedback: string; pass: boolean; };
  quantifiableMetrics: { feedback: string; pass: boolean; };
  clarity: { feedback: string; pass: boolean; };
  keywords: { feedback: string; pass: boolean; };
  summary: string;
}

export interface User {
  username: string;
  email: string;
  phone: string;
  hashedPassword: string;
  hashedPin: string;
  salt: string;
  createdDate: number;
  lastLogin?: number;
  subscriptionTier: SubscriptionTier;
  accountStatus: 'valid' | 'invalid';
}

export enum EmailPurpose {
  PROFESSIONAL_REWRITE = 'Professional Rewrite',
  COLD_EMAIL = 'Cold Email',
  CORPORATE_REPLY = 'Corporate Reply',
  APOLOGY_EMAIL = 'Apology Email',
  FOLLOW_UP = 'Follow-Up',
  SIMPLIFY_EMAIL = 'Simplify Email',
  SALES_EMAIL = 'Sales Email',
}

export interface AppBackupData {
  users: User[];
  profiles: Record<string, UserProfile>;
  jobs: Record<string, Job[]>;
  recentSearches: RecentSearchQuery[];
  activityLogs: AppActivityLogEntry[];
}

export enum LogActionType {
  USER_SIGNUP = 'User Signed Up',
  USER_LOGIN = 'User Logged In',
  USER_LOGOUT = 'User Logged Out',
  USER_LOGIN_FAILED = 'User Login Failed',
  USER_INACTIVE_LOGIN_ATTEMPT = 'User Inactive Account Login Attempt',
  JOB_ADD = 'Job Added',
  JOB_UPDATE = 'Job Updated',
  JOB_DELETE = 'Job Deleted',
  PROFILE_SAVE = 'Profile Saved',
  RESUME_PARSE = 'Resume Parsed (AI)',
  JOB_SEARCH = 'Job Search Run (AI)',
  JOB_ANALYSIS = 'Job Analysis Run (AI)',
  RESUME_TAILOR = 'Resume Tailored (AI)',
  COVER_LETTER_GENERATE = 'Cover Letter Generated (AI)',
  INTERVIEW_PREP_GENERATE = 'Interview Prep Generated (AI)',
  MOCK_INTERVIEW_FEEDBACK = 'Mock Interview Feedback (AI)',
  SKILL_DEV_PATH_GENERATE = 'Skill Development Path Generated (AI)',
  LINKEDIN_OPTIMIZE = 'LinkedIn Profile Optimized (AI)',
  NETWORKING_MESSAGE_DRAFT = 'Networking Message Drafted (AI)',
  EMAIL_COMPOSE = 'Email Composed (AI)',
  RESUME_GRADE = 'Resume Graded (AI)',
  RESUME_BUILDER_OPEN = 'Resume Builder Opened',
  RESUME_BUILDER_AI_AUTOFILL = 'Resume Builder Auto-Filled (AI)',
  RESUME_BUILDER_SECTION_EDIT = 'Resume Builder Section Edited',
  RESUME_ATS_EVALUATED = 'ATS Score Evaluated (AI)',
  RESUME_DOWNLOAD = 'Resume Downloaded',
  RESUME_DOWNLOAD_DOCX = 'Resume Downloaded (DOCX)',
  SUBSCRIPTION_CHANGE = 'Subscription Tier Changed',
  ADMIN_DATA_CLEAR = 'Admin Cleared All Data',
  ADMIN_DATA_EXPORT = 'Admin Exported All Data',
  ADMIN_DATA_IMPORT = 'Admin Imported All Data',
  ADMIN_USER_CRED_RESET = 'Admin Reset User Credentials',
  ADMIN_USER_STATUS_CHANGE = 'Admin Changed User Status',
  ADMIN_LOGS_CLEAR = 'Admin Cleared Activity Logs',
  APP_INIT = 'Application Initialized',
  ERROR_OCCURRED = 'Error Occurred',
  OFFLINE_EVENT = 'Offline Mode Detected',
  ONLINE_EVENT = 'Online Mode Detected',
  GEOLOCATION_FETCH = 'Geolocation Fetched',
  API_KEY_MISSING = 'API Key Missing',
}

export interface AppActivityLogEntry {
  id: string;
  timestamp: number;
  username: string | 'system' | 'guest';
  actionType: LogActionType;
  details: string;
  severity: 'info' | 'warn' | 'error' | 'debug';
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    cookies?: string;
    screenResolution?: string;
    url?: string;
  };
}
