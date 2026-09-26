import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { AdminAuditLog, ApplicationStatus } from '../../types';

export interface AuditEntry {
  action: string;
  entityType: AdminAuditLog['entityType'];
  entityId?: string;
  details: string;
  activityType?: string;
  previousStatus?: ApplicationStatus;
  newStatus?: ApplicationStatus;
  recipientCount?: number;
  candidateName?: string;
  candidateEmail?: string;
  courseTitle?: string;
  subject?: string;
  attachments?: string[];
}

// firestore.rules requires actorEmail to match the caller's token and timestamp to be the server time,
// so both are set here rather than by callers. Audit failures are logged, never thrown.
export async function logAdminAction(entry: AuditEntry): Promise<void> {
  const actorEmail = auth.currentUser?.email;
  if (!actorEmail) return;

  const fields = Object.fromEntries(Object.entries(entry).filter(([, v]) => v !== undefined));
  try {
    await addDoc(collection(db, 'adminAuditLogs'), { ...fields, actorEmail, timestamp: serverTimestamp() });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}
