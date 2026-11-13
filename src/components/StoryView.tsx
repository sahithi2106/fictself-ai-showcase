import React, { useState, useEffect } from 'react';
import { Story, Chapter, UserProfile, ReadingList } from '../types';
import ReaderCommentsPanel from './ReaderCommentsPanel';
import UserAvatar from './UserAvatar';
import { toggleStoryLike, recordStoryView } from '../lib/api/stories';
import { followUser, unfollowUser, fetchFollowerCounts } from '../lib/api/users';
import { addToList, removeFromList } from '../lib/api/library';

const getStatusEmoji = (status?: string) => {
  switch (status) {
    case 'On Hold': return '🟡';
    case 'Planned': return '🔵';
    case 'Draft': return '⚫';
    case 'Completed': return '🏁';
    case 'Archived': return '📦';
    case 'Ongoing': 
    default: return '🟢';
  }
};
import { 
  Heart, 
  Star, 
  Share2, 
  PlusCircle, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  MessageSquare, 
  Bookmark, 
  Check,
  Type,
  Sparkles,
  Maximize2,
  Minimize2,
  Users,
  Moon,
  Sun,
  BookOpenCheck,
  Award,
  ListPlus,
  Compass,
  Lock,
  Globe,
  X,
  Layers
} from 'lucide-react';

interface StoryViewProps {
  story: Story;
  setView: (view: string) => void;
  selectedChapterId: string;
  setSelectedChapterId: (id: string) => void;
  onUpdateStats: (storyId: string, type: 'like' | 'favorite') => void;
  currentUser?: UserProfile | null;
  readingLists?: ReadingList[];
  setReadingLists?: React.Dispatch<React.SetStateAction<ReadingList[]>>;
}

// Inline markdown to HTML helper to interpret bold, italics, quotes, lists
function parseMarkdownToHtml(content: string): string {
  if (!content) return '';
  
  let result = content;

  // Render bullet points inside <p> elements
  // Convert standard markdown bold and italics
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/__(.*?)__/g, '<strong>$1</strong>');
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  result = result.replace(/_(.*?)_/g, '<em>$1</em>');

  // Convert inline lists inside paragraph blocks
  result = result.replace(/<p>-\s+(.*?)<\/p>/g, '<ul class="list-disc pl-5 my-3 space-y-1"><li>$1</li></ul>');
  
  // Convert blockquotes inside paragraph blocks
  result = result.replace(/<p>&gt;\s+(.*?)<\/p>/g, '<blockquote class="border-l-4 border-amber-500 bg-amber-500/5 pl-4 py-2 my-4 italic text-slate-400">$1</blockquote>');
  result = result.replace(/<p>>\s+(.*?)<\/p>/g, '<blockquote class="border-l-4 border-amber-500 bg-amber-500/5 pl-4 py-2 my-4 italic text-slate-400">$1</blockquote>');

  return result;
}

export default function StoryView({ 
  story, 
  setView, 
  selectedChapterId, 
  setSelectedChapterId,
  onUpdateStats,
  currentUser,
  readingLists,
  setReadingLists
}: StoryViewProps) {
  const publishedChapters = story.chapters.filter(c => c.status === 'published');
  
  // Find current active reading chapter
  const currentChapter = publishedChapters.find(c => c.id === selectedChapterId) || publishedChapters[0];

  // Reading preferences & theme configurations
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [fontSerif, setFontSerif] = useState(true);
  const [readingTheme, setReadingTheme] = useState<'charcoal' | 'sepia' | 'light' | 'obsidian'>('charcoal');
  
  const [isFollowed, setIsFollowed] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [userLiked, setUserLiked] = useState(false);
  const [userFav, setUserFav] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  // Follow/Like/View API integration
  useEffect(() => {
    if (story.id && currentChapter?.id) {
      recordStoryView(story.id, currentChapter.id).catch(e => console.error("Failed to record view:", e));
    }
  }, [story.id, currentChapter?.id]);

  useEffect(() => {
    if (story.authorId) {
      fetchFollowerCounts(story.authorId)
        .then(res => setIsFollowed(res.is_following))
        .catch(e => console.error("Failed to fetch follow status:", e));
    }
  }, [story.authorId]);

  const handleToggleFollow = async () => {
    if (!story.authorId) return;
    const previousState = isFollowed;
    setIsFollowed(!isFollowed); // Optimistic UI
    try {
      const res = previousState 
        ? await unfollowUser(story.authorId) 
        : await followUser(story.authorId);
      setIsFollowed(res.is_following);
    } catch (e) {
      setIsFollowed(previousState); // Revert
      console.error("Failed to toggle follow:", e);
    }
  };

  const handleToggleLike = async () => {
    if (!story.id) return;
    setUserLiked(!userLiked);
    try {
      const res = await toggleStoryLike(story.id);
      setUserLiked(res.is_liked);
      onUpdateStats(story.id, 'like');
    } catch (e) {
      setUserLiked(userLiked);
      console.error("Failed to toggle like:", e);
    }
  };
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);

  // Reading Lists / Pinterest Boards states inside Reader Workspace
  const [showListSelector, setShowListSelector] = useState(false);
  const [inlineNewBoardName, setInlineNewBoardName] = useState('');
  const [inlineNewBoardIsPublic, setInlineNewBoardIsPublic] = useState(true);
  const [showInlineForm, setShowInlineForm] = useState(false);
  const [inlineToast, setInlineToast] = useState<string | null>(null);

  const [isDownloaded, setIsDownloaded] = useState(() => {
    try {
      const val = localStorage.getItem(`fictself_offline_download_${story.id}`);
      return val === 'true';
    } catch (e) {
      return false;
    }
  });

  const handleToggleDownload = () => {
    const nextVal = !isDownloaded;
    setIsDownloaded(nextVal);
    localStorage.setItem(`fictself_offline_download_${story.id}`, String(nextVal));
    triggerInlineToast(nextVal ? "⬇ Story stored safely for offline reading!" : "🗑 Story removed from offline storage.");
  };

  const triggerInlineToast = (msg: string) => {
    setInlineToast(msg);
    setTimeout(() => setInlineToast(null), 3000);
  };

  const handleToggleStoryInList = async (listId: string) => {
    if (!readingLists || !setReadingLists) return;
    
    // Find the target list to know if we are adding or removing
    const targetList = readingLists.find(rl => rl.id === listId);
    if (!targetList) return;
    
    const isCurrentlyInList = targetList.storyIds.includes(story.id);
    
    // Optimistic update
    setReadingLists(readingLists.map(rl => {
      if (rl.id === listId) {
        const storyIds = isCurrentlyInList
          ? rl.storyIds.filter(id => id !== story.id)
          : [...rl.storyIds, story.id];
        return { ...rl, storyIds, lastUpdated: 'Just now' };
      }
      return rl;
    }));
    
    try {
      if (isCurrentlyInList) {
        await removeFromList(listId, story.id);
        triggerInlineToast('Story removed from list.');
      } else {
        await addToList(listId, story.id);
        triggerInlineToast('Story added to list.');
      }
    } catch (err) {
      console.error("Failed to update reading list:", err);
      triggerInlineToast('Error updating list.');
      // Ideally revert optimistic update here
    }
  };

  const handleCreateAndAddListInline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineNewBoardName.trim() || !readingLists || !setReadingLists) return;

    const newRL: ReadingList = {
      id: `rl-new-reader-${Date.now()}`,
      name: inlineNewBoardName.trim(),
      description: 'Quickly curated story reference board from Reader workspace.',
      isPublic: inlineNewBoardIsPublic,
      storyIds: [story.id],
      followersCount: 0,
      creatorName: currentUser?.username || 'user',
      lastUpdated: 'Just now',
      isFollowing: false
    };

    setReadingLists([newRL, ...readingLists]);
    setInlineNewBoardName('');
    setShowInlineForm(false);
    triggerInlineToast(`Board "${newRL.name}" created and story pinned!`);
  };

  const themeClasses = {
    charcoal: {
      bg: 'bg-[#0f111a] text-slate-100 border-slate-800/60',
      canvasBg: 'bg-[#0b0c12]/95 border-[#1a1c29]/90 shadow-2xl',
      headerBg: 'bg-[#0d0e14] border-[#1d1e2e]',
      btnActive: 'bg-blue-650/20 text-blue-300 border-blue-500/30',
      btnInactive: 'bg-[#181a26] text-slate-400 border-slate-800 hover:text-slate-200',
      navBtn: 'bg-[#161722] border-[#222436] text-slate-250 hover:bg-[#1e202e] hover:border-slate-600 disabled:opacity-30',
      input: 'bg-[#07080b] border-[#1a1b24] text-slate-200 focus:border-blue-500',
      card: 'bg-[#090a0f] border-[#181923]',
      textPrimary: 'text-slate-100',
      textSecondary: 'text-slate-400',
      contrastBorder: 'border-slate-800/50'
    },
    sepia: {
      bg: 'bg-[#faf6eb] text-[#3c2a1a] border-amber-800/10',
      canvasBg: 'bg-[#f4ecd8] border-amber-700/15 shadow-md',
      headerBg: 'bg-[#f9f3e3] border-amber-800/10',
      btnActive: 'bg-amber-850/15 text-amber-900 border-amber-700/35',
      btnInactive: 'bg-[#ece4cf] text-[#6b543f] border-amber-800/15 hover:text-[#3c2a1a]',
      navBtn: 'bg-[#ebdcb9] border-amber-700/20 text-[#4a3622] hover:bg-[#e4d4ad] disabled:opacity-30',
      input: 'bg-[#faf7f0] border-amber-700/20 text-[#3c2a1a] placeholder-amber-800/40 focus:border-amber-700',
      card: 'bg-[#f6f0df] border-amber-700/10',
      textPrimary: 'text-[#3c2a1a]',
      textSecondary: 'text-[#6b543f]',
      contrastBorder: 'border-amber-800/15'
    },
    light: {
      bg: 'bg-[#f8fafc] text-slate-850 border-slate-200',
      canvasBg: 'bg-white border-slate-205 shadow-md',
      headerBg: 'bg-slate-50 border-slate-200',
      btnActive: 'bg-blue-50 text-blue-700 border-blue-200',
      btnInactive: 'bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800',
      navBtn: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30',
      input: 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500',
      card: 'bg-slate-50 border-slate-200',
      textPrimary: 'text-slate-900',
      textSecondary: 'text-slate-500',
      contrastBorder: 'border-slate-200'
    },
    obsidian: {
      bg: 'bg-[#030304] text-[#eceff4] border-[#0a0a0d]',
      canvasBg: 'bg-[#000000] border-[#0f0f15]/80 shadow-none',
      headerBg: 'bg-[#050508] border-[#0c0c11]',
      btnActive: 'bg-neutral-900 text-slate-200 border-neutral-700',
      btnInactive: 'bg-[#0b0b0f] text-slate-500 border-[#1c1c24] hover:text-slate-350',
      navBtn: 'bg-[#09090c] border-[#16161e] text-slate-300 hover:bg-[#111117] disabled:opacity-30',
      input: 'bg-[#030304] border-[#101015] text-white focus:border-neutral-700',
      card: 'bg-[#050507] border-[#0f0f13]',
      textPrimary: 'text-slate-200',
      textSecondary: 'text-slate-500',
      contrastBorder: 'border-neutral-900'
    }
  };

  const activeTheme = themeClasses[readingTheme];

  const reactions = [
    { emoji: '😮', label: 'Surprised', count: 124 },
    { emoji: '🔥', label: 'Hyped', count: 342 },
    { emoji: '😭', label: 'Tears', count: 86 },
    { emoji: '❤️', label: 'Love', count: 531 }
  ];

  const incrementReaction = (emoji: string) => {
    setSelectedReaction(selectedReaction === emoji ? null : emoji);
  };

  const handleLike = () => {
    handleToggleLike();
  };

  const handleFavorite = () => {
    setUserFav(!userFav);
    onUpdateStats(story.id, 'favorite');
  };

  const activeIndex = publishedChapters.findIndex(c => c.id === (currentChapter?.id || ''));

  const navigateChapter = (direction: 'next' | 'prev') => {
    if (direction === 'prev' && activeIndex > 0) {
      setSelectedChapterId(publishedChapters[activeIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (direction === 'next' && activeIndex < publishedChapters.length - 1) {
      setSelectedChapterId(publishedChapters[activeIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className={`min-h-screen px-4 md:px-8 py-6 space-y-8 select-none transition-all duration-300 rounded-3xl border ${activeTheme.bg}`} 
      id="fictself-reader-view"
    >
      {/* 1. Enhanced Reading Preferences Action Header */}
      <div className={`flex flex-col sm:flex-row items-center justify-between border-b ${activeTheme.contrastBorder} pb-4 gap-4 shrink-0`}>
        <button 
          onClick={() => setView('library')}
          className="flex items-center gap-1.5 text-xs font-bold hover:opacity-80 transition cursor-pointer"
          id="reader-back-to-explore"
          style={{ color: 'inherit' }}
        >
          <ChevronLeft size={16} />
          <span>Exit Reader Portal</span>
        </button>

        {/* Modular e-reading control dock */}
        <div className="flex flex-wrap items-center gap-3 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1.5 rounded-2xl select-none">
          
          {/* Font Type Toggle */}
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setFontSerif(true)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                fontSerif ? 'bg-blue-600 text-white border-transparent' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
              }`}
              title="Serif Book Typeface"
            >
              Book Serif
            </button>
            <button 
              onClick={() => setFontSerif(false)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition border cursor-pointer ${
                !fontSerif ? 'bg-blue-600 text-white border-transparent' : 'bg-transparent text-slate-400 border-transparent hover:text-slate-200'
              }`}
              title="Sans-Serif Clean Typeface"
            >
              Modern Sans
            </button>
          </div>

          <span className="w-px h-4 bg-slate-500/20" />

          {/* Font Size Selector */}
          <div className="flex items-center gap-1">
            {(['sm', 'md', 'lg'] as const).map(sz => (
              <button
                key={sz}
                onClick={() => setFontSize(sz)}
                className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                  fontSize === sz 
                    ? 'bg-blue-650 text-white' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title={`Text Size: ${sz.toUpperCase()}`}
              >
                {sz === 'sm' ? 'A-' : sz === 'md' ? 'A' : 'A+'}
              </button>
            ))}
          </div>

          <span className="w-px h-4 bg-slate-500/20" />

          {/* Theme selection swatches */}
          <div className="flex items-center gap-1.5" id="reader-theme-selector-swatches">
            {(['charcoal', 'sepia', 'light', 'obsidian'] as const).map(th => {
              const isActive = readingTheme === th;
              const colorBubble = th === 'charcoal' 
                ? 'bg-[#0f111a]' 
                : th === 'sepia' 
                ? 'bg-[#ecdcb9]' 
                : th === 'light' 
                ? 'bg-[#ffffff] border-slate-300' 
                : 'bg-[#000000] border-neutral-900';

              return (
                <button
                  key={th}
                  onClick={() => setReadingTheme(th)}
                  className={`w-5 h-5 rounded-full ${colorBubble} border-2 transition hover:scale-115 cursor-pointer ${
                    isActive ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent'
                  }`}
                  title={`Apply ${th} theme`}
                />
              );
            })}
          </div>

        </div>
      </div>

      {/* 2. Distinctive Meta Jumbotron card */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 ${activeTheme.card} flex flex-col md:flex-row gap-6 justify-between items-start md:items-center`}>
        <div className="flex gap-5 flex-col sm:flex-row items-center sm:items-start text-center sm:text-left">
          <img 
            src={story.coverUrl || undefined} 
            alt={story.title} 
            referrerPolicy="no-referrer"
            className="w-24 md:w-28 rounded-xl object-cover shadow-md aspect-[3/4.2] border border-black/10 dark:border-white/10 shrink-0"
          />
          <div className="space-y-2 min-w-0 flex-1">
            <h1 className={`text-xl md:text-2xl font-black tracking-tight ${activeTheme.textPrimary}`}>{story.title}</h1>
            
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
              <span className={`font-mono font-medium ${activeTheme.textSecondary}`}>
                Written by <b className={activeTheme.textPrimary}>{story.author}</b>
              </span>
              <span className="opacity-40">•</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 font-mono font-bold text-[9px] uppercase border border-blue-500/20">
                {story.subgenre ? `${story.genre} / ${story.subgenre}` : story.genre}
              </span>
              <span className="opacity-40">•</span>
              <span className="px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 font-mono font-bold text-[9px] uppercase border border-violet-500/20 flex items-center gap-1">
                {getStatusEmoji(story.status)} {story.status || 'Ongoing'}
              </span>
            </div>
            
            <p className={`text-xs leading-relaxed line-clamp-3 max-w-xl ${activeTheme.textSecondary}`}>
              {story.description}
            </p>

            {story.tags && story.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {story.tags.map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded text-[9px] font-mono">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {publishedChapters.length > 0 && (
              <div className="pt-2.5 flex items-center justify-center sm:justify-start gap-2.5">
                <Award size={14} className="text-blue-400 shrink-0" />
                <span className={`text-[11px] font-mono font-semibold ${activeTheme.textSecondary}`}>Progression:</span>
                <div className="w-28 bg-black/10 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full transition-all duration-300" 
                    style={{ width: `${Math.min(100, Math.round(((activeIndex + 1) / publishedChapters.length) * 100))}%` }} 
                  />
                </div>
                <span className={`text-[11px] font-mono font-black ${activeTheme.textPrimary}`}>
                  {Math.round(((activeIndex + 1) / publishedChapters.length) * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Subscription & Bookmark Actions */}
        <div className="flex sm:flex-row md:flex-col gap-2.5 w-full md:w-auto shrink-0 pt-4 md:pt-0">
          <button 
            onClick={handleToggleFollow}
            className={`w-full sm:flex-1 md:w-44 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 justify-center cursor-pointer border ${
              isFollowed 
                ? 'bg-black/5 dark:bg-white/5 text-slate-400 border-transparent' 
                : 'bg-blue-600 hover:bg-blue-550 text-white border-transparent shadow-sm'
            }`}
          >
            {isFollowed ? <Check size={13} className="text-emerald-400" /> : null}
            {isFollowed ? 'Following Author' : 'Follow Author'}
          </button>

          <button 
            onClick={() => setIsSubscribed(!isSubscribed)}
            className={`w-full sm:flex-1 md:w-44 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
              isSubscribed 
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' 
                : 'bg-black/10 dark:bg-[#1a1b24] border-black/10 dark:border-white/10 hover:opacity-90'
            }`}
          >
            {isSubscribed ? 'Subscribed' : 'Subscribe to Story'}
          </button>
        </div>
      </div>

      {/* 3. Primary Chapter Reading canvas (Comfort Priority) */}
      {currentChapter ? (
        <div className="space-y-6 animate-fade-in" id="primary-chapter-panel">
          
          {/* Chapter header / dropdown panel */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-550/10 pb-3.5 gap-2 shrink-0">
            <div className="text-left">
              <span className="text-[9.5px] font-bold text-blue-400 uppercase tracking-widest font-mono">ACTIVE MANUSCRIPT CORNER</span>
              <h2 className={`text-xl font-bold font-sans ${activeTheme.textPrimary}`}>{currentChapter.title}</h2>
            </div>

            {/* Chapter select navigation box */}
            <div className="flex items-center gap-2">
              <select 
                value={currentChapter.id}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="bg-black/10 dark:bg-slate-900 border border-slate-500/10 text-xs font-bold py-1.5 px-3.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                style={{ color: 'inherit' }}
              >
                {publishedChapters.map(chap => (
                  <option key={chap.id} value={chap.id} className="bg-slate-900 text-slate-100">
                    {chap.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* High contrast comfortable canvas */}
          <div 
            className={`prose prose-invert max-w-none leading-relaxed select-text p-6 md:p-10 transition-all duration-300 rounded-2xl border ${
              activeTheme.canvasBg
            } ${
              fontSerif ? 'font-serif tracking-normal' : 'font-sans tracking-wide'
            } ${
              fontSize === 'sm' ? 'text-sm' : fontSize === 'md' ? 'text-base md:text-lg lg:text-[17px]' : 'text-lg md:text-xl lg:text-[22px]'
            }`}
            style={{ 
              minHeight: '340px',
              color: 'inherit',
              lineHeight: '1.8'
            }}
            id="comfortable-reading-canvas-area"
            dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(currentChapter.content) }}
          />

          {/* Social Interactions Float */}
          <div className={`flex flex-col sm:flex-row gap-4 items-center justify-between p-4 rounded-xl border ${activeTheme.card}`}>
            <div className="flex items-center gap-5">
              <button 
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-xs font-bold transition ${
                  userLiked ? 'text-pink-500' : 'text-slate-450 hover:text-slate-200 cursor-pointer'
                }`}
                id="reader-like-chapter-btn"
              >
                <Heart size={16} fill={userLiked ? 'currentColor' : 'none'} />
                <span>{story.likes + (userLiked ? 1 : 0)} Likes</span>
              </button>

              <button 
                onClick={handleFavorite}
                className={`flex items-center gap-1.5 text-xs font-bold transition ${
                  userFav ? 'text-rose-450 font-extrabold' : 'text-slate-455 hover:text-slate-200 cursor-pointer'
                }`}
                id="reader-fav-chapter-btn"
              >
                <Heart size={16} fill={userFav ? 'currentColor' : 'none'} className="text-rose-500" />
                <span>♡ Favorite</span>
              </button>

              <button 
                onClick={() => {
                  setIsBookmarked(!isBookmarked);
                  triggerInlineToast(!isBookmarked ? "📌 Story saved to bookshelf successfully!" : "📌 Story removed from saved library shelf.");
                }}
                className={`flex items-center gap-1.5 text-xs font-bold transition ${
                  isBookmarked ? 'text-violet-402 font-extrabold' : 'text-slate-455 hover:text-slate-200 cursor-pointer'
                }`}
                id="reader-bookmark-chapter-btn"
              >
                <Bookmark size={15} fill={isBookmarked ? 'currentColor' : 'none'} />
                <span>📌 Save</span>
              </button>

              <button 
                onClick={handleToggleDownload}
                className={`flex items-center gap-1.5 text-xs font-bold transition ${
                  isDownloaded ? 'text-emerald-450 font-extrabold' : 'text-slate-455 hover:text-slate-200 cursor-pointer'
                }`}
                id="reader-download-offline-btn"
              >
                <span className="text-xs shrink-0 select-none">{isDownloaded ? '✓' : '⬇'}</span>
                <span>{isDownloaded ? 'Available Offline' : 'Download Offline'}</span>
              </button>

              <div className="relative">
                <button 
                  onClick={() => setShowListSelector(!showListSelector)}
                  className={`flex items-center gap-1.5 text-xs font-bold transition ${
                    showListSelector ? 'text-violet-400' : 'text-slate-455 hover:text-slate-200 cursor-pointer'
                  }`}
                  id="reader-add-to-list-btn"
                >
                  <ListPlus size={15} />
                  <span>Add to List</span>
                </button>

                {/* Popper selector */}
                {showListSelector && (
                  <div className="absolute right-0 bottom-7 mt-2 w-72 bg-[#121422] border border-violet-500/20 rounded-2xl p-4 shadow-2xl z-40 space-y-4 select-none text-left">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-1.5">
                      <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400 font-mono">Map Board list</span>
                      <button 
                        onClick={() => {
                          setShowListSelector(false);
                          setShowInlineForm(false);
                        }}
                        className="text-slate-450 hover:text-slate-200 cursor-pointer text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    {readingLists && readingLists.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {readingLists.map(rl => {
                          const hasStory = rl.storyIds.includes(story.id);
                          return (
                            <div 
                              key={rl.id}
                              onClick={() => handleToggleStoryInList(rl.id)}
                              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-950/45 hover:bg-slate-950 border border-slate-900 hover:border-slate-800 cursor-pointer transition select-none"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {rl.isPublic ? (
                                  <Globe size={11} className="text-emerald-400 shrink-0" />
                                ) : (
                                  <Lock size={11} className="text-amber-500 shrink-0" />
                                )}
                                <span className="text-xs text-slate-200 font-bold truncate leading-none">{rl.name}</span>
                              </div>

                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition shrink-0 ${
                                hasStory 
                                  ? 'bg-violet-650 border-violet-500 text-white' 
                                  : 'border-slate-800 text-transparent'
                              }`}>
                                <Check size={10} strokeWidth={3} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">No custom boards detected.</p>
                    )}

                    {/* Create inline button / form toggling */}
                    {!showInlineForm ? (
                      <button
                        onClick={() => setShowInlineForm(true)}
                        className="w-full py-1.5 text-center bg-slate-950 hover:bg-slate-900 border border-slate-850 rounded-xl text-[10.5px] text-violet-405 font-bold transition cursor-pointer select-none"
                      >
                        ＋ Create New List inline
                      </button>
                    ) : (
                      <form onSubmit={handleCreateAndAddListInline} className="space-y-2 pt-1">
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. Dialogue references"
                          value={inlineNewBoardName}
                          onChange={(e) => setInlineNewBoardName(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 text-xs px-2.5 py-1.5 text-slate-200 rounded-lg outline-none focus:border-violet-500"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Set public:</span>
                          <input 
                            type="checkbox" 
                            checked={inlineNewBoardIsPublic} 
                            onChange={(e) => setInlineNewBoardIsPublic(e.target.checked)}
                            className="bg-slate-950 accent-violet-600 rounded"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-1 pb-1">
                          <button
                            type="button"
                            onClick={() => setShowInlineForm(false)}
                            className="py-1 bg-slate-950 text-slate-400 hover:text-slate-205 text-[10px] rounded border border-slate-850"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="py-1 bg-violet-650 hover:bg-violet-605 text-white text-[10px] rounded font-bold"
                          >
                            Create & Add
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={() => {
                const dummyLink = window.location.href;
                navigator.clipboard.writeText(dummyLink);
                alert('Reader chapter share link copied safely to your clipboard!');
              }}
              className="text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
              id="reader-share-btn"
            >
              <Share2 size={13} />
              Share Link
            </button>
          </div>

          {/* Stepper chapter navigation triggers */}
          <div className="flex items-center justify-between pt-4 gap-4">
            <button
              onClick={() => navigateChapter('prev')}
              disabled={activeIndex === 0}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition select-none ${activeTheme.navBtn}`}
              id="prev-chapter-nav"
            >
              <ChevronLeft size={16} />
              Previous Chapter
            </button>

            <button
              onClick={() => navigateChapter('next')}
              disabled={activeIndex === publishedChapters.length - 1}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition select-none ${activeTheme.navBtn}`}
              id="next-chapter-nav"
            >
              Next Chapter
              <ChevronRight size={16} />
            </button>
          </div>

          {/* 4. Emoji Reactions Collection Panel */}
          <div className={`space-y-3 pt-5 border-t ${activeTheme.contrastBorder}`}>
            <span className={`text-xs font-bold block text-left ${activeTheme.textSecondary}`}>Post an emoji reaction to this chapter</span>
            <div className="flex flex-wrap gap-2.5">
              {reactions.map(r => {
                const isActive = selectedReaction === r.emoji;
                return (
                  <button
                    key={r.emoji}
                    onClick={() => incrementReaction(r.emoji)}
                    className={`px-4 py-2 rounded-xl border text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      isActive 
                        ? 'bg-blue-500/10 border-blue-500 text-blue-300' 
                        : 'bg-black/5 dark:bg-[#141414] border-slate-500/10 hover:border-slate-400'
                    }`}
                    style={{ color: 'inherit' }}
                  >
                    <span className="text-base">{r.emoji}</span>
                    <span className="font-extrabold font-mono text-[10px]">{r.count + (isActive ? 1 : 0)}</span>
                  </button>
                );
              })}
            </div>
            <div className={`space-y-4 pt-6 border-t ${activeTheme.contrastBorder}`}>
              <ReaderCommentsPanel chapterId={currentChapter.id} />
            </div>
          </div>

        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl border ${activeTheme.card}`}>
          <span className="text-4xl"></span>
          <h3 className={`font-bold mt-2 text-md ${activeTheme.textPrimary}`}>No Chapters Published Yet</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">This author hasn't made any chapters public yet.</p>
        </div>
      )}

      {/* Dynamic Toast Feedback Overlay in Reader context */}
      {inlineToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#0d0f17] border border-violet-500/30 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-xs text-slate-205 font-medium font-sans">{inlineToast}</span>
        </div>
      )}
    </div>
  );
}
