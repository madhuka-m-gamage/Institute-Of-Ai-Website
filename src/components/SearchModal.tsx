import React, { useState } from 'react';
import { COURSES, FACULTY, RESEARCH_PAPERS } from '../data/mockData';
import { Page } from '../types';
import { Search, X, ArrowRight, BookOpen, User, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: Page) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredCourses = query.trim()
    ? COURSES.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.subtitle.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()) ||
          c.duration.toLowerCase().includes(query.toLowerCase()) ||
          c.badge.toLowerCase().includes(query.toLowerCase()) ||
          c.skills.some((s) => s.toLowerCase().includes(query.toLowerCase())) ||
          c.syllabusModules.some((m) =>
            m.title.toLowerCase().includes(query.toLowerCase()) ||
            m.description.toLowerCase().includes(query.toLowerCase()) ||
            m.topics.some((t) => t.toLowerCase().includes(query.toLowerCase()))
          )
      )
    : COURSES.slice(0, 4);

  const filteredFaculty = query.trim()
    ? FACULTY.filter(
        (f) =>
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.role.toLowerCase().includes(query.toLowerCase()) ||
          f.division.toLowerCase().includes(query.toLowerCase())
      )
    : FACULTY.slice(0, 2);

  const filteredPapers = query.trim()
    ? RESEARCH_PAPERS.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.summary.toLowerCase().includes(query.toLowerCase()) ||
          p.category.toLowerCase().includes(query.toLowerCase())
      )
    : RESEARCH_PAPERS.slice(0, 2);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 sm:pt-20 p-3 sm:px-4 bg-[#000f21]/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -15 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#102034] border border-[#334155] w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden my-auto sm:my-0 max-h-[88vh] flex flex-col"
      >
        {/* Header Search Input */}
        <div className="flex items-center px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[#334155] bg-[#0b1c30] shrink-0">
          <Search className="w-5 h-5 text-[#41e4c0] mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs, curriculum topics, faculty mentors..."
            className="w-full bg-transparent text-[#F8FAFC] placeholder-[#8f9097] focus:outline-none font-sans text-sm sm:text-base min-h-[44px]"
            autoFocus
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#8f9097] hover:text-[#41e4c0] transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 flex-1">
          {/* Programs */}
          <div>
            <div className="flex items-center gap-2 font-mono-caps text-xs text-[#41e4c0] mb-3 uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Curriculum Programs ({filteredCourses.length})</span>
            </div>
            <div className="space-y-2">
              {filteredCourses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => {
                    onNavigate('programs');
                    onClose();
                  }}
                  className="p-3 rounded bg-[#1b2b3f]/50 hover:bg-[#1b2b3f] border border-[#334155]/60 hover:border-[#41e4c0] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#F8FAFC] text-sm group-hover:text-[#41e4c0] transition-colors">
                      {course.title}
                    </div>
                    <div className="text-xs text-[#94a3b8]">{course.subtitle}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0]">
                    <span>{course.investment}</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Research */}
          <div>
            <div className="flex items-center gap-2 font-mono-caps text-xs text-[#41e4c0] mb-3 uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>Research Publications ({filteredPapers.length})</span>
            </div>
            <div className="space-y-2">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  onClick={() => {
                    onNavigate('research');
                    onClose();
                  }}
                  className="p-3 rounded bg-[#1b2b3f]/50 hover:bg-[#1b2b3f] border border-[#334155]/60 hover:border-[#41e4c0] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-[#F8FAFC] text-sm group-hover:text-[#41e4c0] transition-colors">
                      {paper.title}
                    </div>
                    <div className="text-xs text-[#94a3b8]">By {paper.author} • {paper.category}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#41e4c0] transform group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>

          {/* Faculty */}
          <div>
            <div className="flex items-center gap-2 font-mono-caps text-xs text-[#41e4c0] mb-3 uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Faculty Mentors ({filteredFaculty.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredFaculty.map((fac) => (
                <div
                  key={fac.id}
                  onClick={() => {
                    onNavigate('about');
                    onClose();
                  }}
                  className="p-3 rounded bg-[#1b2b3f]/50 hover:bg-[#1b2b3f] border border-[#334155]/60 hover:border-[#41e4c0] cursor-pointer transition-all flex items-center gap-3 group"
                >
                  <img
                    src={fac.image}
                    alt={fac.name}
                    className="w-10 h-10 rounded-full object-cover border border-[#41e4c0]/40"
                  />
                  <div>
                    <div className="font-bold text-[#F8FAFC] text-xs group-hover:text-[#41e4c0]">
                      {fac.name}
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">{fac.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-[#0b1c30] border-t border-[#334155] text-xs font-mono-caps text-[#8f9097] flex justify-between items-center">
          <span>PRESS ESC TO CLOSE</span>
          <span>INSTITUTE OF AI SEARCH ENGINE v2.4</span>
        </div>
      </motion.div>
    </div>
  );
};
