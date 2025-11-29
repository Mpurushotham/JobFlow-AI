
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
  weather?: string;
  temperature?: number;
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
}

export interface SearchResult {
  title: string;
  company: string;
  location: string;
  url: string;
  summary: string;
}

export interface SearchFilters {
  query: string;
  location: string;
  datePosted: 'any' | '24h' | 'week' | 'month';
  experienceLevel: 'any' | 'internship' | 'entry' | 'associate' | 'mid-senior' | 'director';
  jobType: 'any' | 'full-time' | 'part-time' | 'contract';
  remote: 'any' | 'on-site' | 'hybrid' | 'remote';
  industry: string;
}

export type ViewState = 'HOME' | 'PROFILE' | 'JOB_SEARCH' | 'JOBS' | 'TRACKER' | 'INTERVIEWS' | 'ANALYTICS' | 'WORKSPACE' | 'DONATE' | 'AI_COACH' | 'ADMIN' | 'ONLINE_PRESENCE';

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
}