import React, { useState } from 'react';
import { ChapterComment, UserProfile } from '../../types';
import CommentComposer from './CommentComposer';

interface CommentThreadItemProps {
  comment: ChapterComment;
  currentUser: UserProfile | null;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, newContent: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  isReply?: boolean;
  key?: React.Key | string | number;
}

export default function CommentThreadItem({ 
  comment, 
  currentUser, 
  onReply, 
  onEdit, 
  onDelete,
  isReply = false
}: CommentThreadItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = currentUser?.id === comment.user_id;
  const isDeleted = comment.is_deleted;

  const handleEditSubmit = async (content: string) => {
    await onEdit(comment.id, content);
    setIsEditing(false);
  };

  const handleReplySubmit = async (content: string) => {
    // If it's already a reply, we attach the reply to its parent so it stays 1-level deep
    const parentId = comment.parent_comment_id || comment.id;
    await onReply(parentId, content);
    setIsReplying(false);
  };

  const handleDeleteConfirm = async () => {
    await onDelete(comment.id);
    setIsDeleting(false);
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined }) + ' ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className={`flex gap-3 group ${isReply ? 'mt-4 ml-8 relative before:absolute before:left-[-16px] before:top-[-10px] before:w-[12px] before:h-[24px] before:border-b before:border-l before:border-slate-800 before:rounded-bl-xl' : 'mt-6'}`}>
      <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center z-10">
        {isDeleted ? (
          <span className="text-slate-500 text-xs font-bold uppercase">?</span>
        ) : comment.user.profile_image ? (
          <img src={comment.user.profile_image} alt={comment.user.display_name || comment.user.username} className="w-full h-full object-cover" />
        ) : (
          <span className="text-slate-400 text-xs font-bold uppercase">{(comment.user.display_name || comment.user.username).charAt(0)}</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="bg-[#121620] border border-slate-800/60 rounded-2xl rounded-tl-none p-3.5 relative">
          <div className="flex items-center justify-between mb-1 gap-2">
            <div className="flex items-center gap-2 truncate">
              <span className="font-bold text-slate-200 text-sm truncate">
                {isDeleted ? '[Deleted User]' : (comment.user.display_name || comment.user.username)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono shrink-0">
                {formatTime(comment.created_at)}
              </span>
              {comment.is_edited && !isDeleted && (
                <span className="text-[10px] text-slate-500 italic shrink-0">(edited)</span>
              )}
            </div>
          </div>

          {isEditing && !isDeleted ? (
            <CommentComposer 
              currentUser={currentUser}
              initialValue={comment.content}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <div className={`text-sm leading-relaxed ${isDeleted ? 'text-slate-500 italic' : 'text-slate-300'} whitespace-pre-wrap`}>
              {comment.content}
            </div>
          )}

          {!isDeleted && !isEditing && (
            <div className="flex items-center gap-4 mt-2">
              <button 
                onClick={() => setIsReplying(!isReplying)}
                className="text-xs font-bold text-slate-500 hover:text-violet-400 transition"
              >
                Reply
              </button>
              
              {isOwner && (
                <>
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="text-xs font-bold text-slate-500 hover:text-amber-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                  >
                    Edit
                  </button>
                  {isDeleting ? (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-rose-500">Sure?</span>
                      <button onClick={handleDeleteConfirm} className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded hover:bg-rose-500/30 font-bold transition">Yes</button>
                      <button onClick={() => setIsDeleting(false)} className="text-[10px] px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 font-bold transition">No</button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDeleting(true)}
                      className="text-xs font-bold text-slate-500 hover:text-rose-400 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {isReplying && (
          <div className="mt-3 ml-2 border-l-2 border-violet-500/30 pl-4">
            <CommentComposer 
              currentUser={currentUser}
              isReply={true}
              placeholder={`Reply to ${comment.user.display_name || comment.user.username}...`}
              onSubmit={handleReplySubmit}
              onCancel={() => setIsReplying(false)}
            />
          </div>
        )}

        {/* Render Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="relative">
            {comment.replies.map(reply => (
              <CommentThreadItem 
                key={reply.id} 
                comment={reply} 
                currentUser={currentUser} 
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                isReply={true} 
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
