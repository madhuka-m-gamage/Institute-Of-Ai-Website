import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { AdminNotification } from '../../types';
import {
  Bell,
  BellRing,
  Building2,
  GraduationCap,
  Mail,
  CheckCircle,
  X,
  Clock,
  Sparkles,
  ChevronRight,
  Trash2,
  CheckCheck,
  Filter
} from 'lucide-react';

interface AdminNotificationBellProps {
  onSelectNotification?: (notification: AdminNotification) => void;
  onAddToast?: (title: string, description: string, type?: 'success' | 'info' | 'error') => void;
}

export const AdminNotificationBell: React.FC<AdminNotificationBellProps> = ({
  onSelectNotification,
  onAddToast,
}) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Real-time listener for Firestore Collections (applications, enterpriseInquiries, contactMessages)
  useEffect(() => {
    // 1. Listen to applications
    const qApps = query(collection(db, 'applications'), limit(20));
    const unsubApps = onSnapshot(qApps, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Check if this was created recently or from normal collection fetch
          const createdAt = data.createdAt || new Date().toISOString();
          const newNotif: AdminNotification = {
            id: `notif-app-${change.doc.id}`,
            type: 'application',
            title: `New Student Application: ${data.fullName || 'Candidate'}`,
            message: `Applied for ${data.courseTitle || 'Executive Track'} • ${data.email || ''}`,
            timestamp: createdAt,
            read: false,
            sourceId: change.doc.id,
            data: { ...data, id: change.doc.id },
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            // Play subtle tone if window is active and newly added after mount
            return [newNotif, ...prev].slice(0, 30);
          });
        }
      });
    }, (err) => console.warn('Notification snapshot applications notice:', err));

    // 2. Listen to enterprise inquiries
    const qEnt = query(collection(db, 'enterpriseInquiries'), limit(20));
    const unsubEnt = onSnapshot(qEnt, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt || new Date().toISOString();
          const newNotif: AdminNotification = {
            id: `notif-ent-${change.doc.id}`,
            type: 'enterprise_inquiry',
            title: `Enterprise Inquiry: ${data.companyName || 'Corporate Lead'}`,
            message: `Scope: ${data.primaryFocus || 'Enterprise Enablement'} (${data.teamSize || 'Custom team'}) • ${data.workEmail || ''}`,
            timestamp: createdAt,
            read: false,
            sourceId: change.doc.id,
            data: { ...data, id: change.doc.id },
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].slice(0, 30);
          });
        }
      });
    }, (err) => console.warn('Notification snapshot enterprise notice:', err));

    // 3. Listen to contact messages
    const qMsg = query(collection(db, 'contactMessages'), limit(20));
    const unsubMsg = onSnapshot(qMsg, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          const createdAt = data.createdAt || new Date().toISOString();
          const newNotif: AdminNotification = {
            id: `notif-msg-${change.doc.id}`,
            type: 'contact_message',
            title: `Helpdesk Message: ${data.name || data.fullName || 'Inquirer'}`,
            message: `${data.inquiryType ? `[${data.inquiryType.toUpperCase()}] ` : ''}${data.message?.slice(0, 60)}...`,
            timestamp: createdAt,
            read: false,
            sourceId: change.doc.id,
            data: { ...data, id: change.doc.id },
          };

          setNotifications((prev) => {
            if (prev.some((n) => n.id === newNotif.id)) return prev;
            return [newNotif, ...prev].slice(0, 30);
          });
        }
      });
    }, (err) => console.warn('Notification snapshot messages notice:', err));

    return () => {
      unsubApps();
      unsubEnt();
      unsubMsg();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (onAddToast) {
      onAddToast('Notifications Cleared', 'All alerts marked as read', 'info');
    }
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    markAsRead(notif.id);
    if (onSelectNotification) {
      onSelectNotification(notif);
    }
    setIsOpen(false);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-[#00172e] hover:bg-[#102034] border border-[#44474d]/40 text-[#d3e4fe] hover:text-white transition-all cursor-pointer flex items-center justify-center"
        title="Admin Notifications Center"
        aria-label="Open Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-[#41e4c0] animate-bounce" />
        ) : (
          <Bell className="w-5 h-5 text-[#94a3b8]" />
        )}

        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white font-mono text-[11px] font-extrabold flex items-center justify-center shadow-lg shadow-red-500/30 border border-[#00172e]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notification Popover Drawer */}
      {isOpen && (
        <>
          {/* Backdrop on Mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/40 sm:hidden backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 top-12 z-50 w-[92vw] sm:w-[420px] max-h-[540px] rounded-2xl bg-[#00172e] border border-[#44474d]/60 shadow-2xl shadow-[#000f21]/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header */}
            <div className="p-4 bg-[#000f21] border-b border-[#334155] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/30">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-none">Live Alerts & Inquiries</h3>
                  <span className="text-[11px] text-[#94a3b8] font-mono">
                    {unreadCount} unread incoming submission{unreadCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="p-1.5 rounded-lg text-xs text-[#41e4c0] hover:bg-[#102034] transition-colors cursor-pointer flex items-center gap-1 font-mono-caps"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[10px]">Mark Read</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#94a3b8] hover:text-white rounded-lg hover:bg-[#102034] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 py-2 bg-[#0b1c30] border-b border-[#334155] flex items-center gap-1 overflow-x-auto text-[11px] font-mono-caps">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('application')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterType === 'application'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Applications
              </button>
              <button
                type="button"
                onClick={() => setFilterType('enterprise_inquiry')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterType === 'enterprise_inquiry'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Enterprise
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unread')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  filterType === 'unread'
                    ? 'bg-[#41e4c0] text-[#031427] font-bold'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Notification Items List */}
            <div className="overflow-y-auto max-h-[380px] divide-y divide-[#334155]/40 flex-1">
              {filteredNotifications.length === 0 ? (
                <div className="py-12 px-4 text-center text-xs text-[#94a3b8] space-y-1.5">
                  <CheckCircle className="w-7 h-7 text-[#41e4c0]/50 mx-auto" />
                  <div className="font-bold text-white">All Caught Up</div>
                  <p className="text-[11px]">No alerts matching this filter category.</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const isApp = notif.type === 'application';
                  const isEnt = notif.type === 'enterprise_inquiry';

                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3.5 hover:bg-[#102034]/70 transition-colors cursor-pointer flex items-start gap-3 relative group ${
                        !notif.read ? 'bg-[#002142]/30' : ''
                      }`}
                    >
                      {/* Unread indicator dot */}
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-[#41e4c0] absolute left-1.5 top-4 shadow-sm shadow-[#41e4c0]" />
                      )}

                      {/* Icon */}
                      <div
                        className={`p-2 rounded-xl shrink-0 mt-0.5 border ${
                          isApp
                            ? 'bg-[#102034] text-[#41e4c0] border-[#41e4c0]/30'
                            : isEnt
                            ? 'bg-[#1b263b] text-amber-300 border-amber-500/30'
                            : 'bg-[#1c1917] text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {isApp ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : isEnt ? (
                          <Building2 className="w-4 h-4" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4
                            className={`text-xs font-bold truncate ${
                              !notif.read ? 'text-white' : 'text-[#d3e4fe]'
                            }`}
                          >
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-mono text-[#94a3b8] shrink-0">
                            {new Date(notif.timestamp).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        <p className="text-[11px] text-[#94a3b8] leading-tight line-clamp-2">
                          {notif.message}
                        </p>

                        <div className="flex items-center justify-between pt-1">
                          <span
                            className={`text-[9px] font-mono-caps px-1.5 py-0.5 rounded border uppercase ${
                              isApp
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : isEnt
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            }`}
                          >
                            {notif.type.replace('_', ' ')}
                          </span>

                          <span className="text-[10px] font-mono text-[#41e4c0] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-3 bg-[#000f21] border-t border-[#334155] text-center text-[10px] font-mono text-[#94a3b8]">
              <span>Live Firestore synchronization active</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
