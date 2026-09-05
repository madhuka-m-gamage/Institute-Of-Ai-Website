import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { LOGO_ICON_URL } from '../data/mockData';
import { Search, Menu, X, ArrowUpRight, ChevronRight, Sparkles, BookOpen, User, MessageSquare, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onOpenSearch: () => void;
  onOpenApply: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onOpenApply,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { label: string; page: Page; icon: React.FC<{ className?: string }> }[] = [
    { label: 'Home', page: 'home', icon: Home },
    { label: 'Programs', page: 'programs', icon: BookOpen },
    { label: 'About', page: 'about', icon: User },
    { label: 'Contact', page: 'contact', icon: MessageSquare },
  ];

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // Handle ESC key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemAnim = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  };

  return (
    <nav className="bg-[#031427]/85 backdrop-blur-xl sticky top-0 w-full z-50 border-b border-[#44474d]/30 shadow-md transition-all duration-300">
      <div className="flex justify-between items-center w-full px-4 md:px-12 max-w-[1280px] mx-auto h-20">
        {/* Brand Logo & Name */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <img
            src={LOGO_ICON_URL}
            alt="Institute Of AI Logo"
            className="w-10 h-10 object-contain group-hover:scale-105 transition-transform duration-300"
          />
          <span className="font-bold text-xl md:text-2xl text-[#F8FAFC] tracking-tighter group-hover:text-[#41e4c0] transition-colors">
            Institute Of AI
          </span>
        </motion.button>

        {/* Desktop Nav Links */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="hidden md:flex items-center space-x-8"
        >
          {navItems.map((item) => {
            const isActive = currentPage === item.page;
            return (
              <motion.button
                variants={itemAnim}
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`font-mono-caps text-xs uppercase tracking-widest transition-all duration-300 relative py-1 focus:outline-none ${
                  isActive
                    ? 'text-[#41e4c0] font-bold'
                    : 'text-[#c5c6cd] hover:text-[#41e4c0]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#41e4c0] rounded-full shadow-[0_0_8px_rgba(65,228,192,0.8)]" />
                )}
              </motion.button>
            );
          })}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex items-center space-x-2 sm:space-x-3 md:space-x-5"
        >
          <button
            onClick={onOpenSearch}
            aria-label="Search Programs and Modules"
            className="text-[#d3e4fe] hover:text-[#41e4c0] p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-[#102034] transition-all duration-300 focus:outline-none"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            onClick={onOpenApply}
            className="hidden md:inline-flex items-center gap-2 px-6 py-2.5 min-h-[44px] bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#38debb] transition-all duration-300 btn-glow focus:outline-none focus:ring-2 focus:ring-[#41e4c0]"
          >
            <span>Apply Now</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            id="mobile-drawer-toggle"
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-[#d3e4fe] hover:text-[#41e4c0] p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[#102034] focus:outline-none focus:ring-2 focus:ring-[#41e4c0]"
            aria-label="Open Navigation Drawer"
            aria-expanded={mobileMenuOpen}
          >
            <Menu className="w-6 h-6" />
          </button>
        </motion.div>
      </div>

      {/* Slide-out Drawer Menu for Mobile */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex justify-end">
            {/* Dark Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#000f21]/80 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Slide-out Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-[85%] max-w-[340px] h-[100dvh] max-h-[100dvh] bg-[#07172b] border-l border-[#334155] shadow-2xl flex flex-col justify-between z-10"
              role="dialog"
              aria-modal="true"
              aria-label="Mobile Navigation Menu"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-[#334155]/80 flex items-center justify-between bg-[#040e1c] shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={LOGO_ICON_URL}
                    alt="Institute Of AI"
                    className="w-8 h-8 object-contain shrink-0"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-base text-[#F8FAFC] tracking-tight leading-tight">
                      Institute Of AI
                    </span>
                    <span className="text-[10px] font-mono-caps text-[#41e4c0] uppercase tracking-wider">
                      Executive & Applied AI
                    </span>
                  </div>
                </div>
                <button
                  id="close-mobile-drawer"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-[#94a3b8] hover:text-[#41e4c0] rounded-lg hover:bg-[#102034] transition-colors focus:outline-none focus:ring-2 focus:ring-[#41e4c0]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation Links List */}
              <div className="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-2">
                <div className="px-2 py-1 text-[11px] font-mono-caps uppercase tracking-wider text-[#94a3b8]">
                  Navigation Routes
                </div>
                {navItems.map((item) => {
                  const isActive = currentPage === item.page;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.page}
                      onClick={() => {
                        onNavigate(item.page);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full text-left font-mono-caps text-sm uppercase py-3 px-4 rounded-xl min-h-[48px] flex items-center justify-between transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/40 font-bold shadow-md shadow-[#41e4c0]/5'
                          : 'text-[#d3e4fe] hover:bg-[#0c1e34] hover:text-[#41e4c0] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#41e4c0]' : 'text-[#94a3b8]'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#41e4c0]' : 'text-[#44474d]'}`} />
                    </button>
                  );
                })}

                <div className="pt-3">
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onOpenSearch();
                    }}
                    className="w-full text-left font-mono-caps text-xs uppercase py-3 px-4 rounded-xl min-h-[44px] flex items-center gap-3 text-[#94a3b8] hover:text-[#41e4c0] hover:bg-[#0c1e34] border border-[#334155]/60 transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-[#41e4c0] shrink-0" />
                    <span>Search Programs / Syllabus</span>
                  </button>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-[#334155] bg-[#040e1c] space-y-2 shrink-0">
                <button
                  id="mobile-drawer-apply-btn"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenApply();
                  }}
                  className="w-full text-center py-3.5 min-h-[48px] bg-[#41e4c0] text-[#031427] font-mono-caps text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-[#38debb] transition-all flex items-center justify-center gap-2 btn-glow shadow-lg shadow-[#41e4c0]/15 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Apply For Enrollment</span>
                </button>

                <div className="text-center pt-0.5">
                  <span className="text-[10px] font-mono text-[#94a3b8]">
                    AI Innovation Hub • Colombo, Sri Lanka
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </nav>
  );
};

