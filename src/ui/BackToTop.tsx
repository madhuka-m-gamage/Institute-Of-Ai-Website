import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowUp } from 'lucide-react';

interface BackToTopProps {
  threshold?: number;
}

export const BackToTop: React.FC<BackToTopProps> = ({ threshold = 350 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (currentScrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }

      if (currentScrollY > threshold) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.7, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-6 right-6 z-40"
        >
          <button
            id="back-to-top-button"
            onClick={scrollToTop}
            aria-label="Back to top of page"
            className="group relative flex items-center justify-center w-12 h-12 rounded-full bg-[#031427]/90 hover:bg-[#102034] text-[#41e4c0] border border-[#41e4c0]/50 hover:border-[#41e4c0] shadow-lg shadow-[#031427]/80 backdrop-blur-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#41e4c0] focus:ring-offset-2 focus:ring-offset-[#031427]"
          >
            {/* Circular Progress Ring */}
            <svg
              className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none p-0.5"
              viewBox="0 0 48 48"
            >
              <circle
                cx="24"
                cy="24"
                r="21"
                className="stroke-[#334155]/40"
                strokeWidth="2"
                fill="none"
              />
              <circle
                cx="24"
                cy="24"
                r="21"
                className="stroke-[#41e4c0] transition-all duration-150"
                strokeWidth="2.5"
                strokeDasharray={131.95} // 2 * PI * 21
                strokeDashoffset={131.95 - (131.95 * scrollProgress) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            {/* Center Arrow Icon */}
            <ArrowUp className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform duration-300 text-[#41e4c0]" />

            {/* Tooltip on Hover for desktop */}
            <span className="sr-only">Back to Top</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
