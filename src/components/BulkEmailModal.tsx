import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { logAdminAction } from '../services/auditLog';
import { StudentApplication, ApplicationStatus, getCandidateName } from '../types';
import { sendGmailMessage, EmailAttachmentPayload } from '../services/workspace';
import {
  getAvailableDocumentsForProgram,
  generateProgramPDF,
  downloadProgramPDF,
  resolveProgramDetails,
} from '../services/pdfDocuments';
import { EmailRichPreview } from './EmailRichPreview';
import {
  Mail,
  Send,
  X,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Paperclip,
  Eye,
  FileText,
  RefreshCw,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

interface BulkEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: StudentApplication[];
  accessToken?: string;
  currentAdminEmail: string;
  onBulkCompleted: (updatedApplications: StudentApplication[]) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

type MassTemplateType =
  | 'acceptance'
  | 'grant_award'
  | 'interview_invite'
  | 'under_review'
  | 'waitlist'
  | 'program_announcement'
  | 'custom';

export const BulkEmailModal: React.FC<BulkEmailModalProps> = ({
  isOpen,
  onClose,
  selectedApplications,
  accessToken,
  currentAdminEmail,
  onBulkCompleted,
  onAddToast,
}) => {
  const [recipientList, setRecipientList] = useState<StudentApplication[]>(selectedApplications);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [templateType, setTemplateType] = useState<MassTemplateType>('acceptance');
  const [subjectTemplate, setSubjectTemplate] = useState<string>('');
  const [bodyTemplate, setBodyTemplate] = useState<string>('');
  const [syncStatus, setSyncStatus] = useState<ApplicationStatus | 'keep'>('accepted');
  const [includeSyllabusPdf, setIncludeSyllabusPdf] = useState<boolean>(true);
  const [includeWelcomePdf, setIncludeWelcomePdf] = useState<boolean>(true);
  const [includeGrantPdf, setIncludeGrantPdf] = useState<boolean>(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);

  // Sending progress state
  const [isSending, setIsSending] = useState<boolean>(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [sendLogs, setSendLogs] = useState<{ name: string; email: string; success: boolean; error?: string }[]>([]);
  const [isDone, setIsDone] = useState<boolean>(false);

  // Sync recipient list if selectedApplications changes when modal is opened
  useEffect(() => {
    if (isOpen) {
      setRecipientList(selectedApplications);
      setPreviewIndex(0);
      setIsDone(false);
      setIsSending(false);
      setSendLogs([]);
    }
  }, [isOpen, selectedApplications]);

  // Generate templates based on templateType
  useEffect(() => {
    switch (templateType) {
      case 'acceptance':
        setSubjectTemplate('[Institute of AI] Official Admissions Acceptance: {{candidate_name}} — {{course_title}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nWe are pleased to inform you that your application for the "{{course_title}}" cohort at the Institute of AI has been ACCEPTED by the Admissions Committee.\n\nAdmissions Next Steps:\n1. Your student onboarding credentials and GPU sandbox access keys will be issued 7 days prior to cohort kickoff.\n2. Review the attached Official Course Syllabus and Welcome Guide.\n3. Join the private cohort Discord & Slack communities using your registered email ({{email}}).\n\nIf you have any questions, our admissions office is here to assist you.\n\nWarm regards,\nAdmissions Committee & Academic Senate\nInstitute of AI - Colombo Tech Park`
        );
        setSyncStatus('accepted');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(true);
        setIncludeGrantPdf(false);
        break;

      case 'grant_award':
        setSubjectTemplate('[Institute of AI] Admissions & Academic Merit GPU Fellowship Award: {{candidate_name}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nCongratulations! The Admissions Senate has approved your application for "{{course_title}}" with an Academic Merit GPU Grant & Co-Sponsorship Award.\n\nFellowship Allocation:\n• Institutional compute sandbox sponsorship awarded.\n• Priority placement in live faculty mentor labs.\n• Enclosed: Official Scholarship Grant Schedule and Course Syllabus.\n\nPlease confirm your enrollment within 7 business days to secure your cohort seat.\n\nSincerely,\nAcademic Directorate & Fellowship Committee\nInstitute of AI`
        );
        setSyncStatus('accepted');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(true);
        setIncludeGrantPdf(true);
        break;

      case 'interview_invite':
        setSubjectTemplate('[Institute of AI] Faculty Technical Discussion Invitation: {{candidate_name}} — {{course_title}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nThank you for applying to the "{{course_title}}" cohort. Your profile has advanced to the faculty evaluation stage.\n\nWe would like to invite you for a 20-minute technical discussion with our teaching faculty to discuss your machine intelligence interests and learning goals.\n\nPlease reply to this email with your preferred time slot or select a time on our admissions calendar.\n\nSincerely,\nAdmissions Review Panel\nInstitute of AI`
        );
        setSyncStatus('under_review');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(false);
        setIncludeGrantPdf(false);
        break;

      case 'under_review':
        setSubjectTemplate('[Institute of AI] Application Under Academic Review: {{candidate_name}} — {{course_title}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nThank you for submitting your application for the "{{course_title}}" program.\n\nYour application dossier is currently undergoing academic review by our faculty committee. We will update you with our formal admissions decision shortly.\n\nSincerely,\nInstitute of AI Admissions Office`
        );
        setSyncStatus('under_review');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(false);
        setIncludeGrantPdf(false);
        break;

      case 'waitlist':
        setSubjectTemplate('[Institute of AI] Priority Waitlist Notification: {{candidate_name}} — {{course_title}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nThank you for applying to the "{{course_title}}" program at the Institute of AI. Due to high demand, our upcoming cohort has reached capacity, and you have been placed on our PRIORITY WAITLIST.\n\nWe will notify you immediately if an enrollment seat opens, or offer guaranteed placement in our subsequent intake.\n\nSincerely,\nAdmissions Committee\nInstitute of AI`
        );
        setSyncStatus('waitlisted');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(false);
        setIncludeGrantPdf(false);
        break;

      case 'program_announcement':
        setSubjectTemplate('[Institute of AI] Cohort Curriculum & Technical Environment Update: {{course_title}}');
        setBodyTemplate(
          `Dear {{candidate_name}},\n\nWe are sharing an official update regarding the upcoming "{{course_title}}" cohort schedule, live lab timings, and Google AI Studio sandbox setup.\n\nPlease find the updated syllabus and technical specifications enclosed with this dispatch.\n\nWarm regards,\nAcademic Operations\nInstitute of AI`
        );
        setSyncStatus('keep');
        setIncludeSyllabusPdf(true);
        setIncludeWelcomePdf(false);
        setIncludeGrantPdf(false);
        break;

      case 'custom':
        // Leave custom template untouched
        break;
    }
  }, [templateType]);

  // Current preview application
  const currentPreviewApp: StudentApplication | null = useMemo(() => {
    if (recipientList.length === 0) return null;
    const safeIdx = Math.max(0, Math.min(previewIndex, recipientList.length - 1));
    return recipientList[safeIdx];
  }, [recipientList, previewIndex]);

  // Interpolated preview strings
  const interpolatedPreview = useMemo(() => {
    if (!currentPreviewApp) {
      return { subject: subjectTemplate, body: bodyTemplate, recipientName: '', email: '', course: '' };
    }
    const name = getCandidateName(currentPreviewApp);
    const firstName = name.split(' ')[0] || name;
    const course = currentPreviewApp.courseTitle || (currentPreviewApp as any).courseName || 'Applied AI Program';
    const email = currentPreviewApp.email;
    const status = syncStatus === 'keep' ? currentPreviewApp.status || 'submitted' : syncStatus;

    const interpolate = (text: string) => {
      return text
        .replace(/\{\{\s*(candidate_name|name|candidateName|full_name)\s*\}\}/gi, name)
        .replace(/\{\{\s*(first_name|firstName)\s*\}\}/gi, firstName)
        .replace(/\{\{\s*(course_title|courseTitle|course|program)\s*\}\}/gi, course)
        .replace(/\{\{\s*(email|candidate_email|candidateEmail)\s*\}\}/gi, email)
        .replace(/\{\{\s*(status)\s*\}\}/gi, status.replace('_', ' ').toUpperCase());
    };

    return {
      subject: interpolate(subjectTemplate),
      body: interpolate(bodyTemplate),
      recipientName: name,
      email,
      course,
    };
  }, [currentPreviewApp, subjectTemplate, bodyTemplate, syncStatus]);

  // Available attachments for the current preview recipient
  const previewAttachmentsList = useMemo(() => {
    if (!currentPreviewApp) return [];
    const course = resolveProgramDetails(currentPreviewApp.courseTitle || (currentPreviewApp as any).courseName);
    const attachments = [];

    if (includeSyllabusPdf) {
      attachments.push({
        id: `syllabus-${course.id}`,
        name: `Official Syllabus: ${course.title}`,
        filename: `IoAI-Syllabus-${course.id}.pdf`,
        sizeEstimate: '185 KB',
        badge: course.badge || 'Syllabus',
        onPreviewDownload: () => downloadProgramPDF(`syllabus-${course.id}`, currentPreviewApp),
      });
    }

    if (includeWelcomePdf) {
      attachments.push({
        id: `welcome-${course.id}`,
        name: `Cohort Welcome & Orientation Guide`,
        filename: `IoAI-Welcome-Orientation-Guide-2026.pdf`,
        sizeEstimate: '220 KB',
        badge: 'Orientation Guide',
        onPreviewDownload: () => downloadProgramPDF(`welcome-${course.id}`, currentPreviewApp),
      });
    }

    if (includeGrantPdf) {
      attachments.push({
        id: `grant-${course.id}`,
        name: `Academic Tuition Grant & Co-Sponsorship Schedule`,
        filename: `IoAI-Scholarship-Grant-Schedule.pdf`,
        sizeEstimate: '140 KB',
        badge: 'Tuition Grant',
        onPreviewDownload: () => downloadProgramPDF(`grant-${course.id}`, currentPreviewApp),
      });
    }

    return attachments;
  }, [currentPreviewApp, includeSyllabusPdf, includeWelcomePdf, includeGrantPdf]);

  const handleRemoveRecipient = (appId: string) => {
    setRecipientList((prev) => prev.filter((a) => a.id !== appId));
    if (previewIndex >= recipientList.length - 1 && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const handleInsertTag = (tag: string) => {
    setBodyTemplate((prev) => `${prev} ${tag}`);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleExecuteMassDispatch = async () => {
    if (recipientList.length === 0) {
      if (onAddToast) onAddToast('No Recipients', 'Please select at least one candidate recipient.', 'error');
      return;
    }

    if (!accessToken) {
      if (onAddToast) {
        onAddToast(
          'Workspace Authorization Required',
          'Please sign in with Google in the Admin Console to authorize Gmail API dispatch.',
          'error'
        );
      }
      return;
    }

    setIsSending(true);
    setIsDone(false);
    setSendLogs([]);
    setSendProgress({ current: 0, total: recipientList.length, currentName: '' });

    const logs: { name: string; email: string; success: boolean; error?: string }[] = [];
    const updatedApps: StudentApplication[] = [];

    const batch = writeBatch(db);
    let batchNeedsCommit = false;

    for (let i = 0; i < recipientList.length; i++) {
      const app = recipientList[i];
      const name = getCandidateName(app);
      const firstName = name.split(' ')[0] || name;
      const course = app.courseTitle || (app as any).courseName || 'Applied AI Program';
      const targetStatus = syncStatus === 'keep' ? app.status || 'submitted' : syncStatus;

      setSendProgress({
        current: i + 1,
        total: recipientList.length,
        currentName: `${name} (${app.email})`,
      });

      try {
        // 1. Personalize text
        const finalSubject = subjectTemplate
          .replace(/\{\{\s*(candidate_name|name|candidateName|full_name)\s*\}\}/gi, name)
          .replace(/\{\{\s*(first_name|firstName)\s*\}\}/gi, firstName)
          .replace(/\{\{\s*(course_title|courseTitle|course|program)\s*\}\}/gi, course)
          .replace(/\{\{\s*(email|candidate_email|candidateEmail)\s*\}\}/gi, app.email)
          .replace(/\{\{\s*(status)\s*\}\}/gi, targetStatus.replace('_', ' ').toUpperCase());

        const finalBody = bodyTemplate
          .replace(/\{\{\s*(candidate_name|name|candidateName|full_name)\s*\}\}/gi, name)
          .replace(/\{\{\s*(first_name|firstName)\s*\}\}/gi, firstName)
          .replace(/\{\{\s*(course_title|courseTitle|course|program)\s*\}\}/gi, course)
          .replace(/\{\{\s*(email|candidate_email|candidateEmail)\s*\}\}/gi, app.email)
          .replace(/\{\{\s*(status)\s*\}\}/gi, targetStatus.replace('_', ' ').toUpperCase());

        // 2. Generate PDF attachments if checked
        const attachmentsPayload: EmailAttachmentPayload[] = [];
        const attachedDocNames: string[] = [];

        if (includeSyllabusPdf) {
          try {
            const gen = generateProgramPDF('syllabus', app);
            attachmentsPayload.push({
              filename: gen.filename,
              mimeType: gen.mimeType,
              dataBase64: gen.dataBase64,
            });
            attachedDocNames.push(gen.filename);
          } catch (e) {
            console.warn('PDF syllabus generation warning:', e);
          }
        }

        if (includeWelcomePdf) {
          try {
            const gen = generateProgramPDF('welcome', app);
            attachmentsPayload.push({
              filename: gen.filename,
              mimeType: gen.mimeType,
              dataBase64: gen.dataBase64,
            });
            attachedDocNames.push(gen.filename);
          } catch (e) {
            console.warn('PDF welcome guide generation warning:', e);
          }
        }

        if (includeGrantPdf) {
          try {
            const gen = generateProgramPDF('grant', app);
            attachmentsPayload.push({
              filename: gen.filename,
              mimeType: gen.mimeType,
              dataBase64: gen.dataBase64,
            });
            attachedDocNames.push(gen.filename);
          } catch (e) {
            console.warn('PDF grant schedule generation warning:', e);
          }
        }

        // 3. Dispatch email via Gmail API
        await sendGmailMessage(accessToken, app.email, finalSubject, finalBody, attachmentsPayload);

        // 4. Update application in Firestore
        const appRef = doc(db, 'applications', app.id);
        const updateFields: any = {
          decisionLetterSent: true,
          lastDecisionEmailAt: new Date().toISOString(),
          lastDecisionStatus: targetStatus,
          lastAttachedFiles: attachedDocNames,
        };

        if (syncStatus !== 'keep') {
          updateFields.status = targetStatus;
          updateFields.reviewedAt = new Date().toISOString();
          updateFields.reviewedBy = currentAdminEmail;
        }

        batch.update(appRef, updateFields);
        batchNeedsCommit = true;

        updatedApps.push({
          ...app,
          ...updateFields,
        });

        logs.push({ name, email: app.email, success: true });
      } catch (err: any) {
        console.error(`Error sending bulk email to ${app.email}:`, err);
        logs.push({ name, email: app.email, success: false, error: err.message || 'Dispatch error' });
      }

      setSendLogs([...logs]);

      // Modest pause between dispatches to maintain safe Gmail API throughput
      if (i < recipientList.length - 1) {
        await new Promise((res) => setTimeout(res, 300));
      }
    }

    // Commit Firestore batch updates
    if (batchNeedsCommit) {
      try {
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch commit error:', batchErr);
      }
    }

    // Log mass dispatch in admin audit logs
    const successCount = logs.filter((l) => l.success).length;
    await logAdminAction({
      action: `Mass Email Dispatched (${successCount}/${recipientList.length} successful)`,
      entityType: 'application',
      details: `Template: ${templateType.toUpperCase()}. Target status: ${syncStatus}. Application IDs: ${recipientList.map((r) => r.id).join(', ')}.`,
      activityType: 'bulk_email',
      recipientCount: successCount,
      newStatus: syncStatus !== 'keep' ? syncStatus : undefined,
    });

    setIsSending(false);
    setIsDone(true);
    onBulkCompleted(updatedApps);

    if (onAddToast) {
      onAddToast(
        'Mass Dispatch Completed',
        `Successfully sent ${successCount} of ${recipientList.length} customized emails.`,
        successCount === recipientList.length ? 'success' : 'info'
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-6xl my-auto rounded-3xl bg-[#000f21] border border-[#334155] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#334155] bg-[#00172e] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0]">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Mass Email & Decision Dispatch Studio
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono-caps bg-[#41e4c0]/10 text-[#41e4c0] border border-[#41e4c0]/30">
                  {recipientList.length} Selected Candidates
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                Personalized bulk email dispatch with automated program syllabi and status synchronization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sending Progress Overlay */}
        {isSending && (
          <div className="p-6 bg-[#00172e]/90 border-b border-[#334155] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#41e4c0] flex items-center gap-2 font-bold">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Dispatching personalized emails via Gmail API...
              </span>
              <span className="text-white font-bold">
                {sendProgress.current} / {sendProgress.total} ({Math.round((sendProgress.current / sendProgress.total) * 100)}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#000f21] overflow-hidden border border-[#334155]">
              <div
                className="h-full bg-linear-to-r from-[#41e4c0] to-emerald-400 transition-all duration-300"
                style={{ width: `${(sendProgress.current / sendProgress.total) * 100}%` }}
              />
            </div>

            <div className="text-[11px] text-[#94a3b8] font-mono truncate">
              Sending to: <strong className="text-white">{sendProgress.currentName}</strong>
            </div>
          </div>
        )}

        {/* Completion Summary Card */}
        {isDone && (
          <div className="p-4 bg-emerald-950/40 border-b border-emerald-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>
                <strong>Mass dispatch finished:</strong> {sendLogs.filter((l) => l.success).length} of {sendLogs.length} emails dispatched successfully.
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono-caps text-xs cursor-pointer"
            >
              Done & Close
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Selected Candidates Token Carousel / Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono-caps text-[#41e4c0] font-bold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Active Target Candidates ({recipientList.length})
              </span>
              <span className="text-[11px] text-[#94a3b8]">
                Click <X className="w-3 h-3 inline text-rose-400" /> to exclude specific candidates from this dispatch.
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#00172e] border border-[#334155] max-h-28 overflow-y-auto flex flex-wrap gap-1.5">
              {recipientList.map((app, idx) => {
                const name = getCandidateName(app);
                const isCurrentPreview = idx === previewIndex;
                return (
                  <div
                    key={app.id}
                    onClick={() => setPreviewIndex(idx)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isCurrentPreview
                        ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]/50 font-bold shadow-xs'
                        : 'bg-[#000f21] text-[#cbd5e1] border-[#334155] hover:border-[#41e4c0]/30'
                    }`}
                  >
                    <span>{name}</span>
                    <span className="text-[10px] text-[#94a3b8]">({app.courseTitle || (app as any).courseName || 'Track'})</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveRecipient(app.id);
                      }}
                      className="p-0.5 text-[#94a3b8] hover:text-rose-400 rounded transition-colors"
                      title="Exclude from mass send"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Template Selector & Editor (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              {/* Preset Template Tabs */}
              <div>
                <label className="block text-xs font-mono-caps text-[#94a3b8] mb-1.5 uppercase font-bold">
                  Preset Message Template
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    { id: 'acceptance', label: 'Admissions Acceptance' },
                    { id: 'grant_award', label: 'GPU Grant Award' },
                    { id: 'interview_invite', label: 'Faculty Interview' },
                    { id: 'under_review', label: 'Under Review' },
                    { id: 'waitlist', label: 'Waitlist Notice' },
                    { id: 'program_announcement', label: 'Program Update' },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplateType(tpl.id as MassTemplateType)}
                      className={`px-3 py-2 rounded-xl text-xs font-mono text-left transition-all border cursor-pointer ${
                        templateType === tpl.id
                          ? 'bg-[#41e4c0]/15 text-[#41e4c0] border-[#41e4c0]/40 font-bold shadow-xs'
                          : 'bg-[#00172e] text-[#94a3b8] border-[#334155] hover:text-white hover:border-[#41e4c0]/20'
                      }`}
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Synchronization Setting */}
              <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-white block">Update Application Status Upon Dispatch</span>
                  <span className="text-[11px] text-[#94a3b8]">
                    Automatically updates all recipient status tags in Firestore.
                  </span>
                </div>

                <select
                  value={syncStatus}
                  onChange={(e) => setSyncStatus(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl bg-[#000f21] border border-[#334155] text-xs text-[#41e4c0] font-mono focus:outline-none focus:border-[#41e4c0] cursor-pointer"
                >
                  <option value="keep">Keep Current Status</option>
                  <option value="accepted">Accepted (Confirmed)</option>
                  <option value="under_review">Under Review</option>
                  <option value="waitlisted">Waitlisted</option>
                  <option value="rejected">Declined</option>
                </select>
              </div>

              {/* Dynamic Variables Pill Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#94a3b8] mb-1 font-mono">
                  <span>Click to insert dynamic variable tag into message body:</span>
                  {copiedTag && <span className="text-[#41e4c0] font-bold">Inserted {copiedTag} ✓</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { tag: '{{candidate_name}}', desc: 'Full Name' },
                    { tag: '{{first_name}}', desc: 'First Name' },
                    { tag: '{{course_title}}', desc: 'Course Program' },
                    { tag: '{{email}}', desc: 'Email' },
                    { tag: '{{status}}', desc: 'Decision Status' },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => handleInsertTag(v.tag)}
                      className="px-2 py-1 rounded-lg bg-[#102034] hover:bg-[#18314e] text-[11px] font-mono text-[#41e4c0] border border-[#41e4c0]/30 transition-colors cursor-pointer"
                      title={v.desc}
                    >
                      {v.tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject Input */}
              <div className="space-y-1">
                <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
                  Email Subject Template
                </label>
                <input
                  type="text"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#00172e] border border-[#334155] text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#41e4c0] font-mono"
                  placeholder="Subject line with {{candidate_name}}..."
                />
              </div>

              {/* Body Textarea */}
              <div className="space-y-1">
                <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
                  Email Body Template (Markdown / Plaintext)
                </label>
                <textarea
                  rows={8}
                  value={bodyTemplate}
                  onChange={(e) => setBodyTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#00172e] border border-[#334155] text-xs text-white placeholder:text-[#94a3b8] focus:outline-none focus:border-[#41e4c0] font-mono leading-relaxed resize-y"
                  placeholder="Dear {{candidate_name}}, ..."
                />
              </div>

              {/* Automatic PDF Enclosure Toggles */}
              <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] space-y-2">
                <span className="text-xs font-mono-caps text-[#41e4c0] font-bold block flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5" />
                  Auto-Enclose Program Documents (Matched to each candidate's course)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#000f21] border border-[#334155] cursor-pointer hover:border-[#41e4c0]/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeSyllabusPdf}
                      onChange={(e) => setIncludeSyllabusPdf(e.target.checked)}
                      className="rounded accent-[#41e4c0] cursor-pointer"
                    />
                    <span className="text-white text-[11px] font-mono">Course Syllabus</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#000f21] border border-[#334155] cursor-pointer hover:border-[#41e4c0]/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeWelcomePdf}
                      onChange={(e) => setIncludeWelcomePdf(e.target.checked)}
                      className="rounded accent-[#41e4c0] cursor-pointer"
                    />
                    <span className="text-white text-[11px] font-mono">Welcome Guide</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-[#000f21] border border-[#334155] cursor-pointer hover:border-[#41e4c0]/30 transition-colors">
                    <input
                      type="checkbox"
                      checked={includeGrantPdf}
                      onChange={(e) => setIncludeGrantPdf(e.target.checked)}
                      className="rounded accent-[#41e4c0] cursor-pointer"
                    />
                    <span className="text-white text-[11px] font-mono">Tuition Grant</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Live Preview Studio for Currently Selected Recipient (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-[#334155]/60">
                <span className="text-xs font-mono-caps text-white font-bold flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#41e4c0]" />
                  Live Preview: Recipient {previewIndex + 1} of {recipientList.length}
                </span>

                {/* Recipient Switcher Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                    disabled={previewIndex === 0}
                    className="p-1 rounded bg-[#00172e] border border-[#334155] text-[#94a3b8] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-[#94a3b8]">
                    {previewIndex + 1}/{recipientList.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((prev) => Math.min(recipientList.length - 1, prev + 1))}
                    disabled={previewIndex >= recipientList.length - 1}
                    className="p-1 rounded bg-[#00172e] border border-[#334155] text-[#94a3b8] hover:text-white disabled:opacity-40 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {currentPreviewApp ? (
                <div className="rounded-2xl border border-[#334155] bg-[#00172e] p-1 overflow-hidden shadow-inner max-h-[580px] overflow-y-auto">
                  <EmailRichPreview
                    subject={interpolatedPreview.subject}
                    body={interpolatedPreview.body}
                    recipientName={interpolatedPreview.recipientName}
                    status={syncStatus === 'keep' ? currentPreviewApp.status || 'submitted' : syncStatus}
                    courseTitle={interpolatedPreview.course}
                    senderEmail={currentAdminEmail}
                    attachments={previewAttachmentsList}
                  />
                </div>
              ) : (
                <div className="py-20 text-center text-[#94a3b8] text-xs">
                  No recipients currently in selection.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#334155] bg-[#00172e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#94a3b8] font-mono">
            Sender: <strong className="text-white">{currentAdminEmail}</strong> (via Gmail API)
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSending}
              className="px-4 py-2 rounded-xl bg-[#000f21] hover:bg-[#102034] text-xs font-mono-caps text-[#cbd5e1] border border-[#334155] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteMassDispatch}
              disabled={isSending || recipientList.length === 0}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-[#41e4c0] to-emerald-400 text-black font-bold text-xs font-mono-caps shadow-md hover:shadow-[#41e4c0]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending {sendProgress.current} / {sendProgress.total}...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Dispatch to All {recipientList.length} Candidates</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
