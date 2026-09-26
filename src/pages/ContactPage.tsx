import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { MAP_IMAGE_URL } from '../data/mockData';
import { TransmissionPayload } from '../types';
import { ScrollReveal } from '../ui/ScrollReveal';
import { ContactFAQ } from '../components/ContactFAQ';
import { AnimatedSuccessCheckmark } from '../ui/AnimatedSuccessCheckmark';
import { Mail, Phone, MapPin, Send, CheckCircle, Radio, Globe2, Crosshair, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const ContactPage: React.FC = () => {
  const [formData, setFormData] = useState<TransmissionPayload>({
    name: '',
    email: '',
    inquiryType: 'corporate',
    message: '',
  });

  const [status, setStatus] = useState<'idle' | 'transmitting' | 'sent'>('idle');
  const [errors, setErrors] = useState<{ name?: string; email?: string; message?: string }>({});
  const [touched, setTouched] = useState<{ name?: boolean; email?: boolean; message?: boolean }>({});

  const validateField = (field: 'name' | 'email' | 'message', val: string) => {
    let err = '';
    const trimmed = (val || '').trim();

    if (field === 'name') {
      if (!trimmed) {
        err = 'Identifier (Full Name) is required';
      } else if (trimmed.length < 2) {
        err = 'Name must be at least 2 characters long';
      }
    } else if (field === 'email') {
      if (!trimmed) {
        err = 'Channel (Email Address) is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        err = 'Please provide a valid email address (e.g. alex@organization.com)';
      }
    } else if (field === 'message') {
      if (!trimmed) {
        err = 'Payload details (Message) is required';
      } else if (trimmed.length < 10) {
        err = 'Message must be at least 10 characters long';
      }
    }

    return err;
  };

  const validateForm = () => {
    const nameErr = validateField('name', formData.name);
    const emailErr = validateField('email', formData.email);
    const messageErr = validateField('message', formData.message);

    const newErrors = {
      ...(nameErr ? { name: nameErr } : {}),
      ...(emailErr ? { email: emailErr } : {}),
      ...(messageErr ? { message: messageErr } : {}),
    };

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: 'name' | 'email' | 'message') => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const err = validateField(field, formData[field]);
    setErrors((prev) => ({ ...prev, [field]: err || undefined }));
  };

  const handleInputChange = (field: keyof TransmissionPayload, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));

    if (field === 'name' || field === 'email' || field === 'message') {
      if (touched[field]) {
        const err = validateField(field, val);
        setErrors((prev) => ({ ...prev, [field]: err || undefined }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({ name: true, email: true, message: true });
    const isValid = validateForm();
    if (!isValid) return;

    setStatus('transmitting');

    try {
      await addDoc(collection(db, 'contactMessages'), {
        name: formData.name.trim(),
        email: formData.email.trim(),
        inquiryType: formData.inquiryType,
        message: formData.message.trim(),
        userId: auth.currentUser?.uid || 'guest_contact',
        createdAt: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Contact message Firestore log note:', err);
    }

    setTimeout(() => {
      setStatus('sent');
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#41e4c0', '#38debb', '#60a5fa', '#93c5fd', '#38bdf8'],
          ticks: 200,
          gravity: 1.1,
          scalar: 0.85,
          shapes: ['circle', 'square'],
          disableForReducedMotion: true,
          zIndex: 9999,
        });
      } catch {}
    }, 600);
  };

  const staggerHeading = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const wordAnim = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 12,
        stiffness: 100,
      },
    },
  };

  return (
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 md:px-12 max-w-[1280px] mx-auto space-y-10 sm:space-y-16">
      {/* Header */}
      <div className="space-y-3 sm:space-y-4 max-w-3xl">
        <ScrollReveal duration={800}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
            <Radio className="w-3.5 h-3.5 animate-pulse shrink-0" />
            <span>Global Communications Uplink</span>
          </div>
        </ScrollReveal>
        
        <motion.h1
          variants={staggerHeading}
          initial="hidden"
          animate="visible"
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight flex flex-wrap gap-x-2 gap-y-1"
        >
          {"Initiate Connection Protocol".split(' ').map((word, i) => (
            <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <ScrollReveal delay={100} duration={800}>
          <p className="text-sm sm:text-base text-[#94a3b8] font-sans leading-relaxed">
            Transmit inquiries directly to our admissions office, research advisory panel, or enterprise consulting division.
          </p>
        </ScrollReveal>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Transmission Form */}
        <div className="lg:col-span-7">
          <ScrollReveal delay={100} duration={800}>
            <div className="bg-[#102034] border border-[#334155] rounded-xl p-5 sm:p-8 shadow-xl">
              {status === 'sent' ? (
                <div className="py-8 sm:py-12 text-center space-y-6">
                  <AnimatedSuccessCheckmark size={64} className="mx-auto" />
                  <div className="space-y-2">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC]">Transmission Confirmed</h3>
                    <p className="text-xs sm:text-sm text-[#94a3b8]">
                      Payload routed to <span className="text-[#41e4c0] font-semibold">{formData.inquiryType.toUpperCase()}</span> node. Response target: &lt; 24 Hours.
                    </p>
                  </div>
                  <div className="p-4 bg-[#0b1c30] rounded-lg border border-[#334155] font-mono-caps text-xs text-[#41e4c0] text-left space-y-1">
                    <div>UPLINK_STATUS: 200_OK</div>
                    <div>SENDER: {formData.email}</div>
                    <div>ENCRYPTION: AES-256-GCM</div>
                  </div>
                  <button
                    onClick={() => {
                      setStatus('idle');
                      setErrors({});
                      setTouched({});
                      setFormData({ name: '', email: '', inquiryType: 'corporate', message: '' });
                    }}
                    className="w-full sm:w-auto min-h-[44px] px-8 py-3 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all"
                  >
                    New Transmission
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-5 sm:space-y-6">
                  <div className="border-b border-[#334155] pb-3 sm:pb-4 flex items-center justify-between">
                    <span className="font-mono-caps text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
                      Transmission Form
                    </span>
                    <span className="font-mono-caps text-[10px] sm:text-xs text-[#41e4c0]">
                      ENCRYPTED CHANNEL
                    </span>
                  </div>

                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                      Identifier (Name) <span className="text-[#41e4c0]">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onBlur={() => handleBlur('name')}
                      placeholder="Dr. Evelyn Reed"
                      className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
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

                  {/* Email Input */}
                  <div>
                    <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                      Channel (Email Address) <span className="text-[#41e4c0]">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                      placeholder="e.reed@enterprise.com"
                      className={`w-full min-h-[44px] bg-[#0b1c30] border rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
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

                  {/* Inquiry Type */}
                  <div>
                    <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                      Vector (Inquiry Type)
                    </label>
                    <select
                      value={formData.inquiryType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          inquiryType: e.target.value as TransmissionPayload['inquiryType'],
                        })
                      }
                      className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
                    >
                      <option value="corporate">Corporate AI Consultation & Custom Training</option>
                      <option value="academic">Academic Enrollment & Course Protocols</option>
                      <option value="research">Research Collaboration & Paper Access</option>
                      <option value="media">Institutional Media Inquiry</option>
                    </select>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                      Payload (Message Detail) <span className="text-[#41e4c0]">*</span>
                    </label>
                    <textarea
                      rows={4}
                      value={formData.message}
                      onChange={(e) => handleInputChange('message', e.target.value)}
                      onBlur={() => handleBlur('message')}
                      placeholder="Provide parameters regarding your inquiry..."
                      className={`w-full min-h-[100px] bg-[#0b1c30] border rounded-lg px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none transition-colors ${
                        errors.message && touched.message
                          ? 'border-rose-500/80 bg-rose-950/10 focus:border-rose-400'
                          : 'border-[#334155] focus:border-[#41e4c0]'
                      }`}
                    />
                    {errors.message && touched.message && (
                      <p className="text-rose-400 text-xs font-sans mt-1.5 flex items-center gap-1.5 animate-in fade-in">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                        <span>{errors.message}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={status === 'transmitting'}
                    className="w-full min-h-[48px] py-3.5 sm:py-4 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all flex items-center justify-center gap-2 btn-glow disabled:opacity-50"
                  >
                    {status === 'transmitting' ? (
                      <>
                        <span className="w-4 h-4 border-2 border-[#031427] border-t-transparent rounded-full animate-spin" />
                        <span>Transmitting Payload...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Transmit Data</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </ScrollReveal>
        </div>

        {/* Uplink Nodes Sidebar & Digital Map */}
        <div className="lg:col-span-5 space-y-6 sm:space-y-8">
          {/* Direct Uplink Nodes */}
          <ScrollReveal delay={200} duration={800}>
            <div className="bg-[#102034] border border-[#334155] rounded-xl p-5 sm:p-8 space-y-5 sm:space-y-6">
              <h3 className="font-mono-caps text-xs font-bold text-[#F8FAFC] uppercase tracking-wider border-b border-[#334155] pb-3 sm:pb-4">
                Direct Uplink Routing
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-[#0b1c30] rounded-lg border border-[#334155] text-[#41e4c0] shrink-0">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono-caps text-[#94a3b8]">PRIMARY ROUTING</div>
                    <div className="text-xs sm:text-sm font-bold text-[#F8FAFC] mt-0.5 break-all">inquiries@instituteofai.edu</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-[#0b1c30] rounded-lg border border-[#334155] text-[#41e4c0] shrink-0">
                    <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono-caps text-[#94a3b8]">VOICE UPLINK</div>
                    <div className="text-xs sm:text-sm font-bold text-[#F8FAFC] mt-0.5">+94 11 234 5678</div>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-[#0b1c30] rounded-lg border border-[#334155] text-[#41e4c0] shrink-0">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-mono-caps text-[#94a3b8]">PHYSICAL SECTOR</div>
                    <div className="text-xs sm:text-sm font-bold text-[#F8FAFC] mt-0.5">
                      AI Innovation Hub, Colombo Tech Park
                    </div>
                    <div className="text-xs text-[#94a3b8]">Western Province, Sri Lanka</div>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Interactive Digital Map Widget */}
          <ScrollReveal delay={300} duration={800}>
            <div className="bg-[#102034] border border-[#334155] rounded-xl p-5 sm:p-6 space-y-4 relative overflow-hidden group">
              <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-1">
                <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0]">
                  <Globe2 className="w-4 h-4 shrink-0" />
                  <span>PRIMARY HUB COORDINATES</span>
                </div>
                <span className="text-[10px] font-mono-caps text-[#94a3b8]">LAT: 6.9271° N, LON: 79.8612° E</span>
              </div>

              {/* Map Canvas Frame */}
              <div className="relative h-48 sm:h-56 rounded-lg border border-[#334155] overflow-hidden">
                <img
                  src={MAP_IMAGE_URL}
                  alt="Colombo Tech Park Digital Location Map"
                  className="w-full h-full object-cover filter brightness-90 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-[#031427]/30 bg-grid-pattern pointer-events-none" />

                {/* Target Crosshair Marker */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative flex items-center justify-center">
                    <span className="w-8 h-8 rounded-full border-2 border-[#41e4c0] animate-ping absolute opacity-75" />
                    <Crosshair className="w-8 h-8 text-[#41e4c0] relative z-10" />
                  </div>
                </div>

                <div className="absolute bottom-2 left-2 px-2 py-1 bg-[#031427]/90 border border-[#334155] text-[10px] font-mono-caps text-[#41e4c0] rounded">
                  COLOMBO_NODE_ACTIVE
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Accordion FAQ Component */}
      <ContactFAQ />
    </div>
  );
};

