import React, { useEffect, useRef, useState } from 'react';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number; // in milliseconds
  duration?: number; // in milliseconds
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: string; // e.g., '24px' or '32px'
  className?: string;
  threshold?: number;
  once?: boolean;
}

export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  duration = 700,
  direction = 'up',
  className = '',
  threshold = 0.15,
  once = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.unobserve(entry.target);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    observer.observe(node);

    return () => {
      if (node) observer.unobserve(node);
    };
  }, [threshold, once]);

  const getTransformStyle = () => {
    if (isVisible) return 'translate3d(0, 0, 0)';

    switch (direction) {
      case 'up':
        return 'translate3d(0, 28px, 0)';
      case 'down':
        return 'translate3d(0, -28px, 0)';
      case 'left':
        return 'translate3d(28px, 0, 0)';
      case 'right':
        return 'translate3d(-28px, 0, 0)';
      case 'none':
        return 'translate3d(0, 0, 0)';
      default:
        return 'translate3d(0, 28px, 0)';
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: getTransformStyle(),
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
};
