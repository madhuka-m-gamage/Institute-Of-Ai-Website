import React, { useState, useEffect } from 'react';
import { RESEARCH_PAPERS } from '../../data/mockData';
import { ResearchPaper } from '../../types';
import { ScrollReveal } from '../../ui/ScrollReveal';
import { SkeletonBlock, PaperCardSkeleton } from '../../ui/Skeleton';
import { FileText, Download, Sparkles, Clock, Tag, X, Bot } from 'lucide-react';
import { motion } from 'motion/react';

export const ResearchPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activePaper, setActivePaper] = useState<ResearchPaper | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const categories = ['All', 'Neural Architectures', 'Alignment & Ethics', 'Compute Optimization', 'Agentic Systems'];

  const handleCategoryChange = (cat: string) => {
    if (cat === selectedCategory) return;
    setIsFiltering(true);
    setSelectedCategory(cat);
    setTimeout(() => {
      setIsFiltering(false);
    }, 300);
  };

  const filteredPapers = selectedCategory === 'All'
    ? RESEARCH_PAPERS
    : RESEARCH_PAPERS.filter((p) => p.category === selectedCategory);

  const handleGenerateSummary = (paper: ResearchPaper) => {
    setActivePaper(paper);
    setLoadingSummary(true);
    setAiSummary(null);

    // Instant, deterministic synthesis rendering without external API latency or credit limits
    setTimeout(() => {
      setAiSummary(
        paper.executiveSummary ||
        `Core Findings: ${paper.summary}\n\nKey Contribution: Advanced algorithmic evaluation in ${paper.category}.`
      );
      setLoadingSummary(false);
    }, 250);
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
    <div className="w-full min-h-screen text-[#d3e4fe] py-8 sm:py-12 px-4 sm:px-6 md:px-8 lg:px-12 max-w-[1280px] mx-auto space-y-8 sm:space-y-12">
      {/* Header */}
      <div className="space-y-4 max-w-3xl">
        <ScrollReveal duration={800}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#102034] border border-[#41e4c0]/40 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-widest">
            <FileText className="w-3.5 h-3.5" />
            <span>Research Repository</span>
          </div>
        </ScrollReveal>
        
        <motion.h1
          variants={staggerHeading}
          initial="hidden"
          animate="visible"
          className="text-4xl sm:text-5xl font-extrabold text-[#F8FAFC] tracking-tight flex flex-wrap gap-2"
        >
          {"Intelligence Research & Alignment Papers".split(' ').map((word, i) => (
            <motion.span variants={wordAnim} key={i} style={{ display: 'inline-block' }}>
              {word}
            </motion.span>
          ))}
        </motion.h1>

        <ScrollReveal delay={100} duration={800}>
          <p className="text-base text-[#94a3b8] font-sans leading-relaxed">
            Open-access peer publications, mathematical proofs, and safety frameworks produced by the Institute of AI research labs.
          </p>
        </ScrollReveal>
      </div>

      {/* Category Pills */}
      <ScrollReveal delay={100} duration={800}>
        <div className="flex flex-wrap gap-3 border-b border-[#334155] pb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryChange(cat)}
              className={`px-4 py-2 rounded text-xs font-mono-caps uppercase tracking-wider transition-all ${
                selectedCategory === cat
                  ? 'bg-[#41e4c0] text-[#031427] font-bold shadow-[0_0_12px_rgba(65,228,192,0.4)]'
                  : 'bg-[#102034] text-[#94a3b8] hover:text-[#41e4c0] border border-[#334155]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* Papers Grid */}
      {isFiltering ? (
        <PaperCardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredPapers.map((paper, idx) => (
            <ScrollReveal key={paper.id} delay={idx * 100} duration={800}>
              <div
                className="glass-card rounded-xl border border-[#334155] p-8 flex flex-col justify-between space-y-6 group h-full"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono-caps text-[#41e4c0]">
                    <span>{paper.category}</span>
                    <span className="flex items-center gap-1 text-[#94a3b8]">
                      <Clock className="w-3.5 h-3.5" />
                      {paper.readTime}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-[#F8FAFC] group-hover:text-[#41e4c0] transition-colors leading-snug">
                    {paper.title}
                  </h3>

                  <div className="text-xs font-mono-caps text-[#94a3b8]">
                    AUTHORS: <span className="text-[#F8FAFC]">{paper.author}</span> • Published {paper.date}
                  </div>

                  <p className="text-sm text-[#94a3b8] font-sans leading-relaxed">
                    {paper.summary}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {paper.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0b1c30] border border-[#334155] rounded text-[11px] font-mono-caps text-[#41e4c0]"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-6 border-t border-[#334155] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <button
                    onClick={() => handleGenerateSummary(paper)}
                    className="min-h-[44px] px-4 py-2.5 bg-[#102034] hover:bg-[#1b2b3f] border border-[#41e4c0]/50 hover:border-[#41e4c0] text-[#41e4c0] font-mono-caps text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>Synthesize with AI</span>
                  </button>

                  <a
                    href={paper.pdfUrl || '#'}
                    download={`${paper.title.toLowerCase().replace(/\s+/g, '-')}.pdf`}
                    onClick={(e) => {
                      if (!paper.pdfUrl) {
                        e.preventDefault();
                      }
                    }}
                    className="min-h-[44px] text-xs font-mono-caps text-[#94a3b8] hover:text-[#41e4c0] flex items-center justify-center sm:justify-start gap-1.5 transition-colors px-3 py-2 rounded-lg hover:bg-[#0b1c30]"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>PDF Protocol</span>
                  </a>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      )}

      {/* AI Summary Modal */}
      {activePaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#000f21]/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[#102034] border border-[#41e4c0]/50 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#334155] bg-[#0b1c30] shrink-0">
              <div className="flex items-center gap-2 text-[#41e4c0]">
                <Bot className="w-5 h-5 shrink-0" />
                <span className="font-mono-caps text-xs sm:text-sm font-bold uppercase tracking-wider text-[#F8FAFC]">
                  AI Synthesis Engine
                </span>
              </div>
              <button
                onClick={() => setActivePaper(null)}
                aria-label="Close Synthesis"
                className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8f9097] hover:text-[#41e4c0] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div className="font-bold text-base sm:text-lg text-[#F8FAFC]">
                {activePaper.title}
              </div>
              <div className="text-xs font-mono-caps text-[#41e4c0]">
                CATEGORY: {activePaper.category}
              </div>

              {loadingSummary ? (
                <div className="p-4 sm:p-6 bg-[#0b1c30] rounded-lg border border-[#334155] space-y-3">
                  <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] mb-2">
                    <div className="w-2 h-2 rounded-full bg-[#41e4c0] animate-ping" />
                    <span>PARSING NEURAL WEIGHTS & PROOFS...</span>
                  </div>
                  <SkeletonBlock width="w-full" height="h-4" />
                  <SkeletonBlock width="w-11/12" height="h-4" />
                  <SkeletonBlock width="w-4/5" height="h-4" />
                  <SkeletonBlock width="w-full" height="h-4" />
                  <SkeletonBlock width="w-2/3" height="h-4" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3.5 sm:p-4 bg-[#0b1c30] rounded-lg border border-[#334155] font-mono text-xs text-[#d3e4fe] whitespace-pre-wrap leading-relaxed">
                    {aiSummary}
                  </div>

                  {activePaper.keyFindings && activePaper.keyFindings.length > 0 && (
                    <div className="p-3.5 sm:p-4 bg-[#081525] rounded-lg border border-[#41e4c0]/30 space-y-2">
                      <div className="text-xs font-mono-caps text-[#41e4c0] font-bold">
                        KEY EMPIRICAL FINDINGS:
                      </div>
                      <ul className="space-y-1.5">
                        {activePaper.keyFindings.map((finding, i) => (
                          <li key={i} className="text-xs text-[#94a3b8] flex items-start gap-2">
                            <span className="text-[#41e4c0] font-bold font-mono">[{i + 1}]</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#0b1c30] border-t border-[#334155] flex justify-end shrink-0">
              <button
                onClick={() => setActivePaper(null)}
                className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase rounded-lg hover:bg-[#38debb] transition-all"
              >
                Close Synthesis
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
