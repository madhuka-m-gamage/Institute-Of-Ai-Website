import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
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
  HardDrive,
  FileText,
  ClipboardList,
  Mail,
  CheckSquare,
  Users,
  Calendar as CalendarIcon,
  Send,
  Plus,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Search,
  Clock
} from 'lucide-react';
import { ListItemSkeleton } from './Skeleton';

interface WorkspaceAdminPanelProps {
  user: User;
  accessToken: string;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

type TabType = 'drive' | 'docs' | 'forms' | 'gmail' | 'tasks' | 'contacts' | 'calendar';

export const WorkspaceAdminPanel: React.FC<WorkspaceAdminPanelProps> = ({
  user,
  accessToken,
  onAddToast,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('drive');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // 1. Google Drive State
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [driveSearch, setDriveSearch] = useState('');

  // 2. Google Docs State
  const [docTitle, setDocTitle] = useState('');
  const [docContent, setDocContent] = useState('');
  const [createdDocInfo, setCreatedDocInfo] = useState<{ documentId: string; title: string } | null>(null);

  // 3. Google Forms State
  const [formIdInput, setFormIdInput] = useState('');
  const [currentForm, setCurrentForm] = useState<FormItem | null>(null);
  const [formResponses, setFormResponses] = useState<any[]>([]);

  // 4. Gmail State
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // 5. Google Tasks State
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');

  // 6. Google Contacts State
  const [contacts, setContacts] = useState<ContactPerson[]>([]);

  // 7. Google Calendar State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>([]);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStart, setEventStart] = useState('');

  const loadTabData = async () => {
    if (!accessToken) {
      setStatusMessage('Workspace access token missing. Please re-authenticate.');
      return;
    }

    setLoading(true);
    setStatusMessage(`Connecting to Google ${activeTab.toUpperCase()} API...`);

    try {
      if (activeTab === 'drive') {
        const files = await listDriveFiles(accessToken, driveSearch);
        setDriveFiles(files);
        setStatusMessage(`Loaded ${files.length} Google Drive files.`);
      } else if (activeTab === 'gmail') {
        const msgs = await listGmailMessages(accessToken);
        setEmails(msgs);
        setStatusMessage(`Loaded ${msgs.length} recent Gmail threads.`);
      } else if (activeTab === 'tasks') {
        const tList = await listGoogleTasks(accessToken);
        setTasks(tList);
        setStatusMessage(`Loaded ${tList.length} Google Tasks.`);
      } else if (activeTab === 'contacts') {
        const cList = await listGoogleContacts(accessToken);
        setContacts(cList);
        setStatusMessage(`Loaded ${cList.length} Google Contacts.`);
      } else if (activeTab === 'calendar') {
        const evList = await listCalendarEvents(accessToken);
        setCalendarEvents(evList);
        setStatusMessage(`Loaded ${evList.length} Google Calendar events.`);
      }
    } catch (err: any) {
      console.warn(`Workspace API Error (${activeTab}):`, err);
      setStatusMessage(err.message || `Could not fetch ${activeTab} data.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab, accessToken]);

  const handleCreateDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle) return;
    setLoading(true);
    try {
      const res = await createGoogleDoc(accessToken, docTitle, docContent);
      setCreatedDocInfo(res);
      setDocTitle('');
      setDocContent('');
      if (onAddToast) onAddToast('Google Doc Created', `Document "${res.title}" created in Google Drive.`, 'success');
      setStatusMessage(`Google Doc created with ID: ${res.documentId}`);
    } catch (err: any) {
      if (onAddToast) onAddToast('Google Doc Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo || !emailSubject || !emailBody) return;
    setIsSendingEmail(true);
    try {
      await sendGmailMessage(accessToken, emailTo, emailSubject, emailBody);
      setEmailTo('');
      setEmailSubject('');
      setEmailBody('');
      if (onAddToast) onAddToast('Gmail Sent', `Notification dispatched to ${emailTo}`, 'success');
      loadTabData();
    } catch (err: any) {
      if (onAddToast) onAddToast('Gmail Dispatch Failed', err.message, 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;
    setLoading(true);
    try {
      await createGoogleTask(accessToken, newTaskTitle, newTaskNotes);
      setNewTaskTitle('');
      setNewTaskNotes('');
      if (onAddToast) onAddToast('Google Task Created', `Task added to your list.`, 'success');
      loadTabData();
    } catch (err: any) {
      if (onAddToast) onAddToast('Task Creation Failed', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCalendarEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventStart) return;
    setLoading(true);
    try {
      const endDateTime = new Date(new Date(eventStart).getTime() + 60 * 60 * 1000).toISOString();
      await createCalendarEvent(accessToken, eventTitle, eventDesc, new Date(eventStart).toISOString(), endDateTime);
      setEventTitle('');
      setEventDesc('');
      setEventStart('');
      if (onAddToast) onAddToast('Calendar Event Scheduled', `Added "${eventTitle}" to Google Calendar.`, 'success');
      loadTabData();
    } catch (err: any) {
      if (onAddToast) onAddToast('Calendar Error', err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Hub Header */}
      <div className="p-6 rounded-2xl bg-[#00172e] border border-[#41e4c0]/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
              <Building2 className="w-3.5 h-3.5" />
              <span>Google Workspace Institutional Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Integrated Cloud Productivity & Communications
            </h2>
            <p className="text-xs text-[#94a3b8]">
              Manage live Google Drive curriculum assets, dispatch official Gmail notifications, sync Google Calendar cohort schedules, and manage Google Docs syllabi.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={loadTabData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-[#102034] hover:bg-[#162a42] border border-[#41e4c0]/40 text-[#41e4c0] text-xs font-mono-caps flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync {activeTab.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Service Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <button
          onClick={() => setActiveTab('drive')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'drive'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <HardDrive className={`w-4 h-4 mb-1.5 ${activeTab === 'drive' ? 'text-[#41e4c0]' : 'text-amber-400'}`} />
          <div className="font-bold text-xs">Drive</div>
          <div className="text-[10px] text-[#64748b]">Curriculum Files</div>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'docs'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <FileText className={`w-4 h-4 mb-1.5 ${activeTab === 'docs' ? 'text-[#41e4c0]' : 'text-cyan-400'}`} />
          <div className="font-bold text-xs">Docs</div>
          <div className="text-[10px] text-[#64748b]">Syllabus Editor</div>
        </button>

        <button
          onClick={() => setActiveTab('gmail')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'gmail'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <Mail className={`w-4 h-4 mb-1.5 ${activeTab === 'gmail' ? 'text-[#41e4c0]' : 'text-red-400'}`} />
          <div className="font-bold text-xs">Gmail</div>
          <div className="text-[10px] text-[#64748b]">Admissions Mail</div>
        </button>

        <button
          onClick={() => setActiveTab('calendar')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'calendar'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <CalendarIcon className={`w-4 h-4 mb-1.5 ${activeTab === 'calendar' ? 'text-[#41e4c0]' : 'text-blue-400'}`} />
          <div className="font-bold text-xs">Calendar</div>
          <div className="text-[10px] text-[#64748b]">Cohort Labs</div>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <CheckSquare className={`w-4 h-4 mb-1.5 ${activeTab === 'tasks' ? 'text-[#41e4c0]' : 'text-emerald-400'}`} />
          <div className="font-bold text-xs">Tasks</div>
          <div className="text-[10px] text-[#64748b]">Review Queues</div>
        </button>

        <button
          onClick={() => setActiveTab('contacts')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'contacts'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <Users className={`w-4 h-4 mb-1.5 ${activeTab === 'contacts' ? 'text-[#41e4c0]' : 'text-purple-400'}`} />
          <div className="font-bold text-xs">Contacts</div>
          <div className="text-[10px] text-[#64748b]">Staff & Mentors</div>
        </button>

        <button
          onClick={() => setActiveTab('forms')}
          className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
            activeTab === 'forms'
              ? 'bg-[#102034] border-[#41e4c0] text-white shadow-lg shadow-[#41e4c0]/10'
              : 'bg-[#00172e]/60 border-[#44474d]/30 text-[#94a3b8] hover:border-[#44474d]'
          }`}
        >
          <ClipboardList className={`w-4 h-4 mb-1.5 ${activeTab === 'forms' ? 'text-[#41e4c0]' : 'text-indigo-400'}`} />
          <div className="font-bold text-xs">Forms</div>
          <div className="text-[10px] text-[#64748b]">Surveys & Polls</div>
        </button>
      </div>

      {/* Main Service Content Area */}
      <div className="p-6 rounded-2xl bg-[#00172e]/70 border border-[#44474d]/30 min-h-[360px]">
        {/* Status Bar */}
        <div className="pb-4 mb-4 border-b border-[#44474d]/20 flex items-center justify-between text-xs text-[#94a3b8]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-pulse" />
            <span className="font-mono text-[#d3e4fe]">{statusMessage || `Active: ${activeTab.toUpperCase()}`}</span>
          </div>
          <span className="font-mono text-[11px] text-[#64748b]">OAuth2.0 Token Authenticated</span>
        </div>

        {/* 1. DRIVE TAB */}
        {activeTab === 'drive' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search files in Google Drive..."
                  value={driveSearch}
                  onChange={(e) => setDriveSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadTabData()}
                  className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>
              <button
                onClick={loadTabData}
                className="px-4 py-2 rounded-xl bg-[#102034] hover:bg-[#162a42] border border-[#41e4c0]/40 text-[#41e4c0] text-xs font-mono-caps transition-colors"
              >
                Search Drive
              </button>
            </div>

            {loading ? (
              <div className="space-y-2">
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="py-12 text-center text-[#94a3b8] text-xs">
                No files found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-[#44474d]/20 max-h-[400px] overflow-y-auto">
                {driveFiles.map((file) => (
                  <div key={file.id} className="py-3 flex items-center justify-between gap-3 hover:bg-[#102034]/30 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-xs font-bold text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-[#64748b] font-mono truncate">{file.mimeType}</div>
                      </div>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-[#102034] text-[#41e4c0] text-xs font-mono flex items-center gap-1 hover:bg-[#162a42] shrink-0"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. DOCS TAB */}
        {activeTab === 'docs' && (
          <div className="space-y-6 max-w-2xl">
            {/* Quick Curriculum & Proposal Templates */}
            <div className="space-y-2.5">
              <span className="text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider block">
                Quick Document Templates
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDocTitle('IOAI - Advanced Multi-Agent Systems Cohort Syllabus');
                    setDocContent(
                      'INSTITUTE OF AI - CURRICULUM SYLLABUS\nTrack: Multi-Agent LLM Systems\n\nModule 1: LangGraph State Graphs\nModule 2: Tool Calling & Sandboxing\nModule 3: Production Evaluation & Tracing\n\nPrerequisites: Python 3.10+, Asyncio'
                    );
                  }}
                  className="p-3 rounded-xl bg-[#000f21] hover:bg-[#102034] border border-[#334155] hover:border-[#41e4c0]/40 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">Syllabus Template</div>
                  <div className="text-[10px] text-[#94a3b8]">Cohort Course Outline</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocTitle('IOAI - Enterprise AI Readiness & Upskilling Proposal');
                    setDocContent(
                      'INSTITUTE OF AI - BESPOKE ENTERPRISE PROPOSAL\nClient: [Organization Name]\nExecutive Sponsor: [Name / Title]\n\n1. Executive Summary\n2. 4-Phase Implementation Scope\n3. Sandbox Architecture & GPU Labs\n4. Deliverables & Commercial Terms'
                    );
                  }}
                  className="p-3 rounded-xl bg-[#000f21] hover:bg-[#102034] border border-[#334155] hover:border-[#41e4c0]/40 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">Enterprise Proposal</div>
                  <div className="text-[10px] text-[#94a3b8]">Custom Team Scope</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDocTitle('IOAI - Practitioner Capstone Evaluation Rubric');
                    setDocContent(
                      'INSTITUTE OF AI - CAPSTONE EVALUATION RUBRIC\nStudent Name: [Candidate]\nProgram: AI Master Practitioner\n\nCriteria:\n1. Neural Architecture Design (25%)\n2. Agent Reliability & Guardrails (25%)\n3. Benchmark Latency & Compute (25%)\n4. Code Quality & Defense (25%)'
                    );
                  }}
                  className="p-3 rounded-xl bg-[#000f21] hover:bg-[#102034] border border-[#334155] hover:border-[#41e4c0]/40 text-left transition-all cursor-pointer"
                >
                  <div className="text-xs font-bold text-white">Evaluation Rubric</div>
                  <div className="text-[10px] text-[#94a3b8]">Capstone Grading</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateDoc} className="space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Create New Google Document</span>
              </h3>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IOAI AI Practitioner Cohort 4 Syllabus"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">
                  Initial Content / Outline
                </label>
                <textarea
                  rows={5}
                  placeholder="Enter syllabus modules or institutional briefing notes..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0] resize-none font-mono"
                />
              </div>

              {createdDocInfo && (
                <div className="p-3.5 rounded-xl bg-[#102034] border border-[#41e4c0]/40 flex items-center justify-between text-xs">
                  <span className="text-[#41e4c0] font-bold">Document "{createdDocInfo.title}" generated!</span>
                  <a
                    href={`https://docs.google.com/document/d/${createdDocInfo.documentId}/edit`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#41e4c0] underline flex items-center gap-1 font-mono"
                  >
                    <span>Open in Google Docs</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Create Google Doc in Drive</span>
              </button>
            </form>
          </div>
        )}

        {/* 3. GMAIL TAB */}
        {activeTab === 'gmail' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleSendEmail} className="space-y-3.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-red-400" />
                <span>Send Official Admissions Email</span>
              </h3>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">To Email</label>
                <input
                  type="email"
                  required
                  placeholder="applicant@example.com"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Subject</label>
                <input
                  type="text"
                  required
                  placeholder="[Institute Of AI] Application Status & Interview Slot"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Message Body</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter message..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSendingEmail}
                className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <span>{isSendingEmail ? 'Sending...' : 'Dispatch Gmail Message'}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-400" />
                <span>Recent Inbox Messages</span>
              </h3>

              {loading ? (
                <div className="space-y-2">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : emails.length === 0 ? (
                <div className="py-8 text-center text-[#94a3b8] text-xs">No recent messages loaded.</div>
              ) : (
                <div className="divide-y divide-[#44474d]/20 max-h-[300px] overflow-y-auto space-y-1">
                  {emails.map((msg) => (
                    <div key={msg.id} className="py-2.5 px-2 hover:bg-[#102034]/30 rounded-lg">
                      <div className="text-xs font-bold text-white truncate">{msg.subject || 'No Subject'}</div>
                      <div className="text-[11px] text-[#41e4c0] truncate">{msg.from}</div>
                      <div className="text-[10px] text-[#94a3b8] truncate">{msg.snippet}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. CALENDAR TAB */}
        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleCreateCalendarEvent} className="space-y-3.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-400" />
                <span>Schedule Live Cohort Session</span>
              </h3>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Weekend Lab 4: LangGraph Multi-Agent Workflows"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={eventStart}
                  onChange={(e) => setEventStart(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Description / Meet Link</label>
                <textarea
                  rows={2}
                  placeholder="Live interactive laboratory on autonomous graph systems..."
                  value={eventDesc}
                  onChange={(e) => setEventDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add to Google Calendar</span>
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Scheduled Events</span>
              </h3>

              {loading ? (
                <div className="space-y-2">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : calendarEvents.length === 0 ? (
                <div className="py-8 text-center text-[#94a3b8] text-xs">No upcoming events found.</div>
              ) : (
                <div className="divide-y divide-[#44474d]/20 max-h-[300px] overflow-y-auto space-y-1">
                  {calendarEvents.map((ev) => (
                    <div key={ev.id} className="py-2.5 px-2 hover:bg-[#102034]/30 rounded-lg">
                      <div className="text-xs font-bold text-white">{ev.summary}</div>
                      <div className="text-[11px] text-[#41e4c0] font-mono">
                        {ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleString() : ev.start?.date}
                      </div>
                      {ev.description && <div className="text-[10px] text-[#94a3b8] truncate">{ev.description}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Create Institutional Action Item</span>
              </h3>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Review Week 2 Student LangGraph Submissions"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Notes / Action Details</label>
                <textarea
                  rows={3}
                  placeholder="Assigned mentor checklist..."
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0] resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Google Tasks</span>
              </button>
            </form>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Active Google Tasks</span>
              </h3>

              {loading ? (
                <div className="space-y-2">
                  <ListItemSkeleton />
                  <ListItemSkeleton />
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center text-[#94a3b8] text-xs">No pending tasks.</div>
              ) : (
                <div className="divide-y divide-[#44474d]/20 max-h-[300px] overflow-y-auto space-y-1">
                  {tasks.map((task) => (
                    <div key={task.id} className="py-2.5 px-2 hover:bg-[#102034]/30 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">{task.title}</div>
                        {task.notes && <div className="text-[10px] text-[#94a3b8]">{task.notes}</div>}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#102034] text-[#41e4c0]">
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Google Contacts (Faculty & Mentors)</span>
            </h3>

            {loading ? (
              <div className="space-y-2">
                <ListItemSkeleton />
                <ListItemSkeleton />
              </div>
            ) : contacts.length === 0 ? (
              <div className="py-8 text-center text-[#94a3b8] text-xs">No contacts loaded.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {contacts.map((contact, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#000f21] border border-[#44474d]/30 flex items-center gap-3">
                    {contact.photoUrl ? (
                      <img src={contact.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#102034] text-[#41e4c0] flex items-center justify-center font-bold text-xs">
                        {contact.name?.charAt(0) || 'C'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{contact.name || 'Unnamed Contact'}</div>
                      <div className="text-[11px] text-[#94a3b8] truncate">{contact.email || 'No email'}</div>
                      {contact.organization && <div className="text-[10px] text-[#41e4c0] truncate">{contact.organization}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. FORMS TAB */}
        {activeTab === 'forms' && (
          <div className="space-y-4 max-w-lg">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-indigo-400" />
              <span>Google Forms Evaluator</span>
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Connect a Google Form ID to view real-time participant survey responses and workshop feedback metrics.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Google Form ID..."
                value={formIdInput}
                onChange={(e) => setFormIdInput(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!formIdInput) return;
                  setLoading(true);
                  try {
                    const f = await getFormDetails(accessToken, formIdInput);
                    setCurrentForm(f);
                    const r = await getFormResponses(accessToken, formIdInput);
                    setFormResponses(r);
                    setStatusMessage(`Loaded form: ${f.title}`);
                  } catch (e: any) {
                    if (onAddToast) onAddToast('Form Load Error', e.message, 'error');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[#41e4c0] text-[#031427] font-bold text-xs cursor-pointer"
              >
                Inspect
              </button>
            </div>

            {currentForm && (
              <div className="p-4 rounded-xl bg-[#000f21] border border-[#41e4c0]/30 space-y-2">
                <div className="text-xs font-bold text-white">{currentForm.title}</div>
                <div className="text-[11px] text-[#94a3b8]">Total Responses: {formResponses.length}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
