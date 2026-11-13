import React, { useState, useEffect } from 'react';
import { Eye, Heart, Calendar, Users, CheckCircle2 } from 'lucide-react';
import UserAvatar from './UserAvatar';
import { fetchPublicProfile, fetchPublicStories, fetchFollowersList, fetchFollowingList, fetchPublicReadingLists, followUser, unfollowUser, PublicProfile, FollowerUser } from '../lib/api/users';
import { Story, ReadingList } from '../types';

interface PublicProfileViewProps {
  userId: string;
  setView: (view: string) => void;
  setSelectedStoryId: (id: string) => void;
  currentUserId?: string;
}

export default function PublicProfileView({ 
  userId, 
  setView, 
  setSelectedStoryId,
  currentUserId
}: PublicProfileViewProps) {
  
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [readingLists, setReadingLists] = useState<ReadingList[]>([]);
  const [followers, setFollowers] = useState<FollowerUser[]>([]);
  const [following, setFollowing] = useState<FollowerUser[]>([]);
  
  const [activeSubTab, setActiveSubTab] = useState<'stories' | 'about' | 'lists' | 'following'>('stories');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    Promise.all([
      fetchPublicProfile(userId),
      fetchPublicStories(userId).catch(() => []),
      fetchPublicReadingLists(userId).catch(() => []),
      fetchFollowersList(userId).catch(() => []),
      fetchFollowingList(userId).catch(() => [])
    ]).then(([profRes, storiesRes, listsRes, followersRes, followingRes]) => {
      if (!mounted) return;
      setProfile(profRes);
      setStories(storiesRes);
      setReadingLists(listsRes);
      setFollowers(followersRes);
      setFollowing(followingRes);
    }).catch(err => {
      console.error(err);
      if (mounted) setError('Failed to load profile.');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    
    return () => { mounted = false; };
  }, [userId]);

  const handleFollowToggle = async () => {
    if (!currentUserId || !profile) return;
    try {
      const res = profile.is_following_viewer 
        ? await unfollowUser(profile.id)
        : await followUser(profile.id);
      setProfile({
        ...profile,
        is_following_viewer: res.is_following,
        followers_count: res.followers_count
      });
    } catch (err) {
      console.error("Failed to follow", err);
    }
  };

  if (loading) {
    return <div className="text-center p-12 text-slate-400">Loading profile...</div>;
  }
  
  if (error || !profile) {
    return <div className="text-center p-12 text-red-400">{error || 'Profile not found'}</div>;
  }

  const joinDate = profile.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown';

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6 select-none animate-fade-in" id="public-profile-view">
      
      {/* 1. COMPACT CREATOR BANNER COVER & AVATAR COMBINATION */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0a0b0d] border border-slate-850 shadow-md">
        {/* Banner container */}
        <div className="h-44 md:h-56 w-full relative overflow-hidden bg-slate-900">
          <img 
            src={'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=1200&auto=format&fit=crop'} 
            alt="Profile Banner" 
            className="w-full h-full object-cover brightness-[0.7]"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent h-28" />
        </div>

        {/* Profile Avatar overlapping banner */}
        <div className="px-6 md:px-10 pb-6 pt-16 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="absolute -top-14 md:-top-16 left-1/2 md:left-10 transform -translate-x-1/2 md:translate-x-0 relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#0b0c10] overflow-hidden shadow-lg bg-slate-950">
              <UserAvatar 
                src={profile.profile_image || ''} 
                name={profile.display_name || profile.username} 
                size="xl" 
                className="w-full h-full object-cover" 
              />
            </div>
          </div>

          {/* Author Basic Information */}
          <div className="flex-1 text-center md:text-left space-y-1.5 md:pl-6 leading-normal select-text">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {profile.display_name || profile.username}
              </h1>
              <span className="text-xs text-slate-450 font-semibold font-mono self-center">
                @{profile.username}
              </span>
            </div>
            
            {profile.bio && (
              <p className="text-xs text-slate-300 max-w-lg italic font-sans">
                "{profile.bio}"
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] text-slate-500 font-mono mt-2">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Joined {joinDate}</span>
            </div>
          </div>

          <div className="flex gap-3 shrink-0 self-center">
            {!profile.is_own_profile && currentUserId && (
              <button
                onClick={handleFollowToggle}
                className={`flex items-center justify-center gap-1.5 py-2 px-6 text-xs font-bold rounded-xl transition cursor-pointer shadow-md ${
                  profile.is_following_viewer 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                    : 'bg-violet-600 hover:bg-violet-500 text-white'
                }`}
              >
                {profile.is_following_viewer ? (
                  <>
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    Following
                  </>
                ) : (
                  <>
                    <Users size={13} />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC BROAD VISUAL STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-[#0d0d0d] border border-slate-850 p-4 rounded-xl shadow-sm text-center">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Published</span>
          <span className="text-lg font-black text-white font-mono block">{profile.public_story_count}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Followers</span>
          <span className="text-lg font-black text-amber-500 font-mono block">{profile.followers_count.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Following</span>
          <span className="text-lg font-black text-rose-500 font-mono block">{profile.following_count.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Reading Lists</span>
          <span className="text-lg font-black text-[#5fc3e4] font-mono block">{profile.public_reading_list_count}</span>
        </div>
      </div>

      {/* 4. HUB LAYOUT COLUMN NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left font-sans">
        
        {/* LEFT COLUMN: HUB SUB-TABS */}
        <div className="md:col-span-3 space-y-1">
          {[
            { id: 'stories', label: '✍️ Stories', count: stories.length },
            { id: 'about', label: '📖 About Author', count: null },
            { id: 'lists', label: '📚 Reading Lists', count: readingLists.length },
            { id: 'following', label: '👥 Network', count: followers.length + following.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-between transition cursor-pointer border ${
                activeSubTab === tab.id
                  ? 'bg-blue-600/10 border-blue-500/20 text-blue-300 font-extrabold'
                  : 'bg-[#0d0d0d] hover:bg-[#111] border-transparent text-slate-450'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="font-mono text-[10px] bg-black/60 px-2 py-0.5 rounded-full text-slate-400">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* RIGHT COLUMN: DETAIL VIEWPORTS */}
        <div className="md:col-span-9 bg-[#0d0d0d] border border-slate-850 rounded-xl p-5 md:p-6 shadow-sm min-h-[300px]">
          
          {/* A. STORIES TAB VIEW */}
          {activeSubTab === 'stories' && (
            <div className="space-y-4 animate-fade-in animate-duration-150">
              <div className="flex justify-between items-center select-none pb-2 border-b border-slate-850">
                <h3 className="font-extrabold text-white text-sm font-sans flex items-center gap-2">
                  Stories by {profile.display_name || profile.username}
                </h3>
              </div>

              {stories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {stories.map(story => (
                    <div 
                      key={story.id}
                      onClick={() => {
                        setSelectedStoryId(story.id);
                        setView('public-story');
                      }}
                      className="p-4 rounded-xl bg-black border border-slate-850 hover:border-slate-800 transition cursor-pointer flex gap-4 shadow-sm"
                    >
                      {story.coverUrl ? (
                        <img 
                          src={story.coverUrl} 
                          alt={story.title} 
                          referrerPolicy="no-referrer"
                          className="w-16 rounded object-cover aspect-[3/4] border border-slate-900 shrink-0 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-21 bg-gradient-to-tr from-slate-950 to-slate-900 flex items-center justify-center rounded border border-slate-850 text-slate-650 font-extrabold text-[10px] shrink-0 uppercase tracking-widest text-center">
                          No Cover
                        </div>
                      )}
                      
                      <div className="space-y-1.5 min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-extrabold text-slate-200 text-[13px] truncate">{story.title}</h4>
                          <p className="text-[11px] text-slate-450 line-clamp-2 leading-relaxed mt-0.5 font-medium">{story.description}</p>
                        </div>
                        
                        <div className="flex items-center gap-3.5 text-[10px] text-slate-500 font-mono mt-1">
                          <span className="flex items-center gap-0.5"><Eye size={12} /> {(story.views || 0).toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart size={11} className="text-rose-500" /> {(story.likes || 0).toLocaleString()}</span>
                          <span className="ml-auto bg-slate-950/80 border border-slate-850/60 px-2 py-0.5 rounded text-[8.5px] font-extrabold text-slate-400 capitalize">
                            {story.status || 'Ongoing'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center select-none bg-black border border-slate-850 rounded-xl space-y-2">
                  <p className="text-xs text-slate-500">No public stories uploaded yet.</p>
                </div>
              )}
            </div>
          )}

          {/* B. ABOUT AUTHOR STORY BIOGRAPHY */}
          {activeSubTab === 'about' && (
            <div className="space-y-4 animate-fade-in animate-duration-150">
              <div className="flex justify-between items-center select-none pb-2 border-b border-slate-850">
                <h3 className="font-extrabold text-white text-sm font-sans flex items-center gap-2">
                  Author Biography & About Me
                </h3>
              </div>

              <div className="bg-black/60 border border-slate-850 p-5 rounded-xl space-y-4 select-text">
                {profile.aboutMe || profile.about_me || profile.bio ? (
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-serif pr-2">
                    {profile.aboutMe || profile.about_me || profile.bio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">This author hasn’t added an about section yet.</p>
                )}
              </div>
            </div>
          )}

          {/* C. PUBLIC READING LISTS */}
          {activeSubTab === 'lists' && (
            <div className="space-y-4 animate-fade-in animate-duration-150">
              <div className="flex justify-between items-center select-none pb-2 border-b border-slate-850">
                <h3 className="font-extrabold text-white text-sm font-sans flex items-center gap-2">
                  Public Reading Lists
                </h3>
              </div>

              {readingLists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {readingLists.map(list => (
                    <div 
                      key={list.id}
                      className="bg-black/40 border border-slate-850 rounded-xl overflow-hidden flex flex-col transition"
                    >
                      <div className="h-28 relative overflow-hidden bg-slate-900">
                        <img 
                          src={list.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=400&auto=format&fit=crop'} 
                          alt={list.name} 
                          className="w-full h-full object-cover opacity-70 group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent h-16" />
                        <div className="absolute inset-0 p-3.5 flex flex-col justify-end text-left">
                          <h4 className="font-extrabold text-[#f3f4f6] text-xs truncate">
                            {list.name}
                          </h4>
                          <span className="text-[9.5px] text-slate-400 font-mono mt-0.5">
                            {list.storyIds?.length || 0} Stories
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center select-none bg-black border border-slate-850 rounded-xl">
                  <p className="text-xs text-slate-500">No public reading lists yet.</p>
                </div>
              )}
            </div>
          )}

          {/* D. SOCIAL CIRCLE AND FOLLOWING TAB VIEW */}
          {activeSubTab === 'following' && (
            <div className="space-y-6 animate-fade-in animate-duration-150 text-xs">
              
              <div className="space-y-3">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-slate-850/60">
                  <h4 className="font-bold text-slate-400 font-mono text-[10.5px] uppercase tracking-wider">Followers ({followers.length})</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {followers.map(auth => (
                    <div key={auth.id} className="flex items-center gap-3 p-2 rounded-xl bg-black/60 border border-slate-850/40">
                      <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-850 text-violet-300 font-bold font-sans flex items-center justify-center overflow-hidden">
                        <UserAvatar src={auth.profile_image || ''} name={auth.display_name || auth.username} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-200">{auth.display_name || auth.username}</h5>
                        <p className="text-[10px] text-slate-450 truncate leading-snug">@{auth.username}</p>
                      </div>
                    </div>
                  ))}
                  {followers.length === 0 && <p className="text-slate-500">No followers yet.</p>}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-slate-850/60">
                  <h4 className="font-bold text-slate-400 font-mono text-[10.5px] uppercase tracking-wider">Following ({following.length})</h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {following.map(auth => (
                    <div key={auth.id} className="flex items-center gap-3 p-2 rounded-xl bg-black/60 border border-slate-850/40">
                      <div className="w-8 h-8 rounded-full bg-blue-950 border border-blue-850 text-blue-300 font-bold font-mono flex items-center justify-center overflow-hidden">
                        <UserAvatar src={auth.profile_image || ''} name={auth.display_name || auth.username} size="sm" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-200">{auth.display_name || auth.username}</h5>
                        <p className="text-[10px] text-slate-450 truncate leading-snug">@{auth.username}</p>
                      </div>
                    </div>
                  ))}
                  {following.length === 0 && <p className="text-slate-500">Not following anyone yet.</p>}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
