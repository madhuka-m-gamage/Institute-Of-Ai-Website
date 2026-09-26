import React from 'react';
import { Page } from '../types';
import { ThreeBackground } from '../components/ThreeBackground';
import { ScrollReveal } from '../components/ScrollReveal';
import { ArrowUpRight, Cpu, Shield, Zap, Compass, ChevronRight, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface HomePageProps {
  onNavigate: (page: Page) => void;
  onOpenApply: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onOpenApply }) => {
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
    <div className="relative w-full min-h-screen text-[#d3e4fe] overflow-hidden">
      {/* Hero Section with Interactive Shader Background */}
      <section className="relative min-h-[85vh] flex items-center justify-center pt-12 pb-20 px-4 md:px-12 border-b border-[#334155]/40">
        <ThreeBackground />

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 mt-6">
          <ScrollReveal delay={100} duration={800}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#102034]/80 border border-[#41e4c0]/40 backdrop-blur-md shadow-lg">
              <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-pulse" />
              <span className="font-mono-caps text-xs text-[#41e4c0] uppercase tracking-widest">
                Initializing Future Protocols
              </span>
            </div>
          </ScrollReveal>

          {/* Main Headline */}
          <motion.h1
            variants={staggerHeading}
            initial="hidden"
            animate="visible"
            className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-[#F8FAFC] tracking-tight leading-[1.08] max-w-3xl mx-auto flex flex-col sm:inline-block gap-2"
          >
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.25em' }}>
              {"AI won't replace you.".split(' ').map((word, i) => (
                <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
                  {word}
                </motion.span>
              ))}
            </span>
            <span style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.25em' }}>
              {"A person using AI will.".split(' ').map((word, i) => (
                <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }} className="text-transparent bg-clip-text bg-gradient-to-r from-[#41e4c0] via-[#64FFDA] to-[#b9c7e4]">
                  {word}
                </motion.span>
              ))}
            </span>
          </motion.h1>

          <ScrollReveal delay={300} duration={800}>
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-[#94a3b8] max-w-2xl mx-auto font-sans leading-relaxed">
              The Institute of AI bridges cutting-edge research, hands-on engineering, and algorithmic alignment to empower the next generation of intelligence.
            </p>
          </ScrollReveal>

          <ScrollReveal delay={400} duration={800}>
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={() => onNavigate('programs')}
                className="w-full sm:w-auto px-8 py-4 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-sm hover:bg-[#38debb] transition-all btn-glow flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Explore Curriculum</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigate('research')}
                className="w-full sm:w-auto px-8 py-4 bg-[#102034]/90 text-[#F8FAFC] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-sm border border-[#334155] hover:border-[#41e4c0] hover:text-[#41e4c0] transition-all backdrop-blur-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Research</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </ScrollReveal>

          {/* Key Metrics Strip */}
          <ScrollReveal delay={500} duration={800}>
            <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left font-mono-caps">
              <div className="p-4 rounded bg-[#102034]/60 border border-[#334155]/50 backdrop-blur-sm">
                <div className="text-xs text-[#94a3b8]">PARTNERSHIPS</div>
                <div className="text-2xl font-bold text-[#F8FAFC] mt-1">150+</div>
                <div className="text-[10px] text-[#41e4c0] mt-0.5">Global Enterprises</div>
              </div>
              <div className="p-4 rounded bg-[#102034]/60 border border-[#334155]/50 backdrop-blur-sm">
                <div className="text-xs text-[#94a3b8]">LATENCY</div>
                <div className="text-2xl font-bold text-[#F8FAFC] mt-1">&lt; 12ms</div>
                <div className="text-[10px] text-[#41e4c0] mt-0.5">Edge Inference</div>
              </div>
              <div className="p-4 rounded bg-[#102034]/60 border border-[#334155]/50 backdrop-blur-sm">
                <div className="text-xs text-[#94a3b8]">ALIGNMENT</div>
                <div className="text-2xl font-bold text-[#F8FAFC] mt-1">99.98%</div>
                <div className="text-[10px] text-[#41e4c0] mt-0.5">Safety Guarantee</div>
              </div>
              <div className="p-4 rounded bg-[#102034]/60 border border-[#334155]/50 backdrop-blur-sm">
                <div className="text-xs text-[#94a3b8]">RESEARCH</div>
                <div className="text-2xl font-bold text-[#F8FAFC] mt-1">120+</div>
                <div className="text-[10px] text-[#41e4c0] mt-0.5">Peer Publications</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Educational Pathway & Program Tracks */}
      <section className="py-20 px-4 md:px-12 max-w-[1280px] mx-auto border-t border-[#334155]/40">
        <ScrollReveal duration={800}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="font-mono-caps text-xs text-[#41e4c0] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>Structured Academic Pathways</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
                Master Real-World AI
              </h2>
            </div>
            <p className="text-[#94a3b8] max-w-md text-sm mt-4 md:mt-0 font-sans">
              From zero-fear survival fluency to 8-week workflow mastery, 12-week enterprise engineering, and bespoke corporate transformation.
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Program Pathways Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tier 1: Fundamentals */}
          <ScrollReveal delay={100} duration={800}>
            <div className="bg-[#102034] border border-[#334155] hover:border-[#41e4c0] p-6 rounded-xl flex flex-col justify-between h-full transition-all group shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded bg-[#41e4c0]/10 text-[#41e4c0] text-[10px] font-mono-caps font-bold uppercase tracking-wider border border-[#41e4c0]/30">
                    3-Day Workshop
                  </span>
                  <span className="text-xs font-mono text-[#F8FAFC] font-bold">Rs. 7,500</span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors mb-2">
                  AI Survival & Real-World Fluency
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                  Eliminate fear, master everyday prompting, and streamline daily tasks in just 3 days (6 hours).
                </p>
              </div>
              <button
                onClick={() => onNavigate('programs')}
                className="w-full min-h-[40px] px-3 py-2 bg-[#0b1c30] hover:bg-[#41e4c0] text-[#41e4c0] hover:text-[#031427] font-mono-caps text-xs font-bold uppercase rounded-lg border border-[#334155] hover:border-[#41e4c0] transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Syllabus</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </ScrollReveal>

          {/* Tier 2: Amateur / Intermediate */}
          <ScrollReveal delay={150} duration={800}>
            <div className="bg-[#102034] border border-[#334155] hover:border-[#41e4c0] p-6 rounded-xl flex flex-col justify-between h-full transition-all group shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded bg-[#41e4c0]/10 text-[#41e4c0] text-[10px] font-mono-caps font-bold uppercase tracking-wider border border-[#41e4c0]/30">
                    8-Week Accelerator
                  </span>
                  <span className="text-xs font-mono text-[#F8FAFC] font-bold">Rs. 38,000</span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors mb-2">
                  Applied AI Practitioner & Workflow Builder
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                  Precision RTCC prompting, private NotebookLM research hubs, multimodal creation & Custom Gems.
                </p>
              </div>
              <button
                onClick={() => onNavigate('programs')}
                className="w-full min-h-[40px] px-3 py-2 bg-[#0b1c30] hover:bg-[#41e4c0] text-[#41e4c0] hover:text-[#031427] font-mono-caps text-xs font-bold uppercase rounded-lg border border-[#334155] hover:border-[#41e4c0] transition-all flex items-center justify-center gap-1.5"
              >
                <span>View Syllabus</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </ScrollReveal>

          {/* Tier 3: Flagship Master */}
          <ScrollReveal delay={200} duration={800}>
            <div className="bg-[#102034] border border-[#41e4c0]/60 p-6 rounded-xl flex flex-col justify-between h-full transition-all group shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#41e4c0] text-[#031427] text-[9px] font-mono-caps font-bold px-2 py-0.5 rounded-bl">
                MOST POPULAR
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded bg-[#41e4c0]/20 text-[#41e4c0] text-[10px] font-mono-caps font-bold uppercase tracking-wider border border-[#41e4c0]/40">
                    12-Week Flagship
                  </span>
                  <span className="text-xs font-mono text-[#41e4c0] font-bold">Rs. 75,000</span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors mb-2">
                  AI Master for Real Life
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                  The complete Google AI ecosystem, custom digital employees, Apps Script no-code automation & ROI Capstone.
                </p>
              </div>
              <button
                onClick={() => onNavigate('programs')}
                className="w-full min-h-[40px] px-3 py-2 bg-[#41e4c0] hover:bg-[#38debb] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <span>View 3-Month Syllabus</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </ScrollReveal>

          {/* Tier 4: Enterprise Custom */}
          <ScrollReveal delay={250} duration={800}>
            <div className="bg-[#102034] border border-[#334155] hover:border-[#41e4c0] p-6 rounded-xl flex flex-col justify-between h-full transition-all group shadow-lg">
              <div>
                <div className="flex items-center justify-between gap-2 mb-4">
                  <span className="px-2.5 py-1 rounded bg-[#b9c7e4]/10 text-[#b9c7e4] text-[10px] font-mono-caps font-bold uppercase tracking-wider border border-[#b9c7e4]/30">
                    Custom Timeline
                  </span>
                  <span className="text-xs font-mono text-[#94a3b8]">Custom Proposal</span>
                </div>
                <h3 className="text-lg font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors mb-2">
                  Enterprise Custom AI & Solutions
                </h3>
                <p className="text-xs text-[#94a3b8] leading-relaxed mb-4">
                  Bespoke organizational audits, co-designed training, custom departmental Gems & corporate governance.
                </p>
              </div>
              <button
                onClick={() => onNavigate('programs')}
                className="w-full min-h-[40px] px-3 py-2 bg-[#0b1c30] hover:bg-[#41e4c0] text-[#41e4c0] hover:text-[#031427] font-mono-caps text-xs font-bold uppercase rounded-lg border border-[#334155] hover:border-[#41e4c0] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Scope Consultation</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Redefining Intelligence Bento Grid */}
      <section className="py-24 px-4 md:px-12 max-w-[1280px] mx-auto">
        <ScrollReveal duration={800}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
            <div>
              <div className="font-mono-caps text-xs text-[#41e4c0] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span>Core Capabilities</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-[#F8FAFC] tracking-tight">
                Redefining Intelligence
              </h2>
            </div>
            <p className="text-[#94a3b8] max-w-md text-sm mt-4 md:mt-0 font-sans">
              Our multi-disciplinary research matrix spans frontier architecture design, compute acceleration, and cyber-physical robotics.
            </p>
          </div>
        </ScrollReveal>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Neural Architectures */}
          <ScrollReveal delay={100} duration={800}>
            <div
              onClick={() => onNavigate('research')}
              className="glass-card p-8 rounded-lg cursor-pointer group flex flex-col justify-between min-h-[280px] h-full"
            >
              <div>
                <div className="w-12 h-12 rounded bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0] mb-6 group-hover:scale-110 transition-transform">
                  <Cpu className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3 group-hover:text-[#41e4c0] transition-colors">
                  Neural Architectures
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Deep learning models re-engineered for ultra-low parameter redundancy and high-throughput reasoning.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] pt-6">
                <span>EXPLORE ARCHITECTURES</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Velocity & Compute */}
          <ScrollReveal delay={200} duration={800}>
            <div
              onClick={() => onNavigate('programs')}
              className="glass-card p-8 rounded-lg cursor-pointer group flex flex-col justify-between min-h-[280px] h-full"
            >
              <div>
                <div className="w-12 h-12 rounded bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0] mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3 group-hover:text-[#41e4c0] transition-colors">
                  Velocity & Compute
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Optimizing compute efficiency to compress training cycles and run real-time inference on edge devices.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] pt-6">
                <span>VIEW PERFORMANCE METRICS</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3: Applied Robotics */}
          <ScrollReveal delay={300} duration={800}>
            <div
              onClick={() => onNavigate('research')}
              className="glass-card p-8 rounded-lg cursor-pointer group flex flex-col justify-between min-h-[280px] h-full"
            >
              <div>
                <div className="w-12 h-12 rounded bg-[#41e4c0]/10 border border-[#41e4c0]/30 flex items-center justify-center text-[#41e4c0] mb-6 group-hover:scale-110 transition-transform">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-[#F8FAFC] mb-3 group-hover:text-[#41e4c0] transition-colors">
                  Applied Robotics
                </h3>
                <p className="text-sm text-[#94a3b8] leading-relaxed">
                  Embedding autonomous intelligence directly into physical systems, sensor arrays, and spatial loops.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] pt-6">
                <span>INSPECT EMBODIED SYSTEMS</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </div>
            </div>
          </ScrollReveal>

          {/* Wide Feature Banner: The Ethical Mandate */}
          <div className="md:col-span-3">
            <ScrollReveal delay={200} duration={800}>
              <div className="bg-gradient-to-r from-[#102034] via-[#0b1c30] to-[#102034] border border-[#334155] rounded-lg p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8 hover:border-[#41e4c0]/60 transition-all">
                <div className="space-y-4 max-w-2xl">
                  <div className="inline-flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider">
                    <Shield className="w-4 h-4" />
                    <span>ALGORITHMIC ALIGNMENT</span>
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
                    The Ethical Mandate: Safe, Auditable Intelligence
                  </h3>
                  <p className="text-sm md:text-base text-[#94a3b8] font-sans leading-relaxed">
                    We believe AI deployment without alignment is structural liability. Our governance protocols ensure model transparency, privacy preservation, and deterministic state boundaries across industrial use cases.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('research')}
                  className="px-8 py-4 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded hover:bg-[#38debb] transition-all whitespace-nowrap btn-glow"
                >
                  Read Framework
                </button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
};
