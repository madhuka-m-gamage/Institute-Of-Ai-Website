import React, { useState, useEffect } from 'react';

export const ProgressBar: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      const currentScroll = window.scrollY;
      const progress = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 w-full h-[3px] bg-transparent z-[100] pointer-events-none"
    >
      <div
        className="h-full bg-[#41e4c0] transition-all duration-150 ease-out shadow-[0_0_10px_rgba(65,228,192,0.9)]"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
};
