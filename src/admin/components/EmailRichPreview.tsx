import React from 'react';
import { ApplicationStatus } from '../../types';
import { Mail, CheckCircle2, AlertCircle, Clock, ShieldAlert, Sparkles, Building2, ExternalLink, FileText, Download, Paperclip } from 'lucide-react';

export interface EmailPreviewAttachment {
  id: string;
  name: string;
  filename: string;
  description?: string;
  sizeEstimate?: string;
  badge?: string;
  onPreviewDownload?: () => void;
}

interface EmailRichPreviewProps {
  subject: string;
  bodyText: string;
  recipientEmail: string;
  recipientName: string;
  status: ApplicationStatus;
  courseTitle: string;
  senderEmail?: string;
  attachments?: EmailPreviewAttachment[];
}

export const EmailRichPreview: React.FC<EmailRichPreviewProps> = ({
  subject,
  bodyText,
  recipientEmail,
  recipientName,
  status,
  courseTitle,
  senderEmail = 'admissions@instituteofai.com',
  attachments = [],
}) => {
  const safeRecipientName = (recipientName && recipientName.toLowerCase() !== 'undefined' && recipientName.toLowerCase() !== 'null')
    ? recipientName
    : (recipientEmail && recipientEmail.includes('@')
        ? recipientEmail.split('@')[0].replace(/[._+-]+/g, ' ').replace(/[0-9]+/g, '').trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') || 'Candidate'
        : 'Candidate');
  const getStatusBadge = () => {
    switch (status) {
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono-caps font-bold border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Admitted / Accepted
          </span>
        );
      case 'waitlisted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-mono-caps font-bold border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Priority Waitlist
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-mono-caps font-bold border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Under Evaluation
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-mono-caps font-bold border border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Not Admitted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-300 text-xs font-mono-caps font-bold border border-slate-500/30">
            <AlertCircle className="w-3.5 h-3.5" />
            Application Received
          </span>
        );
    }
  };

  // Convert plain text body into formatted paragraphs and lists
  const formatBodyContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed === '') {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${idx}`} className="text-slate-300 leading-relaxed my-2 text-[13px]">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
      } else if (trimmed.startsWith('1.') || trimmed.startsWith('2.') || trimmed.startsWith('3.') || trimmed.startsWith('4.') || trimmed.startsWith('5.')) {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${idx}`} className="text-slate-300 leading-relaxed my-2 text-[13px]">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        elements.push(
          <div key={`list-${idx}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-[13px] text-slate-200">
            <span className="w-5 h-5 rounded-full bg-[#102034] text-[#41e4c0] text-[11px] font-mono font-bold flex items-center justify-center shrink-0 border border-[#41e4c0]/30 mt-0.5">
              {trimmed.substring(0, 1)}
            </span>
            <span className="leading-snug">{trimmed.substring(2).trim()}</span>
          </div>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${idx}`} className="text-slate-300 leading-relaxed my-2 text-[13px]">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        elements.push(
          <div key={`bullet-${idx}`} className="flex items-start gap-2 my-1 pl-3 text-[13px] text-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-[#41e4c0] mt-2 shrink-0" />
            <span className="leading-snug">{trimmed.substring(2).trim()}</span>
          </div>
        );
      } else if (trimmed.startsWith('Next Steps:') || trimmed.startsWith('Prerequisites:') || trimmed.startsWith('Important Notice:')) {
        if (currentParagraph.length > 0) {
          elements.push(
            <p key={`p-${idx}`} className="text-slate-300 leading-relaxed my-2 text-[13px]">
              {currentParagraph.join(' ')}
            </p>
          );
          currentParagraph = [];
        }
        elements.push(
          <h4 key={`h-${idx}`} className="text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider font-bold mt-3 mb-1">
            {trimmed}
          </h4>
        );
      } else {
        currentParagraph.push(line);
      }
    });

    if (currentParagraph.length > 0) {
      elements.push(
        <p key="p-last" className="text-slate-300 leading-relaxed my-2 text-[13px]">
          {currentParagraph.join(' ')}
        </p>
      );
    }

    return elements;
  };

  return (
    <div className="bg-[#001020] rounded-xl border border-[#334155] overflow-hidden shadow-xl text-left font-sans">
      {/* Simulated Email Client Bar */}
      <div className="bg-[#000a14] px-4 py-2.5 border-b border-[#334155] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[#94a3b8] text-[11px] ml-2">Official Gmail Preview Client</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Email Metadata Envelope */}
      <div className="p-4 bg-[#001429] border-b border-[#334155]/60 space-y-2 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[#94a3b8] font-mono-caps text-[11px] w-12">From:</span>
            <span className="text-white font-medium">Institute of AI Admissions</span>
            <span className="text-[#64748b] font-mono text-[11px]">&lt;{senderEmail}&gt;</span>
          </div>
          <span className="text-[#64748b] text-[11px] font-mono">
            {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[#94a3b8] font-mono-caps text-[11px] w-12">To:</span>
          <span className="text-[#41e4c0] font-medium">{safeRecipientName}</span>
          <span className="text-[#94a3b8] font-mono text-[11px]">&lt;{recipientEmail}&gt;</span>
        </div>

        <div className="flex items-start gap-2 pt-1 border-t border-[#334155]/40">
          <span className="text-[#94a3b8] font-mono-caps text-[11px] w-12 shrink-0 mt-0.5">Subject:</span>
          <span className="text-white font-bold text-xs sm:text-sm leading-snug">{subject}</span>
        </div>
      </div>

      {/* Rendered Email Body (Institutional Letterhead) */}
      <div className="p-5 sm:p-7 space-y-5 bg-[#001020]">
        {/* Letterhead Banner */}
        <div className="flex items-center justify-between pb-4 border-b border-[#334155]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#102034] border border-[#41e4c0]/50 flex items-center justify-center text-[#41e4c0]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-mono-caps font-bold text-white tracking-wider block">
                INSTITUTE OF AI
              </span>
              <span className="text-[10px] text-[#41e4c0] font-mono block">
                Admissions & Academic Registry • Colombo Tech Park
              </span>
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#64748b] bg-[#00172e] px-2 py-1 rounded border border-[#334155]">
            Track: {courseTitle}
          </span>
        </div>

        {/* Formatted Content */}
        <div className="space-y-1 bg-[#00172e]/60 p-4 sm:p-5 rounded-xl border border-[#334155]/40">
          {formatBodyContent(bodyText)}
        </div>

        {/* Conditional Action Buttons in Email (Interactive mockup) */}
        {status === 'accepted' && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#102034] to-[#00172e] border border-[#41e4c0]/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <span className="text-xs font-bold text-white block">Admitted Student Sandbox Portal</span>
              <span className="text-[11px] text-[#94a3b8] block">Activate your GPU sandbox workspace and syllabus access</span>
            </div>
            <div className="px-4 py-2 rounded-lg bg-[#41e4c0] text-[#031427] text-xs font-bold font-mono-caps flex items-center gap-1.5 shrink-0 shadow-md shadow-[#41e4c0]/20 pointer-events-none opacity-90">
              <span>Open Student Hub</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        )}

        {/* Attached PDF Enclosures & Syllabi */}
        {attachments && attachments.length > 0 && (
          <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-caps text-[#41e4c0] uppercase font-bold flex items-center gap-1.5">
                <Paperclip className="w-3 h-3 text-[#41e4c0]" />
                Attached Document Enclosures ({attachments.length})
              </span>
              <span className="text-[10px] text-[#94a3b8] font-mono">
                Official PDF MIME Enclosure
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="p-2.5 rounded-lg bg-[#000f21] border border-[#334155]/80 hover:border-[#41e4c0]/50 transition-colors flex items-center justify-between gap-2 text-xs group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-white font-medium block truncate text-[11px] group-hover:text-[#41e4c0] transition-colors">
                        {att.filename}
                      </span>
                      <span className="text-[10px] text-[#94a3b8] font-mono block">
                        PDF • {att.sizeEstimate || '190 KB'} {att.badge ? `• ${att.badge}` : ''}
                      </span>
                    </div>
                  </div>

                  {att.onPreviewDownload && (
                    <button
                      type="button"
                      onClick={att.onPreviewDownload}
                      className="p-1 text-[#94a3b8] hover:text-[#41e4c0] hover:bg-[#102034] rounded transition-colors shrink-0 cursor-pointer"
                      title={`Preview / Download ${att.filename}`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Official Email Signature */}
        <div className="pt-4 border-t border-[#334155]/60 text-xs text-[#94a3b8] space-y-1 font-mono">
          <div className="text-white font-bold font-sans text-xs">Admissions Committee & Academic Senate</div>
          <div className="text-[11px] text-[#41e4c0]">Institute of AI - Center for Advanced Machine Intelligence</div>
          <div className="text-[10px] text-[#64748b]">Colombo Tech Park, Sri Lanka • https://instituteofai.com</div>
          <div className="text-[9px] text-[#475569] pt-2">
            This official communication was cryptographically signed and dispatched via authorized Google Workspace API services.
          </div>
        </div>
      </div>
    </div>
  );
};
