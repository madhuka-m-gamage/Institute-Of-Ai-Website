import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, getDocs, getDoc, setDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, googleSignIn, emailPasswordSignIn, logout, initAuth, getGmailSendToken } from '../lib/firebase';
import { StudentApplication, ApplicationStatus, StaffRole, getCandidateName, getApplicationTimestamp, formatApplicationDate } from '../types';
import {
  Shield,
  Database,
  Users,
  Building2,
  Mail,
  RefreshCw,
  Search,
  Lock,
  LogOut,
  AlertTriangle,
  ShieldCheck,
  UserCog,
  FileSpreadsheet,
  CheckCircle2,
  Layers,
  GraduationCap,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Filter,
  History,
  FileText,
  Clock,
  ChevronRight,
  ExternalLink,
  Trash2,
  CheckCircle,
  HelpCircle,
  Inbox,
  X,
  UserCheck,
  ArrowUpDown,
  Calendar,
  Paperclip,
  CheckSquare,
  Square,
  MinusSquare,
  Send,
  Download,
  Activity
} from 'lucide-react';
import { ScrollReveal } from '../components/ScrollReveal';
import { motion, AnimatePresence } from 'motion/react';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { AdminAuditTrailPanel } from '../components/AdminAuditTrailPanel';
import { RecentActivityPanel } from '../components/RecentActivityPanel';
import { ApplicationDetailModal } from '../components/ApplicationDetailModal';
import { EnterpriseInquiryModal } from '../components/EnterpriseInquiryModal';
import { BulkEmailModal } from '../components/BulkEmailModal';
import { BulkStatusModal } from '../components/BulkStatusModal';
import { CandidateExportModal } from '../components/CandidateExportModal';
import { StatusBadge } from '../components/StatusBadge';
import { AdminNotificationBell } from '../components/AdminNotificationBell';
import { AdminPageFullSkeleton, AdminListSkeleton } from '../components/Skeleton';
import { AdminNotification } from '../types';

interface AdminPageProps {
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

type MainTabType = 'admissions' | 'activity' | 'users' | 'audit';
type AdmissionsSubTab = 'applications' | 'activity' | 'enterprise' | 'messages';

const tableListVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.01,
    },
  },
};

const tableRowVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.995,
  },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.28,
      delay: Math.min(i * 0.035, 0.35),
      ease: [0.25, 1, 0.5, 1],
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.995,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

export const AdminPage: React.FC<AdminPageProps> = ({ onAddToast }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [staffRole, setStaffRole] = useState<StaffRole | null>(null);
  const [roleCheckDone, setRoleCheckDone] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [isEmailSigningIn, setIsEmailSigningIn] = useState<boolean>(false);

  // Email / Password Authentication Inputs
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // 4 Primary Administrative Tabs
  const [mainTab, setMainTab] = useState<MainTabType>('admissions');

  // Sub-tabs for Admissions Oversight
  const [admissionsSubTab, setAdmissionsSubTab] = useState<AdmissionsSubTab>('applications');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'status'>('newest');
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [enterpriseInquiries, setEnterpriseInquiries] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<StudentApplication | null>(null);
  const [selectedEnterpriseInquiry, setSelectedEnterpriseInquiry] = useState<any | null>(null);

  // Bulk Selection & Operations State
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [isBulkEmailModalOpen, setIsBulkEmailModalOpen] = useState<boolean>(false);
  const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const handleSelectNotification = (notif: AdminNotification) => {
    if (notif.type === 'application') {
      setMainTab('admissions');
      setAdmissionsSubTab('applications');
      if (notif.data) {
        setSelectedApplication(notif.data as StudentApplication);
      }
    } else if (notif.type === 'enterprise_inquiry') {
      setMainTab('admissions');
      setAdmissionsSubTab('enterprise');
      if (notif.data) {
        setSelectedEnterpriseInquiry(notif.data);
      }
    } else if (notif.type === 'contact_message') {
      setMainTab('admissions');
      setAdmissionsSubTab('messages');
    }
  };

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('Connecting to Google Cloud Firestore...');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Track Firebase Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) setAccessToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setAccessToken('');
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Resolve the signed-in user's real staff role from Firestore (the actual
  // security boundary is firestore.rules; this gates the console UI to match).
  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setStaffRole(null);
      setRoleCheckDone(false);
      return;
    }
    setRoleCheckDone(false);
    (async () => {
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userDocRef);
        if (!snap.exists()) {
          // Self-provision a bare profile doc (no role) on first sign-in so
          // an existing admin can later find this person by email to grant
          // access — matches firestore.rules' owner-only, role-less create.
          try {
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || null,
              createdAt: new Date().toISOString(),
            });
          } catch (provisionErr) {
            console.warn('Could not self-provision users/{uid} doc:', provisionErr);
          }
        }
        const role = snap.exists() ? (snap.data() as any).role : null;
        const validRoles: StaffRole[] = ['super_admin', 'admissions_officer', 'lead_faculty', 'curriculum_mentor'];
        if (!cancelled) {
          setStaffRole(validRoles.includes(role) ? (role as StaffRole) : null);
        }
      } catch (err) {
        console.error('Staff role check failed:', err);
        if (!cancelled) {
          setStaffRole(null); // fail closed
        }
      } finally {
        if (!cancelled) setRoleCheckDone(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please enter both email and password.');
      return;
    }

    setIsEmailSigningIn(true);
    setAuthError(null);
    try {
      const loggedUser = await emailPasswordSignIn(email.trim(), password);
      setUser(loggedUser);
      if (onAddToast) {
        onAddToast('Authenticated', `Signed into Admin Console as ${loggedUser.email}`, 'success');
      }
    } catch (err: any) {
      console.error('Email Sign-In Error:', err);
      let errorMsg = 'Failed to authenticate. Please check your credentials or continue with Google.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMsg = 'Invalid email or password. Please verify your credentials or use Google Sign-In.';
      } else if (err.code === 'auth/invalid-email') {
        errorMsg = 'Please enter a valid email address.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMsg = 'Too many failed login attempts. Please wait a moment or sign in with Google.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setAuthError(errorMsg);
      if (onAddToast) {
        onAddToast('Authentication Error', errorMsg, 'error');
      }
    } finally {
      setIsEmailSigningIn(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        if (onAddToast) {
          onAddToast('Google Sign-In Verified', `Authenticated as ${result.user.email}`, 'success');
        }
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      setAuthError(err.message || 'Failed to authenticate with Google. Please try again.');
      if (onAddToast) {
        onAddToast('Authentication Error', err.message || 'Google Sign-In failed', 'error');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleAuthorizeGmail = async () => {
    try {
      setAccessToken(await getGmailSendToken());
      if (onAddToast) onAddToast('Gmail Authorized', 'You can now send email from the admin console.', 'success');
    } catch (err: any) {
      if (onAddToast) onAddToast('Gmail Authorization Failed', err.message || 'Could not authorize Gmail sending.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      setUser(null);
      setAccessToken('');
      setStaffRole(null);
      setRoleCheckDone(false);
      setApplications([]);
      setEnterpriseInquiries([]);
      setMessages([]);
      if (onAddToast) {
        onAddToast('Session Terminated', 'Signed out from Admin Console', 'info');
      }
    } catch (err: any) {
      console.error('Sign Out Error:', err);
    }
  };

  const fetchRecords = async () => {
    if (!user || !staffRole) return;
    setIsLoading(true);
    setStatusMessage('Syncing with Google Cloud Firestore collections...');
    try {
      // 1. Applications
      try {
        const appSnap = await getDocs(collection(db, 'applications'));
        const apps = appSnap.docs.map(d => {
          const data = d.data();
          const normalizedName = getCandidateName(data as any);
          return {
            id: d.id,
            ...data,
            fullName: normalizedName,
          } as StudentApplication;
        }).sort((a, b) => getApplicationTimestamp(b) - getApplicationTimestamp(a));
        setApplications(apps);
      } catch (err: any) {
        console.warn('Applications fetch warning:', err);
      }

      // 2. Enterprise Inquiries
      try {
        const entSnap = await getDocs(collection(db, 'enterpriseInquiries'));
        const ents = entSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEnterpriseInquiries(ents);
      } catch (err: any) {
        console.warn('Enterprise inquiries fetch warning:', err);
      }

      // 3. Contact Messages
      try {
        const msgSnap = await getDocs(collection(db, 'contactMessages'));
        const msgs = msgSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      } catch (err: any) {
        console.warn('Contact messages fetch warning:', err);
      }

      setStatusMessage('Live sync complete. Connected to Firestore collections.');
    } catch (err: any) {
      console.warn('Firestore fetch notice:', err);
      setStatusMessage('Live write pipeline active. Read queries connected.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user && staffRole) {
      fetchRecords();
    }
  }, [user, staffRole]);

  const handleApplicationUpdated = (updatedApp: StudentApplication) => {
    setApplications(prev => {
      const updated = prev.map(a => a.id === updatedApp.id ? updatedApp : a);
      return [...updated].sort((a, b) => getApplicationTimestamp(b) - getApplicationTimestamp(a));
    });
    setSelectedApplication(null);
  };

  const handleBulkStatusUpdated = (updatedApps: StudentApplication[]) => {
    const updatedMap = new Map(updatedApps.map((a) => [a.id, a]));
    setApplications((prev) => {
      const updated = prev.map((a) => (updatedMap.has(a.id) ? updatedMap.get(a.id)! : a));
      return [...updated].sort((a, b) => getApplicationTimestamp(b) - getApplicationTimestamp(a));
    });
    setSelectedAppIds([]);
  };

  const handleBulkEmailCompleted = (updatedApps: StudentApplication[]) => {
    const updatedMap = new Map(updatedApps.map((a) => [a.id, a]));
    setApplications((prev) => {
      const updated = prev.map((a) => (updatedMap.has(a.id) ? updatedMap.get(a.id)! : a));
      return [...updated].sort((a, b) => getApplicationTimestamp(b) - getApplicationTimestamp(a));
    });
  };

  const handleToggleSelectApp = (appId: string) => {
    setSelectedAppIds((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleSelectAllFiltered = (filteredList: StudentApplication[]) => {
    const filteredIds = filteredList.map((a) => a.id);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selectedAppIds.includes(id));

    if (allSelected) {
      // Deselect all filtered
      setSelectedAppIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      // Select all filtered (union with existing selection)
      setSelectedAppIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedAppIds([]);
  };

  const handleExportSelectedCsv = () => {
    const selectedApps = applications.filter((a) => selectedAppIds.includes(a.id));
    if (selectedApps.length === 0) return;

    const headers = [
      'Application ID',
      'Candidate Name',
      'Email',
      'Phone',
      'Course Title',
      'Status',
      'Applied At',
      'Decision Sent',
      'Background',
      'Goals / Statements',
      'Notes'
    ];

    const rows = selectedApps.map((a) => [
      `"${a.id}"`,
      `"${getCandidateName(a).replace(/"/g, '""')}"`,
      `"${(a.email || '').replace(/"/g, '""')}"`,
      `"${(a.phone || '').replace(/"/g, '""')}"`,
      `"${(a.courseTitle || (a as any).courseName || '').replace(/"/g, '""')}"`,
      `"${(a.status || 'submitted').replace(/"/g, '""')}"`,
      `"${(a.createdAt || '').replace(/"/g, '""')}"`,
      `"${a.decisionLetterSent ? 'YES' : 'NO'}"`,
      `"${(a.background || (a as any).currentRole || '').replace(/"/g, '""')}"`,
      `"${(a.goals || '').replace(/"/g, '""')}"`,
      `"${(a.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Institute-of-AI-Candidates-Export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (onAddToast) {
      onAddToast('Export Downloaded', `Exported ${selectedApps.length} candidate record(s) as CSV.`, 'success');
    }
  };

  // 1. Loading State (Skeleton screen effect prevents blank screen)
  if (isAuthLoading) {
    return <AdminPageFullSkeleton />;
  }

  // 2. Not Authenticated -> Render Unified Admin Console Sign-In Gateway
  if (!user) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center px-4 py-10 sm:py-14">
        <ScrollReveal duration={600}>
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#00172e] border border-[#44474d]/40 shadow-2xl shadow-[#000f21]/90 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-[#102034] border border-[#41e4c0]/40 flex items-center justify-center text-[#41e4c0] mx-auto mb-3 shadow-lg shadow-[#41e4c0]/10">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/30 text-[10px] font-mono-caps text-[#41e4c0] uppercase tracking-widest">
                <Lock className="w-3 h-3" />
                <span>Protected Administrative Gateway</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Admin Console
              </h2>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Sign in with your administrator credentials or Google Workspace account to access operations, admissions pipelines, and management systems.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Authentication Notice</div>
                  <div className="text-[11px] leading-relaxed">{authError}</div>
                </div>
              </div>
            )}

            {/* Email & Password Authentication Form */}
            <form onSubmit={handleEmailLogin} className="space-y-3.5 pt-1">
              <div>
                <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                  Administrator Email
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#94a3b8] absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@instituteofai.com"
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748b] focus:outline-none focus:border-[#41e4c0] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative flex items-center">
                  <KeyRound className="w-4 h-4 text-[#94a3b8] absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-xl pl-10 pr-10 py-2.5 text-sm text-[#F8FAFC] placeholder-[#64748b] focus:outline-none focus:border-[#41e4c0] transition-colors font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-[#94a3b8] hover:text-white p-1 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isEmailSigningIn || isSigningIn}
                className="w-full min-h-[44px] mt-2 py-3 px-4 rounded-xl bg-[#41e4c0] hover:bg-[#38debb] text-[#031427] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#41e4c0]/20 transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isEmailSigningIn ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#031427]" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with Credentials</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-[#334155] w-full" />
              <span className="bg-[#00172e] px-3 text-[11px] font-mono-caps text-[#64748b] uppercase tracking-wider whitespace-nowrap">
                or continue with
              </span>
              <div className="border-t border-[#334155] w-full" />
            </div>

            {/* Google Identity Sign-In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isSigningIn || isEmailSigningIn}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-sm flex items-center justify-center gap-3 shadow-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
                  <span>Connecting to Google Identity...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </>
              )}
            </button>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  // 3. Signed in, but the staff-role lookup hasn't resolved yet
  if (!roleCheckDone) {
    return <AdminPageFullSkeleton />;
  }

  // 4. Signed in, confirmed NOT a staff member -> Access Restricted
  if (!staffRole) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center px-4 py-10 sm:py-14">
        <ScrollReveal duration={600}>
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#00172e] border border-red-500/30 shadow-2xl shadow-[#000f21]/90 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#102034] border border-red-500/40 flex items-center justify-center text-red-400 mx-auto shadow-lg shadow-red-500/10">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                Access Restricted
              </h2>
              <p className="text-xs text-[#94a3b8] leading-relaxed">
                Your account (<span className="text-[#F8FAFC]">{user.email}</span>) is signed in but
                does not have administrative access to this console. Contact an existing
                administrator if you believe this is a mistake.
              </p>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full min-h-[44px] py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-mono-caps text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </ScrollReveal>
      </div>
    );
  }

  // 5. Authenticated & Authorized -> Render Multi-Tab Administrative Dashboard
  return (
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 md:px-10 max-w-[1360px] mx-auto space-y-8">
      {/* Top Header */}
      <ScrollReveal duration={800}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#44474d]/30">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest mb-2">
              <Database className="w-3.5 h-3.5" />
              <span>Admin Console v2.5</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">
              Institutional Command Center
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              Admissions pipelines, Google Workspace synchronization, personnel access governance, and immutable audit streams.
            </p>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Real-time In-Console Notification Bell */}
            <AdminNotificationBell
              onSelectNotification={handleSelectNotification}
              onAddToast={onAddToast}
            />

            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#00172e] border border-[#44474d]/40">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full object-cover border border-[#41e4c0]/40" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#102034] text-[#41e4c0] flex items-center justify-center font-bold text-xs">
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <div className="text-xs font-bold text-white leading-none">{user.displayName || 'Administrator'}</div>
                <div className="text-[10px] text-[#41e4c0] font-mono leading-tight">{user.email}</div>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer"
              title="Sign Out & Lock Console"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Primary Top-Level Tab Navigation */}
      <div className="p-1.5 rounded-2xl bg-[#00172e] border border-[#44474d]/40 grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          onClick={() => setMainTab('admissions')}
          className={`py-3.5 px-4 rounded-xl text-xs font-mono-caps flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            mainTab === 'admissions'
              ? 'bg-[#102034] text-[#41e4c0] font-bold border border-[#41e4c0]/40 shadow-lg shadow-[#41e4c0]/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#000f21]'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span className="text-sm">Admissions ({applications.length})</span>
        </button>

        <button
          onClick={() => setMainTab('activity')}
          className={`py-3.5 px-4 rounded-xl text-xs font-mono-caps flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            mainTab === 'activity'
              ? 'bg-[#102034] text-[#41e4c0] font-bold border border-[#41e4c0]/40 shadow-lg shadow-[#41e4c0]/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#000f21]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span className="text-sm">Recent Activity</span>
        </button>

        {staffRole === 'super_admin' && (
          <button
            onClick={() => setMainTab('users')}
            className={`py-3.5 px-4 rounded-xl text-xs font-mono-caps flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
              mainTab === 'users'
                ? 'bg-[#102034] text-[#41e4c0] font-bold border border-[#41e4c0]/40 shadow-lg shadow-[#41e4c0]/10'
                : 'text-[#94a3b8] hover:text-white hover:bg-[#000f21]'
            }`}
          >
            <UserCog className="w-4 h-4" />
            <span className="text-sm">Staff & Roles</span>
          </button>
        )}

        <button
          onClick={() => setMainTab('audit')}
          className={`py-3.5 px-4 rounded-xl text-xs font-mono-caps flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
            mainTab === 'audit'
              ? 'bg-[#102034] text-[#41e4c0] font-bold border border-[#41e4c0]/40 shadow-lg shadow-[#41e4c0]/10'
              : 'text-[#94a3b8] hover:text-white hover:bg-[#000f21]'
          }`}
        >
          <History className="w-4 h-4" />
          <span className="text-sm">Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: ADMISSIONS OVERSIGHT */}
      {mainTab === 'admissions' && (
        <div className="space-y-6">
          {/* Connection & Status Banner */}
          <div className="p-4 rounded-xl bg-[#00172e] border border-[#41e4c0]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#41e4c0] animate-pulse" />
              <span className="font-mono text-[#d3e4fe]">
                Database: <strong className="text-white">ai-studio-instituteofaiweb-f26eec15-970f-4b88-87fa-dcfd5e70a258</strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#41e4c0] font-mono-caps">{statusMessage}</span>
              <button
                onClick={fetchRecords}
                disabled={isLoading}
                className="px-3 py-1 rounded-lg bg-[#102034] hover:bg-[#162a42] border border-[#41e4c0]/40 text-[#41e4c0] text-[11px] font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="p-5 rounded-2xl bg-[#00172e]/80 border border-[#44474d]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono-caps text-[#94a3b8] uppercase">Student Applications</span>
                <Users className="w-4 h-4 text-[#41e4c0]" />
              </div>
              <div className="text-3xl font-extrabold text-white">{applications.length}</div>
              <span className="text-[11px] text-[#94a3b8] font-mono mt-1 block">Collection /applications</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#00172e]/80 border border-[#44474d]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono-caps text-[#94a3b8] uppercase">Enterprise Scopes</span>
                <Building2 className="w-4 h-4 text-[#41e4c0]" />
              </div>
              <div className="text-3xl font-extrabold text-white">{enterpriseInquiries.length}</div>
              <span className="text-[11px] text-[#94a3b8] font-mono mt-1 block">Collection /enterpriseInquiries</span>
            </div>

            <div className="p-5 rounded-2xl bg-[#00172e]/80 border border-[#44474d]/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono-caps text-[#94a3b8] uppercase">Helpdesk Inquiries</span>
                <Mail className="w-4 h-4 text-[#41e4c0]" />
              </div>
              <div className="text-3xl font-extrabold text-white">{messages.length}</div>
              <span className="text-[11px] text-[#94a3b8] font-mono mt-1 block">Collection /contactMessages</span>
            </div>
          </div>

          {/* Sub Tab Navigation */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#000f21] border border-[#44474d]/30 self-start">
              <button
                onClick={() => {
                  setAdmissionsSubTab('applications');
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-mono-caps transition-colors cursor-pointer ${
                  admissionsSubTab === 'applications'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Applications ({applications.length})
              </button>
              <button
                onClick={() => {
                  setAdmissionsSubTab('activity');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-mono-caps flex items-center gap-1.5 transition-colors cursor-pointer ${
                  admissionsSubTab === 'activity'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Recent Activity</span>
              </button>
              <button
                onClick={() => {
                  setAdmissionsSubTab('enterprise');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-mono-caps transition-colors cursor-pointer ${
                  admissionsSubTab === 'enterprise'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Enterprise ({enterpriseInquiries.length})
              </button>
              <button
                onClick={() => {
                  setAdmissionsSubTab('messages');
                  setSearchQuery('');
                }}
                className={`px-4 py-2 rounded-lg text-xs font-mono-caps transition-colors cursor-pointer ${
                  admissionsSubTab === 'messages'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Transmissions ({messages.length})
              </button>
            </div>

            {/* Candidate Search & Filter Bar */}
            {admissionsSubTab === 'applications' && (
              <div className="p-4 rounded-2xl bg-[#00172e] border border-[#44474d]/40 space-y-3.5 shadow-sm">
                {/* Search Bar & Dropdown Header */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-[#41e4c0] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search by candidate name, email, program track, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-sm text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#41e4c0] focus:ring-1 focus:ring-[#41e4c0]/50 transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white p-1 rounded-md transition-colors"
                        title="Clear search query"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Filter Dropdown */}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40">
                      <Filter className="w-3.5 h-3.5 text-[#41e4c0] shrink-0" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-xs font-mono-caps text-[#d3e4fe] focus:outline-none cursor-pointer pr-2"
                      >
                        <option value="all" className="bg-[#00172e] text-white">ALL STATUSES ({applications.length})</option>
                        <option value="accepted" className="bg-[#00172e] text-emerald-400">ACCEPTED ({applications.filter(a => a.status === 'accepted').length})</option>
                        <option value="submitted" className="bg-[#00172e] text-amber-400">PENDING ({applications.filter(a => !a.status || a.status === 'submitted' || a.status === 'pending').length})</option>
                        <option value="under_review" className="bg-[#00172e] text-sky-400">UNDER REVIEW ({applications.filter(a => a.status === 'under_review').length})</option>
                        <option value="waitlisted" className="bg-[#00172e] text-purple-400">WAITLISTED ({applications.filter(a => a.status === 'waitlisted').length})</option>
                        <option value="rejected" className="bg-[#00172e] text-rose-400">REJECTED ({applications.filter(a => a.status === 'rejected').length})</option>
                      </select>
                    </div>

                    {/* Automatic Sort Order Dropdown */}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40" title="Sort candidate table (defaults to most recent applications first)">
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#41e4c0] shrink-0" />
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="bg-transparent text-xs font-mono-caps text-[#d3e4fe] focus:outline-none cursor-pointer pr-2"
                      >
                        <option value="newest" className="bg-[#00172e] text-white">MOST RECENT FIRST (DEFAULT)</option>
                        <option value="oldest" className="bg-[#00172e] text-white">OLDEST FIRST</option>
                        <option value="name" className="bg-[#00172e] text-white">CANDIDATE NAME (A-Z)</option>
                        <option value="status" className="bg-[#00172e] text-white">ADMISSIONS STATUS</option>
                      </select>
                    </div>

                    {/* Candidate Reporting CSV Export Button */}
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] hover:text-white border border-[#41e4c0]/40 text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap"
                      title="Open Candidate CSV Export & Admissions Reporting Generator"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#41e4c0]" />
                      <span>Export CSV</span>
                    </button>

                    {(searchQuery || statusFilter !== 'all' || sortBy !== 'newest') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setSortBy('newest');
                        }}
                        className="px-3 py-2 rounded-xl bg-[#102034] hover:bg-[#18314e] text-xs font-mono-caps text-[#41e4c0] border border-[#41e4c0]/30 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        title="Reset all filters & return to default newest-first sorting"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Status Filter Buttons & Counters */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#44474d]/20">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-mono-caps text-[#94a3b8] uppercase mr-1">Filter by Status:</span>
                    
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'all'
                          ? 'bg-[#102034] text-white border-[#41e4c0] shadow-xs'
                          : 'bg-[#000f21]/70 text-[#94a3b8] border-[#44474d]/30 hover:text-white hover:border-[#44474d]'
                      }`}
                    >
                      <span>All</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-[#18314e] text-[10px] text-white font-mono">
                        {applications.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('accepted')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'accepted'
                          ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold shadow-xs shadow-emerald-950/50'
                          : 'bg-[#000f21]/70 text-emerald-400/80 border-emerald-500/30 hover:border-emerald-500/60 hover:text-emerald-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>Accepted</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-[10px] text-emerald-300 font-mono font-normal">
                        {applications.filter(a => a.status === 'accepted').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('submitted')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'submitted' || statusFilter === 'pending'
                          ? 'bg-amber-500/25 text-amber-300 border-amber-400 font-bold shadow-xs shadow-amber-950/50'
                          : 'bg-[#000f21]/70 text-amber-400/80 border-amber-500/30 hover:border-amber-500/60 hover:text-amber-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      <span>Pending</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-[10px] text-amber-300 font-mono font-normal">
                        {applications.filter(a => !a.status || a.status === 'submitted' || a.status === 'pending').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('under_review')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'under_review'
                          ? 'bg-sky-500/25 text-sky-300 border-sky-400 font-bold shadow-xs shadow-sky-950/50'
                          : 'bg-[#000f21]/70 text-sky-400/80 border-sky-500/30 hover:border-sky-500/60 hover:text-sky-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span>Under Review</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-[10px] text-sky-300 font-mono font-normal">
                        {applications.filter(a => a.status === 'under_review').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('waitlisted')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'waitlisted'
                          ? 'bg-purple-500/25 text-purple-300 border-purple-400 font-bold shadow-xs shadow-purple-950/50'
                          : 'bg-[#000f21]/70 text-purple-400/80 border-purple-500/30 hover:border-purple-500/60 hover:text-purple-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                      <span>Waitlisted</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[10px] text-purple-300 font-mono font-normal">
                        {applications.filter(a => a.status === 'waitlisted').length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStatusFilter('rejected')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border flex items-center gap-1.5 ${
                        statusFilter === 'rejected'
                          ? 'bg-rose-500/25 text-rose-300 border-rose-400 font-bold shadow-xs shadow-rose-950/50'
                          : 'bg-[#000f21]/70 text-rose-400/80 border-rose-500/30 hover:border-rose-500/60 hover:text-rose-300'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>Rejected</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-[10px] text-rose-300 font-mono font-normal">
                        {applications.filter(a => a.status === 'rejected').length}
                      </span>
                    </button>
                  </div>

                  {/* Results Count Label & Active Selection Indicator */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#94a3b8]">
                    {selectedAppIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-[#41e4c0]/15 text-[#41e4c0] font-bold border border-[#41e4c0]/30 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {selectedAppIds.length} candidate(s) selected
                      </span>
                    )}

                    <span>
                      Showing <strong className="text-white">
                        {applications.filter((a) => {
                          const name = getCandidateName(a).toLowerCase();
                          const email = (a.email || '').toLowerCase();
                          const course = (a.courseTitle || (a as any).courseName || '').toLowerCase();
                          const q = searchQuery.toLowerCase().trim();
                          const matchesSearch = !q || name.includes(q) || email.includes(q) || course.includes(q) || (a.id || '').toLowerCase().includes(q);
                          const matchesStatus = statusFilter === 'all'
                            ? true
                            : (statusFilter === 'submitted' || statusFilter === 'pending')
                            ? (!a.status || a.status === 'submitted' || a.status === 'pending')
                            : a.status === statusFilter;
                          return matchesSearch && matchesStatus;
                        }).length}
                      </strong> of <strong className="text-white">{applications.length}</strong> candidates
                    </span>
                  </div>
                </div>
              </div>
            )}

            {admissionsSubTab !== 'applications' && (
              <div className="relative flex-1 sm:w-80 self-end">
                <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#00172e] border border-[#44474d]/40 text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>
            )}
          </div>

          {/* Sub Tab Data Display */}
          <div className="rounded-2xl bg-[#00172e]/60 border border-[#44474d]/30 overflow-hidden min-h-[300px]">
            {isLoading ? (
              <AdminListSkeleton count={4} />
            ) : (
              <>
                {admissionsSubTab === 'applications' && (
                  <div className="divide-y divide-[#44474d]/20">
                    {applications.length === 0 ? (
                      <div className="py-16 text-center text-[#94a3b8] text-sm space-y-2">
                        <Inbox className="w-8 h-8 text-[#64748b] mx-auto" />
                        <p>No student applications logged in collection <code className="text-[#41e4c0]">/applications</code> yet.</p>
                        <p className="text-xs">Click "Apply Now" anywhere on the site to submit an enrollment application.</p>
                      </div>
                    ) : (() => {
                      const filteredApps = applications
                        .filter((app) => {
                          const name = getCandidateName(app).toLowerCase();
                          const email = (app.email || '').toLowerCase();
                          const course = (app.courseTitle || (app as any).courseName || '').toLowerCase();
                          const phone = (app.phone || '').toLowerCase();
                          const id = (app.id || '').toLowerCase();
                          const q = searchQuery.toLowerCase().trim();
                          const matchesSearch = !q || name.includes(q) || email.includes(q) || course.includes(q) || phone.includes(q) || id.includes(q);

                          const matchesStatus = statusFilter === 'all'
                            ? true
                            : (statusFilter === 'submitted' || statusFilter === 'pending')
                            ? (!app.status || app.status === 'submitted' || app.status === 'pending')
                            : app.status === statusFilter;

                          return matchesSearch && matchesStatus;
                        })
                        .sort((a, b) => {
                          if (sortBy === 'oldest') {
                            return getApplicationTimestamp(a) - getApplicationTimestamp(b);
                          }
                          if (sortBy === 'name') {
                            return getCandidateName(a).localeCompare(getCandidateName(b));
                          }
                          if (sortBy === 'status') {
                            return (a.status || 'submitted').localeCompare(b.status || 'submitted');
                          }
                          // Default: 'newest' (most recent applications on top)
                          const diff = getApplicationTimestamp(b) - getApplicationTimestamp(a);
                          if (diff !== 0) return diff;
                          return (b.id || '').localeCompare(a.id || '');
                        });

                      if (filteredApps.length === 0) {
                        return (
                          <div className="py-16 text-center text-[#94a3b8] text-sm space-y-3 px-4">
                            <Search className="w-8 h-8 text-[#64748b] mx-auto opacity-70" />
                            <div className="space-y-1">
                              <p className="text-white font-medium">No matching candidate applications found</p>
                              <p className="text-xs text-[#94a3b8]">
                                {searchQuery ? `No results for query "${searchQuery}"` : 'No candidates'} in status: <span className="text-[#41e4c0] font-mono uppercase">{statusFilter}</span>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setSortBy('newest');
                              }}
                              className="px-4 py-2 rounded-xl bg-[#102034] hover:bg-[#18314e] text-xs font-mono-caps text-[#41e4c0] border border-[#41e4c0]/40 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reset Search & Filters</span>
                            </button>
                          </div>
                        );
                      }

                      const allFilteredSelected = filteredApps.length > 0 && filteredApps.every((a) => selectedAppIds.includes(a.id));
                      const someFilteredSelected = filteredApps.some((a) => selectedAppIds.includes(a.id));

                      return (
                        <div>
                          {/* Table Header with Select All and Sticky/Docked Bulk Action Bar */}
                          <div className="px-5 py-3 bg-[#00172e] border-b border-[#44474d]/30 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* Master Select All Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleSelectAllFiltered(filteredApps)}
                                className="flex items-center gap-2 text-xs font-mono-caps text-[#cbd5e1] hover:text-white transition-colors cursor-pointer group"
                                title={allFilteredSelected ? 'Deselect all filtered candidates' : 'Select all filtered candidates'}
                              >
                                {allFilteredSelected ? (
                                  <CheckSquare className="w-4 h-4 text-[#41e4c0]" />
                                ) : someFilteredSelected ? (
                                  <MinusSquare className="w-4 h-4 text-[#41e4c0]" />
                                ) : (
                                  <Square className="w-4 h-4 text-[#64748b] group-hover:text-[#94a3b8]" />
                                )}
                                <span className="select-none font-bold">
                                  {allFilteredSelected
                                    ? `Deselect All (${filteredApps.length})`
                                    : `Select All Filtered (${filteredApps.length})`}
                                </span>
                              </button>

                              {selectedAppIds.length > 0 && (
                                <span className="text-[11px] font-mono text-[#94a3b8]">
                                  (<strong className="text-[#41e4c0]">{selectedAppIds.length}</strong> of {applications.length} total selected)
                                </span>
                              )}
                            </div>

                            {/* When no candidates selected, show quick export report button */}
                            {selectedAppIds.length === 0 && (
                              <button
                                type="button"
                                onClick={() => setIsExportModalOpen(true)}
                                className="px-3 py-1.5 rounded-xl bg-[#000f21] hover:bg-[#102034] text-[#cbd5e1] hover:text-[#41e4c0] border border-[#334155] text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer"
                                title="Export candidate list as CSV report for analysis"
                              >
                                <Download className="w-3.5 h-3.5 text-[#41e4c0]" />
                                <span>Export Report ({filteredApps.length})</span>
                              </button>
                            )}

                            {/* Floating / Active Bulk Operations Toolbar */}
                            {selectedAppIds.length > 0 && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-wrap items-center gap-2"
                              >
                                {/* Mass Email Dispatch Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsBulkEmailModalOpen(true)}
                                  className="px-3.5 py-1.5 rounded-xl bg-linear-to-r from-[#41e4c0] to-emerald-400 text-black font-bold text-xs font-mono-caps flex items-center gap-1.5 shadow-md hover:shadow-[#41e4c0]/20 transition-all cursor-pointer"
                                  title="Open Mass Email Dispatcher for selected candidates"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                  <span>Mass Email ({selectedAppIds.length})</span>
                                </button>

                                {/* Bulk Status Update Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsBulkStatusModalOpen(true)}
                                  className="px-3 py-1.5 rounded-xl bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] border border-[#41e4c0]/40 text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="Change status for all selected candidates in one step"
                                >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Update Status</span>
                                </button>

                                {/* Export CSV Button */}
                                <button
                                  type="button"
                                  onClick={() => setIsExportModalOpen(true)}
                                  className="px-3 py-1.5 rounded-xl bg-[#000f21] hover:bg-[#102034] text-[#cbd5e1] hover:text-white border border-[#334155] text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer"
                                  title="Export selected candidate records to CSV format"
                                >
                                  <Download className="w-3.5 h-3.5 text-[#41e4c0]" />
                                  <span>Export CSV</span>
                                </button>

                                {/* Deselect All Button */}
                                <button
                                  type="button"
                                  onClick={handleClearSelection}
                                  className="p-1.5 rounded-lg bg-[#000f21] hover:bg-[#102034] text-[#94a3b8] hover:text-rose-400 border border-[#334155] transition-colors cursor-pointer"
                                  title="Clear current selection"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </motion.div>
                            )}
                          </div>

                          <motion.div
                            key={`apps-container-${statusFilter}-${sortBy}-${searchQuery.trim()}`}
                            variants={tableListVariants}
                            initial="hidden"
                            animate="visible"
                            className="divide-y divide-[#44474d]/20"
                          >
                            <AnimatePresence mode="popLayout">
                              {filteredApps.map((app, index) => {
                                const candidateName = getCandidateName(app);
                                const appTimestamp = getApplicationTimestamp(app);
                                const isVeryRecent = appTimestamp > 0 && (Date.now() - appTimestamp < 24 * 60 * 60 * 1000);
                                const isSelected = selectedAppIds.includes(app.id);

                                return (
                                  <motion.div
                                    key={app.id}
                                    layout="position"
                                    custom={index}
                                    variants={tableRowVariants}
                                    initial="hidden"
                                    animate="visible"
                                    exit="exit"
                                    onClick={() => setSelectedApplication(app)}
                                    className={`p-5 transition-all space-y-2.5 cursor-pointer group flex items-start gap-3.5 ${
                                      isSelected
                                        ? 'bg-[#102034]/70 border-l-4 border-l-[#41e4c0] shadow-xs'
                                        : 'hover:bg-[#102034]/50'
                                    }`}
                                  >
                                    {/* Selection Checkbox */}
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleSelectApp(app.id);
                                      }}
                                      className="pt-0.5 text-[#94a3b8] hover:text-[#41e4c0] cursor-pointer shrink-0 transition-colors"
                                      title={isSelected ? 'Deselect candidate' : 'Select candidate for mass emailing or bulk action'}
                                    >
                                      {isSelected ? (
                                        <CheckSquare className="w-5 h-5 text-[#41e4c0]" />
                                      ) : (
                                        <Square className="w-5 h-5 text-[#64748b] group-hover:text-[#94a3b8]" />
                                      )}
                                    </div>

                                    {/* Candidate Record Content */}
                                    <div className="flex-1 min-w-0 space-y-2.5">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                          <span className="font-bold text-white text-base group-hover:text-[#41e4c0] transition-colors">
                                            {candidateName}
                                          </span>
                                          <span className="px-2.5 py-0.5 rounded-full bg-[#41e4c0]/10 text-[#41e4c0] text-xs font-mono-caps border border-[#41e4c0]/30">
                                            {app.courseTitle || (app as any).courseName || (app as any).programId || 'Applied Track'}
                                          </span>
                                          <StatusBadge status={app.status} size="sm" showIcon />
                                          {app.decisionLetterSent && (
                                            <span
                                              className="px-2 py-0.5 rounded-full text-[10px] font-mono-caps bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/40 flex items-center gap-1"
                                              title={app.lastAttachedFiles?.length ? `Dispatched with ${app.lastAttachedFiles.join(', ')}` : 'Decision letter dispatched'}
                                            >
                                              <Paperclip className="w-2.5 h-2.5 text-[#41e4c0]" />
                                              <span>PDF Dispatched</span>
                                            </span>
                                          )}
                                          {isVeryRecent && (
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono-caps font-bold bg-[#41e4c0]/20 text-[#41e4c0] border border-[#41e4c0]/50 animate-pulse">
                                              RECENT
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2.5">
                                          {/* Application Submission Date Badge */}
                                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#000f21] border border-[#334155]/80 text-[11px] text-[#94a3b8]" title={`Submitted: ${app.createdAt || 'Recent'}`}>
                                            <Clock className="w-3 h-3 text-[#41e4c0] shrink-0" />
                                            <span>Applied: <strong className="text-[#d3e4fe] font-normal">{formatApplicationDate(app)}</strong></span>
                                          </div>
                                          <span className="text-xs text-[#94a3b8] font-mono">ID: {app.id}</span>
                                          <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 group-hover:text-[#41e4c0] transition-all" />
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-[#94a3b8]">
                                        <div><strong className="text-[#d3e4fe]">Email:</strong> {app.email}</div>
                                        <div><strong className="text-[#d3e4fe]">Phone:</strong> {app.phone || 'N/A'}</div>
                                        <div><strong className="text-[#d3e4fe]">Background:</strong> {app.background || (app as any).currentRole || 'N/A'}</div>
                                      </div>

                                      {app.goals && (
                                        <div className="p-3 rounded-lg bg-[#000f21] text-xs text-[#d3e4fe] line-clamp-2">
                                          <span className="text-[#94a3b8] block mb-0.5 font-mono text-[10px] uppercase">Goal Statement:</span>
                                          {app.goals}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </motion.div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {admissionsSubTab === 'enterprise' && (
                  <div className="divide-y divide-[#44474d]/20">
                    {enterpriseInquiries.length === 0 ? (
                      <div className="py-16 text-center text-[#94a3b8] text-sm space-y-2">
                        <Building2 className="w-8 h-8 text-[#64748b] mx-auto" />
                        <p>No corporate proposals in collection <code className="text-[#41e4c0]">/enterpriseInquiries</code> yet.</p>
                        <p className="text-xs">Submit a proposal through the Enterprise Training modal to test.</p>
                      </div>
                    ) : (
                      <motion.div
                        key={`enterprise-container-${searchQuery.trim()}`}
                        variants={tableListVariants}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-[#44474d]/20"
                      >
                        <AnimatePresence mode="popLayout">
                          {enterpriseInquiries
                            .filter(e => !searchQuery || JSON.stringify(e).toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((ent, index) => (
                              <motion.div
                                key={ent.id}
                                layout="position"
                                custom={index}
                                variants={tableRowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                onClick={() => setSelectedEnterpriseInquiry(ent)}
                                className="p-5 hover:bg-[#102034]/50 transition-colors space-y-2 cursor-pointer group"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-base group-hover:text-[#41e4c0] transition-colors">
                                      {ent.companyName || 'Enterprise Lead'}
                                    </span>
                                    <span className="px-2.5 py-0.5 rounded-full bg-[#102034] text-[#41e4c0] text-xs font-mono-caps border border-[#41e4c0]/30">
                                      Team: {ent.teamSize || 'Custom'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-[#94a3b8] font-mono">ID: {ent.id}</span>
                                    <ChevronRight className="w-4 h-4 text-[#94a3b8] group-hover:translate-x-0.5 group-hover:text-[#41e4c0] transition-all" />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#94a3b8]">
                                  <div><strong className="text-[#d3e4fe]">Contact:</strong> {ent.contactName} ({ent.workEmail})</div>
                                  <div><strong className="text-[#d3e4fe]">Primary Focus:</strong> {ent.primaryFocus || 'Enterprise Enablement'}</div>
                                </div>

                                {ent.customRequirements && (
                                  <div className="p-3 rounded-lg bg-[#000f21] text-xs text-[#d3e4fe]">
                                    <span className="text-[#94a3b8] block mb-0.5">Requirements:</span>
                                    {ent.customRequirements}
                                  </div>
                                )}
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                )}

                {admissionsSubTab === 'messages' && (
                  <div className="divide-y divide-[#44474d]/20">
                    {messages.length === 0 ? (
                      <div className="py-16 text-center text-[#94a3b8] text-sm space-y-2">
                        <Mail className="w-8 h-8 text-[#64748b] mx-auto" />
                        <p>No contact messages logged yet in collection <code className="text-[#41e4c0]">/contactMessages</code>.</p>
                      </div>
                    ) : (
                      <motion.div
                        key={`messages-container-${searchQuery.trim()}`}
                        variants={tableListVariants}
                        initial="hidden"
                        animate="visible"
                        className="divide-y divide-[#44474d]/20"
                      >
                        <AnimatePresence mode="popLayout">
                          {messages
                            .filter(m => !searchQuery || JSON.stringify(m).toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((msg, index) => (
                              <motion.div
                                key={msg.id}
                                layout="position"
                                custom={index}
                                variants={tableRowVariants}
                                initial="hidden"
                                animate="visible"
                                exit="exit"
                                className="p-5 hover:bg-[#102034]/50 transition-colors space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-white text-sm">{msg.name || msg.fullName} ({msg.email})</span>
                                  <span className="text-xs text-[#41e4c0] font-mono-caps">{msg.inquiryType || 'General'}</span>
                                </div>
                                <p className="text-xs text-[#d3e4fe]">{msg.message}</p>
                              </motion.div>
                            ))}
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </div>
                )}

                {admissionsSubTab === 'activity' && (
                  <div className="p-2 sm:p-4">
                    <RecentActivityPanel
                      applications={applications}
                      onSelectApplication={(app) => setSelectedApplication(app)}
                      onAddToast={onAddToast}
                      currentAdminEmail={user?.email || 'admin@instituteofai.com'}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB: RECENT ACTIVITY */}
      {mainTab === 'activity' && (
        <RecentActivityPanel
          applications={applications}
          onSelectApplication={(app) => setSelectedApplication(app)}
          onAddToast={onAddToast}
          currentAdminEmail={user?.email || 'admin@instituteofai.com'}
        />
      )}

      {/* TAB 3: USER MANAGEMENT */}
      {mainTab === 'users' && staffRole === 'super_admin' && (
        <UserManagementPanel currentUser={user} currentStaffRole={staffRole} onAddToast={onAddToast} />
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {mainTab === 'audit' && (
        <AdminAuditTrailPanel
          applications={applications}
          onSelectApplication={(app) => setSelectedApplication(app)}
          onAddToast={onAddToast}
          currentAdminEmail={user?.email || 'admin@instituteofai.com'}
        />
      )}

      {/* Slide-over Application Review Detail Modal */}
      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onStatusUpdated={handleApplicationUpdated}
          onAddToast={onAddToast}
          currentAdminEmail={user?.email || 'admin@instituteofai.com'}
          accessToken={accessToken}
          onConnectGoogle={handleAuthorizeGmail}
        />
      )}

      {/* Enterprise Inquiry Follow-up Modal */}
      {selectedEnterpriseInquiry && (
        <EnterpriseInquiryModal
          inquiry={selectedEnterpriseInquiry}
          onClose={() => setSelectedEnterpriseInquiry(null)}
          onAddToast={onAddToast}
          accessToken={accessToken}
          currentAdminEmail={user?.email || 'admin@instituteofai.com'}
          onConnectGoogle={handleAuthorizeGmail}
        />
      )}

      {/* Bulk Email Dispatch Modal */}
      <BulkEmailModal
        isOpen={isBulkEmailModalOpen}
        onClose={() => setIsBulkEmailModalOpen(false)}
        selectedApplications={applications.filter((a) => selectedAppIds.includes(a.id))}
        accessToken={accessToken}
        currentAdminEmail={user?.email || 'admin@instituteofai.com'}
        onBulkCompleted={handleBulkEmailCompleted}
        onAddToast={onAddToast}
      />

      {/* Bulk Status Update Modal */}
      <BulkStatusModal
        isOpen={isBulkStatusModalOpen}
        onClose={() => setIsBulkStatusModalOpen(false)}
        selectedApplications={applications.filter((a) => selectedAppIds.includes(a.id))}
        currentAdminEmail={user?.email || 'admin@instituteofai.com'}
        onBulkUpdated={handleBulkStatusUpdated}
        onAddToast={onAddToast}
      />

      {/* Candidate Admissions CSV Reporting & Export Modal */}
      <CandidateExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        allApplications={applications}
        filteredApplications={applications
          .filter((app) => {
            const name = getCandidateName(app).toLowerCase();
            const email = (app.email || '').toLowerCase();
            const course = (app.courseTitle || (app as any).courseName || '').toLowerCase();
            const phone = (app.phone || '').toLowerCase();
            const id = (app.id || '').toLowerCase();
            const q = searchQuery.toLowerCase().trim();
            const matchesSearch = !q || name.includes(q) || email.includes(q) || course.includes(q) || phone.includes(q) || id.includes(q);

            const matchesStatus = statusFilter === 'all'
              ? true
              : (statusFilter === 'submitted' || statusFilter === 'pending')
              ? (!app.status || app.status === 'submitted' || app.status === 'pending')
              : app.status === statusFilter;

            return matchesSearch && matchesStatus;
          })
          .sort((a, b) => {
            if (sortBy === 'oldest') {
              return getApplicationTimestamp(a) - getApplicationTimestamp(b);
            }
            if (sortBy === 'name') {
              return getCandidateName(a).localeCompare(getCandidateName(b));
            }
            if (sortBy === 'status') {
              return (a.status || 'submitted').localeCompare(b.status || 'submitted');
            }
            const diff = getApplicationTimestamp(b) - getApplicationTimestamp(a);
            if (diff !== 0) return diff;
            return (b.id || '').localeCompare(a.id || '');
          })}
        selectedAppIds={selectedAppIds}
        currentStatusFilter={statusFilter}
        currentSearchQuery={searchQuery}
        currentAdminEmail={user?.email || 'admin@instituteofai.com'}
        onAddToast={onAddToast}
      />
    </div>
  );
};
