import React, { useState, useMemo, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  Users, 
  Search, 
  ThumbsUp, 
  Plus, 
  Lock, 
  X, 
  MessageCircle, 
  Bookmark, 
  Share2, 
  Image as ImageIcon, 
  BarChart2, 
  Check, 
  UserPlus, 
  UserMinus,
  User,
  Heart,
  Trash2
} from 'lucide-react';
import UserAvatar from './UserAvatar';
import { fetchCommunities, createCommunity, joinCommunity, leaveCommunity, deleteCommunity, CommunityGroup } from '../lib/api/communities';

interface CommunityViewProps {
  currentUser?: UserProfile | null;
}

// CommunityGroup interface is now imported from API

interface CommunityComment {
  id: string;
  author: string;
  authorId: string;
  content: string;
  timestamp: string;
  parent_comment_id?: string;
  replies?: CommunityComment[];
}

interface PollOption {
  text: string;
  votes: number;
}

interface PollData {
  question: string;
  options: PollOption[];
  userVotedOptionIndex?: number;
}

interface ForumPost {
  id: string;
  communityId: string;
  communityName: string;
  title: string;
  content: string;
  imageUrl?: string;
  poll?: PollData;
  author: string;
  authorId: string;
  likes: number;
  isLiked?: boolean;
  repliesCount: number;
  timestamp: string;
  commentsList: CommunityComment[];
  isSaved?: boolean;
}

const INITIAL_COMMUNITIES: CommunityGroup[] = [];

const INITIAL_FORUM_POSTS: ForumPost[] = [];

export default function CommunityView({ currentUser }: CommunityViewProps) {
  const [communities, setCommunities] = useState<CommunityGroup[]>(INITIAL_COMMUNITIES);
  const [posts, setPosts] = useState<ForumPost[]>(INITIAL_FORUM_POSTS);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    let cancelled = false;
    const loadAll = async () => {
      try {
        const { fetchCommunityPosts } = await import('../lib/api/communities');
        const commData = await fetchCommunities();
        if (cancelled) return;
        setCommunities(commData);
        
        let allPosts: ForumPost[] = [];
        const joined = commData.filter(c => c.isJoined);
        for (const c of joined) {
          try {
            const backendPosts = await fetchCommunityPosts(c.id);
            const adapted: ForumPost[] = (backendPosts || []).map((bp: any) => ({
              id: bp.id,
              communityId: bp.community_id,
              communityName: c.name,
              title: bp.title,
              content: bp.content,
              imageUrl: bp.image_url,
              poll: bp.poll_data,
              author: bp.author_name,
              authorId: bp.author_id,
              likes: bp.likes_count,
              isLiked: bp.is_liked,
              repliesCount: bp.comments_count,
              timestamp: new Date(bp.created_at).toLocaleDateString(),
              commentsList: (bp.comments || []).map(function mapComment(bc: any): CommunityComment {
                return {
                  id: bc.id,
                  author: bc.author_name,
                  authorId: bc.author_id,
                  content: bc.content,
                  timestamp: new Date(bc.created_at).toLocaleDateString(),
                  parent_comment_id: bc.parent_comment_id,
                  replies: (bc.replies || []).map(mapComment)
                };
              })
            }));
            allPosts = [...allPosts, ...adapted];
          } catch(e) {}
        }
        allPosts.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setPosts(allPosts);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'joined'>('all');

  // Creation State Flags
  const [isCreatingCommunity, setIsCreatingCommunity] = useState(false);
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommPrivate, setNewCommPrivate] = useState(false);

  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostCommId, setNewPostCommId] = useState(INITIAL_COMMUNITIES[0]?.id || '');

  // Comments & Feedback States
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeReplyCommentId, setActiveReplyCommentId] = useState<string | null>(null);
  const [tempCommentText, setTempCommentText] = useState('');
  const [tempReplyText, setTempReplyText] = useState('');
  const [communityToast, setCommunityToast] = useState<string | null>(null);

  const [pendingActions, setPendingActions] = useState<Record<string, boolean>>({});
  const setActionPending = (key: string, isPending: boolean) => {
    setPendingActions(prev => ({ ...prev, [key]: isPending }));
  };

  const triggerToast = (msg: string) => {
    setCommunityToast(msg);
    setTimeout(() => setCommunityToast(null), 3000);
  };

  // Joined/Popular Lists
  const joinedCommunities = useMemo(() => {
    return communities.filter(c => c.isJoined);
  }, [communities]);

  const popularCommunities = useMemo(() => {
    return communities.filter(c => !c.isJoined);
  }, [communities]);

  const filteredJoined = useMemo(() => {
    return joinedCommunities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [joinedCommunities, searchQuery]);

  const filteredPopular = useMemo(() => {
    return popularCommunities.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [popularCommunities, searchQuery]);

  const filteredPostsFeed = useMemo(() => {
    if (selectedFilter === 'joined') {
      const joinedIds = new Set(joinedCommunities.map(c => c.id));
      return posts.filter(post => joinedIds.has(post.communityId));
    }
    return posts;
  }, [posts, selectedFilter, joinedCommunities]);

  // Actions
  const handleToggleJoin = async (commId: string) => {
    if (pendingActions[`join-${commId}`]) return;
    const comm = communities.find(c => c.id === commId);
    if (!comm) return;
    
    setActionPending(`join-${commId}`, true);
    try {
      if (comm.isJoined) {
        await leaveCommunity(commId);
        triggerToast(`Left @${comm.name}.`);
      } else {
        await joinCommunity(commId);
        triggerToast(`Joined @${comm.name}!`);
      }
      const data = await fetchCommunities();
      setCommunities(data);
    } catch (e: any) {
      triggerToast(e.message || 'Failed to update community status');
    } finally {
      setActionPending(`join-${commId}`, false);
    }
  };

  const handleDeleteCommunity = async (commId: string) => {
    if (pendingActions[`delete-${commId}`] || !window.confirm("Are you sure you want to delete this community? This action is permanent and deletes all posts and comments within.")) return;
    setActionPending(`delete-${commId}`, true);
    try {
      await deleteCommunity(commId);
      triggerToast('Community deleted.');
      const data = await fetchCommunities();
      setCommunities(data);
      // Remove posts from the deleted community
      setPosts(prev => prev.filter(p => p.communityId !== commId));
    } catch (e: any) {
      triggerToast(e.message || 'Failed to delete community');
    } finally {
      setActionPending(`delete-${commId}`, false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      await createCommunity({
        name: newCommName,
        description: newCommDesc || 'A general interest group.',
        isPrivate: newCommPrivate
      });
      
      const data = await fetchCommunities();
      setCommunities(data);
      
      setIsCreatingCommunity(false);
      triggerToast(`"${newCommName}" successfully created!`);

      setNewCommName('');
      setNewCommDesc('');
      setNewCommPrivate(false);
    } catch (e: any) {
      triggerToast(e.message || 'Failed to create community');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreatePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostTitle.trim() || pendingActions['create-post']) return;

    setActionPending('create-post', true);
    const sourceGroup = communities.find(c => c.id === newPostCommId) || communities[0];

    try {
      const { createCommunityPost } = await import('../lib/api/communities');
      const bp = await createCommunityPost(sourceGroup.id, {
        title: newPostTitle,
        content: newPostContent,
        image_url: null,
        poll_data: null
      });

      const brandNewPost: ForumPost = {
        id: bp.id,
        communityId: bp.community_id,
        communityName: sourceGroup.name,
        title: bp.title,
        content: bp.content,
        imageUrl: bp.image_url,
        poll: bp.poll_data,
        author: bp.author_name,
        authorId: bp.author_id,
        likes: bp.likes_count,
        isLiked: bp.is_liked,
        repliesCount: bp.comments_count,
        timestamp: new Date(bp.created_at).toLocaleDateString(),
        commentsList: []
      };

      setPosts([brandNewPost, ...posts]);
      setIsCreatingPost(false);
      triggerToast('Post created!');

      setNewPostTitle('');
      setNewPostContent('');
    } catch(e: any) {
      triggerToast(e.message || 'Failed to create post');
    } finally {
      setActionPending('create-post', false);
    }
  };

  const handleVotePoll = (postId: string, optionIndex: number) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId && p.poll) {
        const alreadyVoted = p.poll.userVotedOptionIndex !== undefined;
        const newOptions = p.poll.options.map((opt, oIdx) => {
          if (oIdx === optionIndex) {
            return { ...opt, votes: opt.votes + 1 };
          }
          if (alreadyVoted && oIdx === p.poll?.userVotedOptionIndex) {
            return { ...opt, votes: Math.max(0, opt.votes - 1) };
          }
          return opt;
        });

        return {
          ...p,
          poll: {
            ...p.poll,
            options: newOptions,
            userVotedOptionIndex: optionIndex
          }
        };
      }
      return p;
    }));
  };

  const handleToggleLikePost = async (postId: string) => {
    if (pendingActions[`like-${postId}`]) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    setActionPending(`like-${postId}`, true);
    try {
      const { likeCommunityPost } = await import('../lib/api/communities');
      const bp = await likeCommunityPost(post.communityId, postId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            isLiked: bp.is_liked,
            likes: bp.likes_count
          };
        }
        return p;
      }));
    } catch(e) {
      triggerToast('Failed to like post');
    } finally {
      setActionPending(`like-${postId}`, false);
    }
  };

  const handleSavePost = (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const currentlySaved = !!p.isSaved;
        triggerToast(!currentlySaved ? 'Post saved!' : 'Post removed from saved.');
        return { ...p, isSaved: !currentlySaved };
      }
      return p;
    }));
  };

  const handleSharePost = (post: ForumPost) => {
    const fakeLink = `https://fictself.com/community/${post.communityId}/post/${post.id}`;
    navigator.clipboard.writeText(fakeLink).then(() => {
      triggerToast('Copied link to clipboard!');
    }, () => {});
  };

  const handleCommentSubmit = async (postId: string, parentCommentId?: string) => {
    const textToSubmit = parentCommentId ? tempReplyText : tempCommentText;
    const actionKey = parentCommentId ? `reply-${parentCommentId}` : `comment-${postId}`;
    
    if (!textToSubmit.trim() || pendingActions[actionKey]) return;
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setActionPending(actionKey, true);
    try {
      const { commentCommunityPost } = await import('../lib/api/communities');
      const bc = await commentCommunityPost(post.communityId, postId, textToSubmit.trim(), parentCommentId);
      
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const comment: CommunityComment = {
            id: bc.id,
            author: bc.author_name,
            authorId: bc.author_id,
            content: bc.content,
            parent_comment_id: bc.parent_comment_id,
            timestamp: new Date(bc.created_at).toLocaleDateString(),
            replies: []
          };
          
          let newCommentsList = [...p.commentsList];
          if (parentCommentId) {
            // Find parent and add reply
            const addReply = (list: CommunityComment[]): CommunityComment[] => {
              return list.map(c => {
                if (c.id === parentCommentId) {
                  return { ...c, replies: [...(c.replies || []), comment] };
                }
                if (c.replies && c.replies.length > 0) {
                  return { ...c, replies: addReply(c.replies) };
                }
                return c;
              });
            };
            newCommentsList = addReply(newCommentsList);
          } else {
            newCommentsList = [comment, ...newCommentsList];
          }

          return {
            ...p,
            repliesCount: p.repliesCount + 1,
            commentsList: newCommentsList
          };
        }
        return p;
      }));
      
      if (parentCommentId) {
        setTempReplyText('');
        setActiveReplyCommentId(null);
      } else {
        setTempCommentText('');
      }
    } catch (e) {
      triggerToast('Failed to post comment');
    } finally {
      setActionPending(actionKey, false);
    }
  };

  const handleDeletePost = async (communityId: string, postId: string) => {
    if (pendingActions[`delete-post-${postId}`] || !window.confirm("Delete this post?")) return;
    setActionPending(`delete-post-${postId}`, true);
    try {
      const { deleteCommunityPost } = await import('../lib/api/communities');
      await deleteCommunityPost(communityId, postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
      triggerToast('Post deleted.');
    } catch (e: any) {
      triggerToast(e.message || 'Failed to delete post');
    } finally {
      setActionPending(`delete-post-${postId}`, false);
    }
  };

  const handleDeleteComment = async (communityId: string, postId: string, commentId: string) => {
    if (pendingActions[`delete-comment-${commentId}`] || !window.confirm("Delete this comment?")) return;
    setActionPending(`delete-comment-${commentId}`, true);
    try {
      const { deleteCommunityPostComment } = await import('../lib/api/communities');
      await deleteCommunityPostComment(communityId, postId, commentId);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const removeComment = (list: CommunityComment[]): CommunityComment[] => {
            return list.filter(c => c.id !== commentId).map(c => {
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: removeComment(c.replies) };
              }
              return c;
            });
          };

          return {
            ...p,
            repliesCount: Math.max(0, p.repliesCount - 1),
            commentsList: removeComment(p.commentsList)
          };
        }
        return p;
      }));
      triggerToast('Comment deleted.');
    } catch (e: any) {
      triggerToast(e.message || 'Failed to delete comment');
    } finally {
      setActionPending(`delete-comment-${commentId}`, false);
    }
  };

  // Reusable Community Card Renderer
  const renderCommunityCard = (group: CommunityGroup) => {
    const getInitials = (name: string) => {
      if (!name) return '??';
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    };

    return (
      <div 
        key={group.id}
        className="p-4 bg-zinc-950/70 border border-zinc-900 hover:border-zinc-800 rounded-2xl flex items-center justify-between gap-4 transition group relative"
      >
        <div className="flex items-center gap-3 min-w-0">
          {group.coverUrl ? (
            <img 
              src={group.coverUrl} 
              alt={group.name} 
              className="w-11 h-11 rounded-xl object-cover border border-zinc-900 shrink-0" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-amber-900/40 border border-amber-500/20 text-amber-500 flex items-center justify-center font-black text-sm shrink-0">
              {getInitials(group.name)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-extrabold text-sm text-zinc-100 group-hover:text-amber-400 transition truncate">
              {group.name}
            </div>
            <div className="text-[11.1px] font-semibold text-zinc-500">
              {group.memberCount.toLocaleString()} members
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 shrink-0">
          {currentUser && currentUser.id === group.creator_id ? (
            <button
              onClick={() => handleDeleteCommunity(group.id)}
              disabled={pendingActions[`delete-${group.id}`]}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer bg-red-900/50 hover:bg-red-900/80 text-red-200 border border-red-900/50 ${pendingActions[`delete-${group.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {pendingActions[`delete-${group.id}`] ? 'Deleting...' : 'Delete'}
            </button>
          ) : (
            <button
              onClick={() => handleToggleJoin(group.id)}
              disabled={pendingActions[`join-${group.id}`]}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                group.isJoined 
                  ? 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800' 
                  : 'bg-amber-600 hover:bg-amber-500 text-white font-semibold'
              } ${pendingActions[`join-${group.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {pendingActions[`join-${group.id}`] ? (group.isJoined ? 'Leaving...' : 'Joining...') : (group.isJoined ? 'Leave' : 'Join')}
            </button>
          )}
          {group.isJoined && (
            <button
              onClick={() => {
                setSelectedFilter('joined');
                setSearchQuery(group.name);
                triggerToast(`Showing feed for ${group.name}`);
              }}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-850 cursor-pointer"
            >
              Open
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 select-none text-left font-sans text-slate-100" id="fictself-communities">
      
      {/* Top Back Navigation & Breadcrumb */}
      {searchQuery && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 select-none pb-2 bg-zinc-950/40 p-3 rounded-xl border border-zinc-905" id="community-navigation-breadcrumb">
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="hover:text-white text-zinc-400 transition cursor-pointer font-bold flex items-center gap-1.5 bg-transparent border-0 p-0"
            id="back-to-communities"
          >
            &larr; Back to Communities
          </button>
          <span className="text-zinc-750 font-mono">|</span>
          <span className="text-zinc-500">Workspace</span>
          <span className="text-zinc-750 font-mono">&gt;</span>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedFilter('all');
            }}
            className="hover:text-amber-400 text-zinc-550 transition cursor-pointer bg-transparent border-0 p-0"
          >
            Communities
          </button>
          <span className="text-zinc-755 font-mono">&gt;</span>
          <span className="text-amber-500 font-semibold">{searchQuery}</span>
        </div>
      )}

      {/* Toast */}
      {communityToast && (
        <div className="fixed bottom-6 right-6 p-4 rounded-2xl bg-zinc-900 border border-zinc-805 text-xs text-white font-bold shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <span className="p-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Check size={12} />
          </span>
          <span>{communityToast}</span>
        </div>
      )}

      {/* Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-zinc-900 gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="text-amber-500" /> Communities
          </h1>
        </div>

        <button 
          onClick={() => setIsCreatingCommunity(true)}
          className="flex items-center gap-1.5 px-4.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer border-0"
          id="create-new-group-btn"
        >
          <Plus size={15} />
          Create Community
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left column (Search, Lists) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Search Communities */}
          <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-900 space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-450 flex items-center gap-2">
              <Search size={14} className="text-amber-500" /> Search Communities
            </h3>
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Find a community..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl text-xs pl-9 pr-3.5 py-2.5 outline-none focus:border-amber-500/50 text-slate-200 placeholder-zinc-500 transition"
              />
            </div>
          </div>

          {/* Communities Joined */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 px-1">
              Communities Joined ({joinedCommunities.length})
            </h3>
            
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {filteredJoined.map(renderCommunityCard)}

              {filteredJoined.length === 0 && (
                <div className="text-center py-6 px-4 bg-zinc-950/20 border border-zinc-900/50 rounded-xl text-[11px] text-zinc-500 italic">
                  Not joined any communities yet. Join some below!
                </div>
              )}
            </div>
          </div>

          {/* Popular Communities */}
          <div className="space-y-3">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 px-1">
              Popular Communities
            </h3>

            <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
              {filteredPopular.map(renderCommunityCard)}

              {filteredPopular.length === 0 && (
                <div className="text-center py-6 px-4 bg-zinc-950/20 border border-zinc-900/50 rounded-xl text-[11px] text-zinc-500 italic">
                  No popular communities found.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right column (Feed) */}
        <div className="lg:col-span-8 flex flex-col space-y-5">
          <div className="flex justify-between items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-900">
            <h3 className="text-sm font-black text-white">Community Feed</h3>
            <button 
              onClick={() => setIsCreatingPost(true)}
              className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow cursor-pointer border-0 flex items-center gap-2"
            >
              <Plus size={14} /> Create Post
            </button>
          </div>

          <div className="space-y-4">
            {filteredPostsFeed.length > 0 ? (
              filteredPostsFeed.map(post => (
                <div key={post.id} className="bg-zinc-950 border border-zinc-900 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">{post.author}</div>
                      <div className="text-[11px] font-semibold text-zinc-500">{post.communityName} • {post.timestamp}</div>
                    </div>
                    {/* Delete Post Button */}
                    {currentUser && (currentUser.id === post.authorId || currentUser.id === communities.find(c => c.id === post.communityId)?.creator_id) && (
                      <button
                        onClick={() => handleDeletePost(post.communityId, post.id)}
                        disabled={pendingActions[`delete-post-${post.id}`]}
                        className={`ml-auto p-2 text-zinc-500 hover:text-red-400 bg-zinc-900/50 hover:bg-red-900/20 rounded-xl transition cursor-pointer border border-transparent hover:border-red-900/30 ${pendingActions[`delete-post-${post.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Delete Post"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-bold text-white text-base">{post.title}</h4>
                    <p className="text-sm text-zinc-300">{post.content}</p>
                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="Post Attachment" className="w-full max-h-[400px] object-cover rounded-xl mt-3 border border-zinc-800" />
                    )}
                    
                    {post.poll && (
                      <div className="mt-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
                        <h5 className="font-bold text-sm text-white mb-3">{post.poll.question}</h5>
                        <div className="space-y-2">
                          {(post.poll.options || []).map((opt, i) => {
                            const totalVotes = (post.poll!.options || []).reduce((sum, o) => sum + o.votes, 0) || 1;
                            const percent = Math.round((opt.votes / totalVotes) * 100);
                            return (
                              <div key={i} className="relative group cursor-pointer" onClick={() => handleVotePoll(post.id, i)}>
                                <div className="absolute inset-0 bg-zinc-800 rounded-lg overflow-hidden">
                                  <div className="h-full bg-amber-500/20 transition-all" style={{ width: `${percent}%` }}></div>
                                </div>
                                <div className="relative z-10 px-4 py-2 flex justify-between text-xs font-semibold text-slate-200">
                                  <span>{opt.text}</span>
                                  <span className="text-amber-500">{percent}%</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-4 pt-4 border-t border-zinc-900 text-xs font-bold text-zinc-400">
                    <button 
                      onClick={() => handleToggleLikePost(post.id)}
                      className={`flex items-center gap-1.5 transition cursor-pointer bg-transparent border-0 ${post.isLiked ? 'text-rose-500' : 'hover:text-rose-400'}`}
                    >
                      <Heart size={15} className={post.isLiked ? 'fill-current' : ''} /> {post.likes}
                    </button>
                    <button 
                      onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                      className="flex items-center gap-1.5 hover:text-white transition cursor-pointer bg-transparent border-0"
                    >
                      <MessageCircle size={15} /> {post.repliesCount}
                    </button>
                  </div>

                  {activeCommentPostId === post.id && (
                    <div className="pt-4 border-t border-zinc-900 space-y-4 animate-fade-in">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          placeholder="Add a comment..."
                          value={tempCommentText}
                          onChange={(e) => setTempCommentText(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-amber-500/50 text-white"
                        />
                        <button 
                          onClick={() => handleCommentSubmit(post.id)}
                          disabled={!tempCommentText.trim() || pendingActions[`comment-${post.id}`]}
                          className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white px-4 rounded-xl text-xs font-bold transition cursor-pointer border-0"
                        >
                          {pendingActions[`comment-${post.id}`] ? 'Replying...' : 'Reply'}
                        </button>
                      </div>
                      
                      <div className="space-y-3">
                        {post.commentsList?.map(c => {
                          const renderCommentNode = (node: CommunityComment, level: number = 0) => (
                            <div key={node.id} className={`${level > 0 ? 'ml-6 mt-2 border-l-2 border-zinc-800 pl-4' : 'bg-zinc-900/50 p-3 rounded-xl'}`}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold text-amber-500">{node.author}</span>
                                <span className="text-[10px] text-zinc-500">{node.timestamp}</span>
                              </div>
                              <div className="flex justify-between items-start gap-4">
                                <p className="text-xs text-zinc-300">{node.content}</p>
                                <div className="flex gap-2">
                                  {level < 2 && (
                                    <button
                                      onClick={() => setActiveReplyCommentId(activeReplyCommentId === node.id ? null : node.id)}
                                      className="text-[10px] font-bold text-zinc-500 hover:text-amber-500 transition cursor-pointer bg-transparent border-0"
                                    >
                                      Reply
                                    </button>
                                  )}
                                  {currentUser && (currentUser.id === node.authorId || currentUser.id === post.authorId || currentUser.id === communities.find(comm => comm.id === post.communityId)?.creator_id) && (
                                    <button
                                      onClick={() => handleDeleteComment(post.communityId, post.id, node.id)}
                                      disabled={pendingActions[`delete-comment-${node.id}`]}
                                      className={`p-1 text-zinc-600 hover:text-red-400 bg-transparent rounded-lg transition cursor-pointer ${pendingActions[`delete-comment-${node.id}`] ? 'opacity-50 cursor-not-allowed' : ''}`}
                                      title="Delete Comment"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {activeReplyCommentId === node.id && (
                                <div className="flex gap-2 mt-3 animate-fade-in">
                                  <input
                                    type="text"
                                    placeholder="Write a reply..."
                                    value={tempReplyText}
                                    onChange={(e) => setTempReplyText(e.target.value)}
                                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-amber-500/50 text-white"
                                  />
                                  <button 
                                    onClick={() => handleCommentSubmit(post.id, node.id)}
                                    disabled={!tempReplyText.trim() || pendingActions[`reply-${node.id}`]}
                                    className="bg-amber-600 hover:bg-amber-500 disabled:bg-amber-600/50 text-white px-3 rounded-lg text-[10px] font-bold transition cursor-pointer border-0"
                                  >
                                    {pendingActions[`reply-${node.id}`] ? 'Replying...' : 'Reply'}
                                  </button>
                                </div>
                              )}

                              {node.replies && node.replies.length > 0 && (
                                <div className="mt-2">
                                  {node.replies.map(reply => renderCommentNode(reply, level + 1))}
                                </div>
                              )}
                            </div>
                          );
                          return renderCommentNode(c);
                        })}
                      </div>
                    </div>
                  )}

                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl bg-zinc-950/50">
                <MessageCircle size={32} className="mx-auto text-zinc-700 mb-3" />
                <h3 className="text-white font-bold mb-1">No Posts Yet</h3>
                <p className="text-xs text-zinc-500 mb-4">Be the first to start a discussion in these communities.</p>
                <button 
                  onClick={() => setIsCreatingPost(true)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer border-0"
                >
                  Create Post
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE COMMUNITY MODAL */}
      {isCreatingCommunity && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setIsCreatingCommunity(false)}
        >
          <form 
            onSubmit={handleCreateCommunitySubmit}
            className="w-full max-w-md bg-zinc-950 border border-zinc-850 rounded-2xl p-6 space-y-4.5 relative animate-zoomIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => setIsCreatingCommunity(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base md:text-lg font-black text-white">Create Community</h3>
            </div>

            <div className="space-y-3.5 pt-1 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Community Name *</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Fantasy Worlds"
                  value={newCommName}
                  onChange={(e) => setNewCommName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 placeholder-zinc-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Description *</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="What is the concept of this community?"
                  value={newCommDesc}
                  onChange={(e) => setNewCommDesc(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 placeholder-zinc-500 font-sans"
                />
              </div>

              <div className="flex items-center gap-3 pt-1 select-none">
                <input 
                  type="checkbox"
                  id="make-comm-private-check"
                  checked={newCommPrivate}
                  onChange={(e) => setNewCommPrivate(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 bg-zinc-900 border-zinc-800 rounded cursor-pointer"
                />
                <label htmlFor="make-comm-private-check" className="font-bold text-zinc-350 cursor-pointer text-xs">
                  Private Group (invitation-only membership)
                </label>
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 text-xs font-bold">
              <button 
                type="button" 
                onClick={() => setIsCreatingCommunity(false)}
                className="px-4.5 py-2.5 hover:bg-zinc-900 rounded-xl text-zinc-400 bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newCommName.trim()}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  isSubmitting || !newCommName.trim()
                    ? 'bg-blue-600/50 text-white/50 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white cursor-pointer'
                }`}
              >
                {isSubmitting ? 'Creating...' : 'Create Community'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* CREATE POST STREAM MODAL */}
      {isCreatingPost && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn"
          onClick={() => setIsCreatingPost(false)}
        >
          <form 
            onSubmit={handleCreatePostSubmit}
            className="w-full max-w-lg bg-zinc-950 border border-zinc-850 rounded-2xl p-6 space-y-4 relative animate-zoomIn"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              type="button" 
              onClick={() => setIsCreatingPost(false)}
              className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base md:text-lg font-black text-white">Share a Post</h3>
            </div>

            <div className="space-y-3.5 pt-1 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Target Community *</label>
                <select
                  value={newPostCommId}
                  onChange={(e) => setNewPostCommId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 text-slate-100 text-xs py-2.5 px-3 rounded-xl focus:outline-none cursor-pointer"
                >
                  {communities.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.isJoined ? '(Joined)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Post Title *</label>
                <input 
                  type="text"
                  required
                  placeholder="What is your post topic?"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 placeholder-zinc-500 font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-zinc-400 block">Post Content (Optional)</label>
                <textarea 
                  rows={4}
                  placeholder="Elaborate your ideas..."
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3.5 outline-none focus:border-amber-500/40 text-slate-100 font-sans"
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-900 text-xs font-bold">
              <button 
                type="button" 
                onClick={() => setIsCreatingPost(false)}
                className="px-4.5 py-2.5 hover:bg-zinc-900 rounded-xl text-zinc-400 bg-transparent border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-450 text-white cursor-pointer active:scale-97 border-0 transition"
              >
                Publish Post
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
