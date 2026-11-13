import React, { useState, useEffect } from 'react';
import { X, Save, Sparkles, AlertTriangle, Globe, Tag } from 'lucide-react';
import { Story } from '../types';
import { PRIMARY_GENRES } from '../genresData';
import CoverImageUploader from './CoverImageUploader';
import { uploadStoryCover, removeStoryCover } from '../lib/api/stories';

interface StoryEditModalProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStory: Story) => void;
}

export default function StoryEditModal({
  story,
  isOpen,
  onClose,
  onSave
}: StoryEditModalProps) {
  const [title, setTitle] = useState(story.title);
  const [tagline, setTagline] = useState(story.tagline || '');
  const [description, setDescription] = useState(story.description || '');
  const [coverUrl, setCoverUrl] = useState(story.coverUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [primaryGenre, setPrimaryGenre] = useState(story.genre || '');
  const [subgenre, setSubgenre] = useState(story.subgenre || '');
  
  const [tagsInput, setTagsInput] = useState(story.tags.join(', '));
  const [language, setLanguage] = useState(story.language || 'English');
  const [isPublished, setIsPublished] = useState(story.isPublished);
  const [status, setStatus] = useState<Story['status']>(story.status || 'Ongoing');

  // Sync state if story changes or modal opens
  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setTagline(story.tagline || '');
      setDescription(story.description);
      setPrimaryGenre(story.genre || '');
      setSubgenre(story.subgenre || '');
      setTagsInput(story.tags.join(', '));
      setCoverUrl(story.coverUrl);
      setLanguage(story.language || 'English');
      setIsPublished(story.isPublished);
      setStatus(story.status || 'Ongoing');
    }
  }, [story, isOpen]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;



  const currentTagsCount = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSaving) return;

    setIsSaving(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .slice(0, 10); // Limit to 10 tags max


      let finalCoverUrl = coverUrl;
      if (selectedFile) {
        const tempStory = await uploadStoryCover(story.id, selectedFile);
        finalCoverUrl = tempStory.coverUrl;
      } else if (!coverUrl && story.coverUrl) {
        const tempStory = await removeStoryCover(story.id);
        finalCoverUrl = tempStory.coverUrl;
      }

      const updatedStory: Story = {
        ...story,
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        genre: primaryGenre.trim(),
        subgenre: subgenre.trim() || undefined,
        tags: parsedTags,
        coverUrl: finalCoverUrl,
        language,
        isPublished,
        status,
        lastUpdated: new Date().toISOString()
      };

      onSave(updatedStory);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save story updates.');
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-fade-in" 
      id="story-edit-modal-overlay"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        
        {/* Header bar */}
        <div className="p-4 md:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-400" />
            <span className="text-sm font-bold text-white font-sans">
              Edit Story Settings: {story.title}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            id="close-edit-modal-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Cover management module */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Story Cover Image
            </label>
            <CoverImageUploader
              coverUrl={coverUrl}
              onChange={(url) => setCoverUrl(url)}
              onRemove={() => {
                setCoverUrl('');
                setSelectedFile(null);
              }}
              onFileSelect={(file) => setSelectedFile(file)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Story Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Story Title *</label>
              <input 
                type="text" 
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Story title..."
                className="w-full bg-[#111827] border border-slate-800 hover:border-slate-750 focus:border-violet-500 font-semibold text-xs py-2 px-3 rounded-lg outline-none text-slate-100"
              />
            </div>

            {/* Tagline */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Catchy Tagline</label>
              <input 
                type="text" 
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="A short punchy preview tag..."
                className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3 rounded-lg outline-none text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Genre */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Genre *</label>
              <input 
                type="text"
                required
                value={primaryGenre}
                onChange={(e) => setPrimaryGenre(e.target.value)}
                placeholder="e.g. Fantasy, Drama"
                className="w-full bg-[#111827] border border-slate-800 text-slate-205 text-xs py-2 px-3 rounded-lg outline-none focus:border-violet-500"
              />
            </div>

            {/* Subgenre */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Subgenre</label>
              <input 
                type="text"
                value={subgenre}
                onChange={(e) => setSubgenre(e.target.value)}
                placeholder="e.g. Dark Academia"
                className="w-full bg-[#111827] border border-slate-800 text-slate-205 text-xs py-2 px-3 rounded-lg outline-none focus:border-violet-500"
              />
            </div>

            {/* Language */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono flex items-center gap-1">
                <Globe size={11} className="text-slate-505" /> Language
              </label>
              <input 
                type="text"
                required
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English, Español"
                className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3 rounded-lg outline-none text-slate-200 focus:border-violet-500"
              />
            </div>

            {/* Story Writing Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Writing Status</label>
              <select 
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#111827] border border-slate-800 text-slate-202 text-xs py-2 px-3 rounded-lg outline-none font-bold cursor-pointer focus:border-violet-500"
              >
                <option value="Ongoing">🟢 Ongoing</option>
                <option value="On Hold">🟡 On Hold</option>
                <option value="Planned">🔵 Planned</option>
                <option value="Draft">⚫ Draft</option>
                <option value="Completed">🏁 Completed</option>
                <option value="Archived">📦 Archived</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Release Visibility */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Visibility</label>
              <select 
                value={isPublished ? 'published' : 'draft'}
                onChange={(e) => setIsPublished(e.target.value === 'published')}
                className="w-full bg-[#111827] border border-slate-800 text-slate-202 text-xs py-2 px-3 rounded-lg outline-none cursor-pointer focus:border-violet-500"
              >
                <option value="draft">Draft Outlines Only (WIP)</option>
                <option value="published">Published / Public</option>
              </select>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Tag size={11} className="text-slate-505" /> Tags (Comma separated)
                </span>
                <span className={`text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded ${currentTagsCount > 10 ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-slate-900 text-slate-500'}`}>
                  {currentTagsCount}/10 tags allowed
                </span>
              </label>
              <input 
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. Adventure, Cyberpunk, Espionage, AI"
                className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3 rounded-lg outline-none text-slate-100 focus:border-violet-500"
              />
              {currentTagsCount > 10 && (
                <p className="text-[10px] text-amber-500 select-none">
                  ⚠️ More than 10 tags entered! The list will be automatically truncated to the first 10 on save.
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 font-sans">
            <label className="text-[10px] font-bold text-slate-450 uppercase tracking-widest font-mono">Story Synopsis & Premise</label>
            <textarea 
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the main characters, settings, conflict, or narrative arc of the story universe..."
              className="w-full bg-[#111827] border border-slate-800 rounded-lg text-xs p-3 outline-none text-slate-300 resize-none font-sans leading-relaxed"
            />
          </div>

        </form>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/20">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-405 hover:text-slate-200 transition"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-553 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            id="save-story-config-btn"
          >
            <Save size={13} />
            {isSaving ? "Saving..." : "Save Changes Instantly"}
          </button>
        </div>

      </div>
    </div>
  );
}
