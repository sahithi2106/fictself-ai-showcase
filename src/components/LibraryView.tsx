import React, { useState, useEffect, useMemo } from 'react';
import { Story, ReadingList, UserProfile } from '../types';
import { getReadingHistory, getReadingProgress, removeReadingProgress } from '../lib/readingProgress';
import { 
  BookOpen, 
  Bookmark, 
  Clock, 
  Plus, 
  Lock, 
  Globe, 
  Flame, 
  Eye, 
  CheckCircle, 
  ChevronRight,
  X,
  MoreVertical,
  PlayCircle,
  Share2,
  Trash2,
  Heart
} from 'lucide-react';
import CoverImageUploader from './CoverImageUploader';

interface LibraryViewProps {
  stories: Story[];
  setStories?: React.Dispatch<React.SetStateAction<Story[]>>;
  setView: (view: string) => void;
  setSelectedStoryId: (id: string) => void;
  setSelectedChapterId: (id: string) => void;
  readingLists: ReadingList[];
  setReadingLists: React.Dispatch<React.SetStateAction<ReadingList[]>>;
  navigateTo?: (view: string, storyId?: string, chapterId?: string, userId?: string) => void;
  currentUser?: UserProfile | null;
}

export default function LibraryView({ 
  stories, 
  setView, 
  setSelectedStoryId,
  setSelectedChapterId,
  readingLists,
  setReadingLists,
  navigateTo,
  currentUser
}: LibraryViewProps) {
  
  // Exactly 4 Tabs specified: 'Currently Reading' | 'Saved Stories' | 'Reading Lists' | 'History'
  const [activeTab, setActiveTab] = useState<'reading' | 'saved' | 'lists' | 'history'>('reading');
  
  // Local active states for lists
  const [isAddingList, setIsAddingList] = useState(false);
  const [selectedListDetail, setSelectedListDetail] = useState<ReadingList | null>(null);

  // New list form details
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListCoverUrl, setNewListCoverUrl] = useState('');
  const [newListIsPublic, setNewListIsPublic] = useState(true);

  // Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper:  // For standard shelves
  const completedStories = stories.filter(s => s.status === 'Completed' && s.isPublished);
  const ongoingStories = stories.filter(s => s.status === 'Ongoing' && s.isPublished);
  // Helper: Get story metadata
  const getStoryMeta = (id: string) => {
    // Only return data for real published stories that exist in the DB
    const propStory = stories.find(s => s.id === id && s.isPublished);
    if (propStory) {
      return {
        id: propStory.id,
        title: propStory.title,
        author: propStory.author,
        coverUrl: propStory.coverUrl,
        genre: propStory.genre,
        status: propStory.status || 'Ongoing',
        chaptersCount: propStory.chapters?.length || 1,
        firstChapterId: propStory.chapters?.[0]?.id || 'chap-1'
      };
    }
    
    // Absolute fallback (return null instead of showing fake duplicates)
    return null;
  };

  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [savedStoriesIds, setSavedStoriesIds] = useState<string[]>([]);
  const [readLaterIds, setReadLaterIds] = useState<string[]>([]);
  const [favoritedIds, setFavoritedIds] = useState<string[]>([]);

  // Reading Lists behavior data resolve
  const continueReadingList = useMemo(() => {
    return historyIds.map(getStoryMeta).filter(Boolean);
  }, [historyIds, stories]);
  const recentlyUpdatedList = useMemo(() => [], [stories]);
  const followingList = useMemo(() => [], [stories]);

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const { fetchSavedStories, fetchReadingProgress, fetchReadingLists } = await import('../lib/api/library');
        
        const [saved, readLater, favorited, progress, lists] = await Promise.all([
          fetchSavedStories('saved'),
          fetchSavedStories('read_later'),
          fetchSavedStories('favorited'),
          fetchReadingProgress(),
          fetchReadingLists()
        ]);
        
        setSavedStoriesIds((saved as any[]).map((r: any) => r.story_id));
        setReadLaterIds((readLater as any[]).map((r: any) => r.story_id));
        setFavoritedIds((favorited as any[]).map((r: any) => r.story_id));
        setHistoryIds(Array.from(new Set((progress as any[]).map((r: any) => String(r.story_id)))));
        setReadingLists(lists as ReadingList[]);
      } catch (err) {
        console.error('Failed to load library', err);
      }
    };
    loadLibrary();
  }, []);

  const savedStoriesList = useMemo(() => savedStoriesIds.map(getStoryMeta).filter(Boolean), [savedStoriesIds, stories]);
  const readLaterList = useMemo(() => readLaterIds.map(getStoryMeta).filter(Boolean), [readLaterIds, stories]);
  const favoritedList = useMemo(() => favoritedIds.map(getStoryMeta).filter(Boolean), [favoritedIds, stories]);

  // History behavior data resolve
  const recentlyViewedList = useMemo(() => {
    return historyIds.map(getStoryMeta).filter(Boolean);
  }, [historyIds, stories]);
  const recentlyFinishedList = useMemo(() => [], [stories]);
  const recentlyOpenedList = useMemo(() => [], [stories]);

  // Core Actions
  const handleCreateListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const defaultCovers = [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1507842217343-583bb7270b66?q=80&w=400&auto=format&fit=crop'
    ];
    const imageToUse = newListCoverUrl.trim() || defaultCovers[Math.floor(Math.random() * defaultCovers.length)];

    try {
      const { createReadingList } = await import('../lib/api/library');
      const brandNew = await createReadingList({
        name: newListName.trim(),
        description: newListDesc.trim() || 'A reader-curated lists collection.',
        is_public: newListIsPublic,
        cover_url: imageToUse
      }) as ReadingList;

      setReadingLists([brandNew, ...readingLists]);
      setIsAddingList(false);
      setNewListName('');
      setNewListDesc('');
      setNewListCoverUrl('');
      setNewListIsPublic(true);
      triggerToast(`Reading list "${brandNew.name}" created!`);
    } catch (e) {
      triggerToast('Failed to create reading list.');
    }
  };

  const handleToggleFollowList = (listId: string) => {
    setReadingLists(prev => prev.map(rl => {
      if (rl.id === listId) {
        const followingUpdate = !rl.isFollowing;
        return {
          ...rl,
          isFollowing: followingUpdate,
          followersCount: followingUpdate ? (rl.followersCount || 0) + 1 : Math.max(0, (rl.followersCount || 1) - 1)
        };
      }
      return rl;
    }));
    triggerToast('Board saved to your reading list follows!');
  };

  const handleShareList = (name: string) => {
    navigator.clipboard.writeText(`https://fictself.com/lists/${encodeURIComponent(name)}`).then(() => {
      triggerToast(`Copied share link for "${name}"!`);
    });
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the reading list "${name}"?`)) {
      try {
        const { deleteReadingList } = await import('../lib/api/library');
        await deleteReadingList(id);
        setReadingLists(readingLists.filter(rl => rl.id !== id));
        setSelectedListDetail(null);
        triggerToast(`Deleted list "${name}"`);
      } catch (err) {
        triggerToast('Failed to delete list.');
      }
    }
  };

  const handleReadStory = (storyId: string, firstChapId: string) => {
    if (navigateTo) {
      navigateTo('public-story', storyId);
    }
  };

  const handleContinueReading = (e: React.MouseEvent, storyId: string, chapterId: string) => {
    e.stopPropagation();
    if (navigateTo) {
      navigateTo('reader-chapter', storyId, chapterId);
    }
  };

  const handleRemoveFromLibrary = async (e: React.MouseEvent, storyId: string, title: string, context?: 'reading' | 'saved' | 'readLater' | 'history') => {
    e.stopPropagation();
    if (confirm(`Remove "${title}" from your library history?`)) {
      try {
        const { removeStoryFromList } = await import('../lib/api/library');
        if (context === 'saved') {
          await removeStoryFromList(storyId, 'saved');
          setSavedStoriesIds(prev => prev.filter(id => id !== storyId));
        } else if (context === 'readLater') {
          await removeStoryFromList(storyId, 'read_later');
          setReadLaterIds(prev => prev.filter(id => id !== storyId));
        } else {
          // 'reading' or 'history'
          const { apiDelete } = await import('../lib/api/client');
          await apiDelete(`/library/progress/${storyId}`);
          setHistoryIds(prev => prev.filter(id => id !== storyId));
        }
        triggerToast(`Removed "${title}" from library.`);
      } catch (err) {
        console.error("Failed to remove from library", err);
        triggerToast(`Failed to remove "${title}".`);
      }
    }
  };

  // Render book covers
  const renderBookCoverTile = (book: any, allowRemove?: boolean, removeContext?: 'reading' | 'saved' | 'readLater' | 'history') => {
    return (
      <div 
        key={book.id}
        onClick={() => handleReadStory(book.id, book.firstChapterId)}
        className="group cursor-pointer space-y-3 block select-none bg-zinc-950/20 hover:bg-zinc-900/45 p-2 rounded-2xl transition duration-200 relative"
      >
        <div className="aspect-[2/3] w-full relative overflow-hidden rounded-xl border border-zinc-900/80 shadow-md group-hover:shadow-amber-500/10 transition duration-300">
          <img 
            src={book.coverUrl} 
            alt={book.title} 
            className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex items-end justify-center pb-4">
            <span className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black rounded-lg transition active:scale-95 shadow">
              Open Story
            </span>
          </div>
          {allowRemove && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1 items-end">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // For a real app, this would open a dropdown menu. Here we use inline icons
                }}
                className="p-1.5 bg-black/60 backdrop-blur hover:bg-black text-white rounded-md transition border border-white/10"
                title="Options"
              >
                <MoreVertical size={14} />
              </button>
              
              <div className="flex flex-col gap-1 mt-1 origin-top-right scale-0 group-hover:scale-100 transition-transform">
                {(removeContext === 'reading' || removeContext === 'history') && (
                  <button 
                    onClick={(e) => handleContinueReading(e, book.id, book.firstChapterId)}
                    className="flex items-center gap-2 p-1.5 px-3 bg-amber-500/90 hover:bg-amber-400 text-black text-xs font-bold rounded-md shadow-lg backdrop-blur transition"
                  >
                    <PlayCircle size={12} fill="currentColor" />
                    Continue
                  </button>
                )}
                
                <button 
                  onClick={(e) => handleRemoveFromLibrary(e, book.id, book.title, removeContext)}
                  className="flex items-center gap-2 p-1.5 px-3 bg-red-500/90 hover:bg-red-600 text-white text-xs font-bold rounded-md shadow-lg backdrop-blur transition"
                >
                  <Trash2 size={12} />
                  {removeContext === 'saved' || removeContext === 'readLater' ? 'Unsave' : 'Mark Unread'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-0.5 text-left px-1.5 pb-1 select-text">
          <h4 className="font-extrabold text-[12.5px] leading-tight text-zinc-150 truncate group-hover:text-amber-400 transition">
            {book.title}
          </h4>
          <div className="flex items-center justify-between gap-1 text-[10.5px]">
            <span 
              className="text-zinc-500 truncate hover:text-zinc-300 cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (book.authorId && navigateTo) {
                  navigateTo('public-profile', undefined, undefined, book.authorId);
                }
              }}
            >by {book.author}</span>
            <span className="font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/10 px-1.5 py-[1px] rounded text-[9.5px] font-mono shrink-0 select-none uppercase">
              {book.status}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 select-none font-sans text-zinc-100" id="fictself-library-overhaul">
      
      {/* Toast Popover */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-zinc-900 border border-amber-500/25 rounded-xl shadow-2xl text-xs text-white font-medium flex items-center gap-2 animate-bounce">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Head section with streamlined look */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-900 gap-5">
        <div className="text-left space-y-1">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            Library
          </h1>
        </div>

        {/* Dynamic Switcher Tab Controls */}
        <div className="flex bg-zinc-950 border border-zinc-900 p-1 rounded-xl gap-1 shrink-0 select-none" id="library-tabs-control">
          {[
            { id: 'reading', label: 'Currently Reading', count: continueReadingList.length },
            { id: 'saved', label: 'Saved Stories', count: savedStoriesList.length },
            { id: 'lists', label: 'Reading Lists', count: readingLists.length },
            { id: 'history', label: 'History', count: recentlyViewedList.length }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedListDetail(null);
                }}
                className={`px-4.5 py-2.5 rounded-lg text-xs font-bold transition duration-150 flex items-center gap-1.5 cursor-pointer border-0 ${
                  isActive
                    ? 'bg-amber-600 text-white shadow font-black'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                id={`lib-tab-${tab.id}`}
              >
                <span>{tab.label}</span>
                <span className={`text-[9.5px] px-1 py-[0.5px] rounded font-mono ${
                  isActive ? 'bg-white/20 text-white font-bold' : 'bg-zinc-900 text-zinc-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ==================== ACTIVE VIEWPORTS ==================== */}

      {/* 1. CURRENTLY READING */}
      {activeTab === 'reading' && (
        <div className="space-y-8 animate-fadeIn text-left">
          <div className="space-y-3.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500 mb-1 flex items-center gap-2">
              <Flame size={14} /> Currently Reading
            </h3>
            {continueReadingList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                You are not reading any stories right now.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {continueReadingList.map(book => renderBookCoverTile(book, true, 'reading'))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-450 flex items-center gap-2">
              <BookOpen size={13} /> Recommended Releases
            </h3>
            {recentlyUpdatedList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                No new releases recommended at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {recentlyUpdatedList.map(book => renderBookCoverTile(book, false))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. SAVED STORIES */}
      {activeTab === 'saved' && (
        <div className="space-y-8 animate-fadeIn text-left">
          <div className="space-y-3.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500 flex items-center gap-2">
              <Bookmark size={13} /> Saved Stories
            </h3>
            {savedStoriesList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                You haven't saved any stories.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {savedStoriesList.map(book => renderBookCoverTile(book, true, 'saved'))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-450 flex items-center gap-2">
              <Clock size={13} /> Read Later
            </h3>
            {readLaterList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                Your read later list is empty.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {readLaterList.map(book => renderBookCoverTile(book, true, 'readLater'))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. READING LISTS */}
      {activeTab === 'lists' && (
        <div className="space-y-6 animate-fadeIn text-left">
          
          {!selectedListDetail ? (
            <>
              {/* Creator Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-900">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-zinc-100">Reading Lists</h3>
                  <p className="text-[11px] text-zinc-400">Discover public book shelves or organize your absolute favorites.</p>
                </div>

                <button
                  onClick={() => setIsAddingList(true)}
                  className="px-4.5 py-2 hover:opacity-90 bg-amber-600 font-bold hover:bg-amber-500 transition text-white text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border-0 active:scale-95 shrink-0"
                >
                  <Plus size={14} /> Create Reading List
                </button>
              </div>

              {/* Grid of reading boards (Pinterest inspired layout) */}
              {readingLists.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-zinc-500 bg-zinc-950/20 rounded-2xl border border-zinc-900/50">
                  <Bookmark size={32} className="opacity-20 mb-3" />
                  <p className="text-sm italic">You haven't created or followed any reading lists yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                  {readingLists.map((list) => {
                    const isUserList = Boolean(currentUser) && (
                      list.creatorName === currentUser?.username || 
                      list.creatorName === currentUser?.displayName
                    );
                    
                    return (
                      <div 
                        key={list.id}
                        className="bg-zinc-950/50 border border-zinc-900/80 hover:border-zinc-800 rounded-3xl overflow-hidden flex flex-col transition hover:shadow-xl group duration-250"
                      >
                        {/* Board Cover (Pinterest/Spotify style) */}
                        <div className="h-44 relative overflow-hidden bg-zinc-900 border-b border-zinc-900/60 cursor-pointer" onClick={() => setSelectedListDetail(list)}>
                          <img 
                            src={list.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop'} 
                            alt={list.name}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20 flex flex-col justify-between p-4.5">
                            {/* Top row badge */}
                            <div className="flex justify-between items-start font-mono text-[10px] text-white">
                              <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9.5px] font-bold">
                                {list.storyIds.length} Stories
                              </span>
                              {list.isPublic ? (
                                <span className="bg-emerald-500/20 text-emerald-300 backdrop-blur-md px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                  <Globe size={10} /> Public
                                </span>
                              ) : (
                                <span className="bg-amber-500/20 text-amber-300 backdrop-blur-md px-2.5 py-1 rounded-full font-bold flex items-center gap-1">
                                  <Lock size={10} /> Private
                                </span>
                              )}
                            </div>

                            {/* Content Title Overlay */}
                            <div className="space-y-1 text-left">
                              <h4 className="font-extrabold text-[#f3f4f6] text-base md:text-lg hover:text-amber-400 cursor-pointer transition truncate">
                                {list.name}
                              </h4>
                              <p className="text-[11px] text-zinc-300 line-clamp-1 leading-normal font-sans font-medium">
                                {list.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Footer bar with actions */}
                        <div className="p-4 flex items-center justify-between text-xs font-mono select-none text-zinc-400 border-t border-zinc-900/40 bg-zinc-950/20">
                          <span className="truncate max-w-[120px]">by @{list.creatorName}</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleToggleFollowList(list.id)}
                              className={`px-3 py-1 font-bold text-[10.5px] rounded-lg border cursor-pointer transition duration-150 ${
                                list.isFollowing 
                                  ? 'bg-amber-600/10 border-amber-500/30 text-amber-400' 
                                  : 'bg-zinc-900 hover:border-zinc-700 text-zinc-400 border-zinc-800'
                              }`}
                            >
                              {list.isFollowing ? 'Following' : 'Follow'}
                            </button>
                            
                            <button 
                              onClick={() => handleShareList(list.name)}
                              className="p-1 px-1.5 bg-zinc-900 border border-zinc-805 rounded-lg hover:text-zinc-200 cursor-pointer transition text-zinc-400"
                              title="Share"
                            >
                              <Share2 size={11} />
                            </button>

                            {isUserList && (
                              <button 
                                onClick={() => handleDeleteList(list.id, list.name)}
                                className="p-1 px-1.5 bg-zinc-900 hover:text-red-400 hover:bg-red-955/10 rounded-lg border border-zinc-805 cursor-pointer transition text-zinc-400"
                                title="Delete"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* ==================== LIST DETAIL ==================== */
            <div className="space-y-4">
              {/* Top Back Navigation & Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 select-none pb-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-905" id="reading-list-navigation-breadcrumb">
                <button 
                  onClick={() => setSelectedListDetail(null)}
                  className="hover:text-white text-zinc-400 transition cursor-pointer font-bold flex items-center gap-1.5 bg-transparent border-0 p-0"
                  id="back-to-library"
                >
                  &larr; Back to Library
                </button>
                <span className="text-zinc-755 font-mono">|</span>
                <span className="text-zinc-500">Workspace</span>
                <span className="text-zinc-755 font-mono">&gt;</span>
                <button 
                  onClick={() => setSelectedListDetail(null)}
                  className="hover:text-amber-400 text-zinc-555 transition cursor-pointer bg-transparent border-0 p-0"
                >
                  Library
                </button>
                <span className="text-zinc-755 font-mono">&gt;</span>
                <button 
                  onClick={() => setSelectedListDetail(null)}
                  className="hover:text-amber-400 text-zinc-555 transition cursor-pointer bg-transparent border-0 p-0"
                >
                  Reading Lists
                </button>
                <span className="text-zinc-755 font-mono">&gt;</span>
                <span className="text-amber-500 font-semibold">{selectedListDetail.name}</span>
              </div>

              <div className="bg-zinc-950 border border-zinc-900 rounded-3xl overflow-hidden space-y-6 animate-fadeIn pb-6">
                
                {/* Board Header Banner */}
                <div className="h-48 relative overflow-hidden bg-zinc-900">
                  <img 
                    src={selectedListDetail.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=600&auto=format&fit=crop'} 
                    alt={selectedListDetail.name} 
                    className="w-full h-full object-cover blur-sm brightness-50 opacity-40 absolute inset-0"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-zinc-950 to-transparent h-32" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-between">
                    <button
                      onClick={() => setSelectedListDetail(null)}
                      className="self-start px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/10 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      &larr; Back to Library
                    </button>

                  <div className="flex justify-between items-end gap-4">
                    <div className="space-y-1.5 text-left">
                      <h3 className="text-xl md:text-2xl font-black text-white leading-none flex items-center gap-2">
                        {selectedListDetail.name}
                        {!selectedListDetail.isPublic && <Lock size={16} className="text-amber-500" />}
                      </h3>
                      <p className="text-xs text-zinc-300 max-w-xl line-clamp-2 leading-relaxed">
                        {selectedListDetail.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-455 select-none">
                        <span>by <b>@{selectedListDetail.creatorName}</b></span>
                        <span>•</span>
                        <span>Updated {selectedListDetail.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 select-none shrink-0">
                      <button
                        onClick={() => handleToggleFollowList(selectedListDetail.id)}
                        className={`px-3.5 py-1.5 border border-zinc-800 text-xs font-bold rounded-xl cursor-pointer ${
                          selectedListDetail.isFollowing
                            ? 'bg-amber-600/10 text-amber-400 border-amber-500/20'
                            : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {selectedListDetail.isFollowing ? 'Following' : 'Follow List'}
                      </button>
                      <button
                        onClick={() => handleShareList(selectedListDetail.name)}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl cursor-pointer"
                        title="Copy share link"
                      >
                        <Share2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stories within list */}
              <div className="px-6 space-y-4">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-400">
                  Stories in this List ({selectedListDetail.storyIds.length})
                </h4>

                {selectedListDetail.storyIds.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-5">
                    {selectedListDetail.storyIds.map(storyId => {
                      const book = getStoryMeta(storyId);
                      return renderBookCoverTile(book);
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-zinc-950/20 border border-zinc-900 rounded-xl text-zinc-500 italic text-xs leading-normal">
                    This reading list is currently empty.
                  </div>
                )}
              </div>
            </div>
            </div>
          )}

        </div>
      )}

      {/* 4. HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-8 animate-fadeIn text-left">
          <div className="space-y-3.5">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-[#d97706] mb-1 flex items-center gap-2">
              <Eye size={14} /> Recently Read
            </h3>
            {recentlyViewedList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                You haven't read any stories yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {recentlyViewedList.map(book => renderBookCoverTile(book, true, 'history'))}
              </div>
            )}
          </div>

          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-450 flex items-center gap-2">
              <CheckCircle size={13} /> Completed recently
            </h3>
            {recentlyFinishedList.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 italic text-sm border border-zinc-900 rounded-2xl bg-zinc-950/20">
                You haven't finished any stories recently.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
                {recentlyFinishedList.map(book => renderBookCoverTile(book, false))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================== CREATE LISTS DIALOG ==================================== */}
      {isAddingList && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setIsAddingList(false)}
        >
          <form 
            onSubmit={handleCreateListSubmit}
            className="w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-2xl p-6 space-y-4.5 relative animate-zoomIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => setIsAddingList(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1 text-left">
              <h3 className="text-base md:text-lg font-black text-white">Create a Reading List</h3>
              <p className="text-[11px] text-zinc-400">Save and share your favorite stories on dynamic visual boards.</p>
            </div>

            <div className="space-y-3.5 pt-1 text-xs text-left">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">List Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Fantasy Worlds"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 placeholder-zinc-550 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Description</label>
                <textarea 
                  rows={3}
                  placeholder="What is the central theme of this reading board?"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 placeholder-zinc-550 font-sans"
                />
              </div>

              {/* Cover Image Upload & URL input */}
              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Cover Image</label>
                <CoverImageUploader
                  coverUrl={newListCoverUrl}
                  onChange={(url) => setNewListCoverUrl(url)}
                  onRemove={() => setNewListCoverUrl('')}
                />
              </div>

              <div className="flex items-center gap-3 pt-2 select-none">
                <input 
                  type="checkbox"
                  id="make-public-check-library-new"
                  checked={newListIsPublic}
                  onChange={(e) => setNewListIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 bg-zinc-900 border-zinc-800 rounded cursor-pointer"
                />
                <label htmlFor="make-public-check-library-new" className="font-bold text-zinc-350 cursor-pointer text-xs">
                  Make Board Public (Show on discover views)
                </label>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 text-xs font-bold font-sans">
              <button 
                type="button" 
                onClick={() => setIsAddingList(false)}
                className="px-4.5 py-2.5 hover:bg-zinc-900 rounded-xl text-zinc-400 bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-450 text-white cursor-pointer active:scale-97 border-0 transition"
              >
                Create List
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
