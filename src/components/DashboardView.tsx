import { useState, useEffect } from 'react';
import { Story, Chapter, Character, UserProfile } from '../types';
import { PRIMARY_GENRES } from '../genresData';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit3, 
  Globe, 
  Eye, 
  Heart, 
  Sparkles, 
  Bookmark, 
  AlertTriangle,
  ArrowRight,
  Settings,
  Smile,
  Users,
  CheckCircle2,
  Tag,
  Save,
  MoreVertical,
  Calendar,
  Layers,
  FileText
} from 'lucide-react';
import CharacterView from './CharacterView';

import CoverImageUploader from './CoverImageUploader';
import StoryCoverView from './StoryCoverView';
import { uploadStoryCover, removeStoryCover } from '../lib/api/stories';
import { getStoryBibleData } from './MyStoriesView';
import ReviewQueuePanel from './ReviewQueuePanel';
import ChapterRenameModal from './ChapterRenameModal';
import { updateChapter, deleteChapter } from '../lib/api/chapters';

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

interface DashboardViewProps {
  story: Story;
  characters: Character[];
  stories: Story[];
  setView: (view: string) => void;
  setSelectedChapterId: (id: string) => void;
  onNewChapter: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  onPublishStoryToggle: (storyId: string) => void;
  onAddCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onUpdateCharacter: (character: Character) => void;
  onUpdateStory: (story: Story) => void;
  currentUser?: UserProfile | null;
  onDuplicateStory?: (storyId: string) => void;
  onArchiveStory?: (storyId: string, isArchiving: boolean) => void;
}

type DashboardTab = 'overview' | 'characters' | 'story-bible' | 'analytics' | 'settings' | 'review-queue';

export default function DashboardView({ 
  story, 
  characters,
  stories,
  setView, 
  setSelectedChapterId,
  onNewChapter,
  onDeleteStory,
  onPublishStoryToggle,
  onAddCharacter,
  onDeleteCharacter,
  onUpdateCharacter,
  onUpdateStory,
  currentUser,
  onDuplicateStory,
  onArchiveStory
}: DashboardViewProps) {
  
  const isOwner = currentUser ? (story.authorId === currentUser.id) : true;
  
  // Follow/Subscription/Bookmark local helper states for reader view of dashboard
  const [isFollowed, setIsFollowed] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [chapterFilter, setChapterFilter] = useState<'all' | 'draft' | 'published' | 'pinned'>('all');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showStoryMenu, setShowStoryMenu] = useState(false);

  // Chapter rename modal state
  const [renamingChapter, setRenamingChapter] = useState<{ id: string; title: string; sequence: number } | null>(null);
  // Chapter delete confirm state
  const [deletingChapterId, setDeletingChapterId] = useState<string | null>(null);
  const [isDeletingChapter, setIsDeletingChapter] = useState(false);
  const deletingChapter = deletingChapterId ? story.chapters.find(c => c.id === deletingChapterId) : null;

  // New Sub-Category state inside Story Notes ('story-bible' tab)
  const [selectedNoteSection, setSelectedNoteSection] = useState<'characters' | 'world_notes' | 'timeline' | 'research' | 'ideas'>('world_notes');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteEditText, setNoteEditText] = useState('');
  const [showNoteSavedAlert, setShowNoteSavedAlert] = useState(false);

  // Chapter handlers
  const handlePublishChapter = async (chapId: string) => {
    try {
      await updateChapter(chapId, { status: 'published' });
      const updatedChapters = story.chapters.map(c => {
        if (c.id === chapId) {
          return { ...c, status: 'published' as const };
        }
        return c;
      });
      onUpdateStory({
        ...story,
        chapters: updatedChapters
      });
    } catch (err) {
      console.error("Failed to publish chapter:", err);
      alert("Failed to publish chapter.");
    }
  };

  const handleUnpublishChapter = async (chapId: string) => {
    try {
      await updateChapter(chapId, { status: 'draft' });
      const updatedChapters = story.chapters.map(c => {
        if (c.id === chapId) {
          return { ...c, status: 'draft' as const };
        }
        return c;
      });
      onUpdateStory({
        ...story,
        chapters: updatedChapters
      });
    } catch (err) {
      console.error("Failed to unpublish chapter:", err);
      alert("Failed to unpublish chapter.");
    }
  };

  const handleRenameChapter = (chapId: string, newTitle: string) => {
    const updatedChapters = story.chapters.map(c =>
      c.id === chapId ? { ...c, title: newTitle } : c
    );
    onUpdateStory({ ...story, chapters: updatedChapters });
  };

  const handleDuplicateChapter = (chapId: string) => {
    const chapter = story.chapters.find(c => c.id === chapId);
    if (!chapter) return;
    
    const newId = `chap-dup-${Math.random().toString(36).substring(2, 9)}`;
    const duplicatedChapter: Chapter = {
      ...chapter,
      id: newId,
      title: `${chapter.title} (Copy)`,
      sequence: Math.max(...story.chapters.map(c => c.sequence), 0) + 1,
      lastSaved: new Date().toISOString(),
      isPinned: false
    };
    
    onUpdateStory({
      ...story,
      chapters: [...story.chapters, duplicatedChapter]
    });
  };

  const handleDeleteChapter = (chapId: string) => {
    setDeletingChapterId(chapId);
  };

  const confirmDeleteChapter = async () => {
    if (!deletingChapterId || isDeletingChapter) return;
    setIsDeletingChapter(true);
    try {
      await deleteChapter(deletingChapterId);
      
      const updatedChapters = story.chapters.filter(c => c.id !== deletingChapterId);
      onUpdateStory({ ...story, chapters: updatedChapters });
      
      if (pinnedChapterIds.includes(deletingChapterId)) {
        const next = pinnedChapterIds.filter(id => id !== deletingChapterId);
        setPinnedChapterIds(next);
        localStorage.setItem(`fictself_pinned_chapters_${story.id}`, JSON.stringify(next));
      }
    } catch (err) {
      console.error("Failed to delete chapter:", err);
      alert("Failed to delete chapter.");
    } finally {
      setDeletingChapterId(null);
      setIsDeletingChapter(false);
    }
  };

  const [pinnedChapterIds, setPinnedChapterIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(`fictself_pinned_chapters_${story.id}`);
      if (stored) return JSON.parse(stored);
      return story.chapters.filter(c => c.isPinned).map(c => c.id);
    } catch (e) {
      return story.chapters.filter(c => c.isPinned).map(c => c.id);
    }
  });

  const handleTogglePinChapter = (chapId: string) => {
    const next = pinnedChapterIds.includes(chapId)
      ? pinnedChapterIds.filter(s => s !== chapId)
      : [...pinnedChapterIds, chapId];
    setPinnedChapterIds(next);
    localStorage.setItem(`fictself_pinned_chapters_${story.id}`, JSON.stringify(next));
  };

  /** Swap sequence numbers for adjacent chapters and persist both */
  const handleReorderChapter = async (chapId: string, direction: 'up' | 'down') => {
    const sorted = [...story.chapters]
      .filter(c => c.id !== 'chap-bible')
      .sort((a, b) => a.sequence - b.sequence);
    const idx = sorted.findIndex(c => c.id === chapId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const thisChap = sorted[idx];
    const swapChap = sorted[swapIdx];
    const newSeqThis = swapChap.sequence;
    const newSeqSwap = thisChap.sequence;

    // Optimistic UI update
    const updatedChapters = story.chapters.map(c => {
      if (c.id === thisChap.id) return { ...c, sequence: newSeqThis };
      if (c.id === swapChap.id) return { ...c, sequence: newSeqSwap };
      return c;
    });
    onUpdateStory({ ...story, chapters: updatedChapters });

    // Persist both to backend
    try {
      await Promise.all([
        updateChapter(thisChap.id, { sequence: newSeqThis }),
        updateChapter(swapChap.id, { sequence: newSeqSwap }),
      ]);
    } catch (err) {
      console.error('Failed to persist chapter reorder:', err);
    }
  };

  // Convert old bible structure key mapping — unified to match MyStoriesView's getStoryBibleData schema
  const getBibleKeyForSection = (sec: typeof selectedNoteSection) => {
    switch (sec) {
      case 'world_notes':  return 'worldBuilding';
      case 'timeline':     return 'timeline';
      case 'research':     return 'lore';
      case 'ideas':        return 'relationships';
      case 'locations':    return 'locations';
      case 'rules':        return 'rules';
      default:             return 'worldBuilding';
    }
  };

  useEffect(() => {
    if (story && selectedNoteSection !== 'characters') {
      const bible = getStoryBibleData(story);
      const key = getBibleKeyForSection(selectedNoteSection);
      setNoteEditText(bible[key] || '');
    }
  }, [selectedNoteSection, story]);

  const handleSaveNoteSection = () => {
    const currentBible = getStoryBibleData(story);
    const key = getBibleKeyForSection(selectedNoteSection);
    const updatedBible = {
      ...currentBible,
      [key]: noteEditText
    };
    
    onUpdateStory({
      ...story,
      characterBible: JSON.stringify(updatedBible)
    });
    setIsEditingNote(false);
    setShowNoteSavedAlert(true);
    setTimeout(() => setShowNoteSavedAlert(false), 2500);
  };

  // Settings editable values
  const [editTitle, setEditTitle] = useState(story.title);
  const [editTagline, setEditTagline] = useState(story.tagline || '');
  const [editDesc, setEditDesc] = useState(story.description);
  const [editGenre, setEditGenre] = useState(story.genre);
  const [editLanguage, setEditLanguage] = useState(story.language || 'English');
  const [editTags, setEditTags] = useState(story.tags.join(', '));

  const parsedEditGenreParts = editGenre ? editGenre.split(' / ') : ['Fantasy', 'Epic Fantasy'];
  const editPrimaryGenre = parsedEditGenreParts[0] || 'Fantasy';
  const editSubgenre = parsedEditGenreParts[1] || '';
  const currentPrimaryDef = PRIMARY_GENRES.find(g => g.name === editPrimaryGenre) || PRIMARY_GENRES[0];
  const editGenresSubgenres = currentPrimaryDef.subgenres;

  const handlePrimaryGenreChange = (newPrimary: string) => {
    const def = PRIMARY_GENRES.find(g => g.name === newPrimary);
    const newSub = (def && def.subgenres.length > 0) ? def.subgenres[0] : '';
    const finalVal = newSub ? `${newPrimary} / ${newSub}` : newPrimary;
    setEditGenre(finalVal);
    onUpdateStory({ ...story, genre: finalVal });
  };

  const handleSubgenreChange = (newSub: string) => {
    const finalVal = newSub ? `${editPrimaryGenre} / ${newSub}` : editPrimaryGenre;
    setEditGenre(finalVal);
    onUpdateStory({ ...story, genre: finalVal });
  };

  useEffect(() => {
    setEditTitle(story.title);
    setEditTagline(story.tagline || '');
    setEditDesc(story.description);
    setEditGenre(story.genre);
    setEditLanguage(story.language || 'English');
    setEditTags(story.tags.join(', '));
  }, [story]);

  const handleOpenChapter = (chapId: string, mode: 'view' | 'edit' = 'edit') => {
    // Remember the last opened chapter for this story so "Continue Writing" can restore it
    localStorage.setItem(`fictself_last_chapter_${story.id}`, chapId);
    setSelectedChapterId(chapId);
    if (isOwner) {
      setView(mode === 'view' ? 'chapter-preview' : 'writing-studio');
    } else {
      setView('story-reader');
    }
  };

  const storyChapters = story.chapters.filter(c => c.id !== 'chap-bible');
  const storyCharactersCount = characters.filter(c => c.storyId === story.id).length;

  // Render navigation tab switches
  const navTabs = [
    { id: 'overview' as const, label: 'Write' },
    { id: 'characters' as const, label: 'Characters' },
    { id: 'story-bible' as const, label: 'Story Notes' },
    { id: 'review-queue' as const, label: 'Review Queue' },
    { id: 'analytics' as const, label: 'Story Activity' },
    { id: 'settings' as const, label: 'Settings' }
  ].filter(tab => isOwner || (tab.id === 'overview' || tab.id === 'characters'));

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 select-none text-left font-sans" id="fictself-story-dashboard-view">
      
      {/* Top Back Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 select-none pb-1">
        <button 
          onClick={() => setView('my-stories')}
          className="hover:text-white text-slate-400 transition cursor-pointer font-bold flex items-center gap-1.5"
          id="back-to-my-stories"
        >
          &larr; Back to My Stories
        </button>
        <span className="text-slate-700">|</span>
        <button 
          onClick={() => setView('my-stories')}
          className="hover:text-blue-400 text-slate-500 transition cursor-pointer"
        >
          My Stories
        </button>
        <span className="text-slate-700 font-mono">&gt;</span>
        <span className="text-slate-300 font-semibold truncate max-w-[150px] sm:max-w-xs">{story.title}</span>
      </div>

      {/* Top Header - Pure Brand */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1a1a1a] pb-3 gap-4 shrink-0">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-0.5">
            Story Overview
          </span>
          <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
            📖 {story.title}
          </h1>
        </div>

        {/* Simplified Navigation System */}
        <div className="flex shrink-0 gap-1 overflow-x-auto pb-1 md:pb-0" id="story-dashboard-tabs-row">
          {navTabs.map((tab) => {
            const countLabel = 
              tab.id === 'overview' ? `(${storyChapters.length})` :
              tab.id === 'characters' ? `(${storyCharactersCount})` : '';

            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsEditingNote(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20'
                    : 'text-slate-450 hover:text-slate-200 border border-transparent'
                }`}
                id={`dashboard-tab-${tab.id}`}
              >
                {tab.label} {countLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* TAB: WRITE (OVERVIEW) */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in" id="dashboard-tab-write-content">
          
          {/* Elegant Simplified Story Header: Minimal, clean, focused */}
          <div className="bg-[#0b0c10] border border-slate-850 rounded-2xl p-6 md:p-8 space-y-4 shadow-sm relative overflow-visible" id="story-narrative-header">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2.5">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                  {story.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-medium">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/15 text-[10px] font-mono tracking-wide">
                    {story.genre}
                  </span>
                  <span className="text-slate-700">•</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/15 text-[10px] font-mono tracking-wide">
                    {story.status || 'Ongoing'}
                  </span>
                  <span className="text-slate-700">•</span>
                  <span className="text-slate-300">{storyChapters.length} Chapters</span>
                  <span className="text-slate-700">•</span>
                  <span className="text-slate-400">
                    Last edited: <span className="font-semibold text-slate-300">{story.lastUpdated ? new Date(story.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
                  </span>
                </div>
              </div>

              {/* Action buttons with 3-dot story system */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    // Restore last-opened chapter for this story; fall back to last in list
                    const lastChapId = localStorage.getItem(`fictself_last_chapter_${story.id}`);
                    const target = lastChapId
                      ? storyChapters.find(c => c.id === lastChapId)
                      : storyChapters[storyChapters.length - 1] || storyChapters[0];
                    if (target) {
                      handleOpenChapter(target.id);
                    } else if (isOwner) {
                      onNewChapter(story.id);
                    }
                  }}
                  className="px-4.5 py-2.5 bg-blue-650 hover:bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow transition duration-150 cursor-pointer flex items-center gap-1.5 text-center active:scale-95"
                  id="header-continue-writing-btn"
                >
                  <Edit3 size={13} />
                  Continue Writing
                </button>

                {/* 3-Dot Story Tool Menu */}
                {isOwner && (
                  <div className="relative">
                    <button
                      onClick={() => setShowStoryMenu(!showStoryMenu)}
                      className="p-2.5 bg-slate-900 border border-slate-850 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                      title="Story settings menu"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {showStoryMenu && (
                      <>
                        <div className="fixed inset-0 z-45" onClick={() => setShowStoryMenu(false)} />
                        <div className="absolute right-0 mt-1.5 w-48 bg-[#0f1013] border border-slate-850 rounded-xl shadow-2xl py-1.5 z-50 text-left animate-fade-in font-sans">
                          
                          <button
                            onClick={() => {
                              onPublishStoryToggle(story.id);
                              setShowStoryMenu(false);
                            }}
                            className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <span>{story.isPublished ? 'Revert to Draft' : 'Publish Story'}</span>
                          </button>

                          <button
                            onClick={() => {
                              if (onDuplicateStory) {
                                onDuplicateStory(story.id);
                              } else {
                                alert("Duplication complete! Ready on stories overview.");
                              }
                              setShowStoryMenu(false);
                            }}
                            className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <span>Duplicate Story</span>
                          </button>

                          <button
                            onClick={() => {
                              if (onArchiveStory) {
                                onArchiveStory(story.id, true);
                              } else if (onUpdateStory) {
                                onUpdateStory({ ...story, status: 'Archived' });
                              }
                              setShowStoryMenu(false);
                            }}
                            className="w-full text-left px-4 py-1.5 hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <span>Archive Story</span>
                          </button>

                          <div className="border-t border-slate-850/60 my-1" />

                          <button
                            onClick={() => {
                              if (confirm("Are you sure you want to permanently delete this story? This cannot be undone.")) {
                                onDeleteStory(story.id);
                              }
                              setShowStoryMenu(false);
                            }}
                            className="w-full text-left px-4 py-1.5 hover:bg-rose-500/10 text-xs text-rose-450 hover:text-rose-400 transition flex items-center gap-2 cursor-pointer font-bold"
                          >
                            <span>Delete Story</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chapters section: Immediately following headers */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-850 pb-2">
              <div className="flex items-center gap-2 select-none">
                <span className="text-sm">📂</span>
                <h3 className="text-xs font-bold text-slate-350 uppercase tracking-widest font-mono">
                  Story Chapters
                </h3>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Chapters Filter Pills */}
                <div className="flex gap-1 overflow-x-auto max-w-full select-none" id="chapter-filters-row">
                  {[
                    { id: 'all', label: 'All', count: storyChapters.length },
                    { id: 'draft', label: 'Drafts', count: storyChapters.filter(c => c.status === 'draft').length },
                    { id: 'published', label: 'Published', count: storyChapters.filter(c => c.status === 'published').length },
                    { id: 'pinned', label: 'Pinned', count: storyChapters.filter(c => pinnedChapterIds.includes(c.id)).length }
                  ].map(filter => {
                    const isActive = chapterFilter === filter.id;
                    if (!isOwner && (filter.id === 'draft' || filter.id === 'pinned')) return null;

                    return (
                      <button
                        key={filter.id}
                        onClick={() => setChapterFilter(filter.id as any)}
                        className={`py-1 px-2.5 text-xs font-bold transition-all relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap rounded-lg ${
                          isActive 
                            ? 'text-white bg-blue-600/90 shadow' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                        }`}
                      >
                        <span>{filter.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.1 rounded-full ${
                          isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-450'
                        }`}>
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Create Chapter button */}
                {isOwner && (
                  <button 
                    onClick={() => onNewChapter(story.id)}
                    className="flex items-center justify-center gap-1 py-1.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow cursor-pointer active:scale-95 whitespace-nowrap"
                    id="inline-create-chapter-btn"
                  >
                    <Plus size={13} />
                    New Chapter
                  </button>
                )}
              </div>
            </div>

            {/* Chapters Grid list */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="chapters-write-grid">
              {storyChapters
                .filter(c => {
                  if (!isOwner && c.status !== 'published') return false;
                  if (chapterFilter === 'draft') return c.status === 'draft';
                  if (chapterFilter === 'published') return c.status === 'published';
                  if (chapterFilter === 'pinned') return pinnedChapterIds.includes(c.id);
                  return true;
                })
                .sort((a,b) => a.sequence - b.sequence)
                .map((chap) => {
                  const isPinned = pinnedChapterIds.includes(chap.id);
                  
                  return (
                    <div 
                      key={chap.id} 
                      className="bg-[#0b0c10] border border-slate-850 hover:border-slate-800 rounded-xl p-5 flex flex-col justify-between gap-4 relative group transition shadow-sm hover:shadow"
                      id={`chapter-card-${chap.id}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-extrabold text-blue-400 tracking-wider">
                            Chapter {chap.sequence}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono border ${
                              chap.status === 'published' 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {chap.status === 'published' ? 'Published' : 'Draft'}
                            </span>
                            
                            {/* Chapter 3-Dot Actions */}
                            {isOwner && (
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(activeMenuId === chap.id ? null : chap.id);
                                  }}
                                  className="p-1 rounded hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                                  title="Actions"
                                >
                                  <MoreVertical size={13} />
                                </button>

                                {activeMenuId === chap.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-30" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(null);
                                      }}
                                    />
                                    <div className="absolute right-0 mt-1 w-40 bg-[#0f1013] border border-slate-850 rounded-xl shadow-2xl py-1 z-40 text-left font-sans animate-fade-in text-[11px]">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleTogglePinChapter(chap.id);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                                      >
                                        <span>{isPinned ? 'Unpin Reference' : 'Pin Reference'}</span>
                                      </button>
                                      
                                      {chap.status === 'published' ? (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleUnpublishChapter(chap.id);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                                        >
                                          <span>Revert to Draft</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handlePublishChapter(chap.id);
                                            setActiveMenuId(null);
                                          }}
                                          className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                                        >
                                          <span>Publish Chapter</span>
                                        </button>
                                      )}

                        <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRenamingChapter({ id: chap.id, title: chap.title, sequence: chap.sequence });
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                                      >
                                        <span>Rename Chapter</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDuplicateChapter(chap.id);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-bold"
                                      >
                                        <span>Duplicate Chapter</span>
                                      </button>

                                      <div className="border-t border-slate-800/60 my-1" />

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteChapter(chap.id);
                                          setActiveMenuId(null);
                                        }}
                                        className="w-full text-left px-3.5 py-1.5 hover:bg-rose-500/10 text-rose-450 hover:text-rose-400 transition flex items-center gap-2 cursor-pointer font-bold"
                                      >
                                        <span>Delete Chapter</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <h4 className="font-extrabold text-[#f3f4f6] text-sm tracking-tight mb-1.5 group-hover:text-blue-400 transition-colors">
                          {chap.title}
                        </h4>
                        <p className="text-xs text-slate-450 leading-relaxed line-clamp-2">
                          {chap.summary || 'No summary yet.'}
                        </p>
                      </div>

                      <div className="border-t border-slate-850 pt-3 flex items-center justify-between mt-auto">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            {chap.wordCount.toLocaleString()} words
                          </span>
                          {chap.lastSaved && (
                            <span className="text-[9px] font-mono text-slate-600">
                              Edited {new Date(chap.lastSaved).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 z-10">
                          {/* Reorder arrows */}
                          {isOwner && (
                            <div className="flex flex-col gap-0.5 mr-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReorderChapter(chap.id, 'up'); }}
                                className="p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                                title="Move chapter up"
                              >
                                ▲
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReorderChapter(chap.id, 'down'); }}
                                className="p-0.5 rounded text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                                title="Move chapter down"
                              >
                                ▼
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleOpenChapter(chap.id, 'view')}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                          >
                            View
                          </button>
                          {isOwner && (
                            <button
                              onClick={() => handleOpenChapter(chap.id, 'edit')}
                              className="px-3.5 py-1 bg-blue-600/10 hover:bg-blue-600 hover:text-white text-blue-300 border border-blue-500/15 text-[11px] font-bold rounded-lg transition cursor-pointer"
                            >
                              Write
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

              {storyChapters.filter(c => {
                if (chapterFilter === 'draft') return c.status === 'draft';
                if (chapterFilter === 'published') return c.status === 'published';
                if (chapterFilter === 'pinned') return pinnedChapterIds.includes(c.id);
                return true;
              }).length === 0 && (
                <div className="col-span-1 md:col-span-2 py-8 text-center text-slate-500 text-xs italic bg-[#08090d] border border-dashed border-slate-850 rounded-xl">
                  No chapters found matching filter criteria. Get started by writing a new chapter outline!
                </div>
              )}
            </div>
          </div>


        </div>
      )}

      {/* TAB: CHARACTERS (Crucial story ownership container) */}
      {activeTab === 'characters' && (
        <div className="animate-fade-in bg-transparent" id="dashboard-tab-characters-content">
          <CharacterView 
            characters={characters}
            stories={stories}
            initialSelectedStoryId={story.id}
            hideStorySelector={true}
            onAddCharacter={onAddCharacter}
            onDeleteCharacter={onDeleteCharacter}
            onUpdateCharacter={onUpdateCharacter}
          />
        </div>
      )}

      {/* TAB: STORY NOTES (Formerly Story Bible) */}
      {activeTab === 'story-bible' && (
        <div className="space-y-6 animate-fade-in" id="dashboard-tab-story-notes-content">
          <div className="border-b border-[#111] pb-3 text-left">
            <h3 className="font-extrabold text-[#f3f4f6] text-base">Story Notes</h3>
            <p className="text-xs text-slate-450">Capture your world rules, chronological progression indexes, character sheets, and brainstorming references.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start font-sans">
            
            {/* Sidebar list of 5 note categories */}
            <div className="lg:col-span-4 bg-[#0b0c10] border border-slate-850 rounded-xl p-3 space-y-1">
              {[
                { id: 'world_notes' as const, label: 'World Notes', desc: 'Rules, setting descriptions, systems', emoji: '🌍' },
                { id: 'timeline' as const, label: 'Timeline', desc: 'Chronology, story outline, acts', emoji: '⏳' },
                { id: 'characters' as const, label: 'Character Profiles', desc: 'Active story entity profiles', emoji: '👤' },
                { id: 'research' as const, label: 'Research', desc: 'Historical files, reference material', emoji: '📚' },
                { id: 'ideas' as const, label: 'Ideas', desc: 'Ideation sandbox and logs', emoji: '💡' }
              ].map(sec => {
                const isActive = selectedNoteSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setSelectedNoteSection(sec.id);
                      setIsEditingNote(false);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg transition duration-150 flex items-start gap-3 select-none cursor-pointer ${
                      isActive
                        ? 'bg-blue-600/15 border border-blue-500/25 text-blue-300'
                        : 'hover:bg-slate-900/60 text-slate-400 border border-transparent'
                    }`}
                  >
                    <span className="text-base mt-0.5 shrink-0 select-none">{sec.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-extrabold ${isActive ? 'text-[#f3f4f6]' : 'text-slate-300'}`}>{sec.label}</div>
                      <div className="text-[10px] text-slate-500 truncate mt-0.5">{sec.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Note Editor Canvas Area */}
            <div className="lg:col-span-8 bg-[#0b0c10] border border-slate-850 rounded-xl p-5 flex flex-col justify-between min-h-[380px]" id="story-notes-detail-pane">
              
              {/* If "Character Profiles" sub-tab is chosen */}
              {selectedNoteSection === 'characters' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#111] pb-3">
                    <div>
                      <h4 className="text-[#f3f4f6] font-extrabold text-sm capitalize">Character Profiles</h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Story Reference Archive</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('characters')}
                      className="px-3 py-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 border border-slate-800 hover:border-slate-700 bg-slate-900 rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      Manage Characters &rarr;
                    </button>
                  </div>

                  {characters.filter(c => c.storyId === story.id).length === 0 ? (
                    <div className="py-12 text-center text-slate-520 italic text-xs leading-normal font-sans">
                      No character profiles are created for this story yet. Add characters in the main Characters tab.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto pr-1">
                      {characters
                        .filter(c => c.storyId === story.id)
                        .map(char => (
                          <div 
                            key={char.id} 
                            onClick={() => setActiveTab('characters')}
                            className="p-3 bg-slate-905 border border-slate-850/80 hover:border-slate-800 rounded-xl cursor-pointer transition flex items-center gap-3"
                          >
                            <img 
                              src={char.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${char.name}`} 
                              alt={char.name}
                              className="w-10 h-10 rounded-lg bg-slate-900 object-cover shrink-0"
                            />
                            <div className="min-w-0">
                              <h5 className="font-extrabold text-xs text-white truncate">{char.name}</h5>
                              <p className="text-[10px] text-blue-400 font-mono tracking-wider font-semibold">{char.role || 'Supporting Node'}</p>
                              <p className="text-[10px] text-slate-450 line-clamp-1 mt-0.5">{char.background || 'Core character outline.'}</p>
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Markdown/Text Editor Section */
                <div className="flex flex-col h-full flex-grow">
                  <div className="flex items-center justify-between border-b border-[#111] pb-3 gap-2">
                    <div className="space-y-0.5">
                      <h4 className="text-[#f3f4f6] font-extrabold text-sm capitalize">
                        {selectedNoteSection.replace('_', ' ')}
                      </h4>
                      <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wide">Story Notes reference</p>
                    </div>
                    
                    {isOwner && !isEditingNote && (
                      <button
                        onClick={() => {
                          setIsEditingNote(true);
                          const bible = getStoryBibleData(story);
                          const key = getBibleKeyForSection(selectedNoteSection);
                          setNoteEditText(bible[key] || '');
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-850 hover:border-slate-8e0 text-slate-205 text-xs font-bold transition hover:bg-slate-800 hover:text-white cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 size={11} /> Edit Notes
                      </button>
                    )}
                  </div>

                  {showNoteSavedAlert && (
                    <div className="mt-3 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/10 text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 size={12} />
                      <span>Story notes updated flawlessly.</span>
                    </div>
                  )}

                  {/* Main text container */}
                  <div className="mt-4 flex-grow flex flex-col">
                    {isEditingNote ? (
                      <div className="space-y-2 flex-grow flex flex-col">
                        <textarea
                          rows={11}
                          value={noteEditText}
                          onChange={(e) => setNoteEditText(e.target.value)}
                          className="w-full flex-grow bg-[#101115] border border-slate-850 focus:border-blue-500 rounded-xl p-4 text-xs text-slate-200 outline-none font-sans leading-relaxed resize-none"
                          placeholder="Write reference notes, world designs, or rules..."
                        />
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap leading-relaxed text-xs font-sans text-slate-350 bg-slate-950/40 rounded-xl p-4 border border-slate-855 min-h-[220px]">
                        {getStoryBibleData(story)[getBibleKeyForSection(selectedNoteSection)] || (
                          <p className="italic text-slate-500 font-sans">No notes written for this category. Click 'Edit Notes' to establish outlines.</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons overlay */}
                  {isEditingNote && (
                    <div className="flex justify-end gap-2.5 pt-4 mt-4 border-t border-[#111]">
                      <button
                        onClick={() => setIsEditingNote(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNoteSection}
                        className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow transition cursor-pointer flex items-center gap-1"
                      >
                        <Save size={12} />
                        Save Notes
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: STORY ACTIVITY (Formerly analytics) */}
      {activeTab === 'analytics' && (
        <div className="space-y-5 animate-fade-in text-left" id="dashboard-tab-activity-content">
          <div>
            <h3 className="font-extrabold text-[#f3f4f6] text-base">Story Activity</h3>
            <p className="text-xs text-slate-450">Reader engagement metrics will appear here once your story is published and readers interact with it.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4 space-y-1 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">Reads</span>
              <span className="text-lg font-black text-white font-mono block">{story.views > 0 ? story.views.toLocaleString() : '—'}</span>
            </div>

            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4 space-y-1 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">Likes</span>
              <span className="text-lg font-black text-blue-400 font-mono block">{story.likes > 0 ? story.likes.toLocaleString() : '—'}</span>
            </div>

            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4 space-y-1 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">Comments</span>
              <span className="text-lg font-black text-emerald-450 font-mono block">—</span>
            </div>

            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4 space-y-1 shadow">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-extrabold block">Bookmarks</span>
              <span className="text-lg font-black text-indigo-400 font-mono block">{story.favorites > 0 ? story.favorites.toLocaleString() : '—'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reader reviews */}
            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4.5 space-y-3.5">
              <h4 className="font-extrabold text-[#f3f4f6] text-xs uppercase tracking-wide border-b border-slate-855 pb-2">
                💬 Reader Reviews
              </h4>
              <div className="py-8 text-center text-slate-500 text-xs italic leading-relaxed">
                Reader reviews will appear here once your story is published and readers leave feedback.
              </div>
            </div>

            {/* Chapter word count breakdown */}
            <div className="bg-[#0b0c10] border border-slate-850 rounded-xl p-4.5 space-y-3.5">
              <h4 className="font-extrabold text-[#f3f4f6] text-xs uppercase tracking-wide border-b border-slate-855 pb-2">
                📝 Chapter Word Counts
              </h4>
              {storyChapters.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-xs italic">No chapters written yet.</div>
              ) : (
                <div className="space-y-3">
                  {storyChapters.slice(0, 5).map((c, idx) => (
                    <div key={c.id} className="p-3 rounded-lg bg-black/20 border border-slate-855 flex justify-between items-center text-xs">
                      <div>
                        <h5 className="font-extrabold text-[#f3f4f6] truncate max-w-[140px]">
                          Ch {c.sequence} — {c.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {c.status === 'published' ? '✅ Published' : '📝 Draft'}
                        </p>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400 font-bold">
                        {c.wordCount > 0 ? `${c.wordCount.toLocaleString()} w` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: REVIEW QUEUE */}
      {activeTab === 'review-queue' && (
        <div className="animate-fade-in space-y-4" id="dashboard-tab-review-queue-content">
          <ReviewQueuePanel
            storyId={story.id}
            characters={characters.filter(c => c.storyId === story.id)}
            chapters={story.chapters}
          />
        </div>
      )}

      {/* TAB: SETTINGS (Editable sandbox attributes) */}
      {activeTab === 'settings' && (
        <div className="bg-[#0b0c10] border border-slate-850 rounded-2xl p-6 space-y-6 animate-fade-in" id="dashboard-tab-settings-content">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1c1c1c] pb-4 gap-2">
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                <Settings size={16} className="text-blue-400" />
                Customize Narrative Details
              </h3>
              <p className="text-xs text-slate-450">Review visual covers, titles, taglines, or narrative tags. Changes save instantly.</p>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold animate-pulse self-start sm:self-auto">
              <CheckCircle2 size={10} />
              Auto-saved
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
            <div className="lg:col-span-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Story Title *</label>
                  <input 
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditTitle(val);
                      if (val.trim()) {
                        onUpdateStory({ ...story, title: val.trim() });
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-blue-500 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Story Tagline</label>
                  <input 
                    type="text"
                    value={editTagline}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditTagline(val);
                      onUpdateStory({ ...story, tagline: val.trim() });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 hover:border-slate-700 focus:border-blue-500 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Primary Genre</label>
                  <select 
                    value={editPrimaryGenre}
                    onChange={(e) => handlePrimaryGenreChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  >
                    {PRIMARY_GENRES.map(g => (
                      <option key={g.name} value={g.name}>{g.emoji} {g.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Subgenre</label>
                  <select 
                    value={editSubgenre}
                    onChange={(e) => handleSubgenreChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  >
                    {editGenresSubgenres.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Language</label>
                  <input 
                    type="text"
                    required
                    value={editLanguage}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditLanguage(val);
                      onUpdateStory({ ...story, language: val.trim() });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">Status</label>
                  <select 
                    value={story.status || 'Ongoing'}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      onUpdateStory({ ...story, status: val });
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  >
                    <option value="Ongoing">🟢 Ongoing</option>
                    <option value="On Hold">🟡 On Hold</option>
                    <option value="Planned">🔵 Planned</option>
                    <option value="Draft">⚫ Draft</option>
                    <option value="Completed">🏁 Completed</option>
                    <option value="Archived">📦 Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">Published</label>
                  <select 
                    value={story.isPublished ? 'published' : 'draft'}
                    onChange={() => onPublishStoryToggle(story.id)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  >
                    <option value="draft">Draft Outlines Only</option>
                    <option value="published">Published / Public</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono block">Tags</label>
                <input 
                  type="text"
                  value={editTags}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditTags(val);
                    const parsed = val.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 10);
                    onUpdateStory({ ...story, tags: parsed });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 py-2 px-3 rounded-xl text-xs outline-none focus:border-blue-500"
                  placeholder="Crime, Adventure, Sci-Fi"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-455 uppercase tracking-widest font-mono">Premise Synopsis</label>
                <textarea 
                  rows={4}
                  required
                  value={editDesc}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditDesc(val);
                    onUpdateStory({ ...story, description: val.trim() });
                  }}
                  className="w-full bg-slate-900 border border-slate-800 text-slate-300 p-3 rounded-xl text-xs outline-none resize-none"
                />
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4">
              <div className="p-4 bg-[#08090d] border border-slate-850 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-mono font-bold tracking-widest text-slate-500 uppercase text-center">
                  Story Cover Preview
                </h4>
                
                <div className="max-w-[140px] mx-auto shadow-lg rounded-xl overflow-hidden border border-slate-800">
                  <StoryCoverView 
                    coverUrl={story.coverUrl || undefined} 
                    title={story.title} 
                    genre={story.genre} 
                    subgenre={story.subgenre}
                    author={story.author || 'Unknown'} 
                  />
                </div>

                <CoverImageUploader
                  coverUrl={story.coverUrl}
                  onChange={(newUrl) => onUpdateStory({ ...story, coverUrl: newUrl })}
                  onRemove={async () => {
                    if (story.coverUrl) {
                      try {
                        const tempStory = await removeStoryCover(story.id);
                        onUpdateStory({ ...story, coverUrl: tempStory.coverUrl });
                      } catch(e) { console.error(e); }
                    } else {
                      onUpdateStory({ ...story, coverUrl: '' });
                    }
                  }}
                  onFileSelect={async (file) => {
                    try {
                      const tempStory = await uploadStoryCover(story.id, file);
                      onUpdateStory({ ...story, coverUrl: tempStory.coverUrl });
                    } catch(e) { console.error(e); }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CHAPTER RENAME MODAL */}
      {renamingChapter && (
        <ChapterRenameModal
          isOpen={true}
          currentTitle={renamingChapter.title}
          chapterNumber={renamingChapter.sequence}
          onRename={(newTitle) => handleRenameChapter(renamingChapter.id, newTitle)}
          onClose={() => setRenamingChapter(null)}
        />
      )}

      {/* DELETE CHAPTER CONFIRM MODAL */}
      {deletingChapter && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-fade-in"
          onClick={() => setDeletingChapterId(null)}
          id="delete-chapter-modal-overlay"
        >
          <div
            className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl shrink-0">🗑️</span>
                <div>
                  <h3 className="text-sm font-extrabold text-white mb-1">Delete Chapter?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Are you sure you want to permanently delete{' '}
                    <span className="font-bold text-slate-200">"{deletingChapter.title}"</span>?
                    This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-1 border-t border-slate-800">
                <button
                  onClick={() => setDeletingChapterId(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteChapter}
                  disabled={isDeletingChapter}
                  className={`px-5 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 transition ${
                    isDeletingChapter 
                      ? 'bg-rose-600/50 cursor-not-allowed' 
                      : 'bg-rose-600 hover:bg-rose-500 cursor-pointer active:scale-95'
                  }`}
                  id="confirm-delete-chapter-btn"
                >
                  {isDeletingChapter ? 'Deleting...' : 'Delete Chapter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
