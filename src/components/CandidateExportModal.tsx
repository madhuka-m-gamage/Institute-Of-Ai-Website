import React, { useState, useMemo } from 'react';
import { logAdminAction } from '../services/auditLog';
import { StudentApplication } from '../types';
import { generateCandidateCsv, downloadCsvString, CsvExportOptions } from '../services/csvExport';
import {
  Download,
  FileSpreadsheet,
  X,
  CheckCircle2,
  Filter,
  CheckSquare,
  Layers,
  Sparkles,
  ShieldCheck,
  FileText,
  Users
} from 'lucide-react';

interface CandidateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  allApplications: StudentApplication[];
  filteredApplications: StudentApplication[];
  selectedAppIds: string[];
  currentStatusFilter: string;
  currentSearchQuery: string;
  currentAdminEmail: string;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

export const CandidateExportModal: React.FC<CandidateExportModalProps> = ({
  isOpen,
  onClose,
  allApplications,
  filteredApplications,
  selectedAppIds,
  currentStatusFilter,
  currentSearchQuery,
  currentAdminEmail,
  onAddToast,
}) => {
  // Scope selection: 'filtered' | 'all' | 'selected'
  const [exportScope, setExportScope] = useState<'filtered' | 'all' | 'selected'>(() => {
    if (selectedAppIds.length > 0) return 'selected';
    if (currentStatusFilter !== 'all' || currentSearchQuery) return 'filtered';
    return 'all';
  });

  const [preset, setPreset] = useState<'comprehensive' | 'standard' | 'contact_only'>('comprehensive');
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);
  const [includeGoals, setIncludeGoals] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Determine active candidate array based on chosen scope
  const targetApplications = useMemo(() => {
    if (exportScope === 'selected') {
      return allApplications.filter((a) => selectedAppIds.includes(a.id));
    }
    if (exportScope === 'filtered') {
      return filteredApplications;
    }
    return allApplications;
  }, [exportScope, allApplications, filteredApplications, selectedAppIds]);

  // Statistics for the chosen scope
  const stats = useMemo(() => {
    const counts = {
      total: targetApplications.length,
      accepted: 0,
      under_review: 0,
      submitted: 0,
      waitlisted: 0,
      rejected: 0,
      decisionSent: 0,
    };

    targetApplications.forEach((a) => {
      const s = a.status || 'submitted';
      if (s === 'accepted') counts.accepted++;
      else if (s === 'under_review') counts.under_review++;
      else if (s === 'waitlisted') counts.waitlisted++;
      else if (s === 'rejected') counts.rejected++;
      else counts.submitted++;

      if (a.decisionLetterSent) counts.decisionSent++;
    });

    return counts;
  }, [targetApplications]);

  if (!isOpen) return null;

  const handleExecuteExport = async () => {
    if (targetApplications.length === 0) {
      if (onAddToast) {
        onAddToast('No Records', 'There are no candidate records in the selected export scope.', 'error');
      }
      return;
    }

    setIsExporting(true);

    try {
      const scopeTag =
        exportScope === 'selected'
          ? `Selected_${selectedAppIds.length}`
          : exportScope === 'filtered'
          ? `Filtered_${currentStatusFilter !== 'all' ? currentStatusFilter : 'Custom'}`
          : 'All_Candidates';

      const options: CsvExportOptions = {
        scopeLabel: scopeTag,
        preset,
        includeNotes,
        includeGoals,
        includeDecisionAudit: true,
      };

      const result = generateCandidateCsv(targetApplications, options);
      const success = downloadCsvString(result.filename, result.csvString);

      if (success) {
        await logAdminAction({
          action: `Candidate Report CSV Exported (${result.count} records)`,
          entityType: 'report',
          details: `Filename: ${result.filename}. Scope: ${exportScope.toUpperCase()}. Preset: ${preset.toUpperCase()}. Filter: ${currentStatusFilter}. Search: "${currentSearchQuery || 'None'}".`,
        });

        if (onAddToast) {
          onAddToast(
            'CSV Report Generated',
            `Exported ${result.count} candidate record(s) to "${result.filename}" with UTF-8 encoding.`,
            'success'
          );
        }
        onClose();
      } else {
        throw new Error('Could not trigger browser file download');
      }
    } catch (err: any) {
      console.error('CSV export failure:', err);
      if (onAddToast) {
        onAddToast('Export Failed', err.message || 'An error occurred during CSV creation.', 'error');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div
        className="relative w-full max-w-2xl my-auto rounded-3xl bg-[#000f21] border border-[#334155] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#334155] bg-[#00172e] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Candidate Admissions CSV Reporting
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-caps bg-[#41e4c0]/15 text-[#41e4c0] border border-[#41e4c0]/30">
                  Excel & Sheets Ready
                </span>
              </h2>
              <p className="text-xs text-[#94a3b8]">
                Export candidate enrollment applications, admissions statuses, notes, and metrics.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="p-2 rounded-xl text-[#94a3b8] hover:text-white hover:bg-[#102034] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Export Scope Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
              1. Select Export Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Option: Current Filtered View */}
              <button
                type="button"
                onClick={() => setExportScope('filtered')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  exportScope === 'filtered'
                    ? 'bg-[#41e4c0]/15 border-[#41e4c0] text-white shadow-xs'
                    : 'bg-[#00172e] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#41e4c0]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Filter className="w-4 h-4 text-[#41e4c0]" />
                  <span className="text-base font-bold font-mono text-white">
                    {filteredApplications.length}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Filtered View</span>
                  <span className="text-[10px] text-[#94a3b8]">
                    Status: {currentStatusFilter.toUpperCase()}
                  </span>
                </div>
              </button>

              {/* Option: All Candidates */}
              <button
                type="button"
                onClick={() => setExportScope('all')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  exportScope === 'all'
                    ? 'bg-[#41e4c0]/15 border-[#41e4c0] text-white shadow-xs'
                    : 'bg-[#00172e] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#41e4c0]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Users className="w-4 h-4 text-[#41e4c0]" />
                  <span className="text-base font-bold font-mono text-white">
                    {allApplications.length}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">All Candidates</span>
                  <span className="text-[10px] text-[#94a3b8]">Complete master registry</span>
                </div>
              </button>

              {/* Option: Selected Only */}
              <button
                type="button"
                disabled={selectedAppIds.length === 0}
                onClick={() => setExportScope('selected')}
                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                  selectedAppIds.length === 0
                    ? 'bg-[#00172e]/40 border-[#334155]/40 text-[#64748b] cursor-not-allowed'
                    : exportScope === 'selected'
                    ? 'bg-[#41e4c0]/15 border-[#41e4c0] text-white shadow-xs cursor-pointer'
                    : 'bg-[#00172e] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#41e4c0]/30 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckSquare className="w-4 h-4 text-[#41e4c0]" />
                  <span className="text-base font-bold font-mono text-white">
                    {selectedAppIds.length}
                  </span>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block">Selected Only</span>
                  <span className="text-[10px] text-[#94a3b8]">
                    {selectedAppIds.length === 0 ? 'No candidates selected' : `${selectedAppIds.length} candidate(s) checked`}
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Scope Breakdown Metrics Card */}
          <div className="p-4 rounded-2xl bg-[#00172e] border border-[#334155] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono-caps text-[#41e4c0] font-bold">
                Report Scope Breakdown ({stats.total} Records)
              </span>
              <span className="text-[11px] text-[#94a3b8] font-mono">
                {stats.decisionSent} decision letters dispatched
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-xl bg-[#000f21] border border-[#334155]">
                <div className="text-[10px] text-emerald-400 font-mono-caps">Accepted</div>
                <div className="text-sm font-bold text-white">{stats.accepted}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#000f21] border border-[#334155]">
                <div className="text-[10px] text-sky-400 font-mono-caps">Under Review</div>
                <div className="text-sm font-bold text-white">{stats.under_review}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#000f21] border border-[#334155]">
                <div className="text-[10px] text-amber-400 font-mono-caps">Pending</div>
                <div className="text-sm font-bold text-white">{stats.submitted}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#000f21] border border-[#334155]">
                <div className="text-[10px] text-purple-400 font-mono-caps">Waitlisted</div>
                <div className="text-sm font-bold text-white">{stats.waitlisted}</div>
              </div>
              <div className="p-2 rounded-xl bg-[#000f21] border border-[#334155]">
                <div className="text-[10px] text-rose-400 font-mono-caps">Declined</div>
                <div className="text-sm font-bold text-white">{stats.rejected}</div>
              </div>
            </div>
          </div>

          {/* Preset Report Format Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-mono-caps text-[#94a3b8] uppercase font-bold">
              2. Report Preset & Schema
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'comprehensive',
                  title: 'Executive Dossier',
                  desc: 'All candidate data, timestamps, backgrounds, goals, notes, & PDF logs',
                },
                {
                  id: 'standard',
                  title: 'Standard Admissions',
                  desc: 'Primary applicant info, track, status, applied date, and reviewer',
                },
                {
                  id: 'contact_only',
                  title: 'Quick Contact Sheet',
                  desc: 'Names, emails, phone numbers, tracks, and status overview',
                },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPreset(p.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    preset === p.id
                      ? 'bg-[#41e4c0]/15 border-[#41e4c0] text-white shadow-xs'
                      : 'bg-[#00172e] border-[#334155] text-[#94a3b8] hover:text-white hover:border-[#41e4c0]/30'
                  }`}
                >
                  <span className="text-xs font-bold block text-white mb-0.5">{p.title}</span>
                  <span className="text-[11px] text-[#94a3b8] leading-tight block">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Field Checkboxes for Comprehensive Mode */}
          {preset === 'comprehensive' && (
            <div className="p-3.5 rounded-xl bg-[#00172e] border border-[#334155] space-y-2">
              <span className="text-xs font-mono-caps text-[#94a3b8] uppercase font-bold block">
                Additional Data Columns
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#000f21] border border-[#334155] cursor-pointer hover:border-[#41e4c0]/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeGoals}
                    onChange={(e) => setIncludeGoals(e.target.checked)}
                    className="rounded accent-[#41e4c0] cursor-pointer"
                  />
                  <span className="text-white text-[11px] font-mono">Candidate Goal & Motivation Statements</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#000f21] border border-[#334155] cursor-pointer hover:border-[#41e4c0]/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={includeNotes}
                    onChange={(e) => setIncludeNotes(e.target.checked)}
                    className="rounded accent-[#41e4c0] cursor-pointer"
                  />
                  <span className="text-white text-[11px] font-mono">Internal Admin Evaluation Notes</span>
                </label>
              </div>
            </div>
          )}

          {/* Compatibility Notice */}
          <div className="p-3 rounded-xl bg-[#102034]/60 border border-[#41e4c0]/20 flex items-start gap-2.5 text-xs text-[#cbd5e1]">
            <ShieldCheck className="w-4 h-4 text-[#41e4c0] shrink-0 mt-0.5" />
            <span>
              Generated CSVs include standard UTF-8 Byte Order Marks (<code className="text-[#41e4c0]">BOM</code>) and RFC-compliant field escaping for compatibility with Microsoft Excel, Apple Numbers, and Google Sheets without encoding glitches.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#334155] bg-[#00172e] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#94a3b8] font-mono">
            Exporting <strong className="text-white">{targetApplications.length}</strong> candidate record(s)
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-xl bg-[#000f21] hover:bg-[#102034] text-xs font-mono-caps text-[#cbd5e1] border border-[#334155] transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={isExporting || targetApplications.length === 0}
              className="px-5 py-2 rounded-xl bg-linear-to-r from-[#41e4c0] to-emerald-400 text-black font-bold text-xs font-mono-caps shadow-md hover:shadow-[#41e4c0]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
