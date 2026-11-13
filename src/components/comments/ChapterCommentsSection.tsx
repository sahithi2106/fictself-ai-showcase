import React, { useState, useEffect } from 'react';
import { ChapterComment, UserProfile } from '../../types';
import { fetchChapterComments, createComment, createReply, updateComment, deleteComment } from '../../lib/api/comments';
import CommentComposer from './CommentComposer';
import CommentThreadItem from './CommentThreadItem';
import { MessageSquare, Loader2 } from 'lucide-react';

interface ChapterCommentsSectionProps {
  chapterId: string;
  currentUser: UserProfile | null;
}

export default function ChapterCommentsSection({ chapterId, currentUser }: ChapterCommentsSectionProps) {
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [chapterId]);

  const loadComments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchChapterComments(chapterId);
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
      setError('Failed to load comments. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePostComment = async (content: string) => {
    try {
      await createComment(chapterId, content);
      await loadComments();
    } catch (err: any) {
      console.error('Post error:', err);
      setError(err.message || 'Failed to post comment.');
      throw err;
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    try {
      await createReply(chapterId, parentId, content);
      await loadComments();
    } catch (err: any) {
      console.error('Reply error:', err);
      setError(err.message || 'Failed to post reply.');
      throw err;
    }
  };

  const handleEdit = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, content);
      await loadComments();
    } catch (err: any) {
      console.error('Edit error:', err);
      setError(err.message || 'Failed to edit comment.');
      throw err;
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      await loadComments();
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete comment.');
      throw err;
    }
  };

  const totalCount = comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-24" id="comments-section">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare size={24} className="text-violet-400" />
        <h3 className="text-xl font-bold text-slate-100">Discussion</h3>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-xs font-bold font-mono">
          {totalCount}
        </span>
      </div>

      <CommentComposer 
        currentUser={currentUser} 
        onSubmit={handlePostComment} 
      />

      {isLoading ? (
        <div className="py-12 flex justify-center">
          <Loader2 size={32} className="animate-spin text-slate-700" />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm text-center">
          {error}
        </div>
      ) : comments.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm italic">
          No comments yet. Be the first to share your thoughts!
        </div>
      ) : (
        <div className="space-y-2 mt-8">
          {comments.map(comment => (
            <CommentThreadItem
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
