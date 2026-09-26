export type Page = 'home' | 'about' | 'programs' | 'research' | 'contact' | 'admin';

export type StaffRole = 'super_admin' | 'admissions_officer' | 'lead_faculty' | 'curriculum_mentor';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: 'Super Administrator',
  admissions_officer: 'Admissions Officer',
  lead_faculty: 'Lead Faculty',
  curriculum_mentor: 'Curriculum Mentor',
};

export interface StaffUserProfile {
  uid: string;
  email: string;
  role: StaffRole;
  displayName?: string;
  department?: string;
  createdAt?: string;
}

export function canManageApplications(role: StaffRole | null): boolean {
  return role === 'super_admin' || role === 'admissions_officer';
}

export function canManageInquiries(role: StaffRole | null): boolean {
  return role === 'super_admin' || role === 'admissions_officer';
}

export interface CourseProgram {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: 'Fundamentals' | 'Amateur' | 'Advanced' | 'Enterprise' | 'Flagship Master' | 'Flagship';
  duration: string;
  durationCategory: 'short' | 'long';
  level: 'beginner' | 'amateur' | 'advanced';
  icon: string;
  skills: string[];
  investment: string;
  priceNum: number;
  schedule?: string;
  isCustomEnterprise?: boolean;
  ctaLabel?: string;
  syllabusModules?: {
    period: string; // e.g. "Day 1", "Day 2", "Day 3" or "Week 1-4"
    title: string;
    description: string;
    topics: string[];
  }[];
}

export interface EnterpriseInquiry {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone?: string;
  jobTitle?: string;
  teamSize: string;
  primaryFocus: string;
  deliveryFormat: string;
  timeline: string;
  customRequirements?: string;
  userId?: string;
  createdAt?: unknown;
}

export interface FacultyMember {
  id: string;
  name: string;
  role: string;
  division: string;
  bio: string;
  image: string;
  publications: number;
  credentials?: string;
  citations?: number;
  topCitation?: string;
}

export interface ResearchPaper {
  id: string;
  title: string;
  category: 'Neural Architectures' | 'Alignment & Ethics' | 'Agentic Systems' | 'Compute Optimization';
  author: string;
  date: string;
  summary: string;
  executiveSummary?: string;
  keyFindings?: string[];
  tags: string[];
  readTime: string;
  pdfUrl?: string;
}

export interface TransmissionPayload {
  name: string;
  email: string;
  inquiryType: 'corporate' | 'academic' | 'research' | 'media';
  message: string;
}

export type ApplicationStatus = 'submitted' | 'under_review' | 'accepted' | 'waitlisted' | 'rejected';

export interface StudentApplication {
  id: string;
  fullName: string;
  applicantName?: string;
  name?: string;
  candidateName?: string;
  email: string;
  phone?: string;
  courseId: string;
  courseTitle: string;
  background?: string;
  experienceLevel?: string;
  pythonProficiency?: string;
  goals?: string;
  status: ApplicationStatus;
  notes?: string;
  createdAt?: unknown; // Firestore Timestamp on new docs; ISO string on older ones — read via getApplicationTimestamp
  reviewedAt?: string;
  reviewedBy?: string;
  decisionLetterSent?: boolean;
  lastDecisionEmailAt?: string;
  lastDecisionStatus?: ApplicationStatus;
  lastAttachedFiles?: string[];
}

export function getCandidateName(app?: Partial<StudentApplication> | null): string {
  if (!app) return 'Candidate';

  // Public submissions can carry any value, so each alias is checked on its own and non-strings are skipped.
  for (const value of [app.fullName, app.applicantName, app.name, app.candidateName]) {
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed && trimmed.toLowerCase() !== 'undefined' && trimmed.toLowerCase() !== 'null') return trimmed;
  }

  // If name is absent, extract formatted name from email (e.g. "madhuka.gamage@gmail.com" -> "Madhuka Gamage")
  if (app.email && typeof app.email === 'string' && app.email.includes('@')) {
    const localPart = app.email.split('@')[0];
    const cleaned = localPart
      .replace(/[._+-]+/g, ' ')
      .replace(/[0-9]+/g, '')
      .trim();
    if (cleaned.length >= 2) {
      return cleaned
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }
  }

  return 'Candidate';
}

// Normalizes a Firestore Timestamp, epoch number or date string to milliseconds (0 if unusable).
export function toMillis(raw: unknown): number {
  if (!raw) return 0;

  if (typeof raw === 'object') {
    const ts = raw as { toDate?: () => Date; seconds?: unknown; nanoseconds?: unknown };
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    if (typeof ts.seconds === 'number') {
      return ts.seconds * 1000 + Math.floor((typeof ts.nanoseconds === 'number' ? ts.nanoseconds : 0) / 1000000);
    }
    return 0;
  }

  // Values below 1e12 can only be epoch seconds (1e12 ms is September 2001).
  if (typeof raw === 'number') return raw < 1e12 ? raw * 1000 : raw;

  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    if (!isNaN(parsed)) return parsed;
  }

  return 0;
}

export function getApplicationTimestamp(app?: Partial<StudentApplication> | any): number {
  if (!app) return 0;
  return toMillis(app.createdAt || app.submittedAt || app.created_at || app.timestamp);
}

export function formatApplicationDate(app?: Partial<StudentApplication> | any): string {
  const ts = getApplicationTimestamp(app);
  if (!ts) return 'Recently Submitted';
  
  try {
    const d = new Date(ts);
    const now = Date.now();
    const diffMs = now - ts;
    
    if (diffMs >= 0 && diffMs < 60 * 1000) {
      return 'Just now';
    }
    if (diffMs >= 0 && diffMs < 3600 * 1000) {
      const mins = Math.floor(diffMs / (60 * 1000));
      return `${mins}m ago`;
    }
    if (diffMs >= 0 && diffMs < 24 * 3600 * 1000) {
      const hrs = Math.floor(diffMs / (3600 * 1000));
      return `${hrs}h ago`;
    }
    
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently Submitted';
  }
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorName?: string;
  action: string;
  entityType: 'application' | 'enterprise_inquiry' | 'contact_message' | 'user_role' | 'workspace_doc' | 'workspace_event' | 'report' | 'system';
  entityId?: string;
  details: string;
}

export interface AdminNotification {
  id: string;
  type: 'application' | 'enterprise_inquiry' | 'contact_message';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  sourceId: string;
  data?: any;
}

