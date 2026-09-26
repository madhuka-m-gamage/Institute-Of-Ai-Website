import React from 'react';
import { ApplicationStatus } from '../../types';
import { CheckCircle2, Clock, Eye, Bookmark, XCircle, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status?: ApplicationStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
}

export function getStatusConfig(status?: string) {
  const normalized = (status || 'submitted').toLowerCase();
  
  switch (normalized) {
    case 'accepted':
      return {
        label: 'Accepted',
        displayStatus: 'ACCEPTED',
        bg: 'bg-emerald-500/15',
        text: 'text-emerald-300',
        border: 'border-emerald-500/40',
        dot: 'bg-emerald-400',
        glow: 'shadow-emerald-950/40',
        icon: CheckCircle2,
        description: 'Candidate granted enrollment & institutional credentials.',
      };
    case 'submitted':
    case 'pending':
      return {
        label: 'Pending',
        displayStatus: 'PENDING',
        bg: 'bg-amber-500/15',
        text: 'text-amber-300',
        border: 'border-amber-500/40',
        dot: 'bg-amber-400',
        glow: 'shadow-amber-950/40',
        icon: Clock,
        description: 'Application received and queued for committee review.',
      };
    case 'under_review':
      return {
        label: 'Under Review',
        displayStatus: 'UNDER REVIEW',
        bg: 'bg-sky-500/15',
        text: 'text-sky-300',
        border: 'border-sky-500/40',
        dot: 'bg-sky-400',
        glow: 'shadow-sky-950/40',
        icon: Eye,
        description: 'Candidate portfolio & transcripts currently under faculty evaluation.',
      };
    case 'waitlisted':
      return {
        label: 'Waitlisted',
        displayStatus: 'WAITLISTED',
        bg: 'bg-purple-500/15',
        text: 'text-purple-300',
        border: 'border-purple-500/40',
        dot: 'bg-purple-400',
        glow: 'shadow-purple-950/40',
        icon: Bookmark,
        description: 'Placed on priority intake waitlist pending cohort seat capacity.',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        displayStatus: 'REJECTED',
        bg: 'bg-rose-500/15',
        text: 'text-rose-300',
        border: 'border-rose-500/40',
        dot: 'bg-rose-400',
        glow: 'shadow-rose-950/40',
        icon: XCircle,
        description: 'Application declined for the selected cohort intake.',
      };
    default:
      return {
        label: (status || 'Unknown').replace(/_/g, ' '),
        displayStatus: (status || 'UNKNOWN').toUpperCase().replace(/_/g, ' '),
        bg: 'bg-slate-500/15',
        text: 'text-slate-300',
        border: 'border-slate-500/40',
        dot: 'bg-slate-400',
        glow: 'shadow-slate-950/40',
        icon: AlertCircle,
        description: 'Uncategorized admissions status.',
      };
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status = 'submitted',
  size = 'sm',
  showIcon = true,
  showDot = false,
  className = '',
}) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2.5 py-0.5 text-[10px] gap-1.5',
    md: 'px-3 py-1 text-xs gap-1.5',
    lg: 'px-3.5 py-1.5 text-sm gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-mono-caps font-semibold uppercase tracking-wider border shadow-xs transition-colors select-none ${config.bg} ${config.text} ${config.border} ${config.glow} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      {showDot && (
        <span className={`rounded-full shrink-0 animate-pulse ${config.dot} ${dotSizes[size]}`} />
      )}
      {showIcon && !showDot && (
        <Icon className={`shrink-0 ${iconSizes[size]}`} />
      )}
      <span>{config.displayStatus}</span>
    </span>
  );
};
