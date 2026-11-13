import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Check } from 'lucide-react';

interface ChapterRenameModalProps {
  isOpen: boolean;
  currentTitle: string;
  chapterNumber: number;
  onRename: (newTitle: string) => void;
  onClose: () => void;
}

export default function ChapterRenameModal({
  isOpen,
  currentTitle,
  chapterNumber,
  onRename,
  onClose,
}: ChapterRenameModalProps) {
  const [title, setTitle] = useState(currentTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(currentTitle);
      // Focus & select all on open
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
    }
  }, [isOpen, currentTitle]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onRename(trimmed);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/70 animate-fade-in"
      onClick={onClose}
      id="chapter-rename-modal-overlay"
    >
      <div
        className="bg-[#0f1422] border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
          <div className="flex items-center gap-2">
            <Edit3 size={15} className="text-blue-400" />
            <span className="text-sm font-bold text-white font-sans">
              Rename Chapter {chapterNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            id="close-rename-modal-btn"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Chapter Title
            </label>
            <input
              ref={inputRef}
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter chapter title..."
              className="w-full bg-[#111827] border border-slate-800 hover:border-slate-700 focus:border-blue-500 font-semibold text-sm py-2.5 px-3.5 rounded-xl outline-none text-slate-100 transition"
              id="chapter-rename-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer active:scale-95"
              id="confirm-rename-btn"
            >
              <Check size={13} />
              Rename Chapter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
