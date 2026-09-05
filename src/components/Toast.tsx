import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Sparkles } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  description: string;
  type?: 'success' | 'info' | 'error';
  duration?: number; // ms, defaults to 5000
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 5000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-sky-400 shrink-0" />;
      case 'success':
      default:
        return <CheckCircle2 className="w-5 h-5 text-[#41e4c0] shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'error':
        return 'border-red-500/40 shadow-red-950/20';
      case 'info':
        return 'border-sky-500/40 shadow-sky-950/20';
      case 'success':
      default:
        return 'border-[#41e4c0]/50 shadow-[#41e4c0]/10';
    }
  };

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden bg-[#0b1c30] border ${getBorderColor()} rounded-xl p-4 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in`}
    >
      <div className="flex items-start gap-3">
        <div className="p-1 rounded-lg bg-[#102034] border border-[#334155]/60 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-[#F8FAFC] font-mono-caps uppercase tracking-wider">
              {toast.title}
            </h4>
            <span className="inline-flex items-center gap-1 text-[9px] bg-[#41e4c0]/15 text-[#41e4c0] px-1.5 py-0.5 rounded font-mono-caps">
              <Sparkles className="w-2.5 h-2.5" /> AI AGENT DISPATCH
            </span>
          </div>
          <p className="text-xs text-[#94a3b8] mt-1 leading-relaxed break-words font-sans">
            {toast.description}
          </p>
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="text-[#64748b] hover:text-[#F8FAFC] transition-colors p-1 rounded hover:bg-[#1e293b]"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss countdown bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#102034]">
        <div
          className="h-full bg-gradient-to-r from-[#41e4c0] to-sky-400 transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
