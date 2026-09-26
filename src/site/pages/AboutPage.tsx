import React, { useState, useEffect } from 'react';
import { FACULTY, TEAM_IMAGE_URL } from '../../data/mockData';
import { Page } from '../../types';
import { ScrollReveal } from '../../ui/ScrollReveal';
import { CardSkeleton, SkeletonBlock } from '../../ui/Skeleton';
import { Shield, BookOpen, Layers, Award, Share2, ArrowRight, Network } from 'lucide-react';
import { motion } from 'motion/react';

interface AboutPageProps {
  onNavigate: (page: Page) => void;
  onOpenApply: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onNavigate, onOpenApply }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

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
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1280px] mx-auto space-y-12 sm:space-y-16 md:space-y-20">
      {/* About Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <ScrollReveal duration={800}>
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
              <span>Institutional Overview</span>
            </div>
            <motion.h1 
              variants={staggerHeading}
              initial="hidden"
              animate="visible"
              className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-[#F8FAFC] tracking-tight leading-tight flex flex-wrap gap-2"
            >
              {"Reducing the".split(' ').map((word, i) => (
                <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
                  {word}
                </motion.span>
              ))}
              <span className="text-[#41e4c0] flex gap-2">
                {"Knowledge Gap".split(' ').map((word, i) => (
                  <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
                    {word}
                  </motion.span>
                ))}
              </span>
            </motion.h1>
            <p className="text-base md:text-lg text-[#94a3b8] font-sans leading-relaxed">
              The Institute of AI was established to democratize advanced neural research and elevate individual technical mastery. By unifying academic rigor with real-world enterprise engineering, we train practitioners to build resilient, aligned AI systems.
            </p>

            {/* Pillars List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-4 bg-[#102034] border border-[#334155] rounded">
                <Layers className="w-5 h-5 text-[#41e4c0] mb-2" />
                <div className="font-bold text-sm text-[#F8FAFC]">Standardization</div>
                <div className="text-xs text-[#94a3b8] mt-1">Unified evaluation benchmarks</div>
              </div>
              <div className="p-4 bg-[#102034] border border-[#334155] rounded">
                <BookOpen className="w-5 h-5 text-[#41e4c0] mb-2" />
                <div className="font-bold text-sm text-[#F8FAFC]">Applied Rigor</div>
                <div className="text-xs text-[#94a3b8] mt-1">Production-ready engineering</div>
              </div>
              <div className="p-4 bg-[#102034] border border-[#334155] rounded">
                <Shield className="w-5 h-5 text-[#41e4c0] mb-2" />
                <div className="font-bold text-sm text-[#F8FAFC]">Ethics First</div>
                <div className="text-xs text-[#94a3b8] mt-1">Deterministic alignment</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Hero Image Container */}
        <ScrollReveal delay={200} duration={800}>
          <div className="relative rounded-lg overflow-hidden border border-[#334155] shadow-2xl group">
            <img
              src={TEAM_IMAGE_URL}
              alt="Institute Of AI Leadership Team"
              className="w-full h-[400px] object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#031427] via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-4 bg-[#102034]/90 backdrop-blur-md border border-[#334155] rounded">
              <div className="text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider">
                FACULTY CONCLAVE • COLOMBO TECH PARK
              </div>
              <div className="text-sm font-bold text-[#F8FAFC] mt-1">
                "Architecting autonomous intelligence with unwavering human accountability."
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Global Impact & Nodes */}
      <ScrollReveal duration={800}>
        <section className="bg-[#102034] border border-[#334155] rounded-xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <div className="font-mono-caps text-xs text-[#41e4c0] uppercase tracking-widest flex items-center gap-2">
                <Network className="w-4 h-4" />
                <span>Global Regional Routing</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-[#F8FAFC]">
                Dual Infrastructure: Local Leadership & Global Research
              </h2>
              <p className="text-sm text-[#94a3b8] leading-relaxed">
                Serving South Asia and international markets through our dual domains (<span className="text-[#41e4c0]">.lk</span> for regional hub initiatives and <span className="text-[#41e4c0]">.com</span> for global research deployments).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="p-4 bg-[#0b1c30] border border-[#334155] rounded text-center min-w-[160px]">
                <div className="text-xs font-mono-caps text-[#94a3b8]">REGIONAL HUB</div>
                <div className="text-xl font-bold text-[#F8FAFC] mt-1">instituteofai.lk</div>
                <div className="text-[10px] text-[#41e4c0] mt-1">Sri Lanka Sector</div>
              </div>
              <div className="p-4 bg-[#0b1c30] border border-[#334155] rounded text-center min-w-[160px]">
                <div className="text-xs font-mono-caps text-[#94a3b8]">GLOBAL ENTITY</div>
                <div className="text-xl font-bold text-[#F8FAFC] mt-1">instituteofai.com</div>
                <div className="text-[10px] text-[#41e4c0] mt-1">Worldwide Network</div>
              </div>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Algorithmic Mentors (Faculty Section) */}
      <section className="space-y-10">
        <ScrollReveal duration={800}>
          <div className="flex flex-col md:flex-row md:items-end justify-between">
            <div>
              <div className="font-mono-caps text-xs text-[#41e4c0] uppercase tracking-widest mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                <span>Research Leaders</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#F8FAFC] tracking-tight">
                Algorithmic Mentors & Faculty
              </h2>
            </div>
            <p className="text-sm text-[#94a3b8] max-w-md mt-4 md:mt-0">
              Our faculty members are active researchers publishing in top-tier AI conferences and advising Fortune 500 engineering teams.
            </p>
          </div>
        </ScrollReveal>

        {/* Faculty Cards */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FACULTY.map((fac, idx) => (
            <ScrollReveal key={fac.id} delay={idx * 100} duration={800}>
              <div
                className="glass-card rounded-lg overflow-hidden border border-[#334155] group flex flex-col justify-between h-full"
              >
                <div>
                  {/* Image with grayscale hover effect */}
                  <div className="relative h-64 overflow-hidden bg-[#000f21]">
                    <img
                      src={fac.image}
                      alt={fac.name}
                      className="w-full h-full object-cover filter grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                    />
                    <div className="absolute top-3 right-3 px-2 py-1 bg-[#031427]/90 rounded border border-[#334155] text-[10px] font-mono-caps text-[#41e4c0]">
                      {fac.publications} PAPERS
                    </div>
                  </div>

                  {/* Faculty Info */}
                  <div className="p-6 space-y-3">
                    <div className="text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider">
                      {fac.division}
                    </div>
                    <h3 className="text-xl font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors">
                      {fac.name}
                    </h3>
                    <div className="text-xs text-[#41e4c0] font-semibold font-mono-caps">{fac.role}</div>
                    
                    {fac.credentials && (
                      <div className="text-[11px] text-[#8f9097] bg-[#081525] border border-[#334155]/60 px-2.5 py-1 rounded">
                        {fac.credentials}
                      </div>
                    )}

                    <p className="text-xs text-[#94a3b8] font-sans leading-relaxed pt-1">
                      {fac.bio}
                    </p>

                    {fac.topCitation && (
                      <div className="pt-2 border-t border-[#334155]/40 text-[11px] text-[#94a3b8] leading-tight">
                        <span className="font-mono-caps text-[#41e4c0] block text-[10px] uppercase">Selected Citation</span>
                        <span className="italic text-[#c5c6cd]">"{fac.topCitation}"</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Action */}
                <div className="p-6 pt-3 border-t border-[#334155]/40 mt-4 flex items-center justify-between">
                  <button
                    onClick={() => onNavigate('programs')}
                    className="min-h-[44px] text-xs font-mono-caps text-[#41e4c0] hover:underline flex items-center gap-1.5 py-2"
                  >
                    <span>View Mentorship Tracks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(window.location.href);
                      }
                    }}
                    className="text-[#94a3b8] hover:text-[#41e4c0] p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[#0b1c30] transition-colors"
                    aria-label="Share profile"
                    title="Copy profile link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
        )}
      </section>

      {/* CTA Banner */}
      <ScrollReveal duration={800}>
        <section className="p-6 sm:p-10 bg-[#102034] border border-[#41e4c0]/40 rounded-xl text-center space-y-5 sm:space-y-6">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#F8FAFC]">
            Ready to Train Under World-Class Faculty?
          </h2>
          <p className="text-xs sm:text-sm text-[#94a3b8] max-w-xl mx-auto leading-relaxed">
            Enroll in our upcoming cohort or consult with our advisory node to build customized enterprise intelligence models.
          </p>
          <button
            onClick={onOpenApply}
            className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all btn-glow"
          >
            Initiate Application
          </button>
        </section>
      </ScrollReveal>
    </div>
  );
};
