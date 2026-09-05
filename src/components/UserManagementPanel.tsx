import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Key,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Trash2,
  Lock,
  Mail,
  Search,
  BadgeCheck,
  UserCog
} from 'lucide-react';

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrator' | 'Admissions Officer' | 'Lead Faculty' | 'Curriculum Mentor';
  status: 'Active' | 'Pending' | 'Suspended';
  lastActive: string;
  avatarUrl?: string;
  department: string;
}

interface UserManagementPanelProps {
  currentUser: User;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

const INITIAL_STAFF_MEMBERS: StaffUser[] = [
  {
    id: 'usr_001',
    name: 'Madhuka Gamage',
    email: 'madhukagamage6@gmail.com',
    role: 'Super Administrator',
    status: 'Active',
    lastActive: 'Active Now',
    department: 'Executive Board / Directorate',
  },
  {
    id: 'usr_002',
    name: 'Dr. Alistair Vance',
    email: 'a.vance@instituteofai.com',
    role: 'Lead Faculty',
    status: 'Active',
    lastActive: '2 hours ago',
    department: 'LLM Systems & Autonomous Agents',
  },
  {
    id: 'usr_003',
    name: 'Elena Rostova',
    email: 'e.rostova@instituteofai.com',
    role: 'Admissions Officer',
    status: 'Active',
    lastActive: '34 mins ago',
    department: 'Admissions & Global Student Cohorts',
  },
  {
    id: 'usr_004',
    name: 'Marcus Chen',
    email: 'm.chen@instituteofai.com',
    role: 'Curriculum Mentor',
    status: 'Active',
    lastActive: 'Yesterday',
    department: 'LangGraph & Multi-Agent Architecture',
  }
];

export const UserManagementPanel: React.FC<UserManagementPanelProps> = ({ currentUser, onAddToast }) => {
  const [staffList, setStaffList] = useState<StaffUser[]>(INITIAL_STAFF_MEMBERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffUser['role']>('Admissions Officer');
  const [newDept, setNewDept] = useState('Admissions & Student Success');

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    const newStaff: StaffUser = {
      id: `usr_${Date.now().toString().slice(-4)}`,
      name: newName,
      email: newEmail,
      role: newRole,
      status: 'Active',
      lastActive: 'Just Invited',
      department: newDept,
    };

    setStaffList([newStaff, ...staffList]);
    setNewName('');
    setNewEmail('');
    setIsInviteModalOpen(false);

    if (onAddToast) {
      onAddToast('Personnel Added', `Granted ${newRole} privileges to ${newEmail}`, 'success');
    }
  };

  const handleRemoveStaff = (id: string, email: string) => {
    if (email === 'madhukagamage6@gmail.com') {
      if (onAddToast) {
        onAddToast('Action Restricted', 'Cannot remove root Super Administrator account.', 'error');
      }
      return;
    }
    setStaffList(staffList.filter(s => s.id !== id));
    if (onAddToast) {
      onAddToast('Access Revoked', `Removed administrative access for ${email}`, 'info');
    }
  };

  const filteredStaff = staffList.filter(
    s =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase())
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
                <span>Super Administrator Session</span>
              </div>
              <h2 className="text-xl font-extrabold text-white">
                {currentUser.displayName || 'Root Administrator'}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#94a3b8] font-mono">
                <span>{currentUser.email}</span>
                <span>•</span>
                <span>UID: {currentUser.uid.slice(0, 12)}...</span>
                <span>•</span>
                <span className="text-[#41e4c0]">Verified Google Identity</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs font-mono-caps flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#41e4c0]/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Grant Personnel Access</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role & Privileges Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-[#41e4c0]">Super Administrator</div>
          <div className="text-xs text-[#94a3b8]">Full database CRUD, Google Workspace token auth & console governance.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-cyan-400">Admissions Officer</div>
          <div className="text-xs text-[#94a3b8]">Review applicant portfolios, dispatch admission Gmail, update statuses.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-purple-400">Lead Faculty</div>
          <div className="text-xs text-[#94a3b8]">Schedule Google Calendar labs, edit Docs syllabi, assign curriculum mentors.</div>
        </div>
        <div className="p-4 rounded-xl bg-[#00172e]/60 border border-[#44474d]/30 space-y-1.5">
          <div className="text-xs font-mono-caps text-amber-400">Curriculum Mentor</div>
          <div className="text-xs text-[#94a3b8]">Manage student review queues in Google Tasks and laboratory groups.</div>
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
              Manage role designations and active console access tokens for institute personnel.
            </p>
          </div>

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
        </div>

        <div className="divide-y divide-[#44474d]/20">
          <AnimatePresence mode="popLayout">
            {filteredStaff.map((staff) => (
              <motion.div
                key={staff.id}
                layout
                initial={{ opacity: 0, y: 10, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2 }}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#102034]/20 px-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30 flex items-center justify-center font-bold text-sm shrink-0">
                    {staff.name.charAt(0)}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{staff.name}</span>
                      {staff.email === 'madhukagamage6@gmail.com' && (
                        <span className="px-2 py-0.5 rounded-full bg-[#41e4c0]/10 text-[#41e4c0] text-[10px] font-mono-caps border border-[#41e4c0]/30">
                          Primary Owner
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#94a3b8] font-mono">{staff.email}</div>
                    <div className="text-[11px] text-[#64748b]">{staff.department}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-auto">
                  <span className="px-2.5 py-1 rounded-lg bg-[#000f21] border border-[#44474d]/40 text-xs font-mono-caps text-[#d3e4fe]">
                    {staff.role}
                  </span>
                  <span className="text-xs text-[#41e4c0] font-mono flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-pulse" />
                    {staff.status}
                  </span>
                  {staff.email !== 'madhukagamage6@gmail.com' && (
                    <button
                      onClick={() => handleRemoveStaff(staff.id, staff.email)}
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
      </div>

      {/* Grant Access Modal */}
      {isInviteModalOpen && (
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

            <form onSubmit={handleAddStaff} className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Institutional / Google Email</label>
                <input
                  type="email"
                  required
                  placeholder="s.connor@instituteofai.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Assigned Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as StaffUser['role'])}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white focus:outline-none focus:border-[#41e4c0]"
                >
                  <option value="Admissions Officer">Admissions Officer</option>
                  <option value="Lead Faculty">Lead Faculty</option>
                  <option value="Curriculum Mentor">Curriculum Mentor</option>
                  <option value="Super Administrator">Super Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] mb-1">Department</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admissions & Corporate Partnerships"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#000f21] border border-[#44474d]/40 text-xs text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                />
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
                  className="px-5 py-2.5 rounded-xl bg-[#41e4c0] hover:bg-[#34c7a7] text-[#031427] font-bold text-xs font-mono-caps cursor-pointer"
                >
                  Authorize Personnel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
