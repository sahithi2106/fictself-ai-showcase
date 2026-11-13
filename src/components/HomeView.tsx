import React, { useState, useMemo, useRef } from 'react';
import { Story, UserProfile, ReadingList } from '../types';
import StoryCoverView from './StoryCoverView';
import StoryCard from './StoryCard';
import { PRIMARY_GENRES, scoreStoryForUser } from '../genresData';
import { getReadingHistory, getReadingProgress } from '../lib/readingProgress';
import { fetchTrendingStories, fetchRecommendedStories, fetchNewReleases, fetchRecentlyViewed } from '../lib/api/home';
import { formatCount } from '../utils/formatters';
import { 
  BookOpen, 
  ArrowRight, 
  Clock, 
  PenTool, 
  Plus,
  Flame,
  FileText,
  Search,
  Star,
  Heart,
  Eye,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Calendar,
  X,
  PlusCircle,
  BookmarkCheck,
  Check,
  Layers,
  Globe,
  Lock
} from 'lucide-react';

interface HomeViewProps {
  stories: Story[];
  setView: (view: string) => void;
  setSelectedStoryId: (id: string) => void;
  setSelectedChapterId: (id: string) => void;
  currentUser?: UserProfile | null;
  readingLists?: ReadingList[];
  setReadingLists?: React.Dispatch<React.SetStateAction<ReadingList[]>>;
  navigateTo?: (view: string, storyId?: string, chapterId?: string, userId?: string) => void;
}

function HomeListCollage({ storyIds, manualCover, storiesProps }: { storyIds: string[], manualCover?: string, storiesProps: any[] }) {
  if (manualCover) {
    return <img src={manualCover} alt="Cover" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-2xl" />;
  }
  const covers = storyIds.map(id => storiesProps.find(s => s.id === id)?.coverUrl).filter(Boolean) as string[];
  if (covers.length === 0) {
    return (
      <div className="w-full h-full bg-[#11131e] flex flex-col items-center justify-center text-slate-500 rounded-2xl">
        <span className="text-2xl">🗂️</span>
        <span className="text-[9px] font-mono mt-1 text-slate-600">No Covers</span>
      </div>
    );
  }
  if (covers.length === 1) {
    return <img src={covers[0]} alt="Cover" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-2xl" />;
  }
  if (covers.length === 2) {
    return (
      <div className="w-full h-full flex rounded-2xl overflow-hidden gap-[2px]">
        <img src={covers[0]} alt="Cover 1" referrerPolicy="no-referrer" className="w-1/2 h-full object-cover" />
        <img src={covers[1]} alt="Cover 2" referrerPolicy="no-referrer" className="w-1/2 h-full object-cover" />
      </div>
    );
  }
  if (covers.length === 3) {
    return (
      <div className="w-full h-full flex rounded-2xl overflow-hidden gap-[2px]">
        <img src={covers[0]} alt="Cover 1" referrerPolicy="no-referrer" className="w-1/2 h-full object-cover" />
        <div className="w-1/2 h-full flex flex-col gap-[2px]">
          <img src={covers[1]} alt="Cover 2" referrerPolicy="no-referrer" className="h-1/2 w-full object-cover" />
          <img src={covers[2]} alt="Cover 3" referrerPolicy="no-referrer" className="h-1/2 w-full object-cover" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 rounded-2xl overflow-hidden gap-[2px]">
      <img src={covers[0]} alt="Cover 1" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      <img src={covers[1]} alt="Cover 2" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      <img src={covers[2]} alt="Cover 3" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
      <img src={covers[3]} alt="Cover 4" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
    </div>
  );
}

export default function HomeView({ 
  stories, 
  setView, 
  setSelectedStoryId, 
  setSelectedChapterId,
  currentUser,
  readingLists,
  setReadingLists,
  navigateTo
}: HomeViewProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState('All Genres');
  const [selectedPreviewStory, setSelectedPreviewStory] = useState<any | null>(null);
  const [activeHomeListDetail, setActiveHomeListDetail] = useState<ReadingList | null>(null);
  const [libraryToasts, setLibraryToasts] = useState<string | null>(null);

  // Dynamic user behavior logs for personalized recommendations in Home page discovery
  const [genreHistory, setGenreHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fictself_genre_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fictself_search_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [readingHistory, setReadingHistory] = useState<string[]>(() => {
    return getReadingHistory();
  });

  const userTags = useMemo(() => {
    return currentUser?.interests || [];
  }, [currentUser]);

  const [isAllGenresModalOpen, setIsAllGenresModalOpen] = useState(false);
  
  // Real Feed States
  const [trendingStories, setTrendingStories] = useState<Story[]>([]);
  const [recommendedStories, setRecommendedStories] = useState<Story[]>([]);
  const [newReleases, setNewReleases] = useState<Story[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Story[]>([]);

  React.useEffect(() => {
    let mounted = true;
    const loadFeeds = async () => {
      try {
        // Trending is always public
        const trend = await fetchTrendingStories();
        if (!mounted) return;
        setTrendingStories(trend);
        
        // Only fetch protected feeds if user is logged in
        if (currentUser) {
          const [rec, nr, recent] = await Promise.all([
            fetchRecommendedStories(),
            fetchNewReleases(),
            fetchRecentlyViewed()
          ]);
          if (mounted) {
            setRecommendedStories(rec);
            setNewReleases(nr);
            setRecentlyViewed(recent);
          }
        }
      } catch (err) {
        console.error('Failed to load home feeds:', err);
      }
    };
    loadFeeds();
    return () => { mounted = false; };
  }, [currentUser]);

  // --- Filtered Published Stories ---
  const publishedStories = useMemo(() => {
    return stories.filter(s => s.isPublished);
  }, [stories]);

  // --- Filtered and Search Collections ---
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return publishedStories.filter(s => 
      s.title.toLowerCase().includes(q) || 
      s.author.toLowerCase().includes(q) || 
      (s.genre && s.genre.toLowerCase().includes(q)) ||
      (s.tags && s.tags.some(t => t.toLowerCase().includes(q))) ||
      (s.description && s.description.toLowerCase().includes(q)) ||
      (s.tagline && s.tagline.toLowerCase().includes(q))
    );
  }, [publishedStories, searchQuery]);

  // Resolve continue writing target (the highest custom story)
  const nonArchivedUserStories = stories.filter(s => !s.isArchived);
  const activeWritingStory = nonArchivedUserStories[0];
  const activeWritingChapter = activeWritingStory 
    ? ((activeWritingStory.chapters || []).find(c => c.status === 'draft') || (activeWritingStory.chapters || [])[0]) 
    : null;

  // Resolve continue reading target
  const historyIds = getReadingHistory();
  let activeReadingProgress = null;
  for (const id of historyIds) {
    const prog = getReadingProgress(id);
    if (prog) {
      activeReadingProgress = prog;
      break;
    }
  }
  const activeReadingStory = activeReadingProgress 
    ? publishedStories.find(s => s.id === activeReadingProgress.storyId) 
    : null;
  
  const activeReadingChapterId = activeReadingProgress?.chapterId;
  const activeReadingChapter = activeReadingStory 
    ? ((activeReadingStory.chapters || []).find(c => c.id === activeReadingChapterId) || (activeReadingStory.chapters || [])[0]) 
    : null;

  const handleResumeWritingAction = () => {
    if (activeWritingStory && activeWritingChapter) {
      setSelectedStoryId(activeWritingStory.id);
      setSelectedChapterId(activeWritingChapter.id);
      setView('writing-studio');
    } else {
      setView('my-stories');
    }
  };

  const handleResumeReadingAction = () => {
    if (activeReadingStory && activeReadingChapter) {
      if (navigateTo) {
        navigateTo('reader-chapter', activeReadingStory.id, activeReadingChapter.id);
      } else {
        setSelectedStoryId(activeReadingStory.id);
        setSelectedChapterId(activeReadingChapter.id);
        setView('story-reader');
      }
    } else {
      setView('my-stories');
    }
  };

  const handleSelectDiscoveryStory = (story: any) => {
    if (!story) return;

    // Determine if this is a real backend story (UUID) or a sample/explore story (exp-*, story-* prefix)
    // UUIDs are 36 chars (with dashes) or 32 chars (without). Sample IDs are short: 'exp-1', 'story-1'
    const isRealStory = story.id && story.id.length >= 20;

    // Append to reading history using story.id (not title)
    setReadingHistory(prev => {
      const sid = story.id || '';
      if (!sid) return prev;
      const prevArray = Array.isArray(prev) ? prev : [];
      const updated = [sid, ...prevArray.filter(s => s !== sid)].slice(0, 10);
      localStorage.setItem('fictself_reading_history', JSON.stringify(updated));
      return updated;
    });

    // Append primary genre to genre history
    const parts = story.genre ? story.genre.split(' / ') : [];
    if (parts.length > 0) {
      setGenreHistory(prev => {
        const prim = parts[0].trim();
        const prevArray = Array.isArray(prev) ? prev : [];
        const updated = [prim, ...prevArray.filter(t => t !== prim)].slice(0, 10);
        localStorage.setItem('fictself_genre_history', JSON.stringify(updated));
        return updated;
      });
    }

    if (isRealStory && navigateTo) {
      // Real backend story: navigate to dedicated Public Story landing page
      navigateTo('public-story', story.id);
    } else {
      // Sample/explore story: open preview modal (these don't exist in backend)
      setSelectedPreviewStory(story);
    }
  };

  const handleAddDiscoveryToShelf = (storyTitle: string) => {
    setLibraryToasts(`"${storyTitle}" successfully saved to your offline Library Shelf!`);
    setTimeout(() => setLibraryToasts(null), 3000);
  };

  // --- Scrolling carousels elements references ---
  const trendingRef = useRef<HTMLDivElement>(null);
  const listsRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<HTMLDivElement>(null);
  const newRef = useRef<HTMLDivElement>(null);
  const recentRef = useRef<HTMLDivElement>(null);

  const scrollCarouselLeft = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollCarouselRight = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref.current) {
      ref.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 select-none font-sans text-left" id="fictself-discovery-hub">
      
      {/* 1. Header Row: Welcome Title */}
      <div className="pb-4 border-b border-slate-900/60 flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
            Discover Stories
          </h1>
        </div>
      </div>

      {/* 1.5. Continue Reading Banner */}
      {activeReadingProgress && (
        <div className="bg-gradient-to-r from-violet-900/40 to-[#090b11] border border-violet-500/20 rounded-2xl p-5 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden shadow-lg shadow-violet-900/10">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <BookOpen size={120} />
          </div>
          
          <div 
            className="w-16 h-24 shrink-0 rounded-md overflow-hidden border border-slate-800 shadow-md z-10 relative bg-slate-950 cursor-pointer hover:scale-105 transition"
            onClick={() => navigateTo && navigateTo('public-story', activeReadingProgress.storyId)}
          >
            <StoryCoverView coverUrl={activeReadingProgress.coverUrl} title={activeReadingProgress.title} genre={activeReadingProgress.genre} subgenre={(activeReadingProgress as any).subgenre} author={activeReadingProgress.author} />
          </div>

          <div className="flex-1 space-y-3 z-10 w-full">
            <div 
              className="cursor-pointer group"
              onClick={() => navigateTo && navigateTo('public-story', activeReadingProgress.storyId)}
            >
              <span className="text-[10px] font-mono text-violet-400 font-bold uppercase tracking-wider mb-1 block">Continue Reading</span>
              <h3 className="text-lg font-black text-white leading-tight truncate group-hover:text-violet-400 transition">{activeReadingProgress.title}</h3>
              <p className="text-xs text-slate-400">Chapter {activeReadingProgress.chapterSequence} of {activeReadingProgress.totalChapters}</p>
            </div>
            
            <div className="space-y-1.5 w-full max-w-sm">
              <div className="flex justify-between text-[10px] font-mono font-bold text-slate-400">
                <span>Progress</span>
                <span className="text-violet-400">{activeReadingProgress.progressPercent}%</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden w-full border border-slate-800">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500" 
                  style={{ width: `${activeReadingProgress.progressPercent}%` }}
                />
              </div>
            </div>
          </div>
          
          <button
            onClick={handleResumeReadingAction}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-violet-650 hover:bg-violet-600 text-white font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 shrink-0 z-10"
          >
            Resume <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* 2. Global Search Bar */}
      <div className="max-w-3xl relative" id="global-search-container">
        <div className="flex items-center rounded-2xl bg-[#090b11] border border-slate-805 px-4 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500/20 transition duration-150">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search stories, authors, tags, genres..."
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (val.trim().length > 2) {
                setSearchHistory(prev => {
                  const cleaned = val.trim().toLowerCase();
                  const prevArray = Array.isArray(prev) ? prev : [];
                  if (prevArray.includes(cleaned)) return prevArray;
                  const updated = [cleaned, ...prevArray].slice(0, 10);
                  localStorage.setItem('fictself_search_history', JSON.stringify(updated));
                  return updated;
                });
              }
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  // Push to search history
                  setSearchHistory(prev => {
                    const prevArray = Array.isArray(prev) ? prev : [];
                    const updated = [searchQuery, ...prevArray.filter(t => t !== searchQuery)].slice(0, 10);
                    localStorage.setItem('fictself_search_history', JSON.stringify(updated));
                    return updated;
                  });
                }
              }}
            className="w-full bg-transparent border-none outline-none py-3.5 px-3 text-sm font-semibold text-slate-100 placeholder-slate-400 focus:ring-0"
            id="fictself-search-input"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-450 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Dynamic Search Results Box Overlay */}
      {searchQuery.trim() ? (
        <div className="p-6 bg-[#07090e] border border-slate-850 rounded-2xl space-y-4" id="search-results-viewport">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <Search size={14} className="text-violet-405" />
              Search Results ({searchResults.length} matching found)
            </h3>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-violet-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <X size={12} /> Clear Results
            </button>
          </div>

          {searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map(story => (
                <StoryCard 
                  key={story.id}
                  story={story}
                  onOpenStory={handleSelectDiscoveryStory}
                  onOpenAuthor={(authorId, e) => {
                    if (navigateTo) navigateTo('public-profile', undefined, undefined, authorId);
                  }}
                  className="w-full"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-950/20 rounded-xl text-slate-500 text-xs">
              No stories matching your criteria could be detected. Try another phrase!
            </div>
          )}
        </div>
      ) : null}

      {/* Library Added shelf notification toast */}
      {libraryToasts && (
        <div className="fixed bottom-6 right-6 p-4 rounded-xl bg-slate-900 border border-slate-800/90 text-xs text-slate-200 font-bold shadow-2xl flex items-center gap-2 z-50 animate-bounce">
          <span className="p-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Check size={12} />
          </span>
          <span>{libraryToasts}</span>
        </div>
      )}

      {/* 4. Genres Carousel Row */}
      <div className="space-y-4 border-t border-slate-900/60 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-bold uppercase text-slate-500 select-none">
            Genres
          </h3>
        </div>
        {/* Horizontal track */}
        <div className="flex gap-2 overflow-x-auto pb-1 select-none scrollbar-none" id="genres-pills-row">
          {/* All genres first */}
          <button
            onClick={() => setSelectedGenreFilter('All Genres')}
            className={`px-4 py-3 rounded-2xl text-xs font-bold leading-none shrink-0 transition duration-150 flex items-center border cursor-pointer ${
              selectedGenreFilter === 'All Genres'
                ? 'bg-gradient-to-r from-violet-650 to-indigo-700 border-transparent text-white shadow-md'
                : 'bg-[#090b11] border-slate-850 text-slate-400 hover:text-slate-105 hover:border-slate-700'
            }`}
            id="genre-pill-card-all-genres"
          >
            <span>All Genres</span>
          </button>

          {/* Popular genres list */}
          {PRIMARY_GENRES.map((gen) => {
            const isSelected = selectedGenreFilter === gen.name;
            return (
              <button
                key={gen.name}
                onClick={() => setSelectedGenreFilter(gen.name)}
                className={`px-4 py-3 rounded-2xl text-xs font-bold leading-none shrink-0 transition duration-150 flex items-center border cursor-pointer ${
                  isSelected 
                    ? 'bg-gradient-to-r from-violet-650 to-indigo-700 border-transparent text-white shadow-md' 
                    : 'bg-[#090b11] border-slate-850 text-slate-400 hover:text-slate-105 hover:border-slate-700'
                }`}
                id={`genre-pill-card-${gen.name.replace(/\s+/g, '-').toLowerCase()}`}
              >
                <span>{gen.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Trending Stories Shelves */}
      <div className="space-y-3 border-t border-slate-900/40 pt-6">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-905/35">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Trending Stories
            </h2>
          </div>
          {/* Scroll Buttons */}
          <div className="flex items-center gap-1.5 select-none text-slate-400">
            <button 
              onClick={() => scrollCarouselLeft(trendingRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => scrollCarouselRight(trendingRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div 
          ref={trendingRef}
          className="flex items-stretch gap-5 overflow-x-auto pb-3 scrollbar-none scroll-smooth h-full"
        >
          {trendingStories.length === 0 ? (
            <div className="w-full text-slate-500 italic text-sm py-4">No trending stories yet.</div>
          ) : trendingStories.map(story => (
            <StoryCard 
              key={story.id}
              story={story}
              onOpenStory={handleSelectDiscoveryStory}
              onOpenAuthor={(authorId, e) => {
                if (navigateTo) navigateTo('public-profile', undefined, undefined, authorId);
              }}
            />
          ))}
        </div>
      </div>

      {/* 6. Recommended For You Shelves */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-905/35">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Recommended For You
            </h2>
          </div>
          {/* Scroll Buttons */}
          <div className="flex items-center gap-1.5 select-none text-slate-400">
            <button 
              onClick={() => scrollCarouselLeft(recRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => scrollCarouselRight(recRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div 
          ref={recRef}
          className="flex items-stretch gap-5 overflow-x-auto pb-3 scrollbar-none scroll-smooth h-full"
        >
          {recommendedStories.length === 0 ? (
            <div className="w-full text-slate-500 italic text-sm py-4">No recommended stories yet.</div>
          ) : recommendedStories.map(story => (
            <StoryCard 
              key={story.id}
              story={story}
              onOpenStory={handleSelectDiscoveryStory}
              onOpenAuthor={(authorId, e) => {
                if (navigateTo) navigateTo('public-profile', undefined, undefined, authorId);
              }}
            />
          ))}
        </div>
      </div>

      {/* 7. New Releases Shelves */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-905/35">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              New Releases
            </h2>
          </div>
          {/* Scroll Buttons */}
          <div className="flex items-center gap-1.5 select-none text-slate-400">
            <button 
              onClick={() => scrollCarouselLeft(newRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => scrollCarouselRight(newRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div 
          ref={newRef}
          className="flex items-stretch gap-5 overflow-x-auto pb-3 scrollbar-none scroll-smooth h-full"
        >
          {newReleases.length === 0 ? (
            <div className="w-full text-slate-500 italic text-sm py-4">No new releases available.</div>
          ) : newReleases.map(story => (
            <StoryCard 
              key={story.id}
              story={story}
              onOpenStory={handleSelectDiscoveryStory}
              onOpenAuthor={(authorId, e) => {
                if (navigateTo) navigateTo('public-profile', undefined, undefined, authorId);
              }}
            />
          ))}
        </div>
      </div>

      {/* 8. Recently Viewed Shelves */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b pb-1.5 border-slate-905/35">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold tracking-tight text-white flex items-center gap-2">
              Recently Viewed
            </h2>
          </div>
          {/* Scroll Buttons */}
          <div className="flex items-center gap-1.5 select-none text-slate-400">
            <button 
              onClick={() => scrollCarouselLeft(recentRef)} 
              className="p-1 rounded-full border border-slate-805 hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
            <button 
              onClick={() => scrollCarouselRight(recentRef)} 
              className="p-1 rounded-full border border-[#222] hover:bg-slate-800 hover:text-white cursor-pointer active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div 
          ref={recentRef}
          className="flex items-stretch gap-5 overflow-x-auto pb-3 scrollbar-none scroll-smooth h-full"
        >
          {recentlyViewed.length === 0 ? (
            <div className="w-full text-slate-500 italic text-sm py-4">No recently viewed stories yet.</div>
          ) : recentlyViewed.map(story => (
            <StoryCard 
              key={story.id}
              story={story}
              onOpenStory={handleSelectDiscoveryStory}
              onOpenAuthor={(authorId, e) => {
                if (navigateTo) navigateTo('public-profile', undefined, undefined, authorId);
              }}
            />
          ))}
        </div>
      </div>

      {/* ==================== IMMERSIVE STORY DETAILS MODAL / DRAWER Overlay ==================== */}
      {selectedPreviewStory && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 text-left select-none animate-fadeIn"
          onClick={() => setSelectedPreviewStory(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#090a10] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative flex flex-col md:flex-row shadow-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left Cover aspect */}
            <div className="w-full md:w-56 bg-slate-950 aspect-[3/4.2] md:aspect-auto shrink-0 relative border-r border-slate-900">
              <StoryCoverView 
                coverUrl={selectedPreviewStory.coverUrl} 
                title={selectedPreviewStory.title} 
                genre={selectedPreviewStory.genre} 
                author={selectedPreviewStory.author}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/80 via-transparent to-black/30" />
            </div>

            {/* Right Meta details */}
            <div className="p-6 md:p-8 flex-1 flex flex-col justify-between space-y-5 relative">
              <button 
                onClick={() => setSelectedPreviewStory(null)}
                className="absolute top-4 right-4 p-1 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X size={15} />
              </button>

              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono leading-none">
                  <span className="px-2 py-1 rounded bg-violet-900/40 text-violet-300 font-bold uppercase tracking-wider">
                    {selectedPreviewStory.genre}
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-900 text-slate-400 font-bold border border-slate-805 uppercase">
                    {selectedPreviewStory.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {selectedPreviewStory.title}
                  </h3>
                  <p className="text-slate-400 font-medium">
                    <span 
                      className="hover:text-white cursor-pointer transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (selectedPreviewStory.authorId && navigateTo) {
                          navigateTo('public-profile', undefined, undefined, selectedPreviewStory.authorId);
                        }
                      }}
                    >
                      By {selectedPreviewStory.author}
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-6 font-mono text-[11px] text-slate-350 bg-[#12131b] py-2 px-3.5 border border-slate-850/60 rounded-xl w-fit">
                  <span className="flex items-center gap-1 text-slate-300 font-bold"><Eye size={12} className="text-sky-450" /> {formatCount(selectedPreviewStory.views)} Reads</span>
                  <span className="flex items-center gap-1 text-pink-400 font-bold"><Heart size={11} fill="currentColor" /> {formatCount(selectedPreviewStory.likes)} Likes</span>
                  <span className="flex items-center gap-1 text-amber-400 font-bold">★ {selectedPreviewStory.rating.toFixed(1)}</span>
                </div>

                <div className="space-y-1.5 pt-1 text-left">
                  <h4 className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">Story plot summary</h4>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed font-sans max-h-36 overflow-y-auto">
                    {selectedPreviewStory.description || 'No story logs detected.'}
                  </p>
                </div>
              </div>

              {/* Action Rows */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-900">
                <button
                  onClick={() => {
                    handleAddDiscoveryToShelf(selectedPreviewStory.title);
                    setSelectedPreviewStory(null);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-violet-650 hover:bg-violet-605 text-white font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 active:scale-97 shadow"
                >
                  <PlusCircle size={14} /> Add to shelf list
                </button>
                {selectedPreviewStory?.id?.length >= 32 ? (
                  <button
                    onClick={() => {
                      if (navigateTo) {
                        navigateTo('story-reader', selectedPreviewStory.id);
                      }
                      setSelectedPreviewStory(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-200 font-bold text-xs transition cursor-pointer"
                  >
                    Read Story
                  </button>
                ) : (
                  <button
                    disabled
                    className="px-4 py-3 rounded-xl bg-slate-900/50 border border-slate-800/50 text-slate-500 font-bold text-xs transition cursor-not-allowed"
                    title="This is a sample story and cannot be read."
                  >
                    Sample Only
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ==================== VIEW ALL GENRES MODAL ==================== */}
      {isAllGenresModalOpen && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn"
          onClick={() => setIsAllGenresModalOpen(false)}
        >
          <div 
            className="w-full max-w-4xl bg-[#090a10] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative p-6 md:p-8 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsAllGenresModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900 border border-slate-805 hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X size={15} />
            </button>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-white leading-tight flex items-center gap-2">
                <span>📚 Browse All Story Genres</span>
              </h3>
              <p className="text-xs text-slate-400 max-w-xl">
                Explore the complete multi-column hierarchical catalogue of literary subgenres, tropes, and thematic configurations on Fictself AI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
              {PRIMARY_GENRES.map(gen => {
                const isSelected = selectedGenreFilter === gen.name;
                return (
                  <div
                    key={gen.name}
                    onClick={() => {
                      setSelectedGenreFilter(gen.name);
                      setIsAllGenresModalOpen(false);
                    }}
                    className={`rounded-2xl border p-4 transition-all duration-200 cursor-pointer text-left space-y-2 group hover:border-violet-500 hover:shadow-lg ${
                      isSelected
                        ? 'bg-violet-950/20 border-violet-500'
                        : 'bg-[#11131e]/55 border-slate-850 hover:bg-[#11131e]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{gen.emoji}</span>
                      <h4 className="font-extrabold text-sm text-slate-100 group-hover:text-violet-405 transition">
                        {gen.name}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400 font-medium line-clamp-2 leading-relaxed">
                      {gen.subgenres.join(', ')}
                    </p>

                    <div className="flex flex-wrap gap-1 pt-1">
                      {gen.subgenres.slice(0, 3).map(sub => (
                        <span key={sub} className="text-[9px] font-mono font-medium px-2 py-0.5 rounded bg-slate-950 border border-slate-850 text-slate-400 select-none">
                          {sub}
                        </span>
                      ))}
                      {gen.subgenres.length > 3 && (
                        <span className="text-[9px] font-mono text-slate-500 px-1.5 py-0.5">
                          +{gen.subgenres.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-slate-900 pt-4 text-[11px] text-slate-500 font-mono">
              <span>Primary categories: {PRIMARY_GENRES.length} curated</span>
              <button
                onClick={() => {
                  setSelectedGenreFilter('All Genres');
                  setIsAllGenresModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-[#11131e] hover:bg-slate-900 border border-slate-800 text-slate-200 font-bold transition cursor-pointer"
              >
                Reset to All Genres
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ACTIVE HOME LIST DETAIL MODAL ==================== */}
      {activeHomeListDetail && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn text-left select-none"
          onClick={() => setActiveHomeListDetail(null)}
        >
          <div 
            className="w-full max-w-2xl bg-[#090a10] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveHomeListDetail(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-900 border border-slate-805 hover:bg-slate-800 text-slate-400 cursor-pointer"
            >
              <X size={14} />
            </button>

            <div className="flex flex-col md:flex-row gap-5 pb-5 border-b border-slate-900">
              <div className="w-44 h-26 rounded-2xl overflow-hidden border border-slate-850 shrink-0 select-none">
                <HomeListCollage 
                  storyIds={activeHomeListDetail.storyIds} 
                  manualCover={activeHomeListDetail.coverUrl} 
                  storiesProps={stories} 
                />
              </div>

              <div className="space-y-2 select-text">
                <span className="text-[10px] font-mono bg-violet-650/15 border border-violet-500/10 text-violet-455 px-2 py-0.5 rounded-full">
                  Curated Board discover
                </span>
                <h3 className="text-xl font-black text-white leading-tight">
                  {activeHomeListDetail.name}
                </h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  {activeHomeListDetail.description}
                </p>
                <div className="text-[10.5px] font-mono text-slate-500">
                  created by <b>@{activeHomeListDetail.creatorName}</b> • {activeHomeListDetail.followersCount} followers
                </div>
              </div>
            </div>

            {/* List of stories */}
            <div className="space-y-3.5 overflow-y-auto max-h-[40vh] pr-1.5">
              <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                Stories inside this board ({activeHomeListDetail.storyIds.length})
              </h4>

              {activeHomeListDetail.storyIds.length > 0 ? (
                <div className="space-y-2">
                  {activeHomeListDetail.storyIds.map(stId => {
                    const stMeta = stories.find(s => s.id === stId);
                    if (!stMeta) return null;

                    return (
                      <div 
                        key={stId}
                        className="p-3 bg-slate-950/60 border border-slate-900 hover:border-slate-800 rounded-xl flex items-center justify-between gap-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          <img src={stMeta.coverUrl} alt="Cover" referrerPolicy="no-referrer" className="w-9 h-12 rounded object-cover border border-slate-800" />
                          <div>
                            <span className="text-[9px] font-mono font-bold text-violet-400 bg-violet-600/10 px-1.5 py-0.2 rounded select-none">{stMeta.genre}</span>
                            <h5 className="font-extrabold text-xs text-slate-100 mt-1">{stMeta.title}</h5>
                            <p 
                              className="text-[10px] text-slate-400 leading-none hover:text-white cursor-pointer transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (stMeta.authorId && navigateTo) {
                                  navigateTo('public-profile', undefined, undefined, stMeta.authorId);
                                }
                              }}
                            >by {stMeta.author}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setActiveHomeListDetail(null);
                            setSelectedStoryId(stMeta.id);
                            setSelectedChapterId('chap-1');
                            setView('story-reader');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-violet-650 hover:bg-violet-605 text-white font-bold text-xs cursor-pointer transition select-none flex items-center gap-1"
                        >
                          Read Here
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-950 rounded-xl text-slate-500 text-xs">
                  No stories mapped on this board.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-between select-none">
              <button
                onClick={() => {
                  setActiveHomeListDetail(null);
                  setView('library');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Manage Boards in My Library
              </button>

              <button
                onClick={() => setActiveHomeListDetail(null)}
                className="px-4 py-2 bg-violet-650 hover:bg-violet-605 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Explore
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
