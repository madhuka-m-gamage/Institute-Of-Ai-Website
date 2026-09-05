import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { sendGmailMessage } from '../services/workspace';
import { EmailRichPreview } from './EmailRichPreview';
import {
  X,
  Building2,
  Mail,
  User,
  Phone,
  Clock,
  Sparkles,
  ExternalLink,
  Send,
  CheckCircle,
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Edit3,
  Eye,
  Columns,
  RotateCcw
} from 'lucide-react';

interface EnterpriseInquiryModalProps {
  inquiry: any;
  onClose: () => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
  accessToken?: string;
  currentAdminEmail?: string;
  onConnectGoogle?: () => Promise<void>;
}

export const EnterpriseInquiryModal: React.FC<EnterpriseInquiryModalProps> = ({
  inquiry,
  onClose,
  onAddToast,
  accessToken,
  currentAdminEmail = 'admin@instituteofai.com',
  onConnectGoogle,
}) => {
  const [isSending, setIsSending] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('edit');
  
  const defaultSubject = `[Institute of AI] Enterprise AI Enablement Scope - ${inquiry.companyName || 'Corporate Program'}`;
  const defaultBody = `Dear ${inquiry.contactName || 'Team'},\n\nThank you for reaching out regarding enterprise AI upskilling for ${inquiry.companyName || 'your organization'}.\n\nOur institutional enterprise curriculum covers customized sandbox architectures, multi-agent LLM systems, and local GPU cluster environments for engineering teams.\n\nNext Steps:\n1. We have scheduled our technical director to prepare a customized scope presentation for your team of ${inquiry.teamSize || 'engineers'}.\n2. A private GPU sandbox test environment will be provisioned for evaluation.\n\nSincerely,\nInstitute of AI - Enterprise Division\nColombo Tech Park`;

  const [customSubject, setCustomSubject] = useState(defaultSubject);
  const [customBody, setCustomBody] = useState(defaultBody);

  const handleSendFollowUp = async () => {
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

    setIsSending(true);
    try {
      await sendGmailMessage(accessToken, inquiry.workEmail, customSubject, customBody);

      // Audit log entry
      try {
        await addDoc(collection(db, 'adminAuditLogs'), {
          timestamp: new Date().toISOString(),
          actorEmail: currentAdminEmail,
          action: `Dispatched enterprise scope to ${inquiry.workEmail}`,
          entityType: 'enterprise_inquiry',
          entityId: inquiry.id,
          details: `Company: ${inquiry.companyName}, Team: ${inquiry.teamSize}. Subject: ${customSubject}`,
        });
      } catch (auditErr) {
        console.warn('Audit log write error:', auditErr);
      }

      if (onAddToast) {
        onAddToast('Enterprise Response Sent', `Proposal email dispatched to ${inquiry.workEmail}`, 'success');
      }
      onClose();
    } catch (err: any) {
      console.error('Enterprise follow-up error:', err);
      if (onAddToast) {
        onAddToast('Dispatch Error', err.message || 'Could not send email', 'error');
      }
    } finally {
      setIsSending(false);
    }
  };

  const mailtoUrl = `mailto:${encodeURIComponent(inquiry.workEmail || '')}?subject=${encodeURIComponent(
    customSubject
  )}&body=${encodeURIComponent(customBody)}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#000814]/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#00172e] border border-[#44474d]/50 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#334155] flex items-center justify-between bg-[#000f21] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1b263b] border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
                {inquiry.companyName || 'Enterprise Inquiry'}
              </h2>
              <span className="text-xs text-[#41e4c0] font-mono-caps">
                Team Size: {inquiry.teamSize || 'Custom Scope'} • Focus: {inquiry.primaryFocus || 'AI Enablement'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#94a3b8] hover:text-white rounded-lg hover:bg-[#102034] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm flex-1">
          {/* Token warning */}
          {!accessToken && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-200 block">Google Workspace Authorization Required for Gmail API</span>
                  <p className="text-[#94a3b8]">
                    Connect your institutional Google account with Gmail permissions to dispatch enterprise scopes directly.
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

          {/* Key Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#000f21] border border-[#334155] space-y-1 text-xs">
              <span className="text-[11px] font-mono-caps text-[#41e4c0] uppercase block">Lead Sponsor</span>
              <div className="text-white font-bold">{inquiry.contactName || 'Corporate Representative'}</div>
              <div className="text-[#94a3b8] flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#41e4c0]" />
                <span className="font-mono">{inquiry.workEmail}</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#000f21] border border-[#334155] space-y-1 text-xs">
              <span className="text-[11px] font-mono-caps text-[#41e4c0] uppercase block">Timeline & Requirements</span>
              <div className="text-white font-medium">Timeline: {inquiry.timeline || 'Upcoming Quarter'}</div>
              <div className="text-[#94a3b8] text-[11px]">
                {inquiry.customRequirements || 'Standard institutional corporate enablement track.'}
              </div>
            </div>
          </div>

          {/* Email Composer & Preview Studio */}
          <div className="p-4 rounded-xl bg-[#000f21] border border-[#334155] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#334155]/60">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#41e4c0]" />
                <span className="text-xs font-mono-caps text-white font-bold">
                  Enterprise Proposal Dispatch Studio
                </span>
              </div>

              <div className="flex items-center gap-1 bg-[#00172e] p-1 rounded-lg border border-[#334155]">
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono-caps transition-all cursor-pointer ${
                    viewMode === 'edit' ? 'bg-[#41e4c0] text-[#031427] font-bold' : 'text-[#94a3b8]'
                  }`}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-0.5 rounded text-xs font-mono-caps transition-all cursor-pointer ${
                    viewMode === 'preview' ? 'bg-[#41e4c0] text-[#031427] font-bold' : 'text-[#94a3b8]'
                  }`}
                >
                  Rich Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`hidden sm:inline-block px-2.5 py-0.5 rounded text-xs font-mono-caps transition-all cursor-pointer ${
                    viewMode === 'split' ? 'bg-[#41e4c0] text-[#031427] font-bold' : 'text-[#94a3b8]'
                  }`}
                >
                  Split View
                </button>
              </div>
            </div>

            <div className={`grid gap-3 ${viewMode === 'split' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="space-y-2 bg-[#00172e] p-3 rounded-lg border border-[#334155]">
                  <div>
                    <label className="block text-[10px] font-mono-caps text-[#94a3b8] mb-1">Subject Line</label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      className="w-full bg-[#000f21] border border-[#334155] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#41e4c0]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono-caps text-[#94a3b8] mb-1">Proposal Body Content</label>
                    <textarea
                      rows={viewMode === 'split' ? 9 : 12}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      className="w-full bg-[#000f21] border border-[#334155] rounded-lg p-2.5 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-[#41e4c0] resize-y"
                    />
                  </div>
                </div>
              )}

              {(viewMode === 'preview' || viewMode === 'split') && (
                <EmailRichPreview
                  subject={customSubject}
                  bodyText={customBody}
                  recipientEmail={inquiry.workEmail}
                  recipientName={inquiry.contactName || 'Lead Sponsor'}
                  status={'accepted' as any}
                  courseTitle={`Enterprise Scope: ${inquiry.companyName || 'Corporate'}`}
                  senderEmail={currentAdminEmail}
                />
              )}
            </div>

            {/* Mailto Fallback Link */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-[#334155]/60">
              <span className="text-[#94a3b8]">
                Recipient: <strong className="text-white">{inquiry.workEmail}</strong>
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
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-[#334155] bg-[#000f21] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleSendFollowUp}
            disabled={isSending}
            className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#38debb] text-[#031427] font-bold text-xs font-mono-caps flex items-center gap-2 shadow-lg shadow-[#41e4c0]/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSending ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Dispatching Proposal...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Dispatch Enterprise Proposal Scope</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
