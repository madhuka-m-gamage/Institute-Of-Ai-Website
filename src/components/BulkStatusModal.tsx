import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { doc, writeBatch } from 'firebase/firestore';
import { logAdminAction } from '../services/auditLog';
import { StudentApplication, ApplicationStatus, getCandidateName } from '../types';
import { StatusBadge } from './StatusBadge';
import {
  Layers,
  CheckCircle2,
  X,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  FileText,
  Users
} from 'lucide-react';

interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedApplications: StudentApplication[];
  currentAdminEmail: string;
  onBulkUpdated: (updatedApplications: StudentApplication[]) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

export const BulkStatusModal: React.FC<BulkStatusModalProps> = ({
  isOpen,
  onClose,
  selectedApplications,
  currentAdminEmail,
  onBulkUpdated,
  onAddToast,
}) => {
  const [targetStatus, setTargetStatus] = useState<ApplicationStatus>('accepted');
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyBulkStatus = async () => {
    if (selectedApplications.length === 0) return;

    setIsUpdating(true);
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().toISOString();
      const updatedList: StudentApplication[] = [];

      selectedApplications.forEach((app) => {
        const appRef = doc(db, 'applications', app.id);
        const updateData = {
          status: targetStatus,
          notes: batchNotes ? `${app.notes ? app.notes + '\n\n' : ''}[Batch Update]: ${batchNotes}` : app.notes || '',
          reviewedAt: timestamp,
          reviewedBy: currentAdminEmail,
        };

        batch.update(appRef, updateData);

        updatedList.push({
          ...app,
          ...updateData,
        });
      });

      await batch.commit();

      await logAdminAction({
        action: `Bulk Status Update: ${selectedApplications.length} candidate(s) transitioned to ${targetStatus.toUpperCase()}`,
        entityType: 'application',
        details: `Application IDs: ${selectedApplications.map((a) => a.id).join(', ')}. Batch Note: ${batchNotes || 'None'}.`,
        newStatus: targetStatus,
        recipientCount: selectedApplications.length,
        activityType: 'bulk_status',
      });

      onBulkUpdated(updatedList);
      if (onAddToast) {
        onAddToast(
          'Bulk Status Updated',
          `Successfully updated ${selectedApplications.length} applicant(s) to ${targetStatus.replace('_', ' ').toUpperCase()}`,
          'success'
        );
      }
      onClose();
    } catch (err: any) {
      console.error('Bulk status update error:', err);
      if (onAddToast) {
        onAddToast('Bulk Update Failed', err.message || 'Could not update records in Firestore', 'error');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className="relative w-full max-w-lg rounded-3xl bg-[#000f21] border border-[#334155] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#334155] bg-[#00172e] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Bulk Status Update</h3>
              <p className="text-[11px] text-[#94a3b8]">
                Updating {selectedApplications.length} selected candidate(s)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="p-1.5 rounded-lg text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Target Status Choice */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
              New Candidate Status
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'accepted', label: 'Accepted' },
                { val: 'under_review', label: 'Under Review' },
                { val: 'waitlisted', label: 'Waitlisted' },
                { val: 'rejected', label: 'Declined' },
                { val: 'submitted', label: 'Submitted (Reset)' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setTargetStatus(item.val as ApplicationStatus)}
                  className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    targetStatus === item.val
                      ? 'bg-[#41e4c0]/15 border-[#41e4c0] text-white font-bold'
                      : 'bg-[#00172e] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#41e4c0]/20'
                  }`}
                >
                  <span>{item.label}</span>
                  <StatusBadge status={item.val as ApplicationStatus} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Target Candidate Summary */}
          <div className="p-3 rounded-xl bg-[#00172e] border border-[#334155] space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-[#94a3b8] font-mono text-[11px]">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3 text-[#41e4c0]" />
                Selected Candidates ({selectedApplications.length}):
              </span>
            </div>
            <div className="max-h-24 overflow-y-auto pr-1 space-y-1">
              {selectedApplications.map((app) => (
                <div key={app.id} className="flex items-center justify-between text-[11px] text-[#cbd5e1] font-mono">
                  <span>{getCandidateName(app)}</span>
                  <span className="text-[#94a3b8]">{app.courseTitle || (app as any).courseName || 'Track'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Batch Evaluation Note */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
              Batch Review Note (Optional)
            </label>
            <textarea
              rows={2}
              value={batchNotes}
              onChange={(e) => setBatchNotes(e.target.value)}
              placeholder="e.g., Bulk approved following faculty admissions round..."
              className="w-full px-3 py-2 rounded-xl bg-[#00172e] border border-[#334155] text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0] font-mono resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#334155] bg-[#00172e] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl bg-[#000f21] hover:bg-[#102034] text-xs font-mono-caps text-[#cbd5e1] border border-[#334155] transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyBulkStatus}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl bg-[#41e4c0] hover:bg-[#38debb] text-black font-bold text-xs font-mono-caps transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Applying to {selectedApplications.length}...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Update {selectedApplications.length} Candidate(s)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
