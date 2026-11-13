import React from 'react';
import { Story } from '../types';
import StoryCoverView from './StoryCoverView';
import { Eye, Heart } from 'lucide-react';
import { formatCount } from '../utils/formatters';

interface StoryCardProps {
  story: Story;
  onOpenStory: (story: Story) => void;
  onOpenAuthor?: (authorId: string, e: React.MouseEvent) => void;
  showStatus?: boolean;
  showMetrics?: boolean;
  className?: string;
}

export default function StoryCard({
  story,
  onOpenStory,
  onOpenAuthor,
  showStatus = true,
  showMetrics = true,
  className = ''
}: StoryCardProps) {
  const handleClick = () => onOpenStory(story);

  const handleAuthorClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenAuthor && story.authorId) {
      onOpenAuthor(story.authorId, e);
    }
  };

  const primaryGenre = story.genre ? story.genre.split('/')[0].trim() : 'General';

  return (
    <div 
      onClick={handleClick}
      className={`bg-[#090b11]/85 border border-slate-900 hover:bg-[#0c0e18] hover:border-slate-800 p-3 rounded-2xl shadow shrink-0 cursor-pointer text-left space-y-3 group transition ${className || 'w-[220px]'}`}
    >
      <div className="aspect-[3/4.2] overflow-hidden rounded-xl bg-slate-950 relative border border-slate-850">
        <StoryCoverView 
          coverUrl={story.coverUrl} 
          title={story.title} 
          genre={story.genre} 
          subgenre={story.subgenre}
          author={story.author}
        />
        
        {/* Status/New Badges Overlay */}
        {story.status === 'Completed' && (
          <span className="absolute top-2 right-2 bg-emerald-600/90 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase backdrop-blur-sm shadow border border-emerald-500/30">
            Completed
          </span>
        )}
        {story.status === 'Ongoing' && (
          <span className="absolute top-2 right-2 bg-sky-600/90 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase backdrop-blur-sm shadow border border-sky-500/30">
            Ongoing
          </span>
        )}
        {story.status === 'On Hold' && (
          <span className="absolute top-2 right-2 bg-amber-600/90 text-white px-2 py-0.5 rounded text-[9px] font-bold uppercase backdrop-blur-sm shadow border border-amber-500/30">
            On Hold
          </span>
        )}

        <span className="absolute bottom-2 left-2 bg-black/80 font-mono text-[8px] font-bold text-violet-305 px-1.5 py-0.5 rounded border border-white/5 uppercase">
          {primaryGenre}
        </span>
      </div>

      <div className="space-y-1 pr-1.5">
        <h4 className="font-extrabold text-[13px] text-slate-205 leading-snug truncate group-hover:text-violet-405 transition">
          {story.title}
        </h4>
        <p 
          className={`text-[11px] text-slate-550 font-medium transition-colors ${onOpenAuthor ? 'hover:text-white cursor-pointer' : ''}`}
          onClick={onOpenAuthor ? handleAuthorClick : undefined}
        >
          By {story.author}
        </p>
        
        {(showMetrics || showStatus) && (
          <div className="flex items-center justify-between pt-1 select-none text-[10px] text-slate-500 font-mono">
            {showStatus && (
              <span className="font-sans font-medium text-slate-400">{story.status}</span>
            )}
            
            {showMetrics && (
              <div className="flex items-center gap-3 ml-auto">
                <span className="flex items-center gap-1">
                  <Eye size={11} className="text-sky-400" /> {formatCount(story.views)}
                </span>
                <span className="flex items-center gap-1">
                  <Heart size={11} className="text-pink-500" /> {formatCount(story.likes)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
