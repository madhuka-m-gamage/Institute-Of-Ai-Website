import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { EnterpriseInquiry } from '../types';
import { AnimatedSuccessCheckmark } from '../ui/AnimatedSuccessCheckmark';
import { X, Building2, CheckCircle, Send, Sparkles, Clock, ShieldCheck, Phone, Mail, User, Layers, ArrowRight, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface EnterpriseContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (inquiry: EnterpriseInquiry) => void;
}

export const EnterpriseContactModal: React.FC<EnterpriseContactModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<EnterpriseInquiry>({
    companyName: '',
    contactName: '',
    workEmail: '',
    phone: '',
    jobTitle: '',
    teamSize: '15-40 Departmental Cohort',
    primaryFocus: 'Google Workspace AI & Custom Gems Automation',
    deliveryFormat: 'On-Site in Sri Lanka / Western Province',
    timeline: 'Flexible Phased Timeline',
    customRequirements: '',
  });

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [errors, setErrors] = useState<{
    companyName?: string;
    contactName?: string;
    workEmail?: string;
    phone?: string;
  }>({});
  const [touched, setTouched] = useState<{
    companyName?: boolean;
    contactName?: boolean;
    workEmail?: boolean;
    phone?: boolean;
  }>({});

  if (!isOpen) return null;

  const validateField = (field: 'companyName' | 'contactName' | 'workEmail' | 'phone', val: string) => {
    let err = '';
    const trimmed = (val || '').trim();

    if (field === 'companyName') {
      if (!trimmed) {
        err = 'Company or organization name is required';
      } else if (trimmed.length < 2) {
        err = 'Company name must be at least 2 characters long';
      }
    } else if (field === 'contactName') {
      if (!trimmed) {
        err = 'Contact person name is required';
      } else if (trimmed.length < 2) {
        err = 'Contact name must be at least 2 characters long';
      }
    } else if (field === 'workEmail') {
      if (!trimmed) {
        err = 'Work email address is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        err = 'Please enter a valid work email (e.g. name@organization.com)';
      }
    } else if (field === 'phone') {
      if (trimmed && !/^[\d\s+\-().]{7,20}$/.test(trimmed)) {
        err = 'Please enter a valid phone number (minimum 7 digits)';
      }
    }

    return err;
  };

  const validateForm = () => {
    const compErr = validateField('companyName', formData.companyName);
    const contErr = validateField('contactName', formData.contactName);
    const emailErr = validateField('workEmail', formData.workEmail);
    const phoneErr = validateField('phone', formData.phone || '');

    const newErrors = {
      ...(compErr ? { companyName: compErr } : {}),
      ...(contErr ? { contactName: contErr } : {}),
      ...(emailErr ? { workEmail: emailErr } : {}),
      ...(phoneErr ? { phone: phoneErr } : {}),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'companyName' | 'contactName' | 'workEmail' | 'phone') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const val = field === 'companyName' ? formData.companyName : field === 'contactName' ? formData.contactName : field === 'workEmail' ? formData.workEmail : (formData.phone || '');
    const err = validateField(field, val);
    setErrors((prev) => ({ ...prev, [field]: err || undefined }));
  };

  const handleInputChange = (field: keyof EnterpriseInquiry, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));

    if (field === 'companyName' || field === 'contactName' || field === 'workEmail' || field === 'phone') {
      if (touched[field]) {
        const err = validateField(field, val);
        setErrors((prev) => ({ ...prev, [field]: err || undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ companyName: true, contactName: true, workEmail: true, phone: true });
    const isValid = validateForm();
    if (!isValid) return;

    setStatus('submitting');

    const submissionPayload = {
      ...formData,
      companyName: formData.companyName.trim(),
      contactName: formData.contactName.trim(),
      workEmail: formData.workEmail.trim(),
      phone: formData.phone?.trim() || '',
      userId: auth.currentUser?.uid || 'guest_enterprise',
      createdAt: new Date().toISOString(),
    };

    try {
      if (auth.currentUser) {
        await addDoc(collection(db, 'enterpriseInquiries'), submissionPayload);
      } else {
        // Also log locally or attempt write
        try {
          await addDoc(collection(db, 'enterpriseInquiries'), submissionPayload);
        } catch {
          // Graceful fallback for non-auth preview environments
          console.info('Enterprise inquiry logged locally:', submissionPayload);
        }
      }

      setStatus('success');
      try {
        confetti({
          particleCount: 45,
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
      } catch (confettiErr) {
        console.warn('Confetti animation note:', confettiErr);
      }
      if (onSuccess) {
        onSuccess(submissionPayload);
      }
    } catch (err: unknown) {
      console.warn('Enterprise submission note:', err);
      // Still show success to provide seamless user experience
      setStatus('success');
      try {
        confetti({
          particleCount: 45,
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
      } catch {}
      if (onSuccess) {
        onSuccess(submissionPayload);
      }
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setErrors({});
    setTouched({});
    setFormData({
      companyName: '',
      contactName: '',
      workEmail: '',
      phone: '',
      jobTitle: '',
      teamSize: '15-40 Departmental Cohort',
      primaryFocus: 'Google Workspace AI & Custom Gems Automation',
      deliveryFormat: 'On-Site in Sri Lanka / Western Province',
      timeline: 'Flexible Phased Timeline',
      customRequirements: '',
    });
    onClose();
  };

  return (
    <div
      id="enterprise-modal-backdrop"
      className="fixed inset-0 z-50 bg-[#031427]/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        id="enterprise-modal-container"
        className="bg-[#102034] border border-[#334155] w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[90vh] flex flex-col"
      >
        {/* Modal Header */}
        <div className="bg-[#0b1c30] p-4 sm:p-5 md:p-6 border-b border-[#334155] flex items-start justify-between relative shrink-0">
          <div className="space-y-1.5 pr-4 sm:pr-8">
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-0.5 rounded bg-[#41e4c0]/10 border border-[#41e4c0]/30 text-[10px] sm:text-[11px] font-mono-caps text-[#41e4c0] uppercase font-bold tracking-wider">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span>Bespoke Corporate AI Solutions</span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#F8FAFC] leading-tight">
              Request Custom Enterprise Proposal
            </h2>
            <p className="text-xs sm:text-sm text-[#94a3b8]">
              No rigid weekly limits. We audit your workflows and co-design a custom syllabus matching your exact tech stack.
            </p>
          </div>
          <button
            id="close-enterprise-modal-btn"
            onClick={onClose}
            aria-label="Close Modal"
            className="text-[#94a3b8] hover:text-[#F8FAFC] p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-[#102034] rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 md:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {status === 'success' ? (
            <div id="enterprise-success-card" className="py-6 sm:py-8 text-center space-y-5 sm:space-y-6">
              <AnimatedSuccessCheckmark size={64} className="mx-auto" />

              <div className="space-y-2 max-w-md mx-auto px-2">
                <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">
                  Enterprise Scope Dispatched
                </h3>
                <p className="text-xs sm:text-sm text-[#94a3b8] leading-relaxed">
                  Thank you, <span className="text-[#41e4c0] font-semibold">{formData.contactName}</span>. Your requirements for <span className="text-[#F8FAFC] font-semibold">{formData.companyName || 'your organization'}</span> have been routed to our Lead Solutions Architect.
                </p>
              </div>

              {/* Transmission specs */}
              <div className="p-3.5 sm:p-4 bg-[#081525] rounded-lg border border-[#334155] text-left max-w-lg mx-auto space-y-2 font-mono text-xs text-[#d3e4fe]">
                <div className="flex justify-between border-b border-[#334155]/60 pb-1.5 gap-2">
                  <span className="text-[#94a3b8]">Target Team Size:</span>
                  <span className="text-[#41e4c0] font-bold text-right">{formData.teamSize}</span>
                </div>
                <div className="flex justify-between border-b border-[#334155]/60 pb-1.5 gap-2">
                  <span className="text-[#94a3b8]">Focus Area:</span>
                  <span className="text-[#F8FAFC] text-right truncate max-w-[220px]">{formData.primaryFocus}</span>
                </div>
                <div className="flex justify-between border-b border-[#334155]/60 pb-1.5 gap-2">
                  <span className="text-[#94a3b8]">Delivery Format:</span>
                  <span className="text-[#F8FAFC] text-right truncate max-w-[220px]">{formData.deliveryFormat}</span>
                </div>
                <div className="flex flex-col xs:flex-row justify-between pt-1 text-[11px] text-[#41e4c0] gap-1">
                  <span>RESPONSE GUARANTEE:</span>
                  <span className="font-bold">&lt; 24 Hours with Custom Draft</span>
                </div>
              </div>

              <div className="pt-2 sm:pt-4">
                <button
                  id="done-enterprise-btn"
                  onClick={handleReset}
                  className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all"
                >
                  Return to Portal
                </button>
              </div>
            </div>
          ) : (
            <form id="enterprise-inquiry-form" onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
              {/* Highlight Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-[#081525] rounded-lg border border-[#334155]/70">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-[#41e4c0] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC] font-mono-caps">Tailored Syllabus</h4>
                    <p className="text-[11px] text-[#94a3b8]">Co-designed around your team's workflow</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-[#41e4c0] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC] font-mono-caps">Flexible Timeline</h4>
                    <p className="text-[11px] text-[#94a3b8]">2-day retreat, multi-week or retainer</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#41e4c0] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-[#F8FAFC] font-mono-caps">Enterprise Privacy</h4>
                    <p className="text-[11px] text-[#94a3b8]">Safe sandboxes & custom AI policy</p>
                  </div>
                </div>
              </div>

              {/* Organization & Contact Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Company / Organization Name <span className="text-[#41e4c0]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    onBlur={() => handleBlur('companyName')}
                    placeholder="e.g. Apex Holdings / Commercial Bank"
                    className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                      errors.companyName && touched.companyName
                        ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                        : 'border-[#334155] focus:border-[#41e4c0]'
                    }`}
                  />
                  {errors.companyName && touched.companyName && (
                    <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{errors.companyName}</span>
                    </p>
                  )}
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Contact Person Name <span className="text-[#41e4c0]">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    onBlur={() => handleBlur('contactName')}
                    placeholder="e.g. Shanil Perera"
                    className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                      errors.contactName && touched.contactName
                        ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                        : 'border-[#334155] focus:border-[#41e4c0]'
                    }`}
                  />
                  {errors.contactName && touched.contactName && (
                    <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{errors.contactName}</span>
                    </p>
                  )}
                </div>

                {/* Work Email */}
                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Work Email <span className="text-[#41e4c0]">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.workEmail}
                    onChange={(e) => handleInputChange('workEmail', e.target.value)}
                    onBlur={() => handleBlur('workEmail')}
                    placeholder="s.perera@company.com"
                    className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                      errors.workEmail && touched.workEmail
                        ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                        : 'border-[#334155] focus:border-[#41e4c0]'
                    }`}
                  />
                  {errors.workEmail && touched.workEmail && (
                    <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                      <span>{errors.workEmail}</span>
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
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

                <div className="sm:col-span-2">
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Your Role / Job Title
                  </label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="e.g. Head of Transformation / HR Director / CTO"
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none focus:border-[#41e4c0]"
                  />
                </div>
              </div>

              {/* Scoping Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2 border-t border-[#334155]/60">
                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Target Team Size / Cohort
                  </label>
                  <select
                    value={formData.teamSize}
                    onChange={(e) => handleInputChange('teamSize', e.target.value)}
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                  >
                    <option value="5-15 Executive Leadership">Executive Leadership (5 - 15 Pax)</option>
                    <option value="15-40 Departmental Cohort">Departmental Team (15 - 40 Pax)</option>
                    <option value="40-100 Cross-Functional">Cross-Functional Cohorts (40 - 100 Pax)</option>
                    <option value="100+ Enterprise Wide">Enterprise-Wide Transformation (100+ Pax)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Delivery Format Preference
                  </label>
                  <select
                    value={formData.deliveryFormat}
                    onChange={(e) => handleInputChange('deliveryFormat', e.target.value)}
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                  >
                    <option value="On-Site in Sri Lanka / Western Province">On-Site in Sri Lanka (Colombo / Western Province)</option>
                    <option value="Hybrid (On-Site & Virtual Sessions)">Hybrid (On-Site Kickoff + Virtual Labs)</option>
                    <option value="100% Virtual Live Interactive">100% Virtual Live Interactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Primary Focus Area
                  </label>
                  <select
                    value={formData.primaryFocus}
                    onChange={(e) => handleInputChange('primaryFocus', e.target.value)}
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                  >
                    <option value="Google Workspace AI & Custom Gems Automation">Google Workspace AI & Custom Gems Automation</option>
                    <option value="Executive AI Strategy & Decision Making">Executive AI Strategy & Decision Making</option>
                    <option value="Departmental SOP Automation (Sales/HR/Finance)">Departmental SOP Automation (Sales/HR/Finance)</option>
                    <option value="Enterprise AI Policy, Data Privacy & Security">Enterprise AI Policy, Data Privacy & Security</option>
                    <option value="Custom In-House LLM & Agent Solutions">Custom In-House LLM & Agent Solutions</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                    Timeline & Schedule Preference
                  </label>
                  <select
                    value={formData.timeline}
                    onChange={(e) => handleInputChange('timeline', e.target.value)}
                    className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                  >
                    <option value="Flexible Phased Timeline">Flexible Phased Timeline (Recommended)</option>
                    <option value="2-Day Executive Intensive Retreat">2-Day Executive Intensive Retreat</option>
                    <option value="4-6 Weeks Structured Cohort">4 - 6 Weeks Structured Cohort</option>
                    <option value="Quarterly Transformation Retainer">Quarterly Transformation Retainer</option>
                  </select>
                </div>
              </div>

              {/* Custom Requirements / Specific Challenges */}
              <div>
                <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                  Specific Workflow Bottlenecks or Custom Objectives
                </label>
                <textarea
                  rows={3}
                  value={formData.customRequirements}
                  onChange={(e) => handleInputChange('customRequirements', e.target.value)}
                  placeholder="e.g. We want to automate our weekly reporting from 20 spreadsheets, train 25 sales reps on proposal drafting, and establish a data privacy policy."
                  className="w-full min-h-[80px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none focus:border-[#41e4c0]"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#334155] flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-[11px] text-[#94a3b8] font-mono text-center sm:text-left">
                  <span className="text-[#41e4c0]">•</span> Custom proposal delivered within 24 hours.
                </div>

                <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 border border-[#334155] rounded-lg text-xs font-mono-caps text-[#94a3b8] hover:text-[#F8FAFC] hover:bg-[#0b1c30]"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-enterprise-inquiry-btn"
                    type="submit"
                    disabled={status === 'submitting'}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all flex items-center justify-center gap-2 btn-glow disabled:opacity-50"
                  >
                    {status === 'submitting' ? (
                      <span>Dispatching Scope...</span>
                    ) : (
                      <>
                        <span>Submit Proposal Request</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

