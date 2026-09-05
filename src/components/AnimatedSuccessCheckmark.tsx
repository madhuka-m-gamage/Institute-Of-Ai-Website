import React from 'react';
import { motion } from 'motion/react';

interface AnimatedSuccessCheckmarkProps {
  size?: number;
  className?: string;
  glowColor?: string;
  strokeColor?: string;
  label?: string;
}

export const AnimatedSuccessCheckmark: React.FC<AnimatedSuccessCheckmarkProps> = ({
  size = 56,
  className = '',
  glowColor = 'rgba(65, 228, 192, 0.25)',
  strokeColor = '#41e4c0',
  label,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Subtle pulsating outer ripple ring */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{
            scale: [0.85, 1.25, 1.4],
            opacity: [0.6, 0.2, 0],
          }}
          transition={{
            duration: 1.6,
            ease: 'easeOut',
            repeat: Infinity,
            repeatDelay: 0.8,
          }}
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: glowColor }}
        />

        {/* Outer expanding glow aura on entry */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, rgba(3, 20, 39, 0) 70%)`,
          }}
        />

        {/* SVG Circle and Drawn Path Checkmark */}
        <svg
          width={size}
          height={size}
          viewBox="0 0 52 52"
          className="relative z-10"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle outline trace */}
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeOpacity="0.25"
            strokeLinecap="round"
          />

          {/* Foreground circle drawing animation */}
          <motion.circle
            cx="26"
            cy="26"
            r="24"
            stroke={strokeColor}
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ pathLength: 0, rotate: -90 }}
            animate={{ pathLength: 1, rotate: -90 }}
            transition={{
              duration: 0.55,
              ease: [0.65, 0, 0.35, 1],
            }}
            style={{ transformOrigin: '50% 50%' }}
          />

          {/* Spring-drawn checkmark path */}
          <motion.path
            d="M15 27.5L22.5 35L37 18.5"
            stroke={strokeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{
              pathLength: { delay: 0.35, duration: 0.45, ease: [0.16, 1, 0.3, 1] },
              opacity: { delay: 0.35, duration: 0.1 },
            }}
          />
        </svg>
      </div>

      {label && (
        <motion.span
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.35 }}
          className="mt-3 text-xs font-mono-caps text-[#41e4c0] uppercase tracking-wider font-semibold"
        >
          {label}
        </motion.span>
      )}
    </div>
  );
};
