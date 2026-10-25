import React from 'react';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export const AppLogo: React.FC<AppLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Precision Geometric Enterprise Strategic Prism Icon */}
      <div
        className={`relative ${iconSizes[size]} shrink-0 rounded-xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 p-1.5 shadow-md shadow-slate-950/15 ring-1 ring-white/15 flex items-center justify-center overflow-hidden group`}
      >
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute inset-0 bg-radial from-teal-400/20 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />

        {/* Scalable High-Fidelity Vector SVG */}
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10 transition-transform duration-300 group-hover:scale-105"
        >
          <defs>
            <linearGradient id="stratex-grad-a" x1="4" y1="8" x2="44" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <linearGradient id="stratex-grad-b" x1="12" y1="6" x2="36" y2="42" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>
            <linearGradient id="stratex-grad-c" x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#4338ca" />
            </linearGradient>
            <linearGradient id="stratex-core-glow" x1="24" y1="18" x2="24" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#5eead4" />
            </linearGradient>
          </defs>

          {/* Outer Balanced Hexagonal Shield Frame */}
          <path
            d="M24 4L41.32 14V34L24 44L6.68 34V14L24 4Z"
            stroke="url(#stratex-grad-a)"
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill="none"
            opacity="0.85"
          />

          {/* Inner Isometric Strategic Facets (Finance, Process, Strategy) */}
          {/* Top-Right Quadrant Facet */}
          <path
            d="M24 24L41.32 14V24L24 34V24Z"
            fill="url(#stratex-grad-a)"
            opacity="0.25"
          />
          {/* Top-Left Quadrant Facet */}
          <path
            d="M24 24L6.68 14V24L24 34V24Z"
            fill="url(#stratex-grad-b)"
            opacity="0.2"
          />
          {/* Bottom Anchor Base */}
          <path
            d="M24 34L41.32 24L24 44L6.68 24L24 34Z"
            fill="url(#stratex-grad-c)"
            opacity="0.3"
          />

          {/* Dynamic Cascading Chevron Lines */}
          <path
            d="M13 18L24 24.5L35 18"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
          <path
            d="M16 26L24 31L32 26"
            stroke="url(#stratex-core-glow)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Central Strategic Focus Nucleus */}
          <circle
            cx="24"
            cy="24.5"
            r="3.2"
            fill="url(#stratex-core-glow)"
            stroke="#042f2e"
            strokeWidth="1"
          />
          <circle cx="24" cy="24.5" r="1.2" fill="#0f172a" />
        </svg>

        {/* Corner Micro-Highlight */}
        <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-gradient-to-bl from-teal-300/40 to-transparent rounded-tr-xl pointer-events-none" />
      </div>

      {/* Brand Typography & Wordmark */}
      {showText && (
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-black tracking-tight text-slate-900 font-sans flex items-center gap-1.5">
              <span>STRATEX</span>
              <span className="text-teal-700 font-extrabold text-[13px]">CASCADE</span>
            </span>
            <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider uppercase text-teal-800 bg-teal-50 border border-teal-200/80 rounded-md">
              v4.2 Enterprise
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium tracking-tight mt-0.5">
            سامانه جامع مدیریت استراتژیک، کارت متوازن و هم‌راستایی هلدینگ
          </p>
        </div>
      )}
    </div>
  );
};
