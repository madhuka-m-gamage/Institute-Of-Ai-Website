import React, { useState, useEffect } from 'react';
import { COURSES } from '../data/mockData';
import { Page, CourseProgram } from '../types';
import { ScrollReveal } from '../ui/ScrollReveal';
import { CardSkeleton } from '../ui/Skeleton';
import { Search, Check, Clock, Sparkles, Filter, ArrowUpRight, Calendar, ChevronDown, ChevronUp, BookOpen, Zap, Layers, Building2, Send, Tag, GraduationCap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProgramsPageProps {
  onNavigate: (page: Page) => void;
  onOpenApplyWithCourse: (courseId: string) => void;
  onOpenEnterpriseContact?: () => void;
}

export const ProgramsPage: React.FC<ProgramsPageProps> = ({
  onNavigate,
  onOpenApplyWithCourse,
  onOpenEnterpriseContact,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedCourseId((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (course: CourseProgram) => {
    if (course.isCustomEnterprise || course.id === 'enterprise-custom') {
      if (onOpenEnterpriseContact) {
        onOpenEnterpriseContact();
      } else {
        onOpenApplyWithCourse(course.id);
      }
    } else {
      onOpenApplyWithCourse(course.id);
    }
  };

  const filteredCourses = COURSES.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    const matchesDuration =
      selectedDuration === 'all' || course.durationCategory === selectedDuration;

    return matchesSearch && matchesLevel && matchesDuration;
  });

  const staggerHeading = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const wordAnim = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        damping: 14,
        stiffness: 120,
      },
    },
  };

  return (
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1280px] mx-auto space-y-8 sm:space-y-12">
      {/* Page Header */}
      <div className="space-y-3 sm:space-y-4 max-w-3xl">
        <ScrollReveal duration={800}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Curriculum Catalog & Cohorts</span>
          </div>
        </ScrollReveal>
        
        <motion.h1
          variants={staggerHeading}
          initial="hidden"
          animate="visible"
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F8FAFC] tracking-tight flex flex-wrap gap-2 leading-tight"
        >
          {"Specialized AI Programs & Mastery Tracks".split(' ').map((word, i) => (
            <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <ScrollReveal delay={100} duration={800}>
          <p className="text-sm sm:text-base text-[#94a3b8] font-sans leading-relaxed">
            From foundational workplace automation skills to multi-agent architectures and bespoke enterprise team upskilling, choose your trajectory.
          </p>
        </ScrollReveal>
      </div>

      {/* Filter and Search Bar */}
      <ScrollReveal delay={100} duration={800}>
        <div className="bg-[#102034] border border-[#334155] rounded-xl p-4 sm:p-6 space-y-4 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Search Input */}
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#41e4c0]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic, prompt technique, or skill..."
                className="w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg text-sm text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none focus:border-[#41e4c0] transition-colors"
              />
            </div>

            {/* Level Filter */}
            <div className="flex items-center gap-2">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3 py-2.5 sm:py-3 text-xs font-mono-caps text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0] transition-colors cursor-pointer"
              >
                <option value="all">ALL LEVELS</option>
                <option value="beginner">BEGINNER (FUNDAMENTALS)</option>
                <option value="amateur">AMATEUR (INTERMEDIATE)</option>
                <option value="advanced">ADVANCED & ENTERPRISE</option>
              </select>
            </div>

            {/* Duration Filter */}
            <div>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-lg px-3 py-2.5 sm:py-3 text-xs font-mono-caps text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0] transition-colors cursor-pointer"
              >
                <option value="all">ALL DURATIONS</option>
                <option value="short">SHORT (&lt; 8 WEEKS)</option>
                <option value="long">LONG (8+ WEEKS / ENTERPRISE)</option>
              </select>
            </div>
          </div>

          {/* Results Counter */}
          <div className="flex flex-wrap justify-between items-center gap-2 text-xs font-mono-caps text-[#94a3b8] pt-3 border-t border-[#334155]/60">
            <span>SHOWING {filteredCourses.length} OF {COURSES.length} PROGRAMS</span>
            {(searchQuery || selectedLevel !== 'all' || selectedDuration !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLevel('all');
                  setSelectedDuration('all');
                }}
                className="text-[#41e4c0] hover:underline font-bold py-1 px-2 rounded cursor-pointer"
              >
                RESET FILTERS
              </button>
            )}
          </div>
        </div>
      </ScrollReveal>

      {/* Program Cards Grid */}
      {isLoading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {filteredCourses.map((course, idx) => (
            <ScrollReveal key={course.id} delay={idx * 100} duration={800}>
              <div
                className="glass-card rounded-xl border border-[#334155] p-5 sm:p-6 md:p-8 flex flex-col justify-between h-full shadow-lg relative group transition-all"
              >
                {/* Upper Section: Badge, Duration, Title & Description */}
                <div className="space-y-4">
                  {/* Top Badge & Duration */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <span className="px-3 py-1 bg-[#41e4c0]/15 border border-[#41e4c0]/50 text-[#41e4c0] font-mono-caps text-xs rounded-full font-bold uppercase tracking-wider">
                      {course.badge}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-mono-caps text-[#41e4c0] bg-[#0b1c30] px-3 py-1 rounded-full border border-[#334155] shrink-0">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{course.duration}</span>
                    </div>
                  </div>

                  {/* Course Title & Subtitle */}
                  <div className="space-y-1.5">
                    <h3 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors leading-tight">
                      {course.title}
                    </h3>
                    <p className="text-xs font-mono-caps text-[#41e4c0] tracking-wide leading-snug">
                      {course.subtitle}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-[#94a3b8] font-sans leading-relaxed">
                    {course.description}
                  </p>

                  {/* Schedule Indicator */}
                  {course.schedule && (
                    <div className="flex items-start gap-2 text-[11px] font-mono-caps text-[#94a3b8] bg-[#081525] p-2.5 rounded-lg border border-[#334155]/60">
                      <Calendar className="w-3.5 h-3.5 text-[#41e4c0] shrink-0 mt-0.5" />
                      <span className="leading-snug">{course.schedule}</span>
                    </div>
                  )}
                </div>

                {/* Middle Section: Curriculum Accordion & Target Competencies */}
                <div className="space-y-4 my-5 pt-4 border-t border-[#334155]/60 flex-1">
                  {/* Interactive Curriculum / Syllabus Modules */}
                  {course.syllabusModules && course.syllabusModules.length > 0 && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(course.id)}
                        className="w-full flex items-center justify-between min-h-[44px] py-2.5 px-3.5 rounded-lg bg-[#0b1c30] hover:bg-[#102034] border border-[#334155] hover:border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] transition-colors cursor-pointer"
                      >
                        <span className="flex items-center gap-2 text-left">
                          <BookOpen className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {course.id === 'ai-survival'
                              ? '3-DAY WORKSHOP CURRICULUM'
                              : course.id === 'ai-bridge'
                              ? '8-WEEK (32-HR) PRACTITIONER SYLLABUS'
                              : course.id === 'ai-master'
                              ? '3-MONTH (72-HR) FLAGSHIP SYLLABUS'
                              : course.isCustomEnterprise || course.id === 'enterprise-custom'
                              ? 'BESPOKE 4-PHASE ENTERPRISE ROADMAP'
                              : 'SYLLABUS MODULES'}
                          </span>
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] shrink-0 ml-2">
                          <span className="hidden xs:inline">{expandedCourseId === course.id ? 'COLLAPSE' : 'EXPAND'}</span>
                          {expandedCourseId === course.id ? <ChevronUp className="w-3.5 h-3.5 text-[#41e4c0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#41e4c0]" />}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {expandedCourseId === course.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2.5 pt-2">
                              {course.syllabusModules.map((mod, mIdx) => (
                                <div
                                  key={mIdx}
                                  className="p-3.5 bg-[#081525] border border-[#334155]/70 rounded-lg space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold font-mono-caps text-[#41e4c0]">
                                      {mod.period}: {mod.title}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[#94a3b8] font-sans leading-relaxed">
                                    {mod.description}
                                  </p>
                                  <div className="space-y-1.5 pt-2 border-t border-[#334155]/40">
                                    {mod.topics.map((t, tIdx) => (
                                      <div key={tIdx} className="flex items-start gap-2 text-xs text-[#d3e4fe]/90 font-sans py-0.5">
                                        <span className="text-[#41e4c0] shrink-0 font-bold mt-0.5">›</span>
                                        <span className="leading-relaxed">{t}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Skills / Target Competencies */}
                  <div className="space-y-2">
                    <span className="text-xs font-mono-caps text-[#94a3b8] uppercase tracking-wider block">
                      {course.isCustomEnterprise ? 'Corporate Deliverables & Scope:' : 'Target Competencies & Skills:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {course.skills.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#0b1c30] border border-[#334155] rounded-md text-xs text-[#d3e4fe]"
                        >
                          <CheckCircle2 className="w-3 h-3 text-[#41e4c0] shrink-0" />
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Investment & Action Button */}
                <div className="pt-4 border-t border-[#334155] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-auto">
                  <div>
                    <span className="text-[10px] font-mono-caps text-[#94a3b8] block uppercase tracking-wider">
                      {course.isCustomEnterprise ? 'Investment Model' : 'Program Investment'}
                    </span>
                    <span className="text-xl sm:text-2xl font-extrabold text-[#F8FAFC] font-mono-caps">
                      {course.investment}
                    </span>
                    {course.isCustomEnterprise && (
                      <span className="block text-[11px] text-[#41e4c0] font-mono-caps mt-0.5">
                        Custom Team Scope
                      </span>
                    )}
                  </div>

                  <button
                    id={`course-action-btn-${course.id}`}
                    onClick={() => handleActionClick(course)}
                    className={`w-full sm:w-auto min-h-[44px] px-6 py-3 font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 btn-glow cursor-pointer ${
                      course.isCustomEnterprise
                        ? 'bg-[#41e4c0] text-[#031427] hover:bg-[#38debb] border border-[#41e4c0]'
                        : 'bg-[#41e4c0] text-[#031427] hover:bg-[#38debb]'
                    }`}
                  >
                    {course.isCustomEnterprise ? (
                      <>
                        <Building2 className="w-4 h-4 shrink-0" />
                        <span>{course.ctaLabel || 'Contact Us for Scope'}</span>
                      </>
                    ) : (
                      <>
                        <span>Apply For Program</span>
                        <ArrowUpRight className="w-4 h-4 shrink-0" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}
    </div>
  );
};

