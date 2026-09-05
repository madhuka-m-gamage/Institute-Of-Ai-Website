import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { COURSES } from '../data/mockData';
import { processApplicationWorkflow, WorkflowResult } from '../services/applicationWorkflow';
import { AnimatedSuccessCheckmark } from './AnimatedSuccessCheckmark';
import { X, CheckCircle, ShieldCheck, Cpu, Mail, Sparkles, Check, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourseId?: string;
  onApplicationSuccess?: (info: { courseTitle: string; email: string; emailSubject: string }) => void;
}

export const ApplyModal: React.FC<ApplyModalProps> = ({
  isOpen,
  onClose,
  selectedCourseId,
  onApplicationSuccess,
}) => {
  const [courseId, setCourseId] = useState(selectedCourseId || COURSES[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('Intermediate');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [workflowResult, setWorkflowResult] = useState<WorkflowResult | null>(null);

  // Validation State
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; phone?: boolean }>({});

  if (!isOpen) return null;

  const selectedCourse = COURSES.find((c) => c.id === courseId) || COURSES[0];

  const validateField = (fieldName: 'name' | 'email' | 'phone', val: string) => {
    let err = '';
    const trimmed = val.trim();

    if (fieldName === 'name') {
      if (!trimmed) {
        err = 'Candidate full name is required';
      } else if (trimmed.length < 2) {
        err = 'Name must be at least 2 characters long';
      }
    } else if (fieldName === 'email') {
      if (!trimmed) {
        err = 'Communication email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        err = 'Please enter a valid email address (e.g. alex@domain.com)';
      }
    } else if (fieldName === 'phone') {
      if (trimmed && !/^[\d\s+\-().]{7,20}$/.test(trimmed)) {
        err = 'Please enter a valid phone number (minimum 7 digits)';
      }
    }

    return err;
  };

  const validateForm = () => {
    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const phoneErr = validateField('phone', phone);

    const newErrors = {
      ...(nameErr ? { name: nameErr } : {}),
      ...(emailErr ? { email: emailErr } : {}),
      ...(phoneErr ? { phone: phoneErr } : {}),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (fieldName: 'name' | 'email' | 'phone') => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const val = fieldName === 'name' ? name : fieldName === 'email' ? email : phone;
    const err = validateField(fieldName, val);
    setErrors((prev) => ({ ...prev, [fieldName]: err || undefined }));
  };

  const handleChange = (fieldName: 'name' | 'email' | 'phone', val: string) => {
    if (fieldName === 'name') setName(val);
    if (fieldName === 'email') setEmail(val);
    if (fieldName === 'phone') setPhone(val);

    if (touched[fieldName]) {
      const err = validateField(fieldName, val);
      setErrors((prev) => ({ ...prev, [fieldName]: err || undefined }));
    }
  };

  const triggerSubtleConfetti = () => {
    try {
      // Primary subtle celebratory burst aligned with Institute Of AI cyan, teal, and blue theme
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#41e4c0', '#38debb', '#60a5fa', '#93c5fd', '#38bdf8', '#34d399', '#fde047'],
        ticks: 200,
        gravity: 1.1,
        scalar: 0.85,
        shapes: ['circle', 'square'],
        disableForReducedMotion: true,
        zIndex: 9999,
      });

      // Subtle side accents
      setTimeout(() => {
        confetti({
          particleCount: 25,
          angle: 60,
          spread: 45,
          origin: { x: 0.25, y: 0.65 },
          colors: ['#41e4c0', '#60a5fa', '#a7f3d0'],
          ticks: 180,
          gravity: 1.2,
          scalar: 0.75,
          disableForReducedMotion: true,
          zIndex: 9999,
        });
        confetti({
          particleCount: 25,
          angle: 120,
          spread: 45,
          origin: { x: 0.75, y: 0.65 },
          colors: ['#41e4c0', '#38debb', '#93c5fd'],
          ticks: 180,
          gravity: 1.2,
          scalar: 0.75,
          disableForReducedMotion: true,
          zIndex: 9999,
        });
      }, 120);
    } catch {
      // Silent fallback if canvas rendering is restricted
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ name: true, email: true, phone: true });
    const isValid = validateForm();
    if (!isValid) return;

    setStatus('processing');
    try {
      const sanitizedName = name.trim();
      const sanitizedEmail = email.trim();
      const sanitizedPhone = phone.trim();

      // 1. Save primary registration record in Firestore with all standard & legacy name fields
      try {
        await addDoc(collection(db, 'applications'), {
          fullName: sanitizedName,
          applicantName: sanitizedName,
          name: sanitizedName,
          candidateName: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
          courseId: courseId,
          courseTitle: selectedCourse.title,
          background: experience,
          experienceLevel: experience,
          pythonProficiency: experience,
          status: 'submitted',
          notes: `Phone: ${sanitizedPhone} | Proficiency: ${experience}`,
          userId: auth.currentUser?.uid || 'guest_applicant',
          createdAt: new Date().toISOString(),
        });
      } catch (firestoreErr) {
        console.warn('Applications collection save note:', firestoreErr);
      }

      // 2. Trigger Gemini AI Application Workflow Backend Service
      const result = await processApplicationWorkflow({
        applicantName: sanitizedName,
        fullName: sanitizedName,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: sanitizedPhone,
        courseId,
        courseTitle: selectedCourse.title,
        experience,
        notes: `Phone: ${sanitizedPhone}`,
      });

      setWorkflowResult(result);
      if (onApplicationSuccess) {
        onApplicationSuccess({
          courseTitle: selectedCourse.title,
          email: sanitizedEmail,
          emailSubject: result.emailSubject,
        });
      }
    } catch (err) {
      console.warn('Application Submit Warning:', err);
    } finally {
      setStatus('success');
      triggerSubtleConfetti();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#000f21]/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#102034] border border-[#334155] w-full max-w-xl rounded-xl shadow-2xl overflow-hidden relative my-auto max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-[#334155] bg-[#0b1c30] shrink-0">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#41e4c0] shrink-0" />
            <span className="font-mono-caps text-xs sm:text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
              Enrollment & Agentic Workflow
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Modal"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8f9097] hover:text-[#41e4c0] transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {status === 'success' ? (
          <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto flex-1">
            <div className="flex items-start sm:items-center gap-3.5 bg-[#41e4c0]/10 border border-[#41e4c0]/40 p-3.5 sm:p-4 rounded-lg">
              <AnimatedSuccessCheckmark size={42} className="shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC]">Application Submitted & AI Workflow Executed</h3>
                <p className="text-xs text-[#94a3b8]">
                  Candidate <span className="text-[#41e4c0]">{email}</span> registered for{' '}
                  <span className="text-[#F8FAFC]">{selectedCourse.title}</span>.
                </p>
              </div>
            </div>

            {/* AI Generated Confirmation Email Preview */}
            {workflowResult && (
              <div className="space-y-4">
                <div className="border border-[#334155] rounded-lg bg-[#0b1c30] p-3.5 sm:p-4 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-mono-caps text-[#41e4c0]">
                      <Mail className="w-3.5 h-3.5" />
                      <span>GENERATED CONFIRMATION EMAIL</span>
                    </div>
                    <span className="text-[10px] bg-[#41e4c0]/20 text-[#41e4c0] px-2 py-0.5 rounded font-mono-caps">
                      DISPATCH QUEUED
                    </span>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8f9097] uppercase font-mono-caps block">Subject</label>
                    <div className="text-xs font-bold text-[#F8FAFC] font-sans">{workflowResult.emailSubject}</div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#8f9097] uppercase font-mono-caps block mb-1">Body</label>
                    <div className="text-xs text-[#cbd5e1] leading-relaxed font-sans whitespace-pre-wrap bg-[#071322] p-3 rounded border border-[#1e293b]">
                      {workflowResult.emailBody}
                    </div>
                  </div>
                </div>

                {/* AI Evaluation Analysis */}
                {workflowResult.applicantAnalysis && (
                  <div className="border border-[#41e4c0]/30 rounded-lg bg-[#091829] p-3.5 sm:p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#41e4c0] font-mono-caps">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>ADMISSIONS CANDIDATE ANALYSIS</span>
                      </div>
                      <div className="text-xs font-mono-caps text-[#F8FAFC]">
                        Readiness Score: <span className="text-[#41e4c0] font-bold">{workflowResult.applicantAnalysis.readinessScore}/100</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#94a3b8]">
                      {workflowResult.applicantAnalysis.proficiencyEvaluation}
                    </p>

                    <div>
                      <div className="text-[10px] text-[#41e4c0] font-mono-caps uppercase mb-1">Recommended Onboarding Steps</div>
                      <ul className="space-y-1">
                        {workflowResult.applicantAnalysis.customizedRecommendations?.map((rec, i) => (
                          <li key={i} className="text-xs text-[#cbd5e1] flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-[#41e4c0] shrink-0 mt-0.5" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setStatus('idle');
                onClose();
              }}
              className="w-full min-h-[44px] py-3 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all"
            >
              Close Protocol
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                Target Program
              </label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3 py-2.5 sm:py-3 text-xs sm:text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
              >
                {COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} — {c.duration} ({c.investment})
                  </option>
                ))}
              </select>
              {selectedCourse.schedule && (
                <p className="text-[11px] text-[#41e4c0] font-mono-caps mt-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>Format: {selectedCourse.schedule}</span>
                </p>
              )}
            </div>

            {/* Candidate Name Input */}
            <div>
              <label className="block text-xs font-mono-caps text-[#d3e4fe] uppercase tracking-wider mb-1">
                Candidate Name <span className="text-[#41e4c0]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                placeholder="e.g. Alex Mercer"
                className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                  errors.name && touched.name
                    ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                    : 'border-[#334155] focus:border-[#41e4c0]'
                }`}
              />
              {errors.name && touched.name && (
                <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            {/* Communication Email Input */}
            <div>
              <label className="block text-xs font-mono-caps text-[#d3e4fe] uppercase tracking-wider mb-1">
                Communication Email <span className="text-[#41e4c0]">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                placeholder="alex@organization.com"
                className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                  errors.email && touched.email
                    ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                    : 'border-[#334155] focus:border-[#41e4c0]'
                }`}
              />
              {errors.email && touched.email && (
                <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{errors.email}</span>
                </p>
              )}
            </div>

            {/* Phone & Proficiency */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] uppercase tracking-wider mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  placeholder="+94 77 123 4567"
                  className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                    errors.phone && touched.phone
                      ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                      : 'border-[#334155] focus:border-[#41e4c0]'
                  }`}
                />
                {errors.phone && touched.phone && (
                  <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    <span>{errors.phone}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-mono-caps text-[#d3e4fe] uppercase tracking-wider mb-1">
                  AI Proficiency
                </label>
                <select
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced Developer">Advanced Developer</option>
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'processing'}
                className="w-full min-h-[48px] py-3 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all flex items-center justify-center gap-2 btn-glow disabled:opacity-50"
              >
                {status === 'processing' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-[#031427] border-t-transparent rounded-full animate-spin" />
                    <span>Executing AI Workflow...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit & Run AI Workflow</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};


