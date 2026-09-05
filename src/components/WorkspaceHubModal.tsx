import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, googleSignIn, logout, initAuth, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  listDriveFiles,
  DriveFile,
  createGoogleDoc,
  getFormDetails,
  getFormResponses,
  FormItem,
  listGmailMessages,
  GmailMessage,
  sendGmailMessage,
  listGoogleTasks,
  createGoogleTask,
  TaskItem,
  listGoogleContacts,
  ContactPerson,
  listCalendarEvents,
  createCalendarEvent,
  CalendarEventItem,
} from '../services/workspace';
import {
  X,
  HardDrive,
  FileText,
  ClipboardList,
  Mail,
  CheckSquare,
  Users,
  Calendar as CalendarIcon,
  LogOut,
  Send,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { motion } from 'motion/react';
import { ListItemSkeleton, CardSkeleton, SkeletonBlock } from './Skeleton';

interface WorkspaceHubModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'drive' | 'docs' | 'forms' | 'gmail' | 'tasks' | 'contacts' | 'calendar' | 'activity';

export const WorkspaceHubModal: React.FC<WorkspaceHubModalProps> = ({ isOpen, onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('drive');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Confirmation modal state for mutating operations
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  // Service States
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');

  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [createdDocInfo, setCreatedDocInfo] = useState<{ documentId: string; title: string } | null>(null);

  const [formIdInput, setFormIdInput] = useState('');
  const [currentForm, setCurrentForm] = useState<FormItem | null>(null);
  const [formResponses, setFormResponses] = useState<any[]>([]);

  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  const [contacts, setContacts] = useState<ContactPerson[]>([]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStart, setEventStart] = useState('');

  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        if (token) setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken('');
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && accessToken && isOpen) {
      loadTabData();
    }
  }, [user, accessToken, activeTab, isOpen]);

  const loadTabData = async () => {
    if (!accessToken) {
      if (activeTab === 'activity') {
        loadFirestoreLogs();
      } else {
        setStatusMessage('Google Workspace access token required. Please click "Reconnect Google Access" to authorize Drive, Contacts, Gmail, and Calendar.');
      }
      return;
    }
    setLoading(true);
    setStatusMessage('');
    try {
      if (activeTab === 'drive') {
        const files = await listDriveFiles(accessToken, driveSearch);
        setDriveFiles(files);
      } else if (activeTab === 'gmail') {
        const msgs = await listGmailMessages(accessToken);
        setEmails(msgs);
      } else if (activeTab === 'tasks') {
        const tList = await listGoogleTasks(accessToken);
        setTasks(tList);
      } else if (activeTab === 'contacts') {
        const cList = await listGoogleContacts(accessToken);
        setContacts(cList);
      } else if (activeTab === 'calendar') {
        const events = await listCalendarEvents(accessToken);
        setCalendarEvents(events);
      } else if (activeTab === 'activity') {
        loadFirestoreLogs();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const logWorkspaceAction = async (service: string, action: string, details: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'workspaceLogs'), {
        service,
        action,
        details,
        timestamp: new Date().toISOString(),
        userId: user.uid,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'workspaceLogs');
    }
  };

  const loadFirestoreLogs = async () => {
    if (!user) return;
    try {
      const q = query(collection(db, 'workspaceLogs'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const logs: any[] = [];
      querySnapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setActivityLogs(logs.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || '')));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'workspaceLogs');
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setStatusMessage('Signed in successfully with Google Workspace permissions.');
      }
    } catch (err: any) {
      setStatusMessage(`Sign-in failed: ${err.message}`);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    setAccessToken('');
    setStatusMessage('Signed out.');
  };

  // --- Mutating Actions with Mandatory User Confirmation ---
  const handleCreateDocClick = () => {
    if (!docTitle.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Create Google Document',
      description: `Create new Google Document titled "${docTitle}" in your Google Drive account?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          const docRes = await createGoogleDoc(accessToken, docTitle, docContent);
          setCreatedDocInfo(docRes);
          await logWorkspaceAction('Google Docs', 'CREATE_DOC', `Created document: ${docTitle}`);
          setDocTitle('');
          setDocContent('');
          setStatusMessage('Google Doc created successfully!');
        } catch (err: any) {
          setStatusMessage(`Doc Creation Error: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleSendEmailClick = () => {
    if (!emailTo || !emailSubject) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Confirm Send Gmail',
      description: `Send email to "${emailTo}" with subject "${emailSubject}" from your Gmail account?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await sendGmailMessage(accessToken, emailTo, emailSubject, emailBody);
          await logWorkspaceAction('Gmail', 'SEND_EMAIL', `Sent email to ${emailTo}`);
          setEmailTo('');
          setEmailSubject('');
          setEmailBody('');
          setStatusMessage('Email sent successfully via Gmail API!');
          loadTabData();
        } catch (err: any) {
          setStatusMessage(`Email Send Error: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCreateTaskClick = () => {
    if (!newTaskTitle.trim()) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Create Google Task',
      description: `Add task "${newTaskTitle}" to your Google Tasks account?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await createGoogleTask(accessToken, newTaskTitle, newTaskNotes);
          await logWorkspaceAction('Google Tasks', 'CREATE_TASK', `Created task: ${newTaskTitle}`);
          setNewTaskTitle('');
          setNewTaskNotes('');
          setStatusMessage('Task added successfully!');
          loadTabData();
        } catch (err: any) {
          setStatusMessage(`Task Creation Error: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCreateCalendarEventClick = () => {
    if (!eventTitle || !eventStart) return;
    const startTime = new Date(eventStart).toISOString();
    const endTime = new Date(new Date(eventStart).getTime() + 3600000).toISOString();
    setConfirmDialog({
      isOpen: true,
      title: 'Schedule Calendar Event',
      description: `Schedule "${eventTitle}" on ${new Date(eventStart).toLocaleString()} in your primary Google Calendar?`,
      onConfirm: async () => {
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          await createCalendarEvent(accessToken, eventTitle, eventDesc, startTime, endTime);
          await logWorkspaceAction('Google Calendar', 'CREATE_EVENT', `Scheduled event: ${eventTitle}`);
          setEventTitle('');
          setEventDesc('');
          setEventStart('');
          setStatusMessage('Event scheduled successfully!');
          loadTabData();
        } catch (err: any) {
          setStatusMessage(`Calendar Error: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleFetchForm = async () => {
    if (!formIdInput.trim()) return;
    setLoading(true);
    try {
      const details = await getFormDetails(accessToken, formIdInput.trim());
      setCurrentForm(details);
      const responses = await getFormResponses(accessToken, formIdInput.trim());
      setFormResponses(responses);
      await logWorkspaceAction('Google Forms', 'FETCH_FORM', `Fetched form ID: ${formIdInput}`);
    } catch (err: any) {
      setStatusMessage(`Form Fetch Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#000f21]/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#0b1c30] border border-[#334155] w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#d3e4fe]"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-[#334155] bg-[#102034] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#41e4c0]/10 border border-[#41e4c0]/40 text-[#41e4c0] rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#F8FAFC]">
                Google Workspace & Firebase Hub
              </h2>
              <p className="text-xs text-[#94a3b8] font-mono-caps">
                INTEGRATED ACADEMIC & RESEARCH DATA PIPELINE
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3 bg-[#0b1c30] px-3 py-1.5 rounded border border-[#334155]">
                {user.photoURL && (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                )}
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#F8FAFC]">{user.displayName || user.email}</div>
                  <div className="text-[10px] text-[#41e4c0] font-mono-caps">
                    {accessToken ? 'CONNECTED' : 'TOKEN EXPIRED'}
                  </div>
                </div>
                {!accessToken && (
                  <button
                    onClick={handleSignIn}
                    className="px-2.5 py-1 bg-[#41e4c0] text-[#031427] font-bold text-[11px] rounded font-mono-caps hover:bg-[#38debb] transition-all animate-pulse"
                    title="Authenticate with Google to get active token"
                  >
                    Reconnect Google
                  </button>
                )}
                <button
                  onClick={handleSignOut}
                  title="Sign Out"
                  className="text-[#94a3b8] hover:text-[#ff6b6b] p-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                className="gsi-material-button text-xs py-2 px-4 bg-white text-gray-800 hover:bg-gray-100 rounded font-bold flex items-center gap-2 shadow"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Sign in with Google</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-[#94a3b8] hover:text-[#F8FAFC] p-2 hover:bg-[#102034] rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#102034] border-b border-[#334155] px-6 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'drive', label: 'Drive', icon: HardDrive },
            { id: 'docs', label: 'Docs', icon: FileText },
            { id: 'forms', label: 'Forms', icon: ClipboardList },
            { id: 'gmail', label: 'Gmail', icon: Mail },
            { id: 'tasks', label: 'Tasks', icon: CheckSquare },
            { id: 'contacts', label: 'Contacts', icon: Users },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'activity', label: 'Firestore Logs', icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`py-3 px-4 flex items-center gap-2 text-xs font-mono-caps uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${
                  isActive
                    ? 'border-[#41e4c0] text-[#41e4c0] font-bold bg-[#0b1c30]'
                    : 'border-transparent text-[#94a3b8] hover:text-[#F8FAFC]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Message Banner */}
        {statusMessage && (
          <div className="bg-[#102034] border-b border-[#334155] px-6 py-2.5 text-xs text-[#41e4c0] flex items-center justify-between">
            <span>{statusMessage}</span>
            <button onClick={() => setStatusMessage('')} className="text-[#94a3b8] hover:text-[#F8FAFC]">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {!user ? (
            <div className="text-center py-16 space-y-4">
              <ShieldCheck className="w-12 h-12 text-[#41e4c0] mx-auto opacity-80" />
              <h3 className="text-xl font-bold text-[#F8FAFC]">Sign In Required</h3>
              <p className="text-sm text-[#94a3b8] max-w-md mx-auto">
                Authenticate with your Google Workspace account to read and manage Google Drive, Docs, Forms, Gmail, Tasks, Contacts, and Calendar events directly within the Institute of AI portal.
              </p>
              <button
                onClick={handleSignIn}
                className="px-6 py-3 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded hover:bg-[#38debb] transition-all btn-glow"
              >
                Sign In with Google Workspace
              </button>
            </div>
          ) : (
            <>
              {!accessToken && activeTab !== 'activity' && (
                <div className="bg-[#102034] border border-[#41e4c0]/50 p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#41e4c0] shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold text-[#F8FAFC] font-mono-caps">
                        Active Google OAuth Token Required
                      </h4>
                      <p className="text-[11px] text-[#94a3b8] mt-0.5">
                        For security, OAuth tokens are kept in-memory during active sessions. Re-authenticate to access your real Drive files, Contacts, Gmail, and Calendar events.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignIn}
                    className="px-4 py-2 bg-[#41e4c0] text-[#031427] font-bold text-xs rounded font-mono-caps hover:bg-[#38debb] whitespace-nowrap shrink-0"
                  >
                    Authenticate with Google
                  </button>
                </div>
              )}

              {/* DRIVE TAB */}
              {activeTab === 'drive' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        value={driveSearch}
                        onChange={(e) => setDriveSearch(e.target.value)}
                        placeholder="Search Drive files..."
                        className="w-full bg-[#102034] border border-[#334155] rounded px-4 py-2 text-xs text-[#F8FAFC] focus:border-[#41e4c0] outline-none"
                      />
                    </div>
                    <button
                      onClick={loadTabData}
                      className="px-4 py-2 bg-[#102034] border border-[#334155] hover:border-[#41e4c0] text-xs font-mono-caps text-[#41e4c0] rounded flex items-center gap-2"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      <span>Sync Drive</span>
                    </button>
                  </div>

                  {loading ? (
                    <ListItemSkeleton count={6} />
                  ) : driveFiles.length === 0 ? (
                    <div className="p-8 text-center text-sm text-[#94a3b8] border border-dashed border-[#334155] rounded">
                      No Google Drive files returned for query or account. Click "Sync Drive" to refresh.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {driveFiles.map((file) => (
                        <div
                          key={file.id}
                          className="bg-[#102034] border border-[#334155] rounded p-4 flex items-center justify-between hover:border-[#41e4c0] transition-colors"
                        >
                          <div className="space-y-1 pr-2 overflow-hidden">
                            <div className="text-sm font-bold text-[#F8FAFC] truncate">{file.name}</div>
                            <div className="text-[10px] font-mono-caps text-[#94a3b8] truncate">
                              TYPE: {file.mimeType.split('.').pop()} • ID: {file.id}
                            </div>
                          </div>
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#41e4c0] hover:underline text-xs flex items-center gap-1 font-mono-caps shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DOCS TAB */}
              {activeTab === 'docs' && (
                <div className="space-y-6">
                  <div className="bg-[#102034] border border-[#334155] rounded p-6 space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC] uppercase">
                      Create New AI Research Document
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-[#41e4c0] mb-1 font-mono-caps">
                          DOCUMENT TITLE
                        </label>
                        <input
                          type="text"
                          value={docTitle}
                          onChange={(e) => setDocTitle(e.target.value)}
                          placeholder="e.g. Agentic Workflow Evaluation Framework.docx"
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] focus:border-[#41e4c0] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-[#41e4c0] mb-1 font-mono-caps">
                          INITIAL CONTENT / NOTES
                        </label>
                        <textarea
                          rows={4}
                          value={docContent}
                          onChange={(e) => setDocContent(e.target.value)}
                          placeholder="Insert executive abstract or research findings..."
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] focus:border-[#41e4c0] outline-none"
                        />
                      </div>
                      <button
                        onClick={handleCreateDocClick}
                        disabled={loading || !docTitle.trim()}
                        className="px-5 py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded hover:bg-[#38debb] flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Google Doc</span>
                      </button>
                    </div>
                  </div>

                  {createdDocInfo && (
                    <div className="p-4 bg-[#102034] border border-[#41e4c0] rounded text-xs space-y-1">
                      <div className="font-bold text-[#41e4c0]">Document Created Successfully!</div>
                      <div>Title: {createdDocInfo.title}</div>
                      <div>Document ID: {createdDocInfo.documentId}</div>
                    </div>
                  )}
                </div>
              )}

              {/* FORMS TAB */}
              {activeTab === 'forms' && (
                <div className="space-y-6">
                  <div className="bg-[#102034] border border-[#334155] rounded p-6 space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC] uppercase">
                      Inspect Google Form & Responses
                    </h3>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={formIdInput}
                        onChange={(e) => setFormIdInput(e.target.value)}
                        placeholder="Enter Google Form ID..."
                        className="flex-1 bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] focus:border-[#41e4c0] outline-none"
                      />
                      <button
                        onClick={handleFetchForm}
                        disabled={loading || !formIdInput.trim()}
                        className="px-4 py-2 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded hover:bg-[#38debb]"
                      >
                        Fetch Form
                      </button>
                    </div>
                  </div>

                  {currentForm && (
                    <div className="bg-[#102034] border border-[#334155] rounded p-6 space-y-3">
                      <div className="text-lg font-bold text-[#F8FAFC]">{currentForm.title}</div>
                      {currentForm.description && (
                        <div className="text-xs text-[#94a3b8]">{currentForm.description}</div>
                      )}
                      <div className="text-xs font-mono-caps text-[#41e4c0]">
                        RESPONSES RECEIVED: {formResponses.length}
                      </div>
                      {currentForm.responderUri && (
                        <a
                          href={currentForm.responderUri}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[#41e4c0] hover:underline font-mono-caps"
                        >
                          <span>Open Form URL</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GMAIL TAB */}
              {activeTab === 'gmail' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC]">
                        Gmail Inbox Messages
                      </h3>
                      <button onClick={loadTabData} className="text-xs text-[#41e4c0] hover:underline font-mono-caps">
                        Refresh
                      </button>
                    </div>

                    {loading ? (
                      <ListItemSkeleton count={4} />
                    ) : emails.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#94a3b8] border border-dashed border-[#334155] rounded">
                        No recent Gmail messages found.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                        {emails.map((msg) => (
                          <div key={msg.id} className="bg-[#102034] border border-[#334155] p-3 rounded space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-[#F8FAFC] truncate">{msg.from}</span>
                              <span className="text-[10px] text-[#94a3b8]">{msg.date}</span>
                            </div>
                            <div className="text-xs text-[#41e4c0] font-bold truncate">{msg.subject}</div>
                            <div className="text-[11px] text-[#94a3b8] line-clamp-2">{msg.snippet}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6 bg-[#102034] border border-[#334155] p-6 rounded space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC] uppercase">
                      Compose & Send Email
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">TO EMAIL</label>
                        <input
                          type="email"
                          value={emailTo}
                          onChange={(e) => setEmailTo(e.target.value)}
                          placeholder="recipient@example.com"
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">SUBJECT</label>
                        <input
                          type="text"
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder="Course Admission Inquiry"
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">MESSAGE</label>
                        <textarea
                          rows={4}
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Type payload..."
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <button
                        onClick={handleSendEmailClick}
                        disabled={loading || !emailTo || !emailSubject}
                        className="w-full py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded hover:bg-[#38debb] flex items-center justify-center gap-2"
                      >
                        <Send className="w-4 h-4" />
                        <span>Send Email via Gmail</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TASKS TAB */}
              {activeTab === 'tasks' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC]">Active Google Tasks</h3>
                    {loading ? (
                      <ListItemSkeleton count={4} />
                    ) : tasks.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#94a3b8] border border-dashed border-[#334155] rounded">
                        No tasks found in Google Tasks.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="bg-[#102034] border border-[#334155] p-3 rounded flex items-start gap-3"
                          >
                            <CheckSquare className={`w-4 h-4 mt-0.5 ${task.status === 'completed' ? 'text-[#41e4c0]' : 'text-[#94a3b8]'}`} />
                            <div>
                              <div className={`text-xs font-bold ${task.status === 'completed' ? 'line-through text-[#94a3b8]' : 'text-[#F8FAFC]'}`}>
                                {task.title}
                              </div>
                              {task.notes && <div className="text-[11px] text-[#94a3b8] mt-1">{task.notes}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6 bg-[#102034] border border-[#334155] p-6 rounded space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC] uppercase">Add Google Task</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">TASK TITLE</label>
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="e.g. Complete Lab 3: Multimodal Prompts"
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">NOTES</label>
                        <textarea
                          rows={3}
                          value={newTaskNotes}
                          onChange={(e) => setNewTaskNotes(e.target.value)}
                          placeholder="Task details or target milestones..."
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <button
                        onClick={handleCreateTaskClick}
                        disabled={loading || !newTaskTitle.trim()}
                        className="w-full py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded hover:bg-[#38debb] flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add to Google Tasks</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACTS TAB */}
              {activeTab === 'contacts' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC]">Google Contacts Connections</h3>
                    <button onClick={loadTabData} className="text-xs text-[#41e4c0] hover:underline font-mono-caps">
                      Refresh Contacts
                    </button>
                  </div>

                  {loading ? (
                    <ListItemSkeleton count={6} />
                  ) : contacts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94a3b8] border border-dashed border-[#334155] rounded">
                      No Google Contacts retrieved. Ensure contacts exist in your account.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {contacts.map((c, i) => (
                        <div key={i} className="bg-[#102034] border border-[#334155] rounded p-4 flex items-center gap-3">
                          {c.photoUrl ? (
                            <img src={c.photoUrl} alt={c.name} className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#0b1c30] border border-[#334155] flex items-center justify-center text-[#41e4c0] font-bold text-sm">
                              {c.name ? c.name[0] : 'C'}
                            </div>
                          )}
                          <div className="overflow-hidden">
                            <div className="text-xs font-bold text-[#F8FAFC] truncate">{c.name}</div>
                            <div className="text-[11px] text-[#41e4c0] truncate">{c.email}</div>
                            <div className="text-[10px] text-[#94a3b8] truncate">{c.organization}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CALENDAR TAB */}
              {activeTab === 'calendar' && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-6 space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC]">Upcoming Google Calendar Events</h3>
                    {loading ? (
                      <ListItemSkeleton count={4} />
                    ) : calendarEvents.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#94a3b8] border border-dashed border-[#334155] rounded">
                        No upcoming calendar events found.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[360px] overflow-y-auto">
                        {calendarEvents.map((ev) => (
                          <div key={ev.id} className="bg-[#102034] border border-[#334155] p-3 rounded space-y-1">
                            <div className="text-xs font-bold text-[#F8FAFC]">{ev.summary}</div>
                            <div className="text-[10px] text-[#41e4c0] font-mono-caps">
                              START: {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString() : ev.start?.date}
                            </div>
                            {ev.description && <div className="text-[11px] text-[#94a3b8]">{ev.description}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-6 bg-[#102034] border border-[#334155] p-6 rounded space-y-4">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC] uppercase">
                      Schedule Academic Event
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">EVENT TITLE</label>
                        <input
                          type="text"
                          value={eventTitle}
                          onChange={(e) => setEventTitle(e.target.value)}
                          placeholder="e.g. AI Ethics Seminar Consultation"
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">START DATE & TIME</label>
                        <input
                          type="datetime-local"
                          value={eventStart}
                          onChange={(e) => setEventStart(e.target.value)}
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-[#41e4c0] mb-1 font-mono-caps">DESCRIPTION</label>
                        <textarea
                          rows={2}
                          value={eventDesc}
                          onChange={(e) => setEventDesc(e.target.value)}
                          placeholder="Agenda details..."
                          className="w-full bg-[#0b1c30] border border-[#334155] rounded px-3 py-2 text-xs text-[#F8FAFC] outline-none focus:border-[#41e4c0]"
                        />
                      </div>
                      <button
                        onClick={handleCreateCalendarEventClick}
                        disabled={loading || !eventTitle || !eventStart}
                        className="w-full py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded hover:bg-[#38debb] flex items-center justify-center gap-2"
                      >
                        <CalendarIcon className="w-4 h-4" />
                        <span>Schedule on Google Calendar</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* FIRESTORE LOGS TAB */}
              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold font-mono-caps text-[#F8FAFC]">
                      Firestore Workspace Activity Records
                    </h3>
                    <button onClick={loadFirestoreLogs} className="text-xs text-[#41e4c0] hover:underline font-mono-caps">
                      Refresh Logs
                    </button>
                  </div>

                  {loading ? (
                    <ListItemSkeleton count={5} />
                  ) : activityLogs.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#94a3b8] border border-dashed border-[#334155] rounded">
                      No persistent activity logs recorded in Firestore yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {activityLogs.map((log) => (
                        <div key={log.id} className="bg-[#102034] border border-[#334155] p-3 rounded text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-[#41e4c0] font-mono-caps">{log.service}</span>
                            <span className="text-[#94a3b8] mx-2">•</span>
                            <span className="text-[#F8FAFC] font-bold">{log.action}</span>
                            <div className="text-[#94a3b8] text-[11px] mt-0.5">{log.details}</div>
                          </div>
                          <div className="text-[10px] font-mono-caps text-[#94a3b8]">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>

      {/* Confirmation Dialog Modal */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1c30] border border-[#41e4c0] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-[#41e4c0]">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-base font-bold text-[#F8FAFC]">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-[#94a3b8] leading-relaxed">
              {confirmDialog.description}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-[#102034] text-[#94a3b8] hover:text-[#F8FAFC] rounded text-xs font-mono-caps"
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 bg-[#41e4c0] text-[#031427] font-bold rounded text-xs font-mono-caps hover:bg-[#38debb]"
              >
                Confirm Operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
