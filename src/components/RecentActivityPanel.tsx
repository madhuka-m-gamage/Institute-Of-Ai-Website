import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { StudentApplication, ApplicationStatus, getCandidateName, getApplicationTimestamp } from '../types';
import { StatusBadge } from './StatusBadge';
import { ListItemSkeleton } from '../ui/Skeleton';
import {
  Activity,
  History,
  Mail,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  RefreshCw,
  Send,
  Layers,
  ArrowRight,
  User,
  Paperclip,
  Download,
  Calendar,
  ExternalLink,
  ChevronRight,
  Sparkles,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  Eye,
  CheckSquare,
  X,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  activityType: 'status_change' | 'email_sent' | 'decision_letter' | 'bulk_status' | 'bulk_email' | 'workflow_enrollment' | 'export' | 'general';
  candidateName?: string;
  candidateEmail?: string;
  courseTitle?: string;
  previousStatus?: ApplicationStatus;
  newStatus?: ApplicationStatus;
  subject?: string;
  attachments?: string[];
  recipientCount?: number;
}

interface RecentActivityPanelProps {
  applications: StudentApplication[];
  onSelectApplication?: (app: StudentApplication) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
  currentAdminEmail?: string;
  compact?: boolean;
}

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = ({
  applications,
  onSelectApplication,
  onAddToast,
  currentAdminEmail = 'admin@instituteofai.com',
  compact = false,
}) => {
  const [rawAuditLogs, setRawAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '24h' | '7d' | '30d'>('all');
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<ActivityEvent | null>(null);

  // Subscribe to real-time audit logs from Firestore
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(100));

    const unsubscribeAudit = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
        setRawAuditLogs(docs);
        setLoading(false);
      },
      (err) => {
        console.warn('Realtime audit logs subscription notice:', err);
        // Fallback one-time fetch
        getDocs(q)
          .then((snap) => {
            setRawAuditLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
          })
          .catch((fetchErr) => {
            console.warn('Fallback fetch warning:', fetchErr);
          })
          .finally(() => setLoading(false));
      }
    );

    return () => {
      unsubscribeAudit();
    };
  }, []);

  // Parse and normalize raw logs into standardized ActivityEvent models
  const allEvents: ActivityEvent[] = useMemo(() => {
    const events: ActivityEvent[] = [];

    // 1. Parse Firestore Audit Logs
    rawAuditLogs.forEach((log) => {
      const actionLower = (log.action || '').toLowerCase();
      const detailsLower = (log.details || '').toLowerCase();

      let detectedType: ActivityEvent['activityType'] = log.activityType || 'general';
      let candidateName = log.candidateName;
      let candidateEmail = log.candidateEmail;
      let courseTitle = log.courseTitle;
      let newStatus: ApplicationStatus | undefined = log.newStatus;
      let subject = log.subject;
      let attachments: string[] = log.attachments || [];

      // Detect activity type if not stored explicitly
      if (!log.activityType) {
        if (actionLower.includes('decision') || actionLower.includes('dispatched')) {
          detectedType = 'decision_letter';
        } else if (actionLower.includes('mass email') || actionLower.includes('bulk email')) {
          detectedType = 'bulk_email';
        } else if (actionLower.includes('bulk status')) {
          detectedType = 'bulk_status';
        } else if (actionLower.includes('status') || actionLower.includes('marked as') || actionLower.includes('applicant status')) {
          detectedType = 'status_change';
        } else if (actionLower.includes('csv') || actionLower.includes('export')) {
          detectedType = 'export';
        } else if (log.entityType === 'application') {
          detectedType = 'status_change';
        }
      }

      // Infer candidate info from details if missing
      if (!candidateEmail) {
        const emailMatch = (log.details || log.action || '').match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) candidateEmail = emailMatch[0];
      }

      if (!candidateName && candidateEmail) {
        const appMatch = applications.find(
          (a) => (a.email || '').toLowerCase() === candidateEmail?.toLowerCase()
        );
        if (appMatch) {
          candidateName = getCandidateName(appMatch);
          if (!courseTitle) courseTitle = appMatch.courseTitle || (appMatch as any).courseName;
        }
      }

      if (!courseTitle && log.entityId) {
        const appMatch = applications.find((a) => a.id === log.entityId);
        if (appMatch) {
          if (!candidateName) candidateName = getCandidateName(appMatch);
          courseTitle = appMatch.courseTitle || (appMatch as any).courseName;
        }
      }

      // Detect status from action
      if (!newStatus) {
        if (actionLower.includes('accepted')) newStatus = 'accepted';
        else if (actionLower.includes('under review') || actionLower.includes('under_review')) newStatus = 'under_review';
        else if (actionLower.includes('waitlisted')) newStatus = 'waitlisted';
        else if (actionLower.includes('rejected') || actionLower.includes('declined')) newStatus = 'rejected';
        else if (actionLower.includes('submitted') || actionLower.includes('pending')) newStatus = 'submitted';
      }

      // Detect attachments
      if (attachments.length === 0 && (log.details || '').includes('Attached:')) {
        const attStr = log.details.split('Attached:')[1]?.split('.')[0];
        if (attStr && !attStr.toLowerCase().includes('none')) {
          attachments = attStr.split(',').map((s: string) => s.trim());
        }
      }

      events.push({
        id: log.id,
        timestamp: log.timestamp ? new Date(getApplicationTimestamp(log)).toISOString() : new Date().toISOString(),
        actorEmail: log.actorEmail || 'admin@instituteofai.com',
        action: log.action || 'Administrative Event',
        entityType: log.entityType || 'application',
        entityId: log.entityId,
        details: log.details || '',
        activityType: detectedType,
        candidateName,
        candidateEmail,
        courseTitle,
        newStatus,
        subject,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
    });

    // 3. Synthesize candidate status and decision records from applications directly if audit is empty
    if (events.length === 0) {
      applications.forEach((app) => {
        const name = getCandidateName(app);
        if (app.decisionLetterSent && app.lastDecisionEmailAt) {
          events.push({
            id: `app-dec-${app.id}`,
            timestamp: app.lastDecisionEmailAt,
            actorEmail: app.reviewedBy || 'admissions@instituteofai.com',
            action: `Dispatched ${(app.lastDecisionStatus || app.status || 'ACCEPTED').toUpperCase()} Decision Letter`,
            entityType: 'application',
            entityId: app.id,
            details: `Official decision letter email dispatched to ${name} <${app.email}> for ${app.courseTitle}. Enclosures: ${app.lastAttachedFiles?.join(', ') || 'Standard Curriculum'}.`,
            activityType: 'decision_letter',
            candidateName: name,
            candidateEmail: app.email,
            courseTitle: app.courseTitle || (app as any).courseName,
            newStatus: app.lastDecisionStatus || app.status,
            attachments: app.lastAttachedFiles,
          });
        }

        if (app.reviewedAt && app.status && app.status !== 'submitted') {
          events.push({
            id: `app-rev-${app.id}`,
            timestamp: app.reviewedAt,
            actorEmail: app.reviewedBy || 'admissions@instituteofai.com',
            action: `Admissions Review: Status Updated to ${app.status.toUpperCase()}`,
            entityType: 'application',
            entityId: app.id,
            details: `Candidate ${name} evaluated for ${app.courseTitle}. Internal notes: ${app.notes || 'Evaluation criteria satisfied.'}`,
            activityType: 'status_change',
            candidateName: name,
            candidateEmail: app.email,
            courseTitle: app.courseTitle || (app as any).courseName,
            newStatus: app.status,
          });
        }
      });
    }

    // Sort descending by timestamp
    return events.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
    });
  }, [rawAuditLogs, applications]);

  // Filtered Events
  const filteredEvents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const now = Date.now();

    return allEvents.filter((ev) => {
      // 1. Text search
      if (q) {
        const text = `${ev.action} ${ev.details} ${ev.candidateName || ''} ${ev.candidateEmail || ''} ${ev.courseTitle || ''} ${ev.actorEmail}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // 2. Type filter
      if (typeFilter !== 'all') {
        if (typeFilter === 'status' && ev.activityType !== 'status_change' && ev.activityType !== 'bulk_status') return false;
        if (typeFilter === 'email' && ev.activityType !== 'decision_letter' && ev.activityType !== 'bulk_email' && ev.activityType !== 'workflow_enrollment') return false;
        if (typeFilter === 'decision' && ev.activityType !== 'decision_letter') return false;
        if (typeFilter === 'bulk' && ev.activityType !== 'bulk_status' && ev.activityType !== 'bulk_email') return false;
      }

      // 3. Date recency filter
      if (dateFilter !== 'all') {
        const evTime = new Date(ev.timestamp).getTime();
        if (!evTime) return true;

        if (dateFilter === 'today') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (evTime < todayStart.getTime()) return false;
        } else if (dateFilter === '24h') {
          if (now - evTime > 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === '7d') {
          if (now - evTime > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === '30d') {
          if (now - evTime > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [allEvents, searchQuery, typeFilter, dateFilter]);

  // Quick Metrics
  const metrics = useMemo(() => {
    let statusChanges = 0;
    let emailsSent = 0;
    let bulkOps = 0;
    let todayCount = 0;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    allEvents.forEach((e) => {
      if (e.activityType === 'status_change' || e.activityType === 'bulk_status') statusChanges++;
      if (e.activityType === 'decision_letter' || e.activityType === 'bulk_email' || e.activityType === 'workflow_enrollment') emailsSent++;
      if (e.activityType === 'bulk_status' || e.activityType === 'bulk_email') bulkOps++;

      const t = new Date(e.timestamp).getTime();
      if (t >= todayStart.getTime()) todayCount++;
    });

    return {
      total: allEvents.length,
      statusChanges,
      emailsSent,
      bulkOps,
      todayCount,
    };
  }, [allEvents]);

  const handleOpenCandidateModal = (event: ActivityEvent) => {
    if (!onSelectApplication) return;

    let targetApp: StudentApplication | undefined;

    if (event.entityId) {
      targetApp = applications.find((a) => a.id === event.entityId);
    }
    if (!targetApp && event.candidateEmail) {
      targetApp = applications.find(
        (a) => (a.email || '').toLowerCase() === event.candidateEmail?.toLowerCase()
      );
    }

    if (targetApp) {
      onSelectApplication(targetApp);
    } else if (onAddToast) {
      onAddToast('Candidate Dossier', `Candidate ${event.candidateName || event.candidateEmail} details loaded.`, 'info');
    }
  };

  // Helper to render activity badge icon
  const renderActivityIcon = (type: ActivityEvent['activityType'], status?: ApplicationStatus) => {
    switch (type) {
      case 'decision_letter':
        return (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
            <Mail className="w-4 h-4" />
          </div>
        );
      case 'bulk_email':
        return (
          <div className="p-2.5 rounded-xl bg-[#41e4c0]/15 border border-[#41e4c0]/40 text-[#41e4c0] shrink-0">
            <Send className="w-4 h-4" />
          </div>
        );
      case 'bulk_status':
        return (
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        );
      case 'status_change':
        if (status === 'accepted') {
          return (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          );
        }
        return (
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        );
      case 'workflow_enrollment':
        return (
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
        );
      case 'export':
        return (
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="p-2.5 rounded-xl bg-[#0b1c30] border border-[#334155] text-[#41e4c0] shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner & Real-time Status */}
      <div className="p-5 rounded-2xl bg-[#00172e] border border-[#44474d]/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/30 text-[10px] font-mono-caps text-[#41e4c0] uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-pulse" />
            <span>Admissions Audit & Activity Feed</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            Admissions Operations & Decision Timeline
          </h2>
          <p className="text-xs text-[#94a3b8]">
            Real-time audit log tracking candidate status adjustments, Gmail API decision letters, mass email dispatches, and onboarding milestones.
          </p>
        </div>

        {/* Top Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 font-mono">
          <div className="px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#334155] text-center">
            <div className="text-[10px] text-[#94a3b8] uppercase font-mono-caps">Total Events</div>
            <div className="text-base font-bold text-white">{metrics.total}</div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#334155] text-center">
            <div className="text-[10px] text-emerald-400 uppercase font-mono-caps">Emails Sent</div>
            <div className="text-base font-bold text-[#41e4c0]">{metrics.emailsSent}</div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#334155] text-center">
            <div className="text-[10px] text-sky-400 uppercase font-mono-caps">Status Updates</div>
            <div className="text-base font-bold text-sky-300">{metrics.statusChanges}</div>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#334155] text-center">
            <div className="text-[10px] text-amber-400 uppercase font-mono-caps">Today</div>
            <div className="text-base font-bold text-amber-300">{metrics.todayCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#00172e] border border-[#44474d]/40 space-y-3.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#41e4c0] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search activity by candidate name, email, action, admin actor, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-sm text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#41e4c0] focus:ring-1 focus:ring-[#41e4c0]/50 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white p-1 rounded-md transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Event Category Filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40">
              <Filter className="w-3.5 h-3.5 text-[#41e4c0] shrink-0" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-mono-caps text-[#d3e4fe] focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#00172e] text-white">ALL ACTIVITIES ({allEvents.length})</option>
                <option value="email" className="bg-[#00172e] text-emerald-400">DISPATCHED EMAILS & DECISIONS ({metrics.emailsSent})</option>
                <option value="status" className="bg-[#00172e] text-sky-400">STATUS TRANSITIONS ({metrics.statusChanges})</option>
                <option value="bulk" className="bg-[#00172e] text-purple-400">BULK / MASS OPERATIONS ({metrics.bulkOps})</option>
                <option value="decision" className="bg-[#00172e] text-white">DECISION LETTERS ONLY</option>
              </select>
            </div>

            {/* Timeframe Filter */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40">
              <Calendar className="w-3.5 h-3.5 text-[#41e4c0] shrink-0" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="bg-transparent text-xs font-mono-caps text-[#d3e4fe] focus:outline-none cursor-pointer pr-2"
              >
                <option value="all" className="bg-[#00172e] text-white">ALL TIMEFRAMES</option>
                <option value="today" className="bg-[#00172e] text-white">TODAY ONLY</option>
                <option value="24h" className="bg-[#00172e] text-white">PAST 24 HOURS</option>
                <option value="7d" className="bg-[#00172e] text-white">PAST 7 DAYS</option>
                <option value="30d" className="bg-[#00172e] text-white">PAST 30 DAYS</option>
              </select>
            </div>

            {/* Reset Filters */}
            {(searchQuery || typeFilter !== 'all' || dateFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setDateFilter('all');
                }}
                className="px-3 py-2 rounded-xl bg-[#000f21] hover:bg-[#102034] text-xs font-mono-caps text-[#94a3b8] hover:text-white border border-[#44474d]/40 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* Results Counter */}
        <div className="text-[11px] font-mono text-[#94a3b8] flex items-center justify-between">
          <span>
            Showing <strong className="text-white">{filteredEvents.length}</strong> of <strong className="text-white">{allEvents.length}</strong> activity event(s)
          </span>
          <span className="flex items-center gap-1.5 text-[#41e4c0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#41e4c0] animate-ping" />
            Live Firestore Sync Active
          </span>
        </div>
      </div>

      {/* Activity Timeline Stream */}
      <div className="rounded-2xl bg-[#00172e]/70 border border-[#44474d]/30 overflow-hidden shadow-md">
        {loading ? (
          <ListItemSkeleton count={6} />
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#94a3b8] space-y-3">
            <History className="w-10 h-10 text-[#64748b] mx-auto opacity-70" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">No Recent Admissions Activity Found</p>
              <p className="text-xs text-[#94a3b8] max-w-md mx-auto">
                {searchQuery || typeFilter !== 'all' || dateFilter !== 'all'
                  ? 'No events match your current filter parameters. Try broadening your search or resetting filters.'
                  : 'Candidate status modifications and decision emails will automatically appear here as actions are performed in the console.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#44474d]/20">
            {filteredEvents.map((event) => {
              const matchedApp = applications.find(
                (a) => a.id === event.entityId || (event.candidateEmail && (a.email || '').toLowerCase() === event.candidateEmail.toLowerCase())
              );

              return (
                <div
                  key={event.id}
                  className="p-4 sm:p-5 hover:bg-[#102034]/40 transition-colors flex items-start gap-4 group"
                >
                  {/* Left Type Icon */}
                  {renderActivityIcon(event.activityType, event.newStatus)}

                  {/* Main Event Body */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white text-sm sm:text-base group-hover:text-[#41e4c0] transition-colors">
                          {event.action}
                        </span>

                        {event.newStatus && (
                          <StatusBadge status={event.newStatus} size="sm" showIcon />
                        )}

                        {event.activityType === 'bulk_email' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-caps bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            Mass Dispatch
                          </span>
                        )}

                        {event.activityType === 'bulk_status' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-caps bg-sky-500/10 text-sky-400 border border-sky-500/30">
                            Bulk Transition
                          </span>
                        )}

                        {event.attachments && event.attachments.length > 0 && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono-caps bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30 flex items-center gap-1"
                            title={`PDF Enclosures: ${event.attachments.join(', ')}`}
                          >
                            <Paperclip className="w-2.5 h-2.5 text-[#41e4c0]" />
                            <span>{event.attachments.length} PDF Enclosure(s)</span>
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#94a3b8]">
                        <Clock className="w-3 h-3 text-[#41e4c0] shrink-0" />
                        <span>{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Candidate & Program Summary Chip Bar */}
                    {(event.candidateName || event.candidateEmail || event.courseTitle) && (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        {event.candidateName && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-[#000f21] border border-[#334155] text-[#d3e4fe] flex items-center gap-1.5">
                            <User className="w-3 h-3 text-[#41e4c0]" />
                            <strong className="text-white">{event.candidateName}</strong>
                          </span>
                        )}

                        {event.candidateEmail && (
                          <span className="text-[#94a3b8] font-mono text-[11px]">
                            {event.candidateEmail}
                          </span>
                        )}

                        {event.courseTitle && (
                          <span className="px-2 py-0.5 rounded-md bg-[#41e4c0]/10 text-[#41e4c0] font-mono-caps text-[10px] border border-[#41e4c0]/20">
                            {event.courseTitle}
                          </span>
                        )}

                        {/* Direct Dossier Link if candidate is found */}
                        {matchedApp && onSelectApplication && (
                          <button
                            type="button"
                            onClick={() => handleOpenCandidateModal(event)}
                            className="px-2 py-0.5 rounded-md bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] hover:text-white border border-[#41e4c0]/30 text-[10px] font-mono-caps flex items-center gap-1 transition-colors cursor-pointer"
                            title="Open candidate admissions application file"
                          >
                            <span>View Dossier</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Details Message Body */}
                    <p className="text-xs text-[#d3e4fe]/85 leading-relaxed bg-[#000f21]/60 p-3 rounded-xl border border-[#334155]/60">
                      {event.details}
                    </p>

                    {/* Footer Meta: Actor & Ref */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-[#94a3b8]">
                      <div className="flex items-center gap-2.5">
                        <span>
                          Action By: <strong className="text-[#41e4c0]">{event.actorEmail}</strong>
                        </span>
                        {event.entityId && (
                          <>
                            <span>•</span>
                            <span>Ref ID: {event.entityId}</span>
                          </>
                        )}
                      </div>

                      {/* Detail Inspector Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedEventForDetail(event)}
                        className="text-[#94a3b8] hover:text-[#41e4c0] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect Payload</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Inspect Activity Payload Modal */}
      {selectedEventForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="relative w-full max-w-lg rounded-3xl bg-[#000f21] border border-[#334155] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#334155] bg-[#00172e] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Activity Log Inspection</h3>
                  <span className="text-[10px] font-mono text-[#94a3b8]">ID: {selectedEventForDetail.id}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEventForDetail(null)}
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-mono-caps text-[#94a3b8] uppercase">Action Header</span>
                <div className="text-sm font-bold text-white">{selectedEventForDetail.action}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#00172e] border border-[#334155] font-mono text-[11px]">
                <div>
                  <span className="text-[#94a3b8] block text-[10px]">Actor Email</span>
                  <span className="text-[#41e4c0]">{selectedEventForDetail.actorEmail}</span>
                </div>
                <div>
                  <span className="text-[#94a3b8] block text-[10px]">Timestamp</span>
                  <span className="text-white">{new Date(selectedEventForDetail.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[#94a3b8] block text-[10px]">Activity Type</span>
                  <span className="text-white uppercase">{selectedEventForDetail.activityType}</span>
                </div>
                <div>
                  <span className="text-[#94a3b8] block text-[10px]">Entity Reference</span>
                  <span className="text-white">{selectedEventForDetail.entityId || 'None'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-mono-caps text-[#94a3b8] uppercase">Full Description / Context</span>
                <div className="p-3 rounded-xl bg-[#00172e] border border-[#334155] text-[#d3e4fe] leading-relaxed">
                  {selectedEventForDetail.details}
                </div>
              </div>

              {selectedEventForDetail.attachments && selectedEventForDetail.attachments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono-caps text-[#94a3b8] uppercase">Attached PDF Enclosures</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedEventForDetail.attachments.map((att, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30 font-mono text-[11px] flex items-center gap-1.5"
                      >
                        <Paperclip className="w-3 h-3" />
                        {att}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-[#334155] bg-[#00172e] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEventForDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-[#102034] hover:bg-[#18314e] text-xs font-mono-caps text-white border border-[#41e4c0]/40 transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
