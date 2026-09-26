import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, Sparkles, GraduationCap, Laptop, Building2, Clock, CheckCircle2 } from 'lucide-react';
import { ScrollReveal } from '../../ui/ScrollReveal';

export interface FAQItem {
  id: string;
  category: 'Admissions & Prerequisites' | 'Training Formats & Delivery' | 'Certification & Enterprise';
  question: string;
  answer: string;
  highlights?: string[];
  icon: React.ComponentType<{ className?: string }>;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq-admissions-criteria',
    category: 'Admissions & Prerequisites',
    question: 'What are the technical prerequisites for enrolling in advanced AI programs?',
    answer:
      'Prerequisites vary by track. Foundational and Executive AI Strategy programs require no prior programming experience. Intermediate and advanced engineering tracks (e.g., Deep Learning Architecture, LLM Systems & Agents) recommend baseline proficiency in Python and fundamental linear algebra/statistics. Each applicant receives an automated diagnostic assessment and personalized learning roadmap upon application.',
    highlights: [
      'Diagnostic assessment provided with every application',
      'Python bridge modules available for accelerated onboarding',
      'No coding required for Executive & Product Management tracks',
    ],
    icon: GraduationCap,
  },
  {
    id: 'faq-training-format',
    category: 'Training Formats & Delivery',
    question: 'How are the training sessions structured (Hybrid, In-Person, or Async Virtual)?',
    answer:
      'We offer three primary delivery models: Intensive Live In-Person Cohorts at our Colombo Tech Park Innovation Hub, Interactive Hybrid Cohorts with real-time lab streaming, and 100% On-Demand Virtual tracks with weekly mentor check-ins and code review sandboxes.',
    highlights: [
      'State-of-the-art GPU lab access in Colombo Tech Park',
      'Live synchronized remote participation with low-latency sandbox labs',
      'Flexible weekend and evening cohort schedules for working practitioners',
    ],
    icon: Laptop,
  },
  {
    id: 'faq-admissions-timeline',
    category: 'Admissions & Prerequisites',
    question: 'What is the application review timeline and cohort selection process?',
    answer:
      'Applications are evaluated on a rolling basis. Once submitted, our AI Admissions Assistant and Admissions Committee review your profile within 48 to 72 hours. Selected candidates receive an official letter of acceptance, tuition details, and onboarding credentials to begin pre-work immediately.',
    highlights: [
      '48-72 hour response time for standard applications',
      'Rolling admissions with 4 cohort intakes per calendar year',
      'Priority seat reservations available for early applicants',
    ],
    icon: Clock,
  },
  {
    id: 'faq-enterprise-customization',
    category: 'Certification & Enterprise',
    question: 'Can programs be customized for corporate engineering and executive teams?',
    answer:
      'Yes. Our Enterprise Training division designs tailored workshops, dedicated corporate bootcamps, and on-premise AI alignment sandboxes. We conduct an upfront organizational AI readiness audit to tailor syllabus modules to your technology stack, compliance standards, and internal product goals.',
    highlights: [
      'Bespoke curriculum aligned with your cloud infrastructure (GCP, AWS, Azure)',
      'Confidential on-premise and closed-network sandbox deployments',
      'Enterprise skill progression dashboard for engineering leadership',
    ],
    icon: Building2,
  },
  {
    id: 'faq-certification-credentials',
    category: 'Certification & Enterprise',
    question: 'What industry-recognized certifications and verifiable credentials are provided?',
    answer:
      'Graduates receive verifiable cryptographic digital credentials, a portfolio of peer-reviewed capstone projects hosted in public/enterprise repositories, and official alumni membership in the Institute of AI Global Practitioner Network with lifetime access to continuing research seminars.',
    highlights: [
      'Blockchain-verifiable digital credential badges and certificates',
      'End-to-end production capstone project ready for technical portfolios',
      'Alumni research network access and career mentor matching',
    ],
    icon: CheckCircle2,
  },
];

const CATEGORIES = [
  'All Inquiries',
  'Admissions & Prerequisites',
  'Training Formats & Delivery',
  'Certification & Enterprise',
] as const;

export const ContactFAQ: React.FC = () => {
  const [openId, setOpenId] = useState<string | null>('faq-admissions-criteria');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Inquiries');

  const toggleItem = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const filteredFaqs =
    selectedCategory === 'All Inquiries'
      ? FAQ_DATA
      : FAQ_DATA.filter((faq) => faq.category === selectedCategory);

  return (
    <section id="contact-faq-section" className="w-full space-y-6 sm:space-y-8 pt-4">
      {/* Section Header */}
      <ScrollReveal duration={800}>
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
            <HelpCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Admissions & Training FAQ</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">
            Frequently Asked <span className="text-[#41e4c0]">Questions</span>
          </h2>
          <p className="text-sm sm:text-base text-[#94a3b8] max-w-3xl leading-relaxed">
            Find immediate answers regarding admissions qualifications, cohort timelines, hybrid training formats, and enterprise solutions.
          </p>
        </div>
      </ScrollReveal>

      {/* Category Filter Pills */}
      <ScrollReveal delay={100} duration={800}>
        <div className="flex flex-wrap gap-2 pt-1 pb-2">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono-caps transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#41e4c0] text-[#031427] font-bold border-[#41e4c0] shadow-md shadow-[#41e4c0]/20'
                    : 'bg-[#102034] text-[#d3e4fe] border-[#334155] hover:border-[#41e4c0]/50 hover:text-[#41e4c0]'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Accordion List */}
      <div className="space-y-3 sm:space-y-4">
        {filteredFaqs.map((faq, idx) => {
          const isOpen = openId === faq.id;
          const Icon = faq.icon;

          return (
            <ScrollReveal key={faq.id} delay={idx * 60} duration={600}>
              <div
                className={`border rounded-xl transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? 'bg-[#102034] border-[#41e4c0]/50 shadow-lg shadow-[#41e4c0]/5'
                    : 'bg-[#0b1c30]/90 border-[#334155] hover:border-[#41e4c0]/30 hover:bg-[#102034]/60'
                }`}
              >
                {/* Accordion Trigger Header */}
                <button
                  type="button"
                  id={`faq-trigger-${faq.id}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-content-${faq.id}`}
                  onClick={() => toggleItem(faq.id)}
                  className="w-full p-4 sm:p-6 text-left flex items-start justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5 sm:gap-4 flex-1">
                    <div
                      className={`p-2.5 sm:p-3 rounded-lg border transition-colors shrink-0 mt-0.5 ${
                        isOpen
                          ? 'bg-[#41e4c0]/15 border-[#41e4c0]/50 text-[#41e4c0]'
                          : 'bg-[#031427] border-[#334155] text-[#94a3b8] group-hover:text-[#41e4c0]'
                      }`}
                    >
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono-caps text-[#41e4c0] uppercase tracking-wider block">
                        {faq.category}
                      </span>
                      <h3
                        className={`text-sm sm:text-base font-bold transition-colors ${
                          isOpen ? 'text-[#41e4c0]' : 'text-[#F8FAFC] group-hover:text-[#41e4c0]'
                        }`}
                      >
                        {faq.question}
                      </h3>
                    </div>
                  </div>

                  <div
                    className={`p-1.5 sm:p-2 rounded-full border shrink-0 transition-transform duration-300 ${
                      isOpen
                        ? 'bg-[#41e4c0] text-[#031427] border-[#41e4c0] rotate-180'
                        : 'bg-[#0b1c30] text-[#94a3b8] border-[#334155] group-hover:text-[#41e4c0] group-hover:border-[#41e4c0]/40'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {/* Accordion Collapsible Content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-content-${faq.id}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                    >
                      <div className="px-4 pb-5 sm:px-6 sm:pb-6 pt-0 border-t border-[#334155]/40 space-y-4">
                        <p className="text-xs sm:text-sm text-[#d3e4fe]/90 leading-relaxed pt-4">
                          {faq.answer}
                        </p>

                        {faq.highlights && faq.highlights.length > 0 && (
                          <div className="p-3.5 sm:p-4 rounded-lg bg-[#031427]/80 border border-[#334155]/60 space-y-2">
                            <div className="flex items-center gap-1.5 text-[11px] font-mono-caps text-[#41e4c0] uppercase tracking-wider">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Key Program Takeaways</span>
                            </div>
                            <ul className="space-y-1.5">
                              {faq.highlights.map((highlight, hIdx) => (
                                <li
                                  key={hIdx}
                                  className="text-xs text-[#94a3b8] flex items-start gap-2"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#41e4c0] mt-1.5 shrink-0" />
                                  <span>{highlight}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </section>
  );
};
