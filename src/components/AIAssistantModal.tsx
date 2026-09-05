import React, { useState } from 'react';
import { Sparkles, X, Bot, Send, ArrowRight, BookOpen, Compass, CheckCircle2, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { COURSES } from '../data/mockData';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (courseId: string) => void;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  onSelectCourse,
}) => {
  const [prompt, setPrompt] = useState('');
  const [experience, setExperience] = useState('Beginner (No coding background)');
  const [goals, setGoals] = useState('Automating daily workplace reports and using custom AI gems');
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<{
    advice: string;
    recommendedCourseId: string;
    keyFocusAreas?: string[];
  } | null>(null);

  if (!isOpen) return null;

  const handleAskCounselor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/counselor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim() || 'Please recommend the best program based on my background and goals.',
          currentExperience: experience,
          targetGoals: goals,
        }),
      });

      if (!res.ok) {
        throw new Error('Counselor service returned error');
      }

      const data = await res.json();
      setRecommendation({
        advice: data.advice,
        recommendedCourseId: data.recommendedCourseId || 'ai-master',
        keyFocusAreas: data.keyFocusAreas,
      });
    } catch (err) {
      console.warn('Counselor API notice:', err);
      // Deterministic intelligent fallback
      setRecommendation({
        advice: `Based on your profile (${experience}), we recommend the 3-Month Flagship (AI Master for Real Life). You'll build end-to-end automations with Gemini Advanced, Google Workspace, NotebookLM research synthesis, and Custom Gems with zero coding prerequisites.`,
        recommendedCourseId: 'ai-master',
        keyFocusAreas: [
          'Mastering Multimodal Prompt Architectures (Text, Vision, Audio)',
          'Deploying Custom Gems & Workspace Automations in Real Life',
          'Conducting Deep Synthesis with NotebookLM',
        ],
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recommendedCourse = recommendation
    ? COURSES.find((c) => c.id === recommendation.recommendedCourseId) || COURSES[1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#000f21]/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#102034] border border-[#334155] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden relative my-auto max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#334155] bg-[#0b1c30] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#41e4c0]/10 border border-[#41e4c0]/40 flex items-center justify-center text-[#41e4c0]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono-caps text-xs sm:text-sm font-bold text-[#F8FAFC] uppercase tracking-wider">
                Academic & Career AI Counselor
              </h2>
              <p className="text-[11px] text-[#94a3b8]">Powered by Gemini 3.7 & Institute Curriculum Model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Counselor"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8f9097] hover:text-[#41e4c0] transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Background selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                Current Experience
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
              >
                <option value="Beginner (No coding background)">Beginner (No Coding Experience)</option>
                <option value="Intermediate Tech / Knowledge Worker">Intermediate (Product / Marketing / Ops)</option>
                <option value="Corporate Executive / Department Head">Corporate Executive / Directorate</option>
                <option value="Technical Developer / Engineer">Technical Developer / Engineer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
                Primary Objective
              </label>
              <select
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-xl px-3 py-2 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#41e4c0]"
              >
                <option value="Automating daily workplace reports and using custom AI gems">Automating Daily Reports & Custom Gems</option>
                <option value="Complete 3-Month AI Mastery for real life career acceleration">Full 3-Month Mastery for Career Growth</option>
                <option value="Fast 3-Day intensive productivity leap (ChatGPT/Claude/Gemini)">Fast 3-Day Productivity Leap</option>
                <option value="Transforming an entire company / enterprise team">Transforming Enterprise Workforce</option>
              </select>
            </div>
          </div>

          {/* User question / notes */}
          <div>
            <label className="block text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider mb-1.5">
              Specific Query or Workplace Bottleneck (Optional)
            </label>
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. I spend 10 hours a week consolidating PDF reports in Google Sheets..."
                className="w-full min-h-[44px] bg-[#0b1c30] border border-[#334155] rounded-xl pl-3.5 pr-28 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748b] focus:outline-none focus:border-[#41e4c0]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAskCounselor();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleAskCounselor()}
                disabled={isLoading}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#41e4c0] hover:bg-[#38debb] text-[#031427] font-bold text-xs font-mono-caps rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <span>Analyze</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recommendation Output */}
          {recommendation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 sm:p-5 rounded-xl bg-[#081525] border border-[#41e4c0]/50 space-y-4 shadow-lg"
            >
              <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0] font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Advisor Curriculum Recommendation</span>
              </div>

              <div className="text-xs text-[#d3e4fe] leading-relaxed whitespace-pre-line font-sans">
                {recommendation.advice}
              </div>

              {recommendation.keyFocusAreas && (
                <div className="pt-2 border-t border-[#334155]/60 space-y-1.5">
                  <span className="text-[11px] font-mono-caps text-[#8f9097] uppercase">Recommended Milestones:</span>
                  {recommendation.keyFocusAreas.map((area, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-[#d3e4fe]">
                      <span className="text-[#41e4c0] font-bold">›</span>
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              )}

              {recommendedCourse && (
                <div className="pt-3 border-t border-[#334155]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#102034] p-3.5 rounded-lg border border-[#334155]">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-[#41e4c0]/10 text-[#41e4c0] text-[10px] font-mono-caps font-bold">
                      {recommendedCourse.badge}
                    </span>
                    <h4 className="text-sm font-bold text-[#F8FAFC] mt-1">{recommendedCourse.title}</h4>
                    <p className="text-[11px] text-[#94a3b8]">{recommendedCourse.duration} • {recommendedCourse.subtitle}</p>
                  </div>
                  <button
                    onClick={() => {
                      onSelectCourse(recommendedCourse.id);
                      onClose();
                    }}
                    className="min-h-[44px] px-4 py-2 bg-[#41e4c0] text-[#031427] font-bold text-xs font-mono-caps rounded-lg hover:bg-[#38debb] transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <span>Enroll In Track</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
