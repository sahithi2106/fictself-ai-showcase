import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Send, Loader2, X } from 'lucide-react';

interface CommentComposerProps {
  currentUser: UserProfile | null;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  isReply?: boolean;
  initialValue?: string;
}

export default function CommentComposer({ 
  currentUser, 
  onSubmit, 
  onCancel, 
  placeholder = "Add to the discussion...",
  isReply = false,
  initialValue = ""
}: CommentComposerProps) {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (err) {
      console.error(err);
      // parent can handle toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="p-4 rounded-xl border border-slate-800/60 bg-[#0d1017] text-center">
        <p className="text-slate-400 text-sm">Please log in to join the discussion.</p>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isReply ? 'mt-3' : 'mb-6'} relative`}>
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
        {currentUser.profileImage ? (
          <img src={currentUser.profileImage} alt={currentUser.displayName || currentUser.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-400 text-xs font-bold uppercase">{(currentUser.displayName || currentUser.username).charAt(0)}</span>
        )}
      </div>
      
      <div className="flex-1 flex flex-col gap-2 relative">
        {onCancel && (
          <button 
            onClick={onCancel} 
            className="absolute -top-1 -right-1 text-slate-500 hover:text-slate-300 p-1"
          >
            <X size={14} />
          </button>
        )}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          disabled={isSubmitting}
          className="w-full bg-[#121620] border border-slate-800 focus:border-violet-500/50 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 resize-none outline-none min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div className="flex justify-end gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg text-xs flex items-center gap-2 transition cursor-pointer"
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {initialValue ? 'Save' : (isReply ? 'Reply' : 'Post')}
          </button>
        </div>
      </div>
    </div>
  );
}
