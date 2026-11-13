import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, AlertTriangle, BookOpen, Heart, Share2, Plus, Bookmark, MessageSquare, MoreHorizontal, Check, Copy, CheckCircle2 } from 'lucide-react';
import { Story, Chapter, UserProfile, ReadingList } from '../types';
import { fetchStory, recordStoryView } from '../lib/api/stories';
import { fetchChapters, fetchChapter, fetchChapterVote, toggleChapterVote } from '../lib/api/chapters';
import { getReadingProgress, saveScrollPosition } from '../lib/readingProgress';
import { addToList, removeFromList } from '../lib/api/library';
import ChapterCommentsSection from './comments/ChapterCommentsSection';

interface ReaderChapterViewProps {
  storyId: string;
  chapterId: string;
  navigateTo: (view: string, storyId?: string, chapterId?: string, userId?: string) => void;
  currentUser: UserProfile | null;
  readingLists?: ReadingList[];
  setReadingLists?: React.Dispatch<React.SetStateAction<ReadingList[]>>;
}

export default function ReaderChapterView({ storyId, chapterId, navigateTo, currentUser, readingLists = [], setReadingLists }: ReaderChapterViewProps) {
  const [story, setStory] = useState<Story | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [allChapters, setAllChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action Bar States
  const [voteCount, setVoteCount] = useState(0);
  const [userHasVoted, setUserHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showListSelector, setShowListSelector] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const listSelectorRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (listSelectorRef.current && !listSelectorRef.current.contains(e.target as Node)) {
        setShowListSelector(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStory(storyId),
      fetchChapters(storyId),
      fetchChapter(chapterId),
      fetchChapterVote(chapterId).catch(() => ({ chapter_id: chapterId, vote_count: 0, user_has_voted: false })),
      recordStoryView(storyId, chapterId).catch(e => console.error("Failed to record view", e))
    ]).then(([s, cList, cData, voteData]) => {
      if (cancelled) return;
      setStory(s);
      
      const published = cList.filter(c => c.status === 'published');
      published.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || ((a as any).chapterNumber ?? 0) - ((b as any).chapterNumber ?? 0));
      setAllChapters(published);
      
      setChapter(cData);
      
      setVoteCount(voteData.vote_count);
      setUserHasVoted(voteData.user_has_voted);
      
      // Calculate progress percentage
      const chapterIndex = published.findIndex(c => c.id === chapterId);

      // Use Real Backend
      import('../lib/api/library').then(({ saveReadingProgress }) => {
        saveReadingProgress({
          story_id: s.id,
          chapter_id: cData.id,
          chapter_sequence: chapterIndex + 1,
          total_chapters: published.length || 1,
          progress_percent: Math.round(((chapterIndex + 1) / (published.length || 1)) * 100),
          scroll_y: 0
        }).catch(err => console.error('Failed to save progress to backend', err));
      });
      
      setLoading(false);
      
      // Restore scroll or scroll to top
      setTimeout(() => {
        const existingProgress = getReadingProgress(storyId);
        if (existingProgress && existingProgress.chapterId === chapterId && existingProgress.scrollY) {
          window.scrollTo({ top: existingProgress.scrollY, behavior: 'auto' });
        } else {
          window.scrollTo(0, 0);
        }
      }, 0);
    }).catch(err => {
      if (cancelled) return;
      console.error("Failed to load reading mode", err);
      setError("This chapter is either unpublished, doesn't exist, or you don't have access.");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [storyId, chapterId]);

  // Scroll listener for saving scroll position
  useEffect(() => {
    if (loading) return;
    
    let timeoutId: any = null;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        saveScrollPosition(storyId, window.scrollY);
      }, 500);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, storyId]);

  // --- ACTION HANDLERS ---

  const handleToggleVote = async () => {
    if (isVoting) return;
    setIsVoting(true);
    
    // Optimistic UI update
    const wasVoted = userHasVoted;
    setUserHasVoted(!wasVoted);
    setVoteCount(prev => wasVoted ? prev - 1 : prev + 1);

    try {
      const result = await toggleChapterVote(chapterId);
      setVoteCount(result.vote_count);
      setUserHasVoted(result.user_has_voted);
    } catch (err) {
      // Revert on error
      setUserHasVoted(wasVoted);
      setVoteCount(prev => wasVoted ? prev + 1 : prev - 1);
      console.error("Failed to toggle vote", err);
    } finally {
      setIsVoting(false);
    }
  };

  const handleToggleListMembership = async (listId: string) => {
    if (!setReadingLists || !readingLists) return;
    
    const targetList = readingLists.find(list => list.id === listId);
    if (!targetList) return;
    
    const hasStory = targetList.storyIds.includes(storyId);
    
    // Optimistic update
    setReadingLists(prev => prev.map(list => {
      if (list.id !== listId) return list;
      
      let newStoryIds = [...list.storyIds];
      
      if (hasStory) {
        newStoryIds = newStoryIds.filter(id => id !== storyId);
      } else {
        newStoryIds.push(storyId);
      }
      
      return { ...list, storyIds: newStoryIds, updatedAt: new Date().toISOString() };
    }));
    
    try {
      if (hasStory) {
        await removeFromList(listId, storyId);
      } else {
        await addToList(listId, storyId);
      }
    } catch (err) {
      console.error("Failed to update reading list:", err);
      // Revert optimistic update ideally
    }
  };

  const handleShare = async (type: 'story' | 'chapter') => {
    try {
      const url = new URL(window.location.href);
      if (type === 'story') {
        url.pathname = `/story/${storyId}`;
      } else {
        url.pathname = `/story/${storyId}/chapter/${chapterId}`;
      }
      await navigator.clipboard.writeText(url.toString());
      setShareFeedback(`${type === 'story' ? 'Story' : 'Chapter'} link copied`);
      setTimeout(() => setShareFeedback(null), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
      setShareFeedback("Failed to copy");
      setTimeout(() => setShareFeedback(null), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 bg-[#07090e]">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading chapter...</p>
      </div>
    );
  }

  if (error || !story || !chapter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 bg-[#07090e]">
        <AlertTriangle size={48} className="mb-4 text-amber-500/50" />
        <h2 className="text-xl font-bold text-slate-200 mb-2">Unavailable</h2>
        <p className="max-w-md text-center">{error}</p>
        <button 
          onClick={() => navigateTo('public-story', storyId)}
          className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition cursor-pointer"
        >
          Back to Story
        </button>
      </div>
    );
  }

  // Determine Prev/Next
  const currentIndex = allChapters.findIndex(c => c.id === chapterId);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex !== -1 && currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-[#07090e] font-sans pb-24">
      {/* Reader Navbar */}
      <div className="sticky top-0 z-40 bg-[#07090e]/90 backdrop-blur-md border-b border-slate-800/80 p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigateTo('public-story', storyId)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition text-sm cursor-pointer"
          >
            <ArrowLeft size={16} /> <span className="hidden sm:inline">Back to Story</span>
          </button>
          
          <div className="text-center truncate px-4 flex-1">
            <p className="text-[10px] text-violet-400 font-mono uppercase tracking-widest truncate">{story.title}</p>
            <h2 className="text-sm font-bold text-slate-200 truncate">{chapter.title || `Chapter ${(chapter as any).chapterNumber || currentIndex + 1}`}</h2>
          </div>
          
          <div className="w-20"></div> {/* Spacer for centering */}
        </div>
      </div>

      {/* Reading Content */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        <header className="mb-12 text-center space-y-4">
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <BookOpen size={20} />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-100">{chapter.title || `Chapter ${(chapter as any).chapterNumber || currentIndex + 1}`}</h1>
          <p className="text-slate-500 font-mono text-xs">By {story.author || 'Unknown'}</p>
        </header>

        <article className="prose prose-invert prose-slate max-w-none font-serif text-lg leading-relaxed text-slate-300">
          {chapter.content ? (
            chapter.content.includes('<p>') || chapter.content.includes('<br>') ? (
              <div dangerouslySetInnerHTML={{ __html: chapter.content }} />
            ) : (
              chapter.content.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? <p key={idx} className="mb-6">{paragraph}</p> : <br key={idx} />
              ))
            )
          ) : (
            <p className="text-center text-slate-500 italic">This chapter has no content.</p>
          )}
        </article>

        {/* Reader Action Bar */}
        <div className="mt-16 py-6 border-t border-b border-slate-800 flex items-center justify-between select-none">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleToggleVote}
              disabled={isVoting}
              className={`flex items-center gap-2 transition cursor-pointer group ${userHasVoted ? 'text-rose-400' : 'text-slate-400 hover:text-rose-400'} ${isVoting ? 'opacity-50' : ''}`}
            >
              <Heart size={20} className={`group-active:scale-90 transition-transform ${userHasVoted ? 'fill-rose-400' : ''}`} />
              <span className="text-sm font-semibold hidden sm:inline">
                {voteCount > 0 ? voteCount : 'Vote'}
              </span>
            </button>

            <div className="relative" ref={listSelectorRef}>
              <button 
                onClick={() => setShowListSelector(!showListSelector)}
                className="flex items-center gap-2 text-slate-400 hover:text-amber-400 transition cursor-pointer group"
              >
                <Plus size={20} className="group-active:scale-90 transition-transform" />
                <span className="text-sm font-semibold hidden sm:inline">Add to List</span>
              </button>
              {showListSelector && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-[#121620] border border-slate-700 rounded-xl shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-slate-400 uppercase">Save to...</h3>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                    {readingLists.length > 0 ? readingLists.map(list => {
                      const hasStory = list.storyIds.includes(storyId);
                      return (
                        <button
                          key={list.id}
                          onClick={() => handleToggleListMembership(list.id)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 text-left transition cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Bookmark size={14} className={hasStory ? 'text-amber-400' : 'text-slate-500'} />
                            <span className={`text-sm truncate ${hasStory ? 'text-amber-400 font-semibold' : 'text-slate-300'}`}>
                              {list.name}
                            </span>
                          </div>
                          {hasStory && <CheckCircle2 size={16} className="text-amber-400" />}
                        </button>
                      );
                    }) : (
                      <p className="text-xs text-slate-500 italic p-2">No reading lists found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={shareMenuRef}>
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 text-slate-400 hover:text-violet-400 transition cursor-pointer group"
              >
                <Share2 size={20} className="group-active:scale-90 transition-transform" />
                <span className="text-sm font-semibold hidden sm:inline">Share</span>
              </button>
              {showShareMenu && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-[#121620] border border-slate-700 rounded-xl shadow-xl z-50 p-2 space-y-1">
                  {shareFeedback ? (
                    <div className="flex items-center justify-center gap-2 p-3 text-emerald-400 text-sm font-bold bg-emerald-900/20 rounded-lg">
                      <Check size={16} /> {shareFeedback}
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleShare('chapter')}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-left text-sm"
                      >
                        <Copy size={16} /> Copy Chapter Link
                      </button>
                      <button 
                        onClick={() => handleShare('story')}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer text-left text-sm"
                      >
                        <BookOpen size={16} /> Copy Story Link
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <button className="p-2 text-slate-500 hover:text-slate-300 transition cursor-pointer rounded-full hover:bg-slate-800">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="max-w-3xl mx-auto px-6 pt-12 border-t border-slate-800/50 flex justify-between items-center gap-4">
        {prevChapter ? (
          <button 
            onClick={() => navigateTo('reader-chapter', storyId, prevChapter.id)}
            className="flex-1 flex flex-col items-start p-4 rounded-xl border border-slate-800 bg-[#0d1017] hover:border-slate-600 hover:bg-[#121620] transition group cursor-pointer text-left"
          >
            <span className="text-[10px] text-slate-500 font-mono uppercase mb-1 flex items-center gap-1 group-hover:text-slate-400 transition">
              <ChevronLeft size={12} /> Previous
            </span>
            <span className="font-bold text-slate-300 group-hover:text-violet-300 transition truncate w-full">
              {prevChapter.title || `Chapter ${(prevChapter as any).chapterNumber || currentIndex}`}
            </span>
          </button>
        ) : <div className="flex-1"></div>}

        {nextChapter ? (
          <button 
            onClick={() => navigateTo('reader-chapter', storyId, nextChapter.id)}
            className="flex-1 flex flex-col items-end p-4 rounded-xl border border-slate-800 bg-[#0d1017] hover:border-slate-600 hover:bg-[#121620] transition group cursor-pointer text-right"
          >
            <span className="text-[10px] text-slate-500 font-mono uppercase mb-1 flex items-center gap-1 group-hover:text-slate-400 transition">
              Next <ChevronRight size={12} />
            </span>
            <span className="font-bold text-slate-300 group-hover:text-violet-300 transition truncate w-full">
              {nextChapter.title || `Chapter ${(nextChapter as any).chapterNumber || currentIndex + 2}`}
            </span>
          </button>
        ) : (
          <div className="flex-1 flex flex-col items-end p-4 rounded-xl border border-slate-800/50 bg-[#0a0c12] text-right">
             <span className="text-[10px] text-slate-600 font-mono uppercase mb-1">
              End of published chapters
            </span>
            <button
              onClick={() => navigateTo('public-story', storyId)}
              className="font-bold text-slate-400 hover:text-white transition cursor-pointer"
            >
              Return to Story Details
            </button>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <ChapterCommentsSection chapterId={chapter.id} currentUser={currentUser} />
    </div>
  );
}
