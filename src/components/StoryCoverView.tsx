import { Book } from 'lucide-react';

interface StoryCoverProps {
  coverUrl?: string;
  title: string;
  genre: string;
  subgenre?: string;
  author: string;
  className?: string;
  aspectRatio?: string; // e.g. "aspect-[3/4]"
}

export default function StoryCoverView({
  coverUrl,
  title,
  genre,
  subgenre,
  author,
  className = "w-full h-full obj-cover",
  aspectRatio = "aspect-[3/4]"
}: StoryCoverProps) {
  const hasCover = coverUrl && coverUrl.trim().length > 0 && coverUrl !== 'none';

  if (hasCover) {
    return (
      <img
        src={coverUrl}
        alt={title}
        referrerPolicy="no-referrer"
        className={`${className} ${aspectRatio} object-cover hover:scale-102 transition duration-300 object-top`}
        id={`story-cover-image-${title.replace(/\s+/g, '-').toLowerCase()}`}
      />
    );
  }

  // Beautiful modern book cover placeholder design
  return (
    <div 
      className={`relative w-full ${aspectRatio} bg-gradient-to-br from-[#10141e] via-[#151c2d] to-[#040812] border border-slate-800/80 rounded-lg flex flex-col justify-between p-4 shadow-xl overflow-hidden select-none`}
      id={`story-cover-placeholder-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Abstract technical pattern accent in background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-slate-700/35 to-transparent" />
      <div className="absolute top-0 bottom-0 left-0 w-[4px] bg-gradient-to-r from-violet-500/20 to-transparent border-r border-violet-500/10" />

      {/* Top Banner section */}
      <div className="space-y-1.5 shrink-0 z-10">
        <div className="flex items-center justify-between text-[8px] font-mono font-bold tracking-widest text-[#a5b4fc] uppercase">
          <span>{subgenre ? `${genre} / ${subgenre}` : genre || 'FICTION'}</span>
          <Book size={10} className="text-violet-400" />
        </div>
        <div className="h-[1px] w-full bg-slate-800" />
      </div>

      {/* Middle Title Display with beautiful typography */}
      <div className="flex-1 flex flex-col items-center justify-center text-center p-2 z-10">
        <h3 className="font-serif font-extrabold text-slate-100 text-xs sm:text-sm tracking-wide leading-snug line-clamp-3 uppercase font-sans">
          {title}
        </h3>
        <span className="w-6 h-[1.5px] bg-violet-500/65 my-2.5" />
        <span className="text-[8px] font-mono font-bold text-slate-400 capitalize">
          BLUEPRINT EDITION
        </span>
      </div>

      {/* Footer metadata segment */}
      <div className="space-y-1 shrink-0 z-10 text-center font-mono">
        <div className="h-[1px] w-full bg-slate-800" />
        <p className="text-[8px] font-bold text-slate-400 tracking-wider pt-1 uppercase">
          BY {author || 'Author'}
        </p>
      </div>

      {/* Vintage decorative corners */}
      <div className="absolute bottom-2 right-2 border-r border-b border-slate-800 w-1.5 h-1.5" />
      <div className="absolute bottom-2 left-2 border-l border-b border-slate-800 w-1.5 h-1.5" />
    </div>
  );
}
