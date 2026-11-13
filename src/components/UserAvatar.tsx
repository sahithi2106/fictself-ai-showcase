import React from 'react';

interface UserAvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export default function UserAvatar({ src, name, size = 'sm', className = '' }: UserAvatarProps) {
  const firstLetter = name && name.trim() ? name.trim().charAt(0).toUpperCase() : '?';
  
  // Dynamic, aesthetically balanced high-contrast gradients
  const colors = [
    'from-violet-600 to-indigo-650 text-white border-violet-500/20',
    'from-emerald-600 to-teal-650 text-white border-emerald-500/20',
    'from-[#38bdf8] to-blue-600 text-white border-sky-500/20',
    'from-pink-600 to-rose-650 text-white border-pink-500/20',
    'from-amber-500 to-orange-600 text-white border-amber-500/20',
    'from-purple-600 to-fuchsia-600 text-white border-purple-500/20',
  ];
  
  const charCode = firstLetter.charCodeAt(0) || 0;
  const colorIndex = charCode % colors.length;
  const gradientClass = colors[colorIndex];

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] font-bold',
    sm: 'w-9 h-9 text-xs font-extrabold',
    md: 'w-12 h-12 text-sm font-black',
    lg: 'w-16 h-16 text-xl font-black',
    xl: 'w-20 h-20 text-2xl font-black border-2',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.sm;

  if (src && src.trim()) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        className={`${selectedSize} rounded-full object-cover shrink-0 shadow-sm border border-slate-800/20 dark:border-slate-300 ${className}`}
        id={`user-avatar-tag-${name.replace(/\s+/g, '-').toLowerCase()}`}
      />
    );
  }

  return (
    <div
      className={`${selectedSize} rounded-full bg-gradient-to-tr ${gradientClass} flex items-center justify-center font-sans tracking-tight select-none border shrink-0 shadow-sm leading-none ${className}`}
      id={`user-avatar-initials-${name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {firstLetter}
    </div>
  );
}
