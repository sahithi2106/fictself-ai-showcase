import React, { useState, useRef } from 'react';
import { 
  Sparkles, Check, ChevronLeft, ChevronRight, UploadCloud, Trash2, 
  BookOpen, Edit2, Compass, AlertTriangle, ShieldCheck, Loader2, Quote 
} from 'lucide-react';
import { UserProfile, UserRole } from '../types';
import { authService } from '../lib/authService';

interface OnboardingWizardProps {
  onboardingUser: UserProfile | null;
  onLoginSuccess: (user: UserProfile) => void;
  onCancel: () => void;
  themeMode: 'light' | 'dark';
}

const GENRE_LIST = [
  'Fantasy', 'Romance', 'Sci-Fi', 'Mystery', 'Thriller', 'Horror', 'Adventure', 
  'Historical Fiction', 'Fanfiction', 'Paranormal', 'Teen Fiction', 'LGBTQ+', 
  'Comedy', 'Drama', 'Action', 'Poetry', 'Short Stories', 'Contemporary', 
  'Dark Fantasy', 'Cyberpunk', 'Steampunk', 'Crime', 'Psychological', 'Slice of Life'
];

const HELP_AREAS = [
  'Character Creation', 
  'Plot Development', 
  'Dialogue Writing', 
  'Worldbuilding', 
  'Story Planning', 
  'Editing', 
  'Everything'
];

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80'
];

export default function OnboardingWizard({
  onboardingUser,
  onLoginSuccess,
  onCancel,
  themeMode
}: OnboardingWizardProps) {
  const isLight = themeMode === 'light';

  // State managers
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingRole, setOnboardingRole] = useState<'Reader' | 'Writer' | 'Both'>('Writer');
  const [onboardingInterests, setOnboardingInterests] = useState<string[]>([]);
  const [onboardingHelp, setOnboardingHelp] = useState<string[]>([]);
  const [username, setUsername] = useState(onboardingUser?.username || '');
  const [displayName, setDisplayName] = useState(onboardingUser?.displayName || '');
  const [onboardingBio, setOnboardingBio] = useState('');
  const [onboardingFavoriteQuote, setOnboardingFavoriteQuote] = useState('');
  const [profileImage, setProfileImage] = useState<string>(onboardingUser?.profileImage || '');

  // File drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status indicators
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const toggleInterest = (genre: string) => {
    if (onboardingInterests.includes(genre)) {
      setOnboardingInterests(onboardingInterests.filter(g => g !== genre));
    } else {
      setOnboardingInterests([...onboardingInterests, genre]);
    }
  };

  const toggleHelp = (area: string) => {
    if (onboardingHelp.includes(area)) {
      setOnboardingHelp(onboardingHelp.filter(h => h !== area));
    } else {
      setOnboardingHelp([...onboardingHelp, area]);
    }
  };

  // Drag handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          if (reader.result) setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleOnboardingNext = async () => {
    setFeedbackError(null);

    if (onboardingStep === 1) {
      setOnboardingStep(2);
      return;
    }

    if (onboardingStep === 2) {
      if (onboardingInterests.length === 0) {
        setFeedbackError('Please select at least one genre to continue.');
        return;
      }
      setOnboardingStep(3);
      return;
    }

    if (onboardingStep === 3) {
      if (onboardingHelp.length === 0) {
        setFeedbackError("Please select at least one creative help area.");
        return;
      }
      setOnboardingStep(4);
      return;
    }

    if (onboardingStep === 4) {
      if (!username.trim()) {
        setFeedbackError('Please enter a username.');
        return;
      }
      if (username.length < 3) {
        setFeedbackError('Username must contain at least 3 characters.');
        return;
      }
      if (!onboardingBio.trim()) {
        setFeedbackError('Please write a short bio to complete your profile.');
        return;
      }
      setOnboardingStep(5);
      return;
    }

    if (onboardingStep === 5) {
      setLoading(true);
      try {
        const userId = onboardingUser?.id || 'new-user-' + Math.random().toString(36).substr(2, 9);
        const finalRole: UserRole = onboardingRole === 'Both' ? 'Writer' : onboardingRole;
        const cleanUsername = username.toLowerCase().trim();

        // Build the enriched user profile from data already available:
        //   - onboardingUser: real UserProfile returned by register/login API
        //   - wizard form fields: bio, role, interests, avatar chosen during onboarding
        //
        // We do NOT call authService.updateProfile() here because:
        //   a) the backend User model has no bio/role/interests columns yet
        //   b) the mock updateProfile() searches localStorage — real users are NOT there
        const updatedUser: UserProfile = {
          ...(onboardingUser as UserProfile),
          id: userId,
          email: onboardingUser?.email ?? '',
          createdAt: onboardingUser?.createdAt ?? new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          isActive: true,
          username: cleanUsername,
          displayName: displayName.trim() || cleanUsername,
          role: finalRole,
          bio: onboardingBio.trim(),
          profileImage:
            profileImage ||
            `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
          interests: onboardingInterests,
          followers: 0,
          following: 0,
          publishedStoriesCount: 0,
          draftStoriesCount: 0,
          favorites: [],
          readingLists: ['Fantasy Essentials', 'Scribe Favorites'],
          achievements: ['New Onboarded Creator', 'Character Architect'],
          isOnboarded: true,
          isVerified: true,
        };

        // Persist enriched profile to session cache so getCurrentUserSync() returns it
        localStorage.setItem('fictself_user_session', JSON.stringify(updatedUser));

        if (onboardingFavoriteQuote.trim()) {
          localStorage.setItem(`fictself_quote_${userId}`, onboardingFavoriteQuote.trim());
        }
        localStorage.setItem(`fictself_help_${userId}`, JSON.stringify(onboardingHelp));

        onLoginSuccess(updatedUser);
      } catch (err: any) {
        setFeedbackError(err.message || 'Failed configuring profile.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOnboardingPrev = () => {
    setFeedbackError(null);
    if (onboardingStep > 1) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const labelStyle = `text-xs font-bold mb-1 block ${isLight ? 'text-slate-800' : 'text-slate-300'}`;
  const inputStyle = `w-full transition duration-150 outline-none rounded-xl text-sm py-2.5 px-3 border ${
    isLight 
      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-violet-600 focus:bg-white' 
      : 'bg-[#0d121f] border-slate-800 text-white focus:border-violet-500 focus:bg-[#0c101c]'
  }`;

  return (
    <div className="space-y-6 select-none animate-fade-in" id="onboarding-wizard">
      {/* Visual Step Progress Header */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
          <span className="text-violet-600 dark:text-violet-400">Step {onboardingStep} of 5</span>
          <span>{Math.round((onboardingStep / 5) * 100)}% Complete</span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden flex gap-1 bg-slate-200 dark:bg-slate-900">
          {[1, 2, 3, 4, 5].map(st => (
            <div 
              key={st} 
              className={`h-full flex-1 transition-all duration-300 ${
                st <= onboardingStep ? 'bg-gradient-to-r from-violet-600 via-indigo-550 to-cyan-500' : 'bg-[#e2e8f0] dark:bg-slate-900'
              }`} 
            />
          ))}
        </div>
      </div>

      {feedbackError && (
        <div className="p-3 bg-red-500/10 border border-red-550/20 text-red-600 dark:text-red-400 text-xs rounded-xl flex items-start gap-2 animate-pulse">
          <AlertTriangle className="shrink-0 mt-0.5" size={14} />
          <span>{feedbackError}</span>
        </div>
      )}

      {/* STEP 1: What brings you to FictSelf? */}
      {onboardingStep === 1 && (
        <div className="space-y-4 animate-slide-in">
          <div className="space-y-1 text-left">
            <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>What brings you to Fictself AI?</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Customize your storytelling and reading interfaces.</p>
          </div>

          <div className="space-y-3 pt-1">
            {[
              {
                role: 'Writer',
                icon: <Edit2 size={16} className="text-violet-600 dark:text-violet-400" />,
                title: 'I want to write stories',
                desc: 'Create novels, characters, worldbuilding, and drafts.'
              },
              {
                role: 'Reader',
                icon: <BookOpen size={16} className="text-cyan-600 dark:text-cyan-400" />,
                title: 'I mostly read stories',
                desc: 'Discover authors, save stories, and build reading lists.'
              },
              {
                role: 'Both',
                icon: <Compass size={16} className="text-amber-500" />,
                title: 'Both',
                desc: 'Write your own stories and discover stories from others.'
              }
            ].map(item => {
              const active = onboardingRole === item.role;
              return (
                <div 
                  key={item.role}
                  onClick={() => setOnboardingRole(item.role as any)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition relative overflow-hidden ${
                    active 
                      ? 'bg-violet-500/5 dark:bg-violet-950/10 border-violet-500' 
                      : isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100' 
                        : 'bg-[#0d121f] border-slate-800 text-slate-450 hover:border-slate-700'
                  }`}
                >
                  <div className="flex gap-3.5 items-start">
                    <div className={`p-2 rounded-lg shrink-0 ${isLight ? 'bg-white shadow-xs' : 'bg-[#090c15]'}`}>{item.icon}</div>
                    <div className="space-y-1">
                      <h4 className={`font-bold text-xs ${
                        active 
                          ? isLight ? 'text-violet-800' : 'text-violet-350' 
                          : isLight ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {item.title}
                      </h4>
                      <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{item.desc}</p>
                    </div>
                  </div>
                  {active && (
                    <div className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center bg-violet-600 text-white rounded-bl-xl shadow-sm">
                      <Check size={11} className="stroke-[3]" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 2: Choose your favorite genres */}
      {onboardingStep === 2 && (
        <div className="space-y-4 animate-slide-in text-left">
          <div className="space-y-1 text-left">
            <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Choose your favorite genres</h3>
            <p className={`text-xs ${isLight ? 'text-slate-550' : 'text-slate-450'}`}>Select at least one genre to find stories and tailor your experience.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 max-h-60 overflow-y-auto pr-1">
            {GENRE_LIST.map((genre) => {
              const active = onboardingInterests.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleInterest(genre)}
                  className={`px-3 py-2 rounded-xl border text-[11px] font-bold text-center transition cursor-pointer select-none truncate ${
                    active
                      ? isLight 
                        ? 'bg-violet-100 border-violet-500 text-violet-800' 
                        : 'bg-violet-950/20 border-violet-550 text-violet-300'
                      : isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-850' 
                        : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {active ? '✓ ' : ''}{genre}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: What would you like help with? */}
      {onboardingStep === 3 && (
        <div className="space-y-4 animate-slide-in text-left">
          <div className="space-y-1 text-left">
            <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>What would you like help with?</h3>
            <p className={`text-xs ${isLight ? 'text-slate-550' : 'text-slate-450'}`}>We\'ll customize your AI Writing Companion recommendations.</p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {HELP_AREAS.map((area) => {
              const active = onboardingHelp.includes(area);
              return (
                <button
                  key={area}
                  type="button"
                  onClick={() => toggleHelp(area)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-semibold tracking-wide transition cursor-pointer ${
                    active
                      ? isLight 
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-850' 
                        : 'bg-indigo-950/30 border-indigo-550 text-indigo-300 shadow'
                      : isLight 
                        ? 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100' 
                        : 'bg-[#0d121f] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  {active ? '✓ ' : ''}{area}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Create Your Profile */}
      {onboardingStep === 4 && (
        <div className="space-y-4 animate-slide-in text-left">
          <div className="space-y-1 text-left">
            <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>Create Your Profile</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Bring your identity to the creative community.</p>
          </div>

          {/* Avatar Picture Upload Frame */}
          <div className="flex flex-col items-center gap-3 py-1">
            {profileImage ? (
              <div className="relative">
                <img 
                  src={profileImage} 
                  alt="Avatar preview" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-violet-500 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => setProfileImage('')}
                  className="absolute bottom-0 right-0 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`w-16 h-16 rounded-full border border-dashed flex flex-col items-center justify-center cursor-pointer transition ${
                  isLight ? 'bg-slate-50 border-slate-350 hover:border-violet-500' : 'bg-slate-900 border-slate-800 hover:border-violet-400'
                }`}
              >
                <UploadCloud size={20} className="text-violet-500" />
                <span className="text-[8px] font-bold text-slate-500 mt-0.5 font-mono uppercase">Upload</span>
              </div>
            )}

            <div className="w-full flex flex-col gap-2">
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-2.5 border border-dashed rounded-xl cursor-pointer text-center text-[11px] transition ${
                  isDragging 
                    ? 'border-violet-500 bg-violet-500/5' 
                    : isLight 
                      ? 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300' 
                      : 'bg-[#0b0d14] border-slate-850 hover:border-slate-700'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <p className="font-bold">
                  {profileImage ? 'Replace Image' : 'Drag profile picture here or click to browse'}
                </p>
              </div>

              {/* Presets Grid */}
              <div className="flex justify-center items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 font-mono font-medium block uppercase mr-1">Presets:</span>
                {AVATAR_PRESETS.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setProfileImage(img)}
                    className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${
                      profileImage === img ? 'border-violet-500 scale-110 ring-2 ring-violet-500/20' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={img} alt="preset avatars" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label htmlFor="p-username" className={labelStyle}>Username Handle *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-500 font-mono">@</span>
                <input
                  id="p-username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className={`${inputStyle} pl-6`}
                  placeholder="pen_name"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="p-display" className={labelStyle}>Display Name</label>
              <input
                id="p-display"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={inputStyle}
                placeholder="Pen Name"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="p-bio" className={labelStyle}>About Me (Short Bio statement) *</label>
            <textarea
              id="p-bio"
              required
              value={onboardingBio}
              onChange={(e) => setOnboardingBio(e.target.value)}
              rows={2}
              maxLength={150}
              className={`w-full border rounded-xl p-3 text-xs leading-relaxed transition ${
                isLight 
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white focus:border-violet-605' 
                  : 'bg-[#0d121f] border-slate-800 text-slate-100 focus:bg-[#0c101c] focus:border-violet-500'
              }`}
              placeholder="Tell us about your creative goals or what you love to read..."
            />
            <div className="flex justify-end text-[9px] font-mono text-slate-500">
              <span>{150 - onboardingBio.length} characters left</span>
            </div>
          </div>

          <div className="space-y-1">
            <label htmlFor="p-quote" className={labelStyle}>Favorite Writing Quote (Optional)</label>
            <input
              id="p-quote"
              type="text"
              value={onboardingFavoriteQuote}
              onChange={(e) => setOnboardingFavoriteQuote(e.target.value)}
              className={inputStyle}
              placeholder='"The scariest moment is always just before you start."'
            />
          </div>
        </div>
      )}

      {/* STEP 5: You're Ready! */}
      {onboardingStep === 5 && (
        <div className="space-y-4 animate-slide-in text-center">
          <div className="space-y-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/35 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto animate-bounce mb-2">
              <Check className="stroke-[3]" size={18} />
            </div>
            <h3 className={`text-lg font-extrabold ${isLight ? 'text-slate-900' : 'text-white'}`}>You're Ready!</h3>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Review your information and step into your creative dashboard.</p>
          </div>

          {/* Profile Summary Card */}
          <div className={`p-4 rounded-xl border text-left relative overflow-hidden transition ${
            isLight ? 'bg-slate-50 border-slate-205' : 'bg-black border-slate-850'
          }`}>
            <div className="flex gap-3.5 items-center">
              {profileImage ? (
                <img 
                  src={profileImage} 
                  alt="avatar" 
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-650 flex items-center justify-center text-white text-sm font-bold">
                  {(username || 'P').slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <h4 className={`font-bold text-xs flex items-center gap-1.5 ${isLight ? 'text-slate-950' : 'text-slate-100'}`}>
                  {displayName || username}
                  <span className="bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-300 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase font-bold tracking-wider">
                    {onboardingRole}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 font-mono">@{username}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-900 mt-3 pt-2.5 space-y-1">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500 font-bold block">Bio</span>
              <p className={`text-xs italic leading-normal ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                "{onboardingBio}"
              </p>
            </div>

            {onboardingFavoriteQuote.trim() && (
              <div className="border-t border-slate-200 dark:border-slate-900 mt-2 pt-2 space-y-1 block">
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-550 font-bold block">Favorite Quote</span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">
                  "{onboardingFavoriteQuote}"
                </p>
              </div>
            )}

            <div className="border-t border-slate-200 dark:border-slate-900 mt-2 pt-2 space-y-1.5">
              <span className="text-[9px] uppercase tracking-wider font-mono text-slate-550 font-bold block">Selected Genres</span>
              <div className="flex flex-wrap gap-1">
                {onboardingInterests.map(genre => (
                  <span 
                    key={genre}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight border ${
                      isLight 
                        ? 'bg-violet-50 border-violet-100 text-violet-700' 
                        : 'bg-slate-950 border-slate-800 text-indigo-300'
                    }`}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buttons controls */}
      <div className="flex justify-between items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-900">
        {onboardingStep > 1 ? (
          <button
            type="button"
            onClick={handleOnboardingPrev}
            className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-bold flex items-center gap-1 cursor-pointer select-none"
          >
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition font-bold flex items-center gap-1 cursor-pointer select-none"
          >
            Cancel
          </button>
        )}

        <button
          type="button"
          onClick={handleOnboardingNext}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-violet-600 shadow-md hover:bg-violet-550 text-white font-extrabold text-xs transition cursor-pointer select-none flex items-center gap-1.5 ml-auto"
        >
          {loading ? <Loader2 className="animate-spin" size={12} /> : null}
          {onboardingStep === 5 ? "Enter Fictself AI" : 'Continue'}
          {onboardingStep < 5 && <ChevronRight size={14} />}
        </button>
      </div>
    </div>
  );
}
