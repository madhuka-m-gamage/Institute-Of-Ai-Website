import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { logAdminAction } from '../services/auditLog';
import { StudentApplication, ApplicationStatus, getCandidateName, formatApplicationDate } from '../../types';
import { sendGmailMessage, EmailAttachmentPayload } from '../services/gmail';
import {
  AttachableDocument,
  getAvailableDocumentsForProgram,
  generateProgramPDF,
  downloadProgramPDF,
  resolveProgramDetails,
} from '../services/pdfDocuments';
import { EmailRichPreview } from './EmailRichPreview';
import { StatusBadge, getStatusConfig } from './StatusBadge';
import {
  X,
  User,
  Mail,
  Phone,
  BookOpen,
  Send,
  Sparkles,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Edit3,
  AlertTriangle,
  Eye,
  Columns,
  RotateCcw,
  Plus,
  Check,
  Copy,
  Info,
  Tag,
  Paperclip,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';

interface ApplicationDetailModalProps {
  application: StudentApplication;
  onClose: () => void;
  onStatusUpdated: (updatedApp: StudentApplication) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
  currentAdminEmail?: string;
  accessToken?: string;
  onConnectGoogle?: () => Promise<void>;
}

type TemplateVariant = 'standard' | 'grant' | 'conditional' | 'interview' | 'github_request' | 'guaranteed_rollover' | 'prep_track';

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  application,
  onClose,
  onStatusUpdated,
  onAddToast,
  currentAdminEmail = 'admin@instituteofai.com',
  accessToken,
  onConnectGoogle,
}) => {
  const candidateName = getCandidateName(application);
  const [status, setStatus] = useState<ApplicationStatus>(application.status || 'submitted');
  const [internalNotes, setInternalNotes] = useState<string>(application.notes || '');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  
  // Rich Email Studio State
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [selectedTemplateVariant, setSelectedTemplateVariant] = useState<TemplateVariant>('standard');
  const [customSubject, setCustomSubject] = useState<string>('');
  const [customBody, setCustomBody] = useState<string>('');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  // Available and Selected PDF Documents tailored to applicant's program
  const availableDocs = useMemo(() => {
    return getAvailableDocumentsForProgram(
      application.courseTitle || (application as any).courseName,
      status
    );
  }, [application.courseTitle, (application as any).courseName, status]);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(() => {
    return getAvailableDocumentsForProgram(
      application.courseTitle || (application as any).courseName,
      application.status || 'submitted'
    )
      .filter((d) => d.defaultAttached)
      .map((d) => d.id);
  });

  // Keep defaults updated when status changes
  useEffect(() => {
    const defaults = availableDocs.filter((d) => d.defaultAttached).map((d) => d.id);
    setSelectedDocIds((prev) => {
      // Retain already selected documents from the available set, merging new status defaults
      const validPrev = prev.filter((id) => availableDocs.some((d) => d.id === id));
      const combined = Array.from(new Set([...defaults, ...validPrev]));
      return combined.length > 0 ? combined : defaults;
    });
  }, [status, availableDocs]);

  const handleToggleDocAttachment = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAllDocs = () => {
    if (selectedDocIds.length === availableDocs.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(availableDocs.map((d) => d.id));
    }
  };

  const handleDownloadDoc = (docItem: AttachableDocument) => {
    try {
      downloadProgramPDF(docItem.id, application);
      if (onAddToast) {
        onAddToast('PDF Downloaded', `Generated and downloaded ${docItem.filename}`, 'success');
      }
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      if (onAddToast) {
        onAddToast('PDF Generation Failed', err.message || 'Could not generate PDF document', 'error');
      }
    }
  };

  const handleDownloadAllSelectedDocs = () => {
    if (selectedDocIds.length === 0) {
      if (onAddToast) {
        onAddToast('No Documents Selected', 'Please select at least one document to download.', 'info');
      }
      return;
    }

    selectedDocIds.forEach((id, index) => {
      const docItem = availableDocs.find((d) => d.id === id);
      if (docItem) {
        setTimeout(() => {
          downloadProgramPDF(docItem.id, application);
        }, index * 400);
      }
    });

    if (onAddToast) {
      onAddToast('Generating PDFs', `Downloading ${selectedDocIds.length} official document(s)...`, 'info');
    }
  };

  // Prepare attachments list formatted for EmailRichPreview
  const previewAttachments = useMemo(() => {
    return availableDocs
      .filter((doc) => selectedDocIds.includes(doc.id))
      .map((doc) => ({
        id: doc.id,
        name: doc.name,
        filename: doc.filename,
        description: doc.description,
        sizeEstimate: doc.sizeEstimate,
        badge: doc.badge,
        onPreviewDownload: () => handleDownloadDoc(doc),
      }));
  }, [availableDocs, selectedDocIds, application]);

  // Generate dynamic email template based on status & chosen variant
  const generateTemplate = (st: ApplicationStatus, variant: TemplateVariant = 'standard') => {
    const name = candidateName;
    const course = application.courseTitle || 'Applied Program';

    let subjectLine = `[Institute of AI] Official Admissions Notification (${st.toUpperCase()}): ${name} — ${course}`;
    let body = '';

    if (st === 'accepted') {
      if (variant === 'grant') {
        subjectLine = `[Institute of AI] Admissions & Merit GPU Fellowship Award: ${name} — ${course}`;
        body = `Dear ${name},\n\nWe are delighted to inform you that your application for the "${course}" cohort has been ACCEPTED with an Academic Merit GPU Grant.\n\nAdmissions & Grant Highlights:\n1. 50% Cloud Compute Sandbox Subsidy allocated to your account.\n2. Exclusive faculty office hours and priority cohort placement.\n3. Dedicated access to our high-throughput cluster.\n\nNext Steps:\n1. Student onboarding credentials and GPU sandbox access keys will be dispatched 7 days prior to kickoff.\n2. Access the preparatory syllabus in the student portal.\n\nWarm regards,\nAdmissions Committee & Academic Senate\nInstitute of AI - Colombo Tech Park`;
      } else if (variant === 'conditional') {
        subjectLine = `[Institute of AI] Conditional Admission Offer: ${name} — ${course}`;
        body = `Dear ${name},\n\nCongratulations! The Admissions Committee has granted you CONDITIONAL ADMISSION for "${course}".\n\nPrerequisite Conditions:\n1. Complete the foundational Python & Tensor calculus assessment prior to cohort orientation.\n2. Submit your verified academic transcripts or GitHub project portfolio.\n\nOnce completed, your admission status will be permanently confirmed.\n\nSincerely,\nAdmissions Registry\nInstitute of AI - Colombo Tech Park`;
      } else {
        subjectLine = `[Institute of AI] Official Admissions Acceptance: ${name} — ${course}`;
        body = `Dear ${name},\n\nWe are pleased to inform you that your application for the "${course}" cohort at the Institute of AI has been ACCEPTED by the Admissions Committee.\n\nNext Steps:\n1. Your student onboarding credentials and GPU sandbox access keys will be issued 7 days prior to cohort kickoff.\n2. Review prerequisite preparation materials in the student hub.\n3. Join the cohort Slack community.\n\nWarm regards,\nAdmissions Committee\nInstitute of AI - Colombo Tech Park`;
      }
    } else if (st === 'under_review') {
      if (variant === 'interview') {
        subjectLine = `[Institute of AI] Faculty Technical Interview Invitation: ${name} — ${course}`;
        body = `Dear ${name},\n\nYour application for "${course}" has reached the faculty evaluation stage. We would like to invite you for a 20-minute technical discussion with a member of our teaching faculty.\n\nInterview Focus Areas:\n1. Mathematical foundations & Python proficiency\n2. Research interest in machine intelligence\n\nPlease select a convenient slot via our admissions calendar link.\n\nSincerely,\nAdmissions Committee\nInstitute of AI - Colombo Tech Park`;
      } else if (variant === 'github_request') {
        subjectLine = `[Institute of AI] Application Update - Technical Portfolio Request: ${name} — ${course}`;
        body = `Dear ${name},\n\nThank you for applying to "${course}". To help our admissions team complete their evaluation, please reply to this email with links to your GitHub repositories or technical projects.\n\nWe look forward to reviewing your engineering background.\n\nSincerely,\nAcademic Admissions Office\nInstitute of AI`;
      } else {
        subjectLine = `[Institute of AI] Application Under Academic Review: ${name} — ${course}`;
        body = `Dear ${name},\n\nYour application for "${course}" has been received and is currently UNDER REVIEW by our academic admissions committee.\n\nWe will reach out shortly if additional background documentation or a brief technical interview is required.\n\nSincerely,\nInstitute of AI Admissions Team`;
      }
    } else if (st === 'waitlisted') {
      if (variant === 'guaranteed_rollover') {
        subjectLine = `[Institute of AI] Waitlist Status & Guaranteed Subsequent Intake Option: ${name} — ${course}`;
        body = `Dear ${name},\n\nDue to unprecedented demand, the upcoming cohort for "${course}" has reached maximum seat capacity. You have been placed on our PRIORITY TIER 1 WAITLIST.\n\nWe also offer you a guaranteed reserved seat in our immediate subsequent intake.\n\nPlease let us know if you wish to confirm your rollover placement.\n\nSincerely,\nAdmissions Directorate\nInstitute of AI`;
      } else {
        subjectLine = `[Institute of AI] Priority Waitlist Notification: ${name} — ${course}`;
        body = `Dear ${name},\n\nThank you for applying to "${course}". Your profile is strong, and you have been placed on our PRIORITY WAITLIST for the upcoming intake.\n\nWe will reach out immediately if an intake seat opens up.\n\nSincerely,\nInstitute of AI Admissions Committee`;
      }
    } else if (st === 'rejected') {
      if (variant === 'prep_track') {
        subjectLine = `[Institute of AI] Admissions Update & Preparatory Track Recommendation: ${name} — ${course}`;
        body = `Dear ${name},\n\nThank you for your interest in "${course}". While we cannot offer you admission into this advanced cohort at this time, we invite you to explore our foundational preparatory tracks.\n\nCompleting the preparatory track qualifies candidates for accelerated re-application in future intakes.\n\nSincerely,\nInstitute of AI Admissions`;
      } else {
        subjectLine = `[Institute of AI] Admissions Decision: ${name} — ${course}`;
        body = `Dear ${name},\n\nThank you for your interest in "${course}". After thorough consideration of our cohort capacity and prerequisites, we are unable to offer you admission at this time.\n\nWe encourage you to apply for future cohorts as your background develops.\n\nSincerely,\nInstitute of AI Admissions`;
      }
    } else {
      subjectLine = `[Institute of AI] Application Received & Verification: ${name} — ${course}`;
      body = `Dear ${name},\n\nThank you for submitting your application for the "${course}" cohort at the Institute of AI.\n\nWe have received your application and will begin evaluation shortly.\n\nSincerely,\nInstitute of AI Admissions Team`;
    }

    return { subjectLine, body };
  };

  // Load template whenever status or variant changes
  useEffect(() => {
    const { subjectLine, body } = generateTemplate(status, selectedTemplateVariant);
    setCustomSubject(subjectLine);
    setCustomBody(body);
  }, [status, selectedTemplateVariant, candidateName, application.courseTitle]);

  const handleStatusChange = (newStatus: ApplicationStatus) => {
    setStatus(newStatus);
    setSelectedTemplateVariant('standard');
  };

  const handleResetTemplate = () => {
    const { subjectLine, body } = generateTemplate(status, selectedTemplateVariant);
    setCustomSubject(subjectLine);
    setCustomBody(body);
    if (onAddToast) {
      onAddToast('Template Reset', 'Loaded standard template text for this decision status.', 'info');
    }
  };

  const handleInsertSnippet = (snippet: string) => {
    setCustomBody((prev) => `${prev}\n\n${snippet}`);
    if (onAddToast) {
      onAddToast('Snippet Inserted', 'Added custom text block to draft body.', 'info');
    }
  };

  const handleInsertVariable = (variableVal: string, tagLabel: string) => {
    setCustomBody((prev) => `${prev} ${variableVal}`);
    setCopiedVar(tagLabel);
    setTimeout(() => setCopiedVar(null), 1800);
    if (onAddToast) {
      onAddToast('Variable Inserted', `Added ${tagLabel} (${variableVal}) into body.`, 'info');
    }
  };

  const handleSaveReview = async () => {
    setIsUpdating(true);
    try {
      const appRef = doc(db, 'applications', application.id);
      const updatePayload = {
        status,
        notes: internalNotes,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentAdminEmail,
      };

      await updateDoc(appRef, updatePayload);

      await logAdminAction({
        action: `Updated applicant status to ${status.toUpperCase()}`,
        entityType: 'application',
        entityId: application.id,
        details: `Status transitioned to ${status.replace('_', ' ').toUpperCase()} for ${application.courseTitle || 'Applied Program'}.`,
        candidateName,
        candidateEmail: application.email,
        courseTitle: application.courseTitle || (application as any).courseName,
        previousStatus: application.status || 'submitted',
        newStatus: status,
        activityType: 'status_change',
      });

      const updated: StudentApplication = {
        ...application,
        ...updatePayload,
        fullName: candidateName,
      };

      onStatusUpdated(updated);
      if (onAddToast) {
        onAddToast('Application Updated', `Status updated to ${status.replace('_', ' ').toUpperCase()}`, 'success');
      }
    } catch (err: any) {
      console.error('Update applicant error:', err);
      if (onAddToast) {
        onAddToast('Update Failed', err.message || 'Could not update applicant record in Firestore', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSendDecisionLetter = async () => {
    if (!accessToken) {
      if (onAddToast) {
        onAddToast(
          'Workspace Token Missing',
          'Please sign in with Google in the Admin Console to authorize Gmail API dispatch, or use the "Open in Mail Client" link below.',
          'error'
        );
      }
      return;
    }

    setIsSendingEmail(true);
    try {
      // Sanitize body and subject from any variable placeholders
      const finalSubject = customSubject
        .replace(/\{\{\s*(candidate_name|candidateName|name|applicantName|applicant_name)\s*\}\}/gi, candidateName)
        .replace(/\{\{\s*(course_title|courseTitle|course)\s*\}\}/gi, application.courseTitle || 'Applied Program')
        .replace(/\{\{\s*(email|candidateEmail|candidate_email)\s*\}\}/gi, application.email);

      const finalBody = customBody
        .replace(/\{\{\s*(candidate_name|candidateName|name|applicantName|applicant_name)\s*\}\}/gi, candidateName)
        .replace(/\{\{\s*(course_title|courseTitle|course)\s*\}\}/gi, application.courseTitle || 'Applied Program')
        .replace(/\{\{\s*(email|candidateEmail|candidate_email)\s*\}\}/gi, application.email);

      // 1. Generate real base64 PDF attachments for all selected docs
      const attachmentsPayload: EmailAttachmentPayload[] = [];
      const attachedDocNames: string[] = [];

      for (const docId of selectedDocIds) {
        try {
          const generated = generateProgramPDF(docId, application);
          attachmentsPayload.push({
            filename: generated.filename,
            mimeType: generated.mimeType,
            dataBase64: generated.dataBase64,
            description: `Official ${docId} enclosure for ${candidateName}`,
          });
          attachedDocNames.push(generated.filename);
        } catch (pdfErr) {
          console.warn(`Failed generating PDF for ${docId}:`, pdfErr);
        }
      }

      // 2. Dispatch via workspace Gmail API service with attachments
      await sendGmailMessage(accessToken, application.email, finalSubject, finalBody, attachmentsPayload);

      // 3. Mark decision letter sent in Firestore
      const appRef = doc(db, 'applications', application.id);
      await updateDoc(appRef, {
        decisionLetterSent: true,
        lastDecisionEmailAt: new Date().toISOString(),
        lastDecisionStatus: status,
        lastAttachedFiles: attachedDocNames,
      });

      // 4. Log audit entry
      await logAdminAction({
        action: `Dispatched ${status.toUpperCase()} decision email with ${attachmentsPayload.length} PDF attachment(s)`,
        entityType: 'application',
        entityId: application.id,
        details: `Dispatched via Gmail API for ${application.courseTitle}. Attached: ${attachedDocNames.join(', ') || 'None'}. Subject: ${finalSubject}`,
        candidateName,
        candidateEmail: application.email,
        courseTitle: application.courseTitle || (application as any).courseName,
        newStatus: status,
        subject: finalSubject,
        attachments: attachedDocNames,
        activityType: 'decision_letter',
      });

      if (onAddToast) {
        const attachmentMsg = attachedDocNames.length > 0 ? ` with ${attachedDocNames.length} PDF attachment(s)` : '';
        onAddToast(
          'Decision Letter Dispatched',
          `Official decision email${attachmentMsg} successfully sent to ${candidateName} (${application.email})`,
          'success'
        );
      }
    } catch (err: any) {
      console.error('Error dispatching decision letter:', err);
      if (onAddToast) {
        onAddToast('Email Dispatch Error', err.message || 'Could not send email via Gmail API', 'error');
      }
    } finally {
      setIsSendingEmail(false);
    }
  };

  const mailtoUrl = `mailto:${encodeURIComponent(application.email)}?subject=${encodeURIComponent(
    customSubject
  )}&body=${encodeURIComponent(customBody)}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#000814]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#00172e] border border-[#44474d]/50 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#334155] flex items-center justify-between bg-[#000f21] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#102034] border border-[#41e4c0]/40 flex items-center justify-center text-[#41e4c0]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {candidateName}
                </h2>
                <StatusBadge status={status} size="sm" showIcon />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#94a3b8] mt-0.5">
                <span>ID: {application.id}</span>
                <span>•</span>
                <span className="text-[#41e4c0] font-mono-caps">{application.courseTitle}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#d3e4fe]">
                  <Clock className="w-3 h-3 text-[#41e4c0]" />
                  Applied: {formatApplicationDate(application)}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#94a3b8] hover:text-white rounded-lg hover:bg-[#102034] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Workspace */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Workspace Token Warning Banner if disconnected */}
          {!accessToken && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-200 block">Google Workspace Authorization Required for Direct Gmail API Dispatch</span>
                  <p className="text-[#94a3b8]">
                    Connect your institutional Google Workspace account with Gmail permissions to dispatch official emails directly from the browser.
                  </p>
                </div>
              </div>
              {onConnectGoogle && (
                <button
                  type="button"
                  onClick={onConnectGoogle}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono-caps font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authorize Workspace</span>
                </button>
              )}
            </div>
          )}

          {/* Decision Status Controls */}
          <div className="p-4 rounded-xl bg-[#0b1c30] border border-[#334155] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider font-bold">
                1. Select Admissions Decision Status
              </span>
              <span className="text-[11px] text-[#94a3b8] font-mono">
                {application.reviewedAt ? `Reviewed ${new Date(application.reviewedAt).toLocaleDateString()}` : 'Pending Review'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['submitted', 'under_review', 'accepted', 'waitlisted', 'rejected'] as ApplicationStatus[]).map((st) => {
                const cfg = getStatusConfig(st);
                const isSelected = status === st;
                
                const activeColorClasses: Record<string, string> = {
                  accepted: 'bg-emerald-500 text-[#000f21] font-bold border-emerald-400 shadow-md shadow-emerald-500/30',
                  submitted: 'bg-amber-500 text-[#000f21] font-bold border-amber-400 shadow-md shadow-amber-500/30',
                  under_review: 'bg-sky-500 text-[#000f21] font-bold border-sky-400 shadow-md shadow-sky-500/30',
                  waitlisted: 'bg-purple-600 text-white font-bold border-purple-400 shadow-md shadow-purple-500/30',
                  rejected: 'bg-rose-600 text-white font-bold border-rose-400 shadow-md shadow-rose-500/30',
                };

                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => handleStatusChange(st)}
                    className={`py-2.5 px-3 rounded-lg text-xs font-mono-caps transition-all cursor-pointer border text-center flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? (activeColorClasses[st] || 'bg-[#41e4c0] text-[#031427] font-bold border-[#41e4c0]')
                        : 'bg-[#00172e] text-[#94a3b8] border-[#334155] hover:border-[#44474d] hover:text-white'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-current' : cfg.dot}`} />
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Applicant Profile Coordinates (Collapsible/Dense) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] space-y-1.5 text-xs">
              <span className="text-[11px] font-mono-caps text-[#94a3b8] uppercase block font-semibold">Candidate Coordinates</span>
              <div className="flex items-center gap-2 text-white">
                <Mail className="w-3.5 h-3.5 text-[#41e4c0]" />
                <span className="font-mono">{application.email}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Phone className="w-3.5 h-3.5 text-[#41e4c0]" />
                <span>{application.phone || 'No phone supplied'}</span>
              </div>
              <div className="flex items-center gap-2 text-white">
                <Clock className="w-3.5 h-3.5 text-[#41e4c0]" />
                <span>Submitted: <strong className="text-[#d3e4fe] font-normal">{formatApplicationDate(application)}</strong></span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] space-y-1.5 text-xs">
              <span className="text-[11px] font-mono-caps text-[#94a3b8] uppercase block font-semibold">Academic Evaluation Details</span>
              <div className="text-white">
                <span className="text-[#94a3b8]">Background:</span> {application.background || 'Not specified'}
              </div>
              <div className="text-white">
                <span className="text-[#94a3b8]">Python Proficiency:</span> {application.pythonProficiency || 'Intermediate'}
              </div>
            </div>
          </div>

          {/* Rich Text Preview & Email Dispatch Studio */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#000f21] border border-[#334155] space-y-4">
            {/* Studio Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#334155]/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#102034] text-[#41e4c0] flex items-center justify-center border border-[#41e4c0]/30">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-mono-caps text-white font-bold block">
                    2. Decision Email Studio & Rich Preview ({status.toUpperCase()})
                  </span>
                  <span className="text-[11px] text-[#94a3b8] block">
                    Edit templates, insert dynamic institutional clauses, and verify layout in real-time
                  </span>
                </div>
              </div>

              {/* View Mode Toggle Controls */}
              <div className="flex items-center gap-1 bg-[#00172e] p-1 rounded-xl border border-[#334155]">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono-caps transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-[#41e4c0] text-[#031427] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editor</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono-caps transition-all flex items-center gap-1.5 cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-[#41e4c0] text-[#031427] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Rich Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`hidden md:flex px-3 py-1 rounded-lg text-xs font-mono-caps transition-all items-center gap-1.5 cursor-pointer ${
                    viewMode === 'split'
                      ? 'bg-[#41e4c0] text-[#031427] font-bold'
                      : 'text-[#94a3b8] hover:text-white'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Split View</span>
                </button>
              </div>
            </div>

            {/* Template Presets & Formatting Helpers */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#00172e]/60 p-3 rounded-xl border border-[#334155]/60 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[#94a3b8] font-mono-caps text-[11px]">Template Variant:</span>
                
                {status === 'accepted' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('standard')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'standard'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Standard Admission
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('grant')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'grant'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Merit GPU Grant
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('conditional')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'conditional'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Conditional Offer
                    </button>
                  </>
                )}

                {status === 'under_review' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('standard')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'standard'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Review Notice
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('interview')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'interview'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Interview Invitation
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('github_request')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'github_request'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      GitHub Portfolio Request
                    </button>
                  </>
                )}

                {status === 'waitlisted' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('standard')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'standard'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Priority Waitlist
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('guaranteed_rollover')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'guaranteed_rollover'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Guaranteed Next Intake
                    </button>
                  </>
                )}

                {status === 'rejected' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('standard')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'standard'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Standard Notice
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTemplateVariant('prep_track')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono-caps border transition-all cursor-pointer ${
                        selectedTemplateVariant === 'prep_track'
                          ? 'bg-[#41e4c0]/20 text-[#41e4c0] border-[#41e4c0]'
                          : 'bg-[#000f21] text-[#94a3b8] border-[#334155] hover:text-white'
                      }`}
                    >
                      Prep Track Recommendation
                    </button>
                  </>
                )}

                {status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateVariant('standard')}
                    className="px-2.5 py-1 rounded-lg text-xs font-mono-caps bg-[#41e4c0]/20 text-[#41e4c0] border border-[#41e4c0]"
                  >
                    Standard Receipt
                  </button>
                )}
              </div>

              {/* Reset to Base Template */}
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-xs text-[#94a3b8] hover:text-white flex items-center gap-1 font-mono cursor-pointer transition-colors"
                title="Reset Subject and Body to Default"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </div>

            {/* Enclosed Program PDF Documents & Syllabi Selector */}
            <div className="p-4 rounded-xl bg-[#00172e] border border-[#334155] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#334155]/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-mono-caps text-white font-bold block">
                      Program Syllabus & Document Enclosures
                    </span>
                    <span className="text-[10px] text-[#94a3b8] font-mono block">
                      Tailored to: <strong className="text-[#41e4c0]">{application.courseTitle || 'Chosen Program'}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#000f21] text-[#41e4c0] border border-[#334155]">
                    {selectedDocIds.length} of {availableDocs.length} attached
                  </span>
                  <button
                    type="button"
                    onClick={handleSelectAllDocs}
                    className="text-[11px] text-[#94a3b8] hover:text-white font-mono cursor-pointer px-2 py-1 rounded bg-[#102034] hover:bg-[#18314e] border border-[#334155] transition-colors"
                  >
                    {selectedDocIds.length === availableDocs.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedDocIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDownloadAllSelectedDocs}
                      className="text-[11px] text-[#41e4c0] hover:text-[#38debb] font-mono cursor-pointer px-2.5 py-1 rounded bg-[#102034] hover:bg-[#18314e] border border-[#41e4c0]/30 transition-colors flex items-center gap-1"
                      title="Download all selected PDF documents to your machine"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download All ({selectedDocIds.length})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Document List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {availableDocs.map((docItem) => {
                  const isAttached = selectedDocIds.includes(docItem.id);
                  return (
                    <div
                      key={docItem.id}
                      className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                        isAttached
                          ? 'bg-[#000f21] border-[#41e4c0]/50 shadow-sm shadow-[#41e4c0]/5'
                          : 'bg-[#000f21]/60 border-[#334155]/60 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleDocAttachment(docItem.id)}
                          className="mt-0.5 text-xs text-[#94a3b8] hover:text-[#41e4c0] cursor-pointer shrink-0 transition-colors"
                          title={isAttached ? 'Uncheck to detach from email' : 'Check to attach to email'}
                        >
                          {isAttached ? (
                            <CheckSquare className="w-4 h-4 text-[#41e4c0]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#64748b]" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-white block">
                              {docItem.name}
                            </span>
                            {docItem.badge && (
                              <span className="text-[9px] font-mono-caps px-1.5 py-0.2 rounded bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30">
                                {docItem.badge}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#94a3b8] font-mono block mt-0.5">
                            {docItem.filename} • {docItem.sizeEstimate}
                          </span>
                          <p className="text-[11px] text-[#cbd5e1] mt-1 leading-relaxed line-clamp-2">
                            {docItem.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#334155]/40 text-xs">
                        <span className={`text-[10px] font-mono flex items-center gap-1 ${isAttached ? 'text-[#41e4c0]' : 'text-[#64748b]'}`}>
                          <Paperclip className="w-3 h-3" />
                          {isAttached ? 'Enclosed in Email' : 'Not Attached'}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDownloadDoc(docItem)}
                            className="px-2 py-1 rounded bg-[#102034] hover:bg-[#18314e] text-[#94a3b8] hover:text-white border border-[#334155] text-[10px] font-mono cursor-pointer flex items-center gap-1 transition-colors"
                            title="Generate and download a local copy of this PDF"
                          >
                            <Download className="w-3 h-3 text-[#41e4c0]" />
                            <span>Preview / Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleDocAttachment(docItem.id)}
                            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
                              isAttached
                                ? 'bg-[#41e4c0]/20 text-[#41e4c0] border border-[#41e4c0]/40'
                                : 'bg-[#00172e] text-[#94a3b8] hover:text-white border border-[#334155]'
                            }`}
                          >
                            {isAttached ? 'Attached ✓' : '+ Attach to Email'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Editor / Preview Studio Body */}
            <div className={`grid gap-4 ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {/* Left Column: Interactive Content Editor */}
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="space-y-3 bg-[#00172e] p-4 rounded-xl border border-[#334155]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono-caps text-[#41e4c0] font-bold uppercase">
                      Email Content Editor
                    </span>
                    <span className="text-[11px] text-[#64748b] font-mono">
                      {customBody.length} chars • {customBody.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-mono-caps text-[#94a3b8]">Subject Header</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (!customSubject.includes(candidateName)) {
                            setCustomSubject((prev) => `${prev} — ${candidateName}`);
                          }
                        }}
                        className="text-[10px] text-[#41e4c0] hover:underline font-mono cursor-pointer flex items-center gap-1"
                        title="Append candidate name to subject line"
                      >
                        <Tag className="w-2.5 h-2.5" />
                        <span>+ Inject Name</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full bg-[#000f21] border border-[#334155] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#41e4c0]"
                    />
                  </div>

                  {/* Insertable Dynamic Variables & Quick Clauses */}
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-mono-caps text-[#41e4c0] uppercase block font-semibold mb-1">
                        Dynamic Candidate Fields (Click to insert):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertVariable(candidateName, 'Candidate Name')}
                          className="px-2 py-0.5 rounded bg-[#000f21] hover:bg-[#102034] text-emerald-300 border border-emerald-500/40 text-[10px] font-mono cursor-pointer flex items-center gap-1 transition-all"
                          title="Insert resolved candidate full name"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>Candidate: <strong>{candidateName}</strong></span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertVariable(application.courseTitle || 'Applied Program', 'Course Title')}
                          className="px-2 py-0.5 rounded bg-[#000f21] hover:bg-[#102034] text-cyan-300 border border-cyan-500/40 text-[10px] font-mono cursor-pointer flex items-center gap-1 transition-all"
                          title="Insert program title"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>Course: <strong>{application.courseTitle || 'Applied Program'}</strong></span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertVariable(application.email, 'Candidate Email')}
                          className="px-2 py-0.5 rounded bg-[#000f21] hover:bg-[#102034] text-slate-300 border border-slate-500/40 text-[10px] font-mono cursor-pointer flex items-center gap-1 transition-all"
                          title="Insert candidate email"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          <span>Email: <strong>{application.email}</strong></span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono-caps text-[#94a3b8] uppercase block mb-1">Quick Add Clauses:</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInsertSnippet('Next Steps:\n1. Complete candidate verification.\n2. Access orientation materials.')}
                          className="px-2 py-0.5 rounded bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] border border-[#41e4c0]/30 text-[10px] font-mono cursor-pointer"
                        >
                          + Next Steps Block
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSnippet('Prerequisites:\n- Python 3.10+ proficiency\n- Fundamental linear algebra')}
                          className="px-2 py-0.5 rounded bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] border border-[#41e4c0]/30 text-[10px] font-mono cursor-pointer"
                        >
                          + Prereqs List
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsertSnippet('Note: GPU cluster allocation is provisioned via Institute of AI Sandbox.')}
                          className="px-2 py-0.5 rounded bg-[#102034] hover:bg-[#18314e] text-[#41e4c0] border border-[#41e4c0]/30 text-[10px] font-mono cursor-pointer"
                        >
                          + GPU Sandbox Note
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono-caps text-[#94a3b8] mb-1">Message Body</label>
                    <textarea
                      rows={viewMode === 'split' ? 12 : 16}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      placeholder="Type official email message body..."
                      className="w-full bg-[#000f21] border border-[#334155] rounded-xl p-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#41e4c0] resize-y"
                    />
                  </div>
                </div>
              )}

              {/* Right Column: Live Rich HTML / Email Preview Window */}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-mono-caps text-[#41e4c0] font-bold uppercase flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      Live Formatted Email Preview
                    </span>
                    <span className="text-[11px] text-[#94a3b8] font-mono">
                      Real-time Institutional Output
                    </span>
                  </div>

                  <EmailRichPreview
                    subject={customSubject}
                    bodyText={customBody}
                    recipientEmail={application.email}
                    recipientName={candidateName}
                    status={status}
                    courseTitle={application.courseTitle || 'Applied Program'}
                    senderEmail={currentAdminEmail}
                    attachments={previewAttachments}
                  />
                </div>
              )}
            </div>

            {/* Quick Mailto Fallback Link */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#334155]/60">
              <span className="text-[#94a3b8]">
                Recipient: <strong className="text-white">{application.email}</strong>
              </span>
              <a
                href={mailtoUrl}
                className="text-[#41e4c0] hover:underline flex items-center gap-1 font-mono text-[11px]"
              >
                <span>Open in Desktop Mail Client (Mailto Fallback)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Reviewer Internal Notes */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider font-bold">
              3. Faculty / Admissions Committee Internal Notes (Database Only)
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Add internal evaluation comments, interview score, or prerequisite verification notes (not shared with applicant)..."
              className="w-full bg-[#0b1c30] border border-[#334155] rounded-xl p-3 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#334155] bg-[#000f21] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleSendDecisionLetter}
            disabled={isSendingEmail}
            className="px-4 py-2.5 rounded-xl bg-[#102034] hover:bg-[#18314e] border border-[#41e4c0]/40 text-[#41e4c0] font-mono-caps text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-md"
          >
            {isSendingEmail ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching via Gmail API...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch {status.toUpperCase()} Email via Gmail API</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSaveReview}
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#38debb] text-[#031427] font-bold text-xs font-mono-caps flex items-center gap-2 shadow-lg shadow-[#41e4c0]/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Save Review Status</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
