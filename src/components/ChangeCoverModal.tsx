import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Story } from '../types';
import CoverImageUploader from './CoverImageUploader';
import { uploadStoryCover, removeStoryCover } from '../lib/api/stories';

interface ChangeCoverModalProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedStory: Story) => void;
}

export default function ChangeCoverModal({
  story,
  isOpen,
  onClose,
  onSave
}: ChangeCoverModalProps) {
  const [coverUrl, setCoverUrl] = useState(story?.coverUrl || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Sync state if story changes or modal opens
  useEffect(() => {
    if (story) {
      setCoverUrl(story.coverUrl || '');
      setSelectedFile(null);
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

  const handleSave = async () => {
    setIsUploading(true);
    try {
      let updatedStory = story;
      if (selectedFile) {
        updatedStory = await uploadStoryCover(story.id, selectedFile);
      } else if (!coverUrl || coverUrl === 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=400&q=80') {
        updatedStory = await removeStoryCover(story.id);
      } else {
        // Fallback for just saving crop or no changes
        updatedStory = { ...story, coverUrl, lastUpdated: new Date().toISOString() };
      }
      onSave(updatedStory);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to update cover');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" 
      id="change-cover-modal"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f1422] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
          <h3 className="font-bold text-sm text-slate-200">Change Cover – {story.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer" id="close-cover-modal-btn">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-4">
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
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950/40 border-t border-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            id="cancel-cover-modal-btn"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUploading}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
            id="save-cover-modal-btn"
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isUploading ? 'Saving...' : 'Save Cover'}
          </button>
        </div>
      </div>
    </div>
  );
}
