import { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  storyTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmationModal({
  storyTitle,
  isOpen,
  onClose,
  onConfirm
}: DeleteConfirmationModalProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-fade-in" 
      id="delete-confirm-modal-overlay"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-[#0f1422] border border-red-500/20 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-6"
      >
        
        {/* Warning Icon and Header */}
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-950/40 border border-red-900/30 rounded-full text-red-500 shadow-md shrink-0">
            <AlertTriangle size={24} className="animate-bounce" />
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-100 font-sans" id="delete-prompt-header">
              Delete Story?
            </h3>
            <p className="text-xs text-slate-400 leading-normal">
              You are about to permanently delete the creative notebook:
            </p>
            <div className="p-2.5 bg-[#090d16] border border-slate-800 rounded-lg text-xs font-mono font-extrabold text-red-301 truncate">
              📖 {storyTitle}
            </div>
            <p className="text-[11px] text-red-405 font-medium flex items-center gap-1 font-sans">
              <Trash2 size={12} /> This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-900">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-900/50 text-slate-402 hover:text-slate-200 text-xs font-semibold transition"
            id="cancel-delete-btn"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-red-650 hover:bg-red-555 text-white text-xs font-bold transition shadow-lg active:scale-98"
            id="confirm-delete-btn"
          >
            Delete Story
          </button>
        </div>

      </div>
    </div>
  );
}
