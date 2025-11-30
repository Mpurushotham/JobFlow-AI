
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
}

export interface InterviewQA {
  question: string;
  answer: string;
  tip: string;
}

export interface ParsedResume {
  fullName?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experienceSummary?: string;
  educationSummary?: string;
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
  parsedData?: ParsedResume;
  targetJobDescription?: string; // New: For master resume fit analysis
  masterResumeFit?: string; // New: JSON stringified MasterResumeFitResult
  subscriptionTier?: SubscriptionTier; // New: User's subscription tier
}

export interface SearchResult {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
  matchScore?: number; // Added for on-demand analysis
  analysis?: string;    // Added for on-demand analysis (JSON stringified)
}

export interface SearchFilters {
  query: string;
  location: string;
  datePosted: 'any' | '24h' | 'week' | 'month';
  experienceLevel: 'any' | 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director' | 'senior' | 'lead' | 'staff'; // Added 'senior', 'lead', 'staff'
  jobType: 'any' | 'full-time' | 'part-time' | 'contract';
  remote: 'any' | 'on-site' | 'hybrid' | 'remote';
  industry: string;
  salaryRange: 'any' | 'below_50k' | '50k_80k' | '80k_120k' | '120k_150k' | '150k_plus'; // Added salaryRange
  seniority: 'any' | 'junior' | 'mid' | 'senior' | 'lead_staff'; // Added seniority
}

export interface RecentSearchQuery {
  query: string;
  timestamp: number;
}

export type ViewState = 'HOME' | 'PROFILE' | 'JOB_SEARCH' | 'JOBS' | 'TRACKER' | 'INTERVIEWS' | 'ANALYTICS' | 'WORKSPACE' | 'DONATE' | 'AI_COACH' | 'ADMIN' | 'ONLINE_PRESENCE' | 'PRICING' | 'SECURITY_PRIVACY';

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
  summary: string;
}


// Represents a user account in the system
export interface User {
  username: string;
  email: string;
  phone: string;
  hashedPassword: string;
  hashedPin: string;
  salt: string;
  createdDate: number;
  lastLogin?: number;
  subscriptionTier: SubscriptionTier; // New: User's subscription tier
}

// New: For AI Email Assistant
export enum EmailPurpose {
  PROFESSIONAL_REWRITE = 'Professional Rewrite',
  COLD_EMAIL = 'Cold Email',
  CORPORATE_REPLY = 'Corporate Reply',
  APOLOGY_EMAIL = 'Apology Email',
  FOLLOW_UP = 'Follow-Up',
  SIMPLIFY_EMAIL = 'Simplify Email',
  SALES_EMAIL = 'Sales Email',
}

export interface EmailComposeConfig {
  purpose: EmailPurpose;
  context: string; // The original email, purpose details, product description, etc.
}
