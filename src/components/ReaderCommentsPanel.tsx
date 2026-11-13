import React, { useEffect, useState } from 'react';
import { apiGet } from '../lib/api/client';
import { MessageSquare, RefreshCw } from 'lucide-react';

function timeAgo(dateString: string) {
  const diff = (new Date().getTime() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ReaderCommentsPanelProps {
  chapterId: string;
}

interface CommentThread {
  id: string;
  user_id: string;
  user: {
    username: string;
    avatar_url: string;
  };
  content: string;
  created_at: string;
  is_deleted: boolean;
  replies: CommentThread[];
}

export default function ReaderCommentsPanel({ chapterId }: ReaderCommentsPanelProps) {
  const [comments, setComments] = useState<CommentThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet(`/chapters/${chapterId}/comments`);
      setComments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      // API client provides apiPost
      const { apiPost } = await import('../lib/api/client');
      const data = await apiPost(`/chapters/${chapterId}/comments`, { content: newComment.trim() });
      setComments(prev => [data, ...prev]);
      setNewComment('');
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setPosting(false);
    }
  };

  useEffect(() => {
    if (chapterId) {
      fetchComments();
    }
  }, [chapterId]);

  return (
    <div className="flex flex-col h-full bg-[#0c0c0e] font-sans">
      <div className="p-3 border-b border-[#1c1c1e] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={14} className="text-violet-400" />
          <span className="text-[10px] font-bold text-slate-200 uppercase tracking-widest">Reader Comments</span>
        </div>
        <button 
          onClick={fetchComments} 
          disabled={loading}
          className="p-1 rounded hover:bg-[#1a1a1c] text-slate-500 hover:text-slate-300 transition disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
        {loading && comments.length === 0 ? (
          <div className="flex justify-center p-4">
            <span className="text-xs text-slate-500">Loading comments...</span>
          </div>
        ) : error ? (
          <div className="p-3 bg-red-950/20 text-red-400 text-xs rounded-lg border border-red-900/30">
            {error}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePostComment(); }}
                placeholder="Write a comment..." 
                className="flex-1 bg-[#12131b] text-slate-200 text-xs rounded-xl px-3 py-2 border border-slate-800/60 focus:outline-none focus:border-violet-500/50"
              />
              <button 
                onClick={handlePostComment}
                disabled={posting || !newComment.trim()}
                className="px-3 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition"
              >
                {posting ? '...' : 'Post'}
              </button>
            </div>
            
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center space-y-2 opacity-50">
                <MessageSquare size={24} className="text-slate-600" />
                <span className="text-[11px] text-slate-400">No comments yet.</span>
              </div>
            ) : (
          comments.map(thread => (
            <div key={thread.id} className="flex flex-col gap-2">
              {/* Parent Comment */}
              <div className="flex gap-2 text-left items-start">
                <img 
                  src={thread.user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} 
                  alt={thread.user.username} 
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover shrink-0 filter grayscale mt-0.5"
                />
                <div className="min-w-0 flex flex-col space-y-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-slate-400 font-mono">@{thread.user.username}</span>
                    <span className="text-[8px] text-slate-600">{timeAgo(thread.created_at)}</span>
                  </div>
                  <div className="p-2.5 rounded-xl text-[11.5px] leading-relaxed bg-[#141416] text-slate-300 border border-[#222]">
                    {thread.is_deleted ? <em className="text-slate-500">Comment deleted</em> : thread.content}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {thread.replies && thread.replies.length > 0 && (
                <div className="ml-7 flex flex-col gap-2 border-l border-[#222] pl-3">
                  {thread.replies.map(reply => (
                    <div key={reply.id} className="flex gap-2 text-left items-start">
                      <img 
                        src={reply.user.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=fallback'} 
                        alt={reply.user.username} 
                        referrerPolicy="no-referrer"
                        className="w-4 h-4 rounded-full object-cover shrink-0 filter grayscale mt-0.5"
                      />
                      <div className="min-w-0 flex flex-col space-y-1 w-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] text-slate-400 font-mono">@{reply.user.username}</span>
                          <span className="text-[8px] text-slate-600">{timeAgo(reply.created_at)}</span>
                        </div>
                        <div className="p-2 rounded-lg text-[11px] leading-relaxed bg-[#0c0c0e] text-slate-400 border border-[#1a1a1c]">
                          {reply.is_deleted ? <em className="text-slate-600">Reply deleted</em> : reply.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
          </div>
        )}
      </div>
    </div>
  );
}
