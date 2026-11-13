import React, { useState, useEffect } from 'react';
import { BookOpen, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Story, Chapter } from '../types';
import { fetchStory, recordStoryView } from '../lib/api/stories';
import { fetchChapters } from '../lib/api/chapters';
import { saveStoryToList, removeStoryFromList, fetchSavedStories, fetchReadingProgressForStory } from '../lib/api/library';
import StoryCoverView from './StoryCoverView';

interface PublicStoryViewProps {
  storyId: string;
  navigateTo: (view: string, storyId?: string, chapterId?: string, userId?: string) => void;
}

export default function PublicStoryView({ storyId, navigateTo }: PublicStoryViewProps) {
  const [story, setStory] = useState<Story | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastReadChapterId, setLastReadChapterId] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStory(storyId),
      fetchChapters(storyId),
      fetchSavedStories('saved')
    ]).then(async ([s, cList, savedRes]) => {
      if (cancelled) return;
      setStory(s);
      
      // Filter out any accidentally leaked drafts just in case, though backend should handle it
      const published = cList.filter(c => c.status === 'published');
      // Sort by sequence or chapterNumber (whichever is available/reliable)
      published.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0) || ((a as any).chapterNumber ?? 0) - ((b as any).chapterNumber ?? 0));
      setChapters(published);

      // Check reading progress
      try {
        const progressRes = await fetchReadingProgressForStory(storyId);
        if (progressRes && progressRes.chapter_id) {
          if (published.some(c => c.id === progressRes.chapter_id)) {
            setLastReadChapterId(progressRes.chapter_id);
          }
        }
      } catch (e) {
        // ignore if none exists
      }
      
      const savedList = savedRes as any[];
      setIsSaved(savedList.some(r => r.story_id === storyId));
      
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      console.error("Failed to load public story", err);
      setError("This story is either unpublished, doesn't exist, or you don't have access.");
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [storyId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="animate-spin mb-4" size={32} />
        <p>Loading story...</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-slate-400">
        <AlertTriangle size={48} className="mb-4 text-amber-500/50" />
        <h2 className="text-xl font-bold text-slate-200 mb-2">Story Unavailable</h2>
        <p className="max-w-md text-center">{error}</p>
        <button 
          onClick={() => navigateTo('home')}
          className="mt-6 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition cursor-pointer"
        >
          Return Home
        </button>
      </div>
    );
  }

  const handleStartReading = async () => {
    if (chapters.length === 0) return;
    const chapterToRead = lastReadChapterId || chapters[0].id;
    try {
      await recordStoryView(storyId, chapterToRead);
    } catch (e) {
      console.error('Failed to record view:', e);
    }
    navigateTo('reader-chapter', storyId, chapterToRead);
  };

  const handleToggleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await removeStoryFromList(storyId, 'saved');
        setIsSaved(false);
      } else {
        await saveStoryToList(storyId, 'saved');
        setIsSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-sans animate-fade-in">
      <button 
        onClick={() => navigateTo('home')}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition text-sm mb-8 cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        <div className="w-full md:w-1/3 max-w-[280px] mx-auto md:mx-0 shrink-0">
          <div className="aspect-[16/10] sm:aspect-[2/3] md:aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
            <StoryCoverView
              coverUrl={story.coverUrl}
              title={story.title}
              genre={story.genre}
              subgenre={story.subgenre}
              author={story.author}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="flex-1 space-y-6 flex flex-col justify-center">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight">{story.title}</h1>
            
            <div 
              className="flex items-center gap-3 cursor-pointer group"
              onClick={() => {
                if (story.authorId && navigateTo) {
                  navigateTo('public-profile', undefined, undefined, story.authorId);
                }
              }}
            >
              <div className="w-10 h-10 rounded-full bg-violet-900 border-2 border-violet-500 overflow-hidden shrink-0 flex items-center justify-center group-hover:border-violet-400 transition-colors">
                {/* Fallback avatar placeholder */}
                <span className="text-violet-200 font-bold text-sm uppercase">
                  {(story.author || 'U').charAt(0)}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-400 font-mono tracking-wider uppercase mb-0.5">Written By</p>
                <p className="text-base text-violet-300 font-bold group-hover:text-violet-200 transition-colors">@{story.author || 'Unknown'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 text-sm font-bold text-slate-400">
            <span className="bg-slate-900 px-3 py-1 rounded-md border border-slate-800">
              {story.subgenre ? `${story.genre} / ${story.subgenre}` : story.genre || 'Uncategorized'}
            </span>
            <span className="bg-slate-900 px-3 py-1 rounded-md border border-slate-800">{chapters.length} Chapters</span>
          </div>

          {story.tags && story.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {story.tags.map(tag => (
                <span key={tag} className="px-2 py-1 bg-violet-900/30 text-violet-300 border border-violet-500/30 rounded text-xs font-mono">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <p className="text-slate-300 leading-relaxed text-base">
            {story.description || "No description provided."}
          </p>

          <div className="pt-4 flex items-center gap-3">
            <button
              onClick={handleStartReading}
              disabled={chapters.length === 0}
              className="px-8 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <BookOpen size={18} />
              {chapters.length === 0 
                ? 'No Chapters Available' 
                : (lastReadChapterId ? 'Continue Reading' : 'Start Reading')}
            </button>

            <button
              onClick={handleToggleSave}
              disabled={isSaving}
              className={`px-4 py-3.5 rounded-xl border font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
                isSaved 
                  ? 'bg-amber-600 border-amber-500 hover:bg-amber-700 text-white' 
                  : 'bg-transparent border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              {isSaved ? 'Saved to Library' : 'Save to Library'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-6 border-b border-slate-800 pb-2">Table of Contents</h3>
        
        {chapters.length === 0 ? (
          <p className="text-slate-500 italic p-6 bg-slate-900/50 rounded-xl border border-slate-800/50 text-center">
            No published chapters yet. Check back later!
          </p>
        ) : (
          <div className="grid gap-3">
            {chapters.map((chapter, index) => (
              <div 
                key={chapter.id}
                onClick={async () => {
                  try {
                    await recordStoryView(storyId, chapter.id);
                  } catch (e) {
                    console.error('Failed to record view:', e);
                  }
                  navigateTo('reader-chapter', storyId, chapter.id);
                }}
                className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                  chapter.id === lastReadChapterId 
                    ? 'bg-violet-950/30 border-violet-800/50 hover:bg-violet-900/40' 
                    : 'bg-[#11131a] border-slate-800/80 hover:border-slate-600 hover:bg-[#161922]'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 font-mono text-xs w-6 text-right">
                    {(chapter as any).chapterNumber || index + 1}
                  </span>
                  <div>
                    <h4 className="font-bold text-slate-200">{chapter.title || `Chapter ${(chapter as any).chapterNumber || index + 1}`}</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {chapter.wordCount || 0} words • Updated {new Date(chapter.lastSaved || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                {chapter.id === lastReadChapterId && (
                  <span className="text-xs font-bold text-violet-400 bg-violet-950/50 px-2 py-1 rounded">
                    Current
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
