import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  orientation?: 'horizontal' | 'vertical';
  withGrid?: boolean;
}

export default function Logo({
  className = "",
  size = "md",
  showText = true,
  orientation = "horizontal"
}: LogoProps) {
  // Determine pixel sizes
  let pixelSize = 40;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'sm': pixelSize = 32; break;
      case 'md': pixelSize = 44; break;
      case 'lg': pixelSize = 80; break;
      case 'xl': pixelSize = 120; break;
    }
  }

  const logoIcon = (
    <div 
      className="relative shrink-0 select-none flex items-center justify-center bg-gradient-to-br from-violet-550/15 to-indigo-505/5 dark:from-violet-500/15 dark:to-indigo-500/5 rounded-xl border border-violet-500/20" 
      style={{ width: pixelSize, height: pixelSize }}
      id="fictself-logo-icon-svg-wrapper"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-violet-600 dark:text-violet-400 w-3/5 h-3/5"
      >
        {/* Book cover outline / backing page */}
        <path d="M4 19.5V15a2.5 2.5 0 0 1 2.5-2.5H20v7H6.5A2.5 2.5 0 0 1 4 19.5Z" className="opacity-30" />
        {/* Main open page / leaf shape */}
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H18v16H6.5A2.5 2.5 0 0 1 4 15.5V4.5Z" />
        {/* Elegant Letter F in the book page */}
        <path d="M9 6h4.5" strokeWidth="2.5" />
        <path d="M9 9.5h3" strokeWidth="2.5" />
        <path d="M9 6v7.5" strokeWidth="2.5" />
      </svg>
    </div>
  );

  if (!showText) {
    return logoIcon;
  }

  if (orientation === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center gap-2 ${className}`} id="fictself-logo-vertical">
        {logoIcon}
        <div className="space-y-0.5">
          <h1 className="text-base font-black text-slate-800 dark:text-white tracking-wide font-sans">
            Fictself AI
          </h1>
          <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 font-sans uppercase tracking-wider">
            Story Studio
          </p>
        </div>
      </div>
    );
  }

  // Horizontal Logo layout matching sidebars/headers
  return (
    <div className={`flex items-center gap-3 ${className}`} id="fictself-logo-horizontal">
      {logoIcon}
      <div className="flex flex-col select-none leading-none text-left">
        <span className="font-extrabold text-sm text-slate-800 dark:text-white font-sans tracking-wide">
          Fictself AI
        </span>
        <span className="text-[9.5px] font-semibold text-slate-450 dark:text-slate-500 font-sans tracking-normal mt-0.5">
          Story Studio
        </span>
      </div>
    </div>
  );
}
