import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  deleteField,
  doc,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { StaffRole, STAFF_ROLE_LABELS } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  UserPlus,
  Search,
  Trash2,
  Lock,
  UserCog,
  RefreshCw,
} from 'lucide-react';

interface StaffUser {
  uid: string;
  email: string;
  displayName?: string;
  role: StaffRole;
  department?: string;
  createdAt?: string;
}

interface UserManagementPanelProps {
  currentUser: User;
  currentStaffRole: StaffRole;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

const ALL_ROLES: StaffRole[] = ['super_admin', 'admissions_officer', 'lead_faculty', 'curriculum_mentor'];

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ currentUser, currentStaffRole, onAddToast }) => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<StaffRole>('admissions_officer');
  const [isGranting, setIsGranting] = useState(false);

  const isSuperAdmin = currentStaffRole === 'super_admin';

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      // Only staff (role in the 4 known values) are shown here — a plain
      // signed-in visitor with no role never appears in this directory.
      const q = query(collection(db, 'users'), where('role', 'in', ALL_ROLES));
      const snap = await getDocs(q);
      const staff: StaffUser[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          uid: d.id,
          email: data.email || '',
          displayName: data.displayName,
          role: data.role,
          department: data.department,
          createdAt: data.createdAt,
        };
      });
      setStaffList(staff);
    } catch (err: any) {
      console.error('Failed to load staff directory:', err);
      if (onAddToast) {
        onAddToast('Load Error', 'Could not load the staff directory from Firestore.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = inviteEmail.trim();
    if (!targetEmail) return;

    setIsGranting(true);
    try {
      // There is no Admin SDK / Cloud Functions backend in this project, so
      // an account can't be provisioned purely from an email address — the
      // person must already have signed in at least once (landing on the
      // "Access Restricted" screen) for their users/{uid} doc to exist.
      const q = query(collection(db, 'users'), where('email', '==', targetEmail));
      const snap = await getDocs(q);

      if (snap.empty) {
        if (onAddToast) {
          onAddToast(
            'Person Not Found Yet',
            `${targetEmail} hasn't signed in to the Admin Console yet. Ask them to visit /admin and sign in with Google once, then grant their role here.`,
            'error'
          );
        }
        return;
      }

      const targetDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', targetDoc.id), { role: inviteRole });

      setInviteEmail('');
      setIsInviteModalOpen(false);
      await loadStaff();

      if (onAddToast) {
        onAddToast('Personnel Access Granted', `${targetEmail} is now a ${STAFF_ROLE_LABELS[inviteRole]}.`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to grant access:', err);
      if (onAddToast) {
        onAddToast('Grant Failed', err.message || 'Could not update this user\'s role.', 'error');
      }
    } finally {
      setIsGranting(false);
    }
  };

  const handleRevokeAccess = async (staff: StaffUser) => {
    if (staff.uid === currentUser.uid) {
      if (onAddToast) {
        onAddToast('Action Restricted', 'You cannot revoke your own administrative access.', 'error');
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'users', staff.uid), { role: deleteField() });
      setStaffList((prev) => prev.filter((s) => s.uid !== staff.uid));
      if (onAddToast) {
        onAddToast('Access Revoked', `Removed administrative access for ${staff.email}`, 'info');
      }
    } catch (err: any) {
      console.error('Failed to revoke access:', err);
      if (onAddToast) {
        onAddToast('Revoke Failed', err.message || 'Could not update this user\'s role.', 'error');
      }
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      (s.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      STAFF_ROLE_LABELS[s.role].toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.department || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Current Active Session Card */}
      <div className="p-6 rounded-2xl bg-[#00172e] border border-[#41e4c0]/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt=""
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#41e4c0]"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#102034] text-[#41e4c0] border-2 border-[#41e4c0] flex items-center justify-center font-bold text-xl">
                {currentUser.email?.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#102034] text-[#41e4c0] text-[10px] font-mono-caps border border-[#41e4c0]/40">
                <ShieldCheck className="w-3 h-3" />
                <span>{STAFF_ROLE_LABELS[currentStaffRole]} Session</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {currentUser.displayName || 'Administrator'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#94a3b8] font-mono">
                <span>{currentUser.email}</span>
                <span>•</span>
                <span>UID: {currentUser.uid.slice(0, 12)}...</span>
              </div>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs font-mono-caps flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#41e4c0]/20"
              >
                <UserPlus className="w-4 h-4" />
                <span>Grant Personnel Access</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Role & Privileges Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-[#41e4c0]">Super Administrator</div>
          <div className="text-xs text-[#94a3b8]">Full application/inquiry CRUD, staff role management & console governance.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-cyan-400">Admissions Officer</div>
          <div className="text-xs text-[#94a3b8]">Review applicant portfolios, dispatch admission Gmail, update statuses.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-purple-400">Lead Faculty</div>
          <div className="text-xs text-[#94a3b8]">Read-only admissions visibility; schedules Google Calendar labs & Docs syllabi.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-amber-400">Curriculum Mentor</div>
          <div className="text-xs text-[#94a3b8]">Read-only admissions visibility; manages Google Tasks review queues.</div>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="p-6 rounded-2xl bg-[#00172e]/70 border border-[#44474d]/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#44474d]/20">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[#41e4c0]" />
              <span>Authorized Administrative Directory</span>
            </h3>
            <p className="text-xs text-[#94a3b8]">
              Live roster from Firestore — only accounts with a granted role appear here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-60 pl-9 pr-4 py-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
              />
            </div>
            <button
              onClick={loadStaff}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-[#94a3b8] hover:text-[#41e4c0] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-[#94a3b8]">Loading staff directory...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#94a3b8]">
            No staff members found. Grant access to get started.
          </div>
        ) : (
          <div className="divide-y divide-[#44474d]/20">
            <AnimatePresence mode="popLayout">
              {filteredStaff.map((staff) => (
                <motion.div
                  key={staff.uid}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.15 } }}
                  transition={{ duration: 0.2 }}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#102034]/20 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30 flex items-center justify-center font-bold text-sm shrink-0">
                      {(staff.displayName || staff.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{staff.displayName || staff.email}</span>
                        {staff.uid === currentUser.uid && (
                          <span className="px-2 py-0.5 rounded-full bg-[#41e4c0]/10 text-[#41e4c0] text-[10px] font-mono-caps border border-[#41e4c0]/30">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#94a3b8] font-mono">{staff.email}</div>
                      {staff.department && <div className="text-[11px] text-[#64748b]">{staff.department}</div>}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <span className="px-2.5 py-1 rounded-lg bg-[#000f21] border border-[#44474d]/40 text-xs font-mono-caps text-[#d3e4fe]">
                      {STAFF_ROLE_LABELS[staff.role]}
                    </span>
                    {isSuperAdmin && staff.uid !== currentUser.uid && (
                      <button
                        onClick={() => handleRevokeAccess(staff)}
                        className="p-2 rounded-lg text-[#94a3b8] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Revoke Permissions"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Grant Access Modal */}
      {isInviteModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#00172e] border border-[#41e4c0]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#41e4c0]" />
                <span>Grant Administrative Role</span>
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#94a3b8] hover:text-white text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0b1c30] border border-[#334155]/60 flex items-start gap-2.5 text-[11px] text-[#94a3b8]">
              <Lock className="w-3.5 h-3.5 text-[#41e4c0] shrink-0 mt-0.5" />
              <span>
                The person must have already signed in to the Admin Console at least once (they'll
                see "Access Restricted") before their role can be granted here.
              </span>
            </div>

            <form onSubmit={handleGrantAccess} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">
                  Their Google / Institutional Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="s.connor@instituteofai.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as StaffRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white focus:outline-none focus:border-[#41e4c0]"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {STAFF_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs text-[#94a3b8] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGranting}
                  className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs font-mono-caps cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isGranting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isGranting ? 'Granting...' : 'Authorize Personnel'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
