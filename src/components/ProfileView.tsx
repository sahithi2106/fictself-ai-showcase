import React, { useState, useRef, useEffect } from 'react';
import { Story, UserProfile, UserRole, ReadingList } from '../types';
import UserAvatar from './UserAvatar';
import { fetchFollowerCounts } from '../lib/api/users';
import { 
  User, 
  Eye, 
  Heart, 
  Mail, 
  Edit3, 
  Save, 
  Image as ImageIcon, 
  Clock, 
  Sparkles, 
  Upload, 
  Trash2, 
  Users,
  BookOpen,
  Calendar,
  Compass,
  CheckCircle2,
  Bookmark,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { authService } from '../lib/authService';


interface ProfileViewProps {
  stories: Story[];
  setView: (view: string) => void;
  setSelectedStoryId: (id: string) => void;
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
}

export default function ProfileView({ 
  stories, 
  setView, 
  setSelectedStoryId,
  currentUser,
  onUpdateProfile
}: ProfileViewProps) {
  
  // Basic states
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || 'Author');
  const [username, setUsername] = useState(() => {
    return currentUser?.username || currentUser?.email?.split('@')[0] || 'author';
  });
  const [shortBio, setShortBio] = useState(currentUser?.bio || 'Capturing mechanical neon cybernetics and cozy worlds.');
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  
  // Custom cover banner state persists locally
  const [coverImage, setCoverImage] = useState(() => {
    try {
      const stored = localStorage.getItem(`fictself_profile_cover_${currentUser?.id || 'temp'}`);
      return stored || 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=1200&auto=format&fit=crop';
    } catch (e) {
      return 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?q=80&w=1200&auto=format&fit=crop';
    }
  });

  // Long personal bio/about section states
  const [aboutBio, setAboutBio] = useState(() => {
    return currentUser?.aboutMe || currentUser?.bio || '';
  });

  // Social metrics
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => {
    if (currentUser?.id) {
      fetchFollowerCounts(currentUser.id)
        .then(res => {
          setFollowersCount(res.followers_count);
          setFollowingCount(res.following_count);
        })
        .catch(err => console.error("Failed to fetch follower counts:", err));
    }
  }, [currentUser?.id]);

  // Active tab selection inside user's profile: 'stories' | 'about' | 'lists' | 'following'
  const [activeSubTab, setActiveSubTab] = useState<'stories' | 'about' | 'lists' | 'following'>('stories');
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Sync state if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || 'Author');
      setShortBio(currentUser.bio || 'Capturing mechanical neon cybernetics and cozy worlds.');
      setAboutBio(currentUser.aboutMe || currentUser.bio || '');
      setProfileImage(currentUser.profileImage || '');
      setUsername(currentUser.username || currentUser.email?.split('@')[0] || 'author');
    }
  }, [currentUser]);

  // Filter creator stories
  const authorStories = stories.filter(s => {
    if (!currentUser) return s.authorId === 'user-writer-1';
    return s.authorId === currentUser.id;
  });

  const totalViews = authorStories.reduce((sum, s) => sum + s.views, 0);
  const totalLikes = authorStories.reduce((sum, s) => sum + s.likes, 0);

  const [userReadingLists, setUserReadingLists] = useState<ReadingList[]>([]);
  useEffect(() => {
    try {
      const key = currentUser ? `fictself_reading_lists_${currentUser.id}` : 'fictself_reading_lists_anon';
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as ReadingList[];
        const fakeIds = new Set(['rl-1', 'rl-2', 'rl-3', 'rl-4']);
        const fakeNames = new Set(['Fantasy Worlds', 'Books To Read', 'Romance Favorites', 'Summer Reads']);
        const validLists = parsed.filter(rl => 
          rl && rl.id && rl.name && 
          !fakeIds.has(rl.id) && 
          !fakeNames.has(rl.name)
        );
        setUserReadingLists(validLists);
      } else {
        setUserReadingLists([]);
      }
    } catch (e) {
      setUserReadingLists([]);
    }
  }, []);

  // Handle Avatar image upload
  const handleAvatarFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file.');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setProfileImage(event.target.result);
          setUploadError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Cover Banner image upload
  const handleCoverFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setUploadError('Please select a valid image file for the banner.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          setCoverImage(event.target.result);
          try {
            localStorage.setItem(`fictself_profile_cover_${currentUser?.id || 'temp'}`, event.target.result);
          } catch (e) {}
          setUploadError(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    setSuccessMsg(null);
    try {
      let finalProfileImage = profileImage;
      if (avatarFile) {
        const token = localStorage.getItem('fictself_access_token');
        if (token) {
          const { apiUploadAvatar } = await import('../lib/api/auth');
          const tempUser = await apiUploadAvatar(avatarFile, token);
          if (tempUser.profileImage) {
            finalProfileImage = tempUser.profileImage;
          }
        }
      }

      // Save primary profile parameters
      const updated = await authService.updateProfile(currentUser.id, {
        displayName,
        bio: shortBio,
        aboutMe: aboutBio,
        profileImage: finalProfileImage,
        role: currentUser.role
      });
      onUpdateProfile({
        ...updated,
        username
      });

      // Save secondary profile parameters in localStorage
      localStorage.setItem(`fictself_profile_cover_${currentUser.id}`, coverImage);

      setIsEditing(false);
      setSuccessMsg('Your story platform profile has been seamlessly updated!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      console.error(err);
      setUploadError('Could not save profile changes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const joinDate = currentUser?.createdAt 
    ? new Date(currentUser.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'June 2026';

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6 select-none animate-fade-in" id="fictself-profile-view">
      
      {successMsg && (
        <div className="py-3 px-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[#a2e9c1] text-xs font-semibold animate-fade-in flex items-center gap-2">
          <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {uploadError && (
        <div className="py-3 px-4 rounded-xl bg-red-950/40 border border-red-500/20 text-red-400 text-xs font-semibold animate-fade-in">
          ⚠️ {uploadError}
        </div>
      )}

      {/* 1. COMPACT CREATOR BANNER COVER & AVATAR COMBINATION */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0a0b0d] border border-slate-850 shadow-md">
        {/* Banner container */}
        <div className="h-44 md:h-56 w-full relative overflow-hidden bg-slate-900">
          <img 
            src={coverImage} 
            alt="Profile Banner" 
            className="w-full h-full object-cover brightness-[0.7]"
            referrerPolicy="no-referrer"
          />
          {/* Overlay to dim under text/buttons */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent h-28" />
          
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-4 right-4 bg-black/60 hover:bg-black/85 backdrop-blur-md text-white font-sans text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-800 transition flex items-center gap-1.5 cursor-pointer"
            title="Upload new banner image"
          >
            <ImageIcon size={13} />
            Change Cover
          </button>
          
          <input 
            type="file" 
            ref={coverInputRef} 
            onChange={handleCoverFile} 
            accept="image/*" 
            className="hidden" 
          />
        </div>

        {/* Profile Avatar overlapping banner */}
        <div className="px-6 md:px-10 pb-6 pt-16 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="absolute -top-14 md:-top-16 left-1/2 md:left-10 transform -translate-x-1/2 md:translate-x-0 relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-[#0b0c10] overflow-hidden shadow-lg bg-slate-950">
              <UserAvatar 
                src={profileImage} 
                name={displayName} 
                size="xl" 
                className="w-full h-full object-cover" 
              />
            </div>
            
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="absolute bottom-1 right-1 bg-violet-600 hover:bg-violet-500 hover:scale-105 border-2 border-[#0b0c10] rounded-full p-2 text-white transition cursor-pointer shadow-md"
              title="Upload profile photo"
            >
              <Upload size={12} />
            </button>
            
            <input 
              type="file" 
              ref={avatarInputRef} 
              onChange={handleAvatarFile} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          {/* Author Basic Information */}
          <div className="flex-1 text-center md:text-left space-y-1.5 md:pl-6 leading-normal select-text">
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                {displayName}
              </h1>
              <span className="text-xs text-slate-450 font-semibold font-mono self-center">
                @{username}
              </span>
            </div>
            
            <p className="text-xs text-slate-300 max-w-lg italic font-sans">
              "{shortBio}"
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-[11px] text-slate-500 font-mono mt-2">
              <span className="flex items-center gap-1.5"><Calendar size={12} /> Member since {joinDate}</span>
              <span className="hidden md:inline">•</span>
              <span className="flex items-center gap-1.5"><Mail size={12} /> {currentUser?.email || 'author@example.com'}</span>
            </div>
          </div>

          <div className="flex gap-3 shrink-0 self-center">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-bold rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950 hover:bg-[#111] text-slate-200 transition cursor-pointer"
            >
              <Edit3 size={13} />
              {isEditing ? 'Cancel Editing' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC BROAD VISUAL STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#0d0d0d] border border-slate-850 p-4 rounded-xl shadow-sm text-center">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Stories Published</span>
          <span className="text-lg font-black text-white font-mono block">{authorStories.filter(s => s.isPublished).length}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Followers</span>
          <span className="text-lg font-black text-amber-500 font-mono block">{followersCount.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Following</span>
          <span className="text-lg font-black text-rose-500 font-mono block">{followingCount.toLocaleString()}</span>
        </div>
        <div className="space-y-0.5 border-l border-slate-900">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono font-bold block">Reading Lists</span>
          <span className="text-lg font-black text-[#5fc3e4] font-mono block">{userReadingLists.length}</span>
        </div>
      </div>

      {/* 3. PROFILE DETAILS EDIT BLOCK */}
      {isEditing && (
        <form onSubmit={handleSaveProfile} className="bg-[#0b0c10] border border-slate-850 rounded-xl p-6 shadow-sm space-y-4 text-left">
          <div className="border-b border-slate-850 pb-3 flex justify-between items-center">
            <h3 className="font-bold text-[#e2e8f0] text-sm flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <Edit3 size={13} className="text-violet-400" />
              Edit Profile Settings
            </h3>
            <span className="text-[10.5px] text-slate-500 font-mono">SOCIAL IDENTITY LAYER</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-400 font-mono block uppercase text-[10px] tracking-wide">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                maxLength={40}
                className="w-full h-10 px-3 rounded-lg border border-slate-850 bg-black text-[#e2e8f0] focus:border-violet-500 focus:outline-none transition font-sans"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-slate-400 font-mono block uppercase text-[10px] tracking-wide">Username handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-550 font-mono">@</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  required
                  maxLength={30}
                  className="w-full h-10 pl-7 pr-3 rounded-lg border border-slate-850 bg-black text-[#e2e8f0] focus:border-violet-500 focus:outline-none transition font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-extrabold text-slate-400 font-mono block uppercase text-[10px] tracking-wide">Short Tagline Bio (One-liner)</label>
            <input
              type="text"
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              placeholder="e.g. Dreamer, writer, and tea lover..."
              maxLength={120}
              className="w-full h-10 px-3 rounded-lg border border-slate-850 bg-black text-[#e2e8f0] focus:border-violet-500 focus:outline-none transition leading-relaxed font-sans"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-extrabold text-slate-400 font-mono block uppercase text-[10px] tracking-wide">About Me Biography</label>
            <textarea
              value={aboutBio}
              onChange={(e) => setAboutBio(e.target.value)}
              rows={5}
              placeholder="Tell readers about who you are, what drives your plots, and your publication goals..."
              className="w-full p-3 rounded-lg border border-slate-850 bg-black text-[#e2e8f0] focus:border-violet-500 focus:outline-none transition font-sans leading-relaxed"
            />
            <div className="flex justify-between font-mono text-[9px] text-slate-500 mt-1 select-none">
              <span>Supports comprehensive human-readable paragraphs</span>
              <span>{aboutBio.length} characters written</span>
            </div>
          </div>



          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 text-xs font-bold text-slate-450 hover:text-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs select-none shadow-md transition cursor-pointer flex items-center gap-1.5"
            >
              <Save size={12} />
              Save Creator Profile
            </button>
          </div>
        </form>
      )}

      {/* 4. HUB LAYOUT COLUMN NAVIGATION */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-left font-sans">
        
        {/* LEFT COLUMN: HUB SUB-TABS */}
        <div className="md:col-span-3 space-y-1">
          {[
            { id: 'stories', label: '✍️ My Stories', count: authorStories.length },
            { id: 'about', label: '📖 About Author', count: null },
            { id: 'lists', label: '📚 Reading Lists', count: userReadingLists.length },
            { id: 'following', label: '👥 Social Circle', count: null },
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
          
          {/* A. MY STORIES TAB VIEW */}
          {activeSubTab === 'stories' && (
            <div className="space-y-4 animate-fade-in animate-duration-150">
              <div className="flex justify-between items-center select-none pb-2 border-b border-slate-850">
                <h3 className="font-extrabold text-white text-sm font-sans flex items-center gap-2">
                  Stories Written By {displayName}
                </h3>
              </div>

              {authorStories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {authorStories.map(story => (
                    <div 
                      key={story.id}
                      onClick={() => {
                        setSelectedStoryId(story.id);
                        setView('story-dashboard');
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
                          <span className="flex items-center gap-0.5"><Eye size={12} /> {story.views.toLocaleString()}</span>
                          <span className="flex items-center gap-0.5"><Heart size={11} className="text-rose-500" /> {story.likes.toLocaleString()}</span>
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
                  <button
                    onClick={() => setView('new-story-flow')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-300 text-xs font-bold rounded-lg transition"
                  >
                    Create Story Outline &rarr;
                  </button>
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
                <span className="text-[10px] text-slate-500 font-mono">BIOGRAPHY</span>
              </div>

              <div className="bg-black/60 border border-slate-850 p-5 rounded-xl space-y-4 select-text">
                {aboutBio ? (
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-serif pr-2">
                    {aboutBio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic text-center py-4">You haven’t added an about section yet.</p>
                )}
                
                <div className="pt-3 border-t border-slate-900 flex justify-between items-center font-mono text-[9px] text-slate-500 select-none">
                  <span>Author account is verified</span>
                  <span>Created {joinDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* C. COMMUNITY WRITTEN READING LIST BOARD SHELF */}
          {activeSubTab === 'lists' && (
            <div className="space-y-4 animate-fade-in animate-duration-150">
              <div className="flex justify-between items-center select-none pb-2 border-b border-slate-850">
                <h3 className="font-extrabold text-white text-sm font-sans flex items-center gap-2">
                  Public Curated Reading Lists
                </h3>
                <span className="text-[10px] text-slate-550 font-mono">PINTEREST BOARDS</span>
              </div>

              {userReadingLists.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {userReadingLists.map(list => (
                    <div 
                      key={list.id}
                      onClick={() => setView('library')}
                      className="bg-black/40 border border-slate-850 hover:border-slate-800 rounded-xl overflow-hidden flex flex-col cursor-pointer transition"
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
                            {list.storyIds.length} Stories
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center select-none bg-black border border-slate-850 rounded-xl">
                  <p className="text-xs text-slate-500">No public reading boards created yet.</p>
                </div>
              )}
            </div>
          )}

          {/* D. SOCIAL CIRCLE AND FOLLOWING TAB VIEW */}
          {activeSubTab === 'following' && (
            <div className="space-y-6 animate-fade-in animate-duration-150 text-xs">
              
              {/* Followed Authors */}
              <div className="space-y-3">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-slate-850/60">
                  <h4 className="font-bold text-slate-400 font-mono text-[10.5px] uppercase tracking-wider">Followed Authors</h4>
                  <span className="text-[9px] font-mono text-slate-500">AUTHORS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { name: 'Aria Vance', tag: '@Aria_Vance', bio: 'High Fantasy epic writer. Crafting airships.', avatar: 'A' },
                    { name: 'C. Sterling', tag: '@c_sterling', bio: 'Magic and coal engines steam engineer.', avatar: 'C' },
                    { name: 'Gideon Tech', tag: '@gideon_write', bio: 'Building neon cyberspace chronicles.', avatar: 'G' },
                    { name: 'K. Ishiguro', tag: '@k_ishiguro', bio: 'Machine sentiments and slowburn space plots.', avatar: 'K' }
                  ].map(auth => (
                    <div key={auth.tag} className="flex items-center gap-3 p-2 rounded-xl bg-black/60 border border-slate-850/40">
                      <div className="w-8 h-8 rounded-full bg-violet-950 border border-violet-850 text-violet-300 font-bold font-sans flex items-center justify-center">
                        {auth.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-200">{auth.name} <span className="font-mono text-[9px] text-slate-500 font-normal">{auth.tag}</span></h5>
                        <p className="text-[10px] text-slate-450 truncate leading-snug">{auth.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Followed Communities */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center select-none pb-1.5 border-b border-slate-850/60">
                  <h4 className="font-bold text-slate-400 font-mono text-[10.5px] uppercase tracking-wider">Joined Communities</h4>
                  <span className="text-[9px] font-mono text-slate-500">GROUPS</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { name: 'Fantasy Writers', members: '1,240 members', desc: 'A hub for magic systems & world grids' },
                    { name: 'Worldbuilding Club', members: '2,080 members', desc: 'Regional geographic Chronology boards' }
                  ].map(comm => (
                    <div key={comm.name} className="flex items-center gap-3 p-2 rounded-xl bg-black/60 border border-slate-850/40">
                      <div className="w-8 h-8 rounded-lg bg-blue-950 border border-blue-850 text-blue-300 font-bold font-mono flex items-center justify-center">
                        #
                      </div>
                      <div className="min-w-0 flex-1">
                        <h5 className="font-bold text-slate-200">{comm.name}</h5>
                        <p className="text-[10px] text-slate-450 truncate leading-snug">{comm.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
