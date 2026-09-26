import React from 'react';
import { Page } from '../../types';
import { ScrollReveal } from '../../ui/ScrollReveal';

interface FooterProps {
  onNavigate: (page: Page) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#000f21] w-full py-16 border-t border-[#44474d]/20 mt-auto text-[#d3e4fe]">
      <ScrollReveal duration={800}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 px-4 md:px-12 max-w-[1280px] mx-auto">
          {/* Brand & Copyright */}
          <div className="md:col-span-2 space-y-4">
            <button
              onClick={() => onNavigate('home')}
              className="font-bold text-2xl text-[#F8FAFC] tracking-tighter hover:text-[#41e4c0] transition-colors focus:outline-none"
            >
              Institute Of AI
            </button>
            <p className="font-sans text-sm text-[#94a3b8] max-w-sm">
              © 2024 Institute of AI. Engineered for Futuristic Precision.
            </p>
            <div className="flex items-center gap-2 text-xs font-mono-caps text-[#41e4c0]/80">
              <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-ping" />
              <span>GLOBAL INTELLIGENCE NETWORK ONLINE</span>
            </div>
          </div>

          {/* Programs & Pathways */}
          <div className="flex flex-col gap-3">
            <span className="font-mono-caps text-xs text-[#F8FAFC] uppercase tracking-wider mb-1">
              Active Programs
            </span>
            <button
              onClick={() => onNavigate('programs')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors"
            >
              3-Day AI Survival Workshop
            </button>
            <button
              onClick={() => onNavigate('programs')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors"
            >
              8-Week Applied Practitioner
            </button>
            <button
              onClick={() => onNavigate('programs')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors"
            >
              12-Week Flagship Master
            </button>
            <button
              onClick={() => onNavigate('programs')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors"
            >
              Enterprise Custom AI
            </button>
          </div>

          {/* Institutional Portals */}
          <div className="flex flex-col gap-3">
            <span className="font-mono-caps text-xs text-[#F8FAFC] uppercase tracking-wider mb-1">
              Institute Access
            </span>
            <button
              onClick={() => onNavigate('about')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors cursor-pointer"
            >
              Faculty & Mentorship
            </button>
            <button
              onClick={() => onNavigate('programs')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors cursor-pointer"
            >
              Curriculum Catalog
            </button>
            <button
              onClick={() => onNavigate('contact')}
              className="text-left font-sans text-sm text-[#94a3b8] hover:text-[#41e4c0] transition-colors cursor-pointer"
            >
              Admissions & Contact
            </button>
            <button
              onClick={() => onNavigate('admin')}
              className="text-left font-sans text-sm text-[#41e4c0] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 pt-1"
            >
              <span className="w-2 h-2 rounded-full bg-[#41e4c0] animate-pulse" />
              <span>Admin Console</span>
            </button>
          </div>
        </div>
      </ScrollReveal>
    </footer>
  );
};
