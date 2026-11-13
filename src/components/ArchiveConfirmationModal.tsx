import React, { useEffect } from 'react';
import { X, Archive } from 'lucide-react';
import { Story } from '../types';

interface ArchiveConfirmationModalProps {
  story: Story;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ArchiveConfirmationModal({
  story,
  isOpen,
  onClose,
  onConfirm
}: ArchiveConfirmationModalProps) {
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

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs" 
      id="archive-story-modal"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f1422] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-scale-in"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-900">
          <div className="flex items-center gap-2 text-violet-400">
            <Archive size={18} />
            <span className="font-bold text-sm text-slate-200">Archive Story?</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer" id="close-archive-modal-btn">
            <X size={16} />
          </button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-zinc-200 text-sm font-semibold">
            Are you sure you want to archive "{story.title}"?
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            This story will be moved from Active Stories to Archived Stories.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed font-semibold text-amber-400/90">
            Readers will no longer discover this story.
          </p>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-950/40 border-t border-slate-900">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            id="cancel-archive-modal-btn"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
            id="confirm-archive-modal-btn"
          >
            <Archive size={14} />
            Archive
          </button>
        </div>
      </div>
    </div>
  );
}
