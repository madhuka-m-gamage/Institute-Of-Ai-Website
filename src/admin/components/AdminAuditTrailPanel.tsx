import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { AdminAuditLog, StudentApplication, getApplicationTimestamp } from '../../types';
import { ShieldCheck, History, User, Clock, Filter, RefreshCw, Layers, Database, Activity, Mail } from 'lucide-react';
import { ListItemSkeleton } from '../../ui/Skeleton';
import { RecentActivityPanel } from './RecentActivityPanel';

interface AdminAuditTrailPanelProps {
  applications?: StudentApplication[];
  onSelectApplication?: (app: StudentApplication) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
  currentAdminEmail?: string;
}

export const AdminAuditTrailPanel: React.FC<AdminAuditTrailPanelProps> = ({
  applications = [],
  onSelectApplication,
  onAddToast,
  currentAdminEmail = 'admin@instituteofai.com',
}) => {
  const [activeView, setActiveView] = useState<'activity' | 'system'>('activity');
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'adminAuditLogs'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      const fetched = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, ...data, timestamp: new Date(getApplicationTimestamp(data)).toISOString() } as AdminAuditLog;
      });
      setLogs(fetched);
    } catch (err: any) {
      console.warn('Audit logs read notice:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'all') return true;
    return log.entityType === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top View Selector Bar */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[#000f21] border border-[#44474d]/30 self-start">
        <button
          type="button"
          onClick={() => setActiveView('activity')}
          className={`px-4 py-2 rounded-lg text-xs font-mono-caps flex items-center gap-2 transition-colors cursor-pointer ${
            activeView === 'activity'
              ? 'bg-[#41e4c0] text-[#031427] font-bold'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Candidate Activity & Decisions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('system')}
          className={`px-4 py-2 rounded-lg text-xs font-mono-caps flex items-center gap-2 transition-colors cursor-pointer ${
            activeView === 'system'
              ? 'bg-[#41e4c0] text-[#031427] font-bold'
              : 'text-[#94a3b8] hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>System & Access Governance Log</span>
        </button>
      </div>

      {activeView === 'activity' ? (
        <RecentActivityPanel
          applications={applications}
          onSelectApplication={onSelectApplication}
          onAddToast={onAddToast}
          currentAdminEmail={currentAdminEmail}
        />
      ) : (
        <div className="space-y-6">
          {/* Header with Refresh & Filter */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#00172e] border border-[#44474d]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/30 text-[10px] font-mono-caps text-[#41e4c0] uppercase tracking-widest mb-1.5">
                <ShieldCheck className="w-3 h-3" />
                <span>Immutable Governance Stream</span>
              </div>
              <h2 className="text-xl font-bold text-white">System & Admissions Audit Log</h2>
              <p className="text-xs text-[#94a3b8]">
                Records administrative state changes, user access alterations, and admissions decision dispatches.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-[#0b1c30] border border-[#334155] text-xs font-mono-caps text-[#d3e4fe] rounded-xl px-3 py-2 focus:outline-none focus:border-[#41e4c0]"
              >
                <option value="all">ALL EVENT TYPES</option>
                <option value="application">ADMISSIONS & APPLICANTS</option>
                <option value="enterprise_inquiry">ENTERPRISE SCOPES</option>
                <option value="user_role">USER ROLES & PERMISSIONS</option>
                <option value="workspace_doc">WORKSPACE DOCUMENTS</option>
                <option value="system">SYSTEM EVENTS</option>
              </select>

              <button
                type="button"
                onClick={fetchLogs}
                disabled={loading}
                className="p-2.5 rounded-xl bg-[#102034] hover:bg-[#18314e] border border-[#41e4c0]/40 text-[#41e4c0] transition-colors cursor-pointer disabled:opacity-50"
                title="Refresh Audit Feed"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Audit Log Stream */}
          <div className="rounded-2xl bg-[#00172e]/70 border border-[#44474d]/30 overflow-hidden">
            {loading ? (
              <ListItemSkeleton count={5} />
            ) : filteredLogs.length === 0 ? (
              <div className="py-16 text-center text-xs text-[#94a3b8] space-y-2">
                <History className="w-8 h-8 text-[#64748b] mx-auto" />
                <p>No audit trail records found for the selected filter category.</p>
              </div>
            ) : (
              <div className="divide-y divide-[#44474d]/20">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 hover:bg-[#102034]/40 transition-colors flex items-start gap-3.5">
                    <div className="p-2.5 rounded-xl bg-[#0b1c30] border border-[#334155] text-[#41e4c0] shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold text-white text-xs sm:text-sm">{log.action}</span>
                        <span className="text-[11px] font-mono text-[#94a3b8]">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-[#d3e4fe]/85 leading-relaxed">{log.details}</p>

                      <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-[#94a3b8]">
                        <span>Actor: <strong className="text-[#41e4c0]">{log.actorEmail}</strong></span>
                        <span>•</span>
                        <span className="uppercase font-mono-caps text-[#64748b]">Entity: {log.entityType}</span>
                        {log.entityId && (
                          <>
                            <span>•</span>
                            <span>Ref: {log.entityId}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

