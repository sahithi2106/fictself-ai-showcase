import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle, 
  Loader2,
  Moon,
  Sun,
  BookOpen,
  Heart,
  Sparkles,
  Feather,
  Compass
} from 'lucide-react';
import { authService } from '../lib/authService';
import { apiRequestSignupOtp, apiVerifySignupOtp } from '../lib/api/auth';
import { UserProfile } from '../types';


interface AuthGateProps {
  onLoginSuccess: (user: UserProfile) => void;
  onLogout: () => void;
  currentUser: UserProfile | null;
  triggerSessionExpirySignal?: boolean;
  themeMode?: 'light' | 'dark';
  onThemeChange?: (newTheme: 'light' | 'dark') => void;
}

type AuthMode = 'login' | 'signup' | 'signup-otp' | 'signup-details' | 'forgot-password' | 'reset-password' | 'onboarding' | 'session-expired';

export default function AuthGate({
  onLoginSuccess,
  onLogout,
  currentUser,
  triggerSessionExpirySignal = false,
  themeMode = 'dark',
  onThemeChange
}: AuthGateProps) {

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Password reset flows
  const [resetEmailAddress, setResetEmailAddress] = useState('');

  // Interactive statuses
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  // Onboarding UI state
  const [onboardingUser, setOnboardingUser] = useState<UserProfile | null>(null);
  const [onboardingDisplayName, setOnboardingDisplayName] = useState('');
  const [onboardingBio, setOnboardingBio] = useState('');
  const [onboardingAvatar, setOnboardingAvatar] = useState('');
  const [onboardingGenres, setOnboardingGenres] = useState<string[]>([]);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
      
      if (!validTypes.includes(file.type)) {
        setFeedbackError('Unsupported file format. Please upload JPG, PNG, or WEBP.');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        setFeedbackError('File size exceeds the 10MB limit.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOnboardingAvatar(event.target.result as string);
          clearFeedback();
        }
      };
      reader.readAsDataURL(file);
    }
  };


  const handleOnboardingSubmit = async (skip: boolean) => {
    if (!onboardingUser) return;
    setLoading(true);
    try {
      if (skip) {
        const updated = await authService.updateProfile(onboardingUser.id, { isOnboarded: true });
        onLoginSuccess(updated);
      } else {
        const updated = await authService.updateProfile(onboardingUser.id, {
          displayName: onboardingDisplayName || onboardingUser.displayName,
          bio: onboardingBio,
          profileImage: onboardingAvatar || onboardingUser.profileImage,
          interests: onboardingGenres,
          isOnboarded: true
        });
        onLoginSuccess(updated);
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Profile setup failed.');
    } finally {
      setLoading(false);
    }
  };


  
  // Watch session expiry trigger logs
  useEffect(() => {
    if (triggerSessionExpirySignal) {
      setMode('session-expired');
    }
  }, [triggerSessionExpirySignal]);

  const handleGoogleSocialLogin = async () => {
    clearFeedback();
    setFeedbackError('Google authentication is coming soon.');
  };

  const handleAppleSocialLogin = async () => {
    clearFeedback();
    setFeedbackError('Apple authentication is coming soon.');
  };


  const clearFeedback = () => {
    setFeedbackError(null);
    setFeedbackSuccess(null);
  };

  // LOGIN SEQUENCE
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!email || !password) {
      setFeedbackError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.login({
        email: email.trim(),
        passwordHash: password,
        rememberMe: true
      });

      if (response && response.user) {
        onLoginSuccess(response.user);
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'The credentials entered are incorrect.');
    } finally {
      setLoading(false);
    }
  };

  // SIGN UP SEQUENCE (MULTI-STEP)
  const handleSignupRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email.trim() || !email.includes('@')) {
      setFeedbackError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await apiRequestSignupOtp(email.trim());
      setFeedbackSuccess('A verification code has been sent to your email.');
      setMode('signup-otp');
    } catch (err: any) {
      setFeedbackError(err.message || 'Failed to request code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (otp.length !== 6) {
      setFeedbackError('Please enter the 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await apiVerifySignupOtp(email.trim(), otp);
      setFeedbackSuccess('Email verified successfully! Please complete your profile.');
      setMode('signup-details');
    } catch (err: any) {
      setFeedbackError(err.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignupComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!username.trim()) {
      setFeedbackError('Please choose a username.');
      return;
    }
    if (username.length < 3) {
      setFeedbackError('Username must be at least 3 characters.');
      return;
    }
    if (password.length < 8) {
      setFeedbackError('Password must contain at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setFeedbackError('Passwords do not match. Please verify your typing.');
      return;
    }

    setLoading(true);
    try {
      const registerResponse = await authService.register({
        username: username.toLowerCase().trim(),
        displayName: username.trim(),
        email: email.trim(),
        passwordHash: password
      });

      if (registerResponse && registerResponse.user) {
        if (!registerResponse.user.isOnboarded) {
          setOnboardingUser(registerResponse.user);
          setOnboardingDisplayName(registerResponse.user.displayName || '');
          setMode('onboarding');
        } else {
          onLoginSuccess(registerResponse.user);
        }
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // FORGOT PASSWORD
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (!email.trim()) return setFeedbackError('Please provide your verified email.');

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setResetEmailAddress(email);
      setFeedbackSuccess('Password reset link has been dispatched to your email.');
      setMode('reset-password');
    } catch (err: any) {
      setFeedbackError(err.message || 'Email address not found.');
    } finally {
      setLoading(false);
    }
  };

  // RESET PASSWORD
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();

    if (password.length < 8) return setFeedbackError('Password must contain at least 8 characters.');
    if (password !== confirmPassword) return setFeedbackError('Passwords do not match.');

    setLoading(true);
    try {
      await authService.resetPassword(resetEmailAddress, password);
      setFeedbackSuccess('Your password has been updated successfully. Please sign in now.');
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFeedbackError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const isLight = themeMode === 'light';

  const labelStyle = "text-xs font-semibold tracking-wide block text-slate-500 dark:text-slate-400 mb-1.5 text-left";
  const inputStyle = `w-full text-sm font-sans rounded-xl border p-3 pl-10 outline-none transition focus:ring-1 focus:ring-violet-500/20 ${
    isLight 
      ? 'bg-white border-[#e2e0d5] text-slate-900 placeholder-[#a2a095] focus:border-violet-500' 
      : 'bg-[#10121d] border-[#1d2238] text-slate-100 placeholder-slate-500 focus:bg-[#0c0e18] focus:border-violet-500/40'
  }`;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      isLight ? 'bg-[#fdfdf9] text-[#1c1917]' : 'bg-[#06080e] text-slate-100'
    }`}>
      
      {/* Onboarding Wizard removed/bypassed */}
      <div className="flex-grow grid grid-cols-1 lg:grid-cols-12 min-h-screen">
          
          {/* LEFT SIDE PANEL: Hero Visual, Headlines, and Accent chips (66.6% width on desktop) */}
          <section className={`col-span-1 lg:col-span-8 flex flex-col justify-center items-center py-12 px-6 sm:px-12 md:px-16 text-center select-none border-b lg:border-b-0 lg:border-r transition-colors duration-300 ${
            isLight 
              ? 'bg-[#faf9f2] border-[#e7e5dc]' 
              : 'bg-radial bg-gradient-to-br from-[#0c0f1e] via-[#070912] to-[#04050a] border-[#181d2f]/40'
          }`}>
            
            {/* Handcrafted glowing storytelling companion bot in vector SVG */}
            <div className="w-full max-w-[340px] aspect-video flex items-center justify-center mb-4 relative">
              <svg viewBox="0 0 400 300" className="w-full filter drop-shadow-[0_4px_25px_rgba(139,92,246,0.12)]" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="pinkGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#ec4899" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="violetGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="neonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f43f5e" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="strongGlow" x="-35%" y="-35%" width="170%" height="170%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Ambient glow blobs */}
                <circle cx="200" cy="140" r="110" fill="url(#pinkGlow)" />
                <circle cx="220" cy="100" r="90" fill="url(#violetGlow)" />

                {/* Floating holographic card panels */}
                <g filter="url(#glow)" stroke={isLight ? "#aa90e0" : "#8b5cf6"} strokeWidth="1.5" strokeOpacity={isLight ? "0.6" : "0.4"}>
                  <path d="M120 60 H 285 A 12 12 0 0 1 297 72 V 175 A 12 12 0 0 1 285 187 H 120 A 12 12 0 0 1 108 175 V 72 A 12 12 0 0 1 120 60 Z" />
                  <path d="M96 55 L 112 55 L 112 70" />
                  <circle cx="280" cy="72" r="2.5" fill="#8b5cf6" fillOpacity="0.6" />
                  <circle cx="270" cy="72" r="2.5" fill="#8b5cf6" fillOpacity="0.6" />
                  <circle cx="260" cy="72" r="2.5" fill="#8b5cf6" fillOpacity="0.6" />
                  
                  {/* Glowing core sparks */}
                  <path d="M124 95 L 130 95 L 132 89 L 134 95 L 140 95 L 135 98 L 137 104 L 132 100 L 127 104 L 129 98 Z" fill="#ec4899" stroke="none" fillOpacity="0.6" />
                  <line x1="125" y1="115" x2="155" y2="115" stroke="#8b5cf6" strokeDasharray="3 3" />
                  <line x1="125" y1="125" x2="142" y2="125" />
                </g>

                {/* Glowing neon paths & connector points */}
                <g stroke="#ec4899" strokeWidth="1.2" strokeOpacity="0.5">
                  <path d="M297 110 H 322 V 130 H 332" />
                  <rect x="332" y="125" width="10" height="10" rx="2" fill="#ec4899" fillOpacity="0.15" />
                  <path d="M108 135 H 83 V 115" />
                  <circle cx="83" cy="115" r="3.5" fill="#8b5cf6" />
                </g>

                {/* AI Companion Main Figure */}
                {/* Head */}
                <rect x="156" y="80" width="88" height="72" rx="26" fill={isLight ? "#ffffff" : "#0d101a"} stroke="url(#neonGradient)" strokeWidth="3" filter="url(#glow)" />
                
                {/* Visual interface eyes */}
                <rect x="178" y="104" width="9" height="13" rx="4.5" fill="#ec4899" filter="url(#strongGlow)" />
                <rect x="213" y="104" width="9" height="13" rx="4.5" fill="#ec4899" filter="url(#strongGlow)" />
                
                {/* Joy/Smiling lips */}
                <path d="M193 124 C 196 128, 204 128, 207 124" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" filter="url(#strongGlow)" />

                {/* Earphones / Sensory links */}
                <circle cx="150" cy="116" r="11" fill={isLight ? "#ffffff" : "#06080e"} stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" />
                <circle cx="250" cy="116" r="11" fill={isLight ? "#ffffff" : "#06080e"} stroke="url(#neonGradient)" strokeWidth="2" filter="url(#glow)" />
                <path d="M161 82 C 176 72, 224 72, 239 82" stroke="url(#neonGradient)" strokeWidth="2" fill="none" strokeDasharray="3 2" />

                {/* Neck connector */}
                <rect x="192" y="148" width="16" height="8" rx="2" fill={isLight ? "#ebe9df" : "#0a0c14"} stroke="url(#neonGradient)" strokeWidth="1.8" filter="url(#glow)" />

                {/* Core Torso Chassis */}
                <rect x="164" y="156" width="72" height="68" rx="18" fill={isLight ? "#ffffff" : "#0d101a"} stroke="url(#neonGradient)" strokeWidth="3" filter="url(#glow)" />
                
                {/* Visual Chest display */}
                <rect x="174" y="166" width="52" height="38" rx="9" fill={isLight ? "#fbfaf4" : "#111422"} stroke="#8b5cf6" strokeWidth="1.5" />
                <path d="M180 178 H 220 M180 186 H 210 M180 194 H 200" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.7" />

                {/* Outer arms */}
                <path d="M160 168 C 141 178, 141 198, 150 206" stroke="url(#neonGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                <path d="M240 168 C 259 178, 259 198, 250 206" stroke="url(#neonGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />

                {/* Outer legs */}
                <path d="M184 224 V 246 H 173" stroke="url(#neonGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />
                <path d="M216 224 V 246 H 227" stroke="url(#neonGradient)" strokeWidth="3" strokeLinecap="round" filter="url(#glow)" />

                {/* Hologram bottom ellipse */}
                <ellipse cx="200" cy="265" rx="65" ry="7" fill="#8b5cf6" fillOpacity="0.16" filter="url(#glow)" />
              </svg>
            </div>

            {/* Headline Area */}
            <h1 className={`font-serif font-black tracking-tight text-3xl sm:text-4xl md:text-5xl lg:text-5.5xl xl:text-6xl mt-4 mb-3 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Read. Write. Share Stories.
            </h1>
            
            {/* Supporting tagline copy */}
            <p className={`text-sm sm:text-base leading-relaxed max-w-md ${
              isLight ? 'text-[#5d5a52]' : 'text-slate-400'
            }`}>
              Create stories, build worlds, and discover new favorites.
            </p>

            {/* Premium Genre Accent Chips */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 max-w-lg">
              {[
                { name: 'Fantasy', icon: Sparkles, colorClass: isLight ? 'bg-[#f5f0ff] border-purple-200 text-purple-750 font-bold' : 'bg-purple-950/20 text-purple-400 border-purple-500/20 font-semibold' },
                { name: 'Romance', icon: Heart, colorClass: isLight ? 'bg-[#fff0f4] border-rose-200 text-rose-750 font-bold' : 'bg-rose-950/20 text-rose-400 border-rose-500/20 font-semibold' },
                { name: 'Mystery', icon: Compass, colorClass: isLight ? 'bg-[#fff7e6] border-amber-200 text-amber-750 font-bold' : 'bg-amber-950/20 text-amber-400 border-amber-500/20 font-semibold' },
                { name: 'Sci-Fi', icon: BookOpen, colorClass: isLight ? 'bg-[#eefcfc] border-cyan-200 text-cyan-750 font-bold' : 'bg-cyan-950/20 text-cyan-400 border-cyan-500/20 font-semibold' },
                { name: 'Adventure', icon: Feather, colorClass: isLight ? 'bg-[#edfbf4] border-emerald-200 text-emerald-750 font-bold' : 'bg-emerald-950/20 text-emerald-400 border-emerald-500/20 font-semibold' }
              ].map((genre) => {
                const GenreIcon = genre.icon;
                return (
                  <span
                    key={genre.name}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border tracking-wide select-none ${genre.colorClass}`}
                  >
                    <GenreIcon size={12} className="opacity-80 shrink-0" />
                    <span>{genre.name}</span>
                  </span>
                );
              })}
            </div>
          </section>

          {/* RIGHT SIDE PANEL: Authentication Form Only (33.3% width on desktop) */}
          <section className={`col-span-1 lg:col-span-4 flex flex-col justify-between p-6 sm:p-10 transition-colors duration-300 ${
            isLight ? 'bg-white' : 'bg-[#06080e]'
          }`}>
            
            {/* Simple logo watermark & theme switch inside side panel */}
            <div className="flex items-center justify-between w-full pb-4">
              <div className="flex items-center gap-1.5 select-none opacity-80">
                <BookOpen size={16} className="text-violet-500 shrink-0" />
                <span className="font-serif font-black text-xs tracking-wider text-slate-800 dark:text-slate-300 uppercase">
                  fictself ai
                </span>
              </div>
              
              {onThemeChange && (
                <button
                  type="button"
                  onClick={() => onThemeChange(isLight ? 'dark' : 'light')}
                  className={`p-2 rounded-full border transition cursor-pointer select-none ${
                    isLight 
                      ? 'bg-slate-50 border-[#cbd5e1]/50 text-slate-555 hover:bg-slate-100' 
                      : 'bg-[#101323] border-[#1f263d] text-slate-400 hover:text-white'
                  }`}
                  title="Toggle color theme"
                >
                  {isLight ? <Moon size={14} /> : <Sun size={14} />}
                </button>
              )}
            </div>

            {/* Core simplified Login/Signup Container */}
            <div className="w-full max-w-[340px] mx-auto flex-grow flex flex-col justify-center py-6">
              
              {/* Feedback States */}
              {feedbackError && (
                <div className="mb-4 p-3 border rounded-xl text-xs font-semibold text-left flex gap-2 items-start justify-between bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-450">
                  <div className="flex gap-2 items-start leading-relaxed">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{feedbackError}</span>
                  </div>
                  <button type="button" onClick={() => setFeedbackError(null)} className="font-bold opacity-75 hover:opacity-100 text-xs shrink-0 select-none bg-transparent border-0 cursor-pointer">&times;</button>
                </div>
              )}

              {feedbackSuccess && (
                <div className="mb-4 p-3 border rounded-xl text-xs font-semibold text-left flex gap-2 items-start justify-between bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-450">
                  <div className="flex gap-2 items-start leading-relaxed">
                    <Check size={14} className="shrink-0 mt-0.5" />
                    <span>{feedbackSuccess}</span>
                  </div>
                  <button type="button" onClick={() => setFeedbackSuccess(null)} className="font-bold opacity-75 hover:opacity-100 text-xs shrink-0 select-none bg-transparent border-0 cursor-pointer">&times;</button>
                </div>
              )}

              {mode === 'session-expired' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 border rounded-xl text-xs flex flex-col items-center gap-2.5 bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={20} className="text-amber-500" />
                    <p className="font-serif font-black text-sm">Session Expired</p>
                    <p className="leading-relaxed font-sans text-slate-500 dark:text-slate-400">
                      Please sign in again to verify your identity and safeguard your drafts.
                    </p>
                  </div>

                  <button
                    onClick={() => { setMode('login'); clearFeedback(); }}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs uppercase tracking-wider transition cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              )}

              {/* FORGOT PASSWORD */}
              {mode === 'forgot-password' && (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" id="form-forgot">
                  <div className="space-y-1 text-left">
                    <h2 className="text-xl font-serif font-black tracking-tight text-slate-800 dark:text-white">Reset Password</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Enter your email and we'll transmit a secure recovery link.</p>
                  </div>

                  <div className="space-y-1.5 text-left pb-1">
                    <label htmlFor="forgot-email" className={labelStyle}>Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                      <input
                        id="forgot-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputStyle}
                        placeholder="your-email@example.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs tracking-wide cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="animate-spin" size={14} />}
                    Send Recovery Link
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => { setMode('login'); clearFeedback(); }}
                    className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isLight 
                        ? 'border-[#e2e0d5] bg-slate-50 hover:bg-slate-100 text-slate-700' 
                        : 'border-[#1f263d] bg-transparent hover:bg-[#121626] text-slate-300'
                    }`}
                  >
                    Cancel
                  </button>
                </form>
              )}

              {/* RESET PASSWORD */}
              {mode === 'reset-password' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-4" id="form-reset">
                  <div className="space-y-1 text-left">
                    <h2 className="text-xl font-serif font-black tracking-tight text-slate-800 dark:text-white">New Password</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Design a safe security credential for your account.</p>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label htmlFor="reset-pass" className={labelStyle}>New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                      <input
                        id="reset-pass"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputStyle}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left pb-1">
                    <label htmlFor="reset-confirm" className={labelStyle}>Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} />
                      <input
                        id="reset-confirm"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={inputStyle}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs cursor-pointer flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="animate-spin" size={14} />}
                    Update Password
                  </button>
                </form>
              )}

              {/* SIGN IN FORM (DEFAULT SCREEN) */}
              {mode === 'login' && (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Form Core Header */}
                  <div className="space-y-1 text-left select-none">
                    <h2 className={`text-2xl font-serif font-black tracking-tight ${
                      isLight ? 'text-slate-850' : 'text-white'
                    }`}>
                      Sign In
                    </h2>
                    <p className="text-xs text-slate-550 dark:text-slate-400">
                      Pick up where you left off. Your next chapter starts here.
                    </p>
                  </div>

                  {/* Continuing with single visual Google Social button */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={handleGoogleSocialLogin}
                      disabled={loading}
                      className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold tracking-wide transition flex items-center justify-center gap-2 cursor-pointer ${
                        isLight 
                          ? 'border-[#cbd5e1]/60 bg-white text-slate-700 hover:bg-[#faf9f5]' 
                          : 'border-[#1d2238] bg-[#10121d] text-slate-200 hover:bg-[#181d33]'
                      }`}
                      id="google-continue-btn"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </button>
                  </div>

                  {/* Visual spacing element */}
                  <div className="relative flex items-center py-0.5 select-none text-left">
                    <div className="flex-grow border-t border-slate-200/50 dark:border-slate-800/40"></div>
                    <span className="flex-shrink mx-2.5 text-slate-400 dark:text-slate-500 font-sans text-[10px] tracking-widest uppercase">
                      or details
                    </span>
                    <div className="flex-grow border-t border-slate-200/50 dark:border-slate-800/40"></div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4" id="form-login">
                    <div className="space-y-1.5 text-left">
                      <label htmlFor="login-email" className={labelStyle}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="login-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputStyle}
                          placeholder="yourname@domain.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center pb-0.5">
                        <label htmlFor="login-password" className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setMode('forgot-password');
                            clearFeedback();
                          }}
                          className="text-xs font-bold text-violet-500 dark:text-violet-400 hover:underline cursor-pointer bg-transparent border-0 p-0"
                        >
                          Forgot Password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="login-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputStyle}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 cursor-pointer bg-transparent border-0"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs py-0.5 select-none text-left">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-540 dark:text-slate-400 font-sans">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-[#cbd5e1] dark:border-slate-800 text-violet-600 focus:ring-0 cursor-pointer h-4 w-4 bg-transparent outline-none"
                        />
                        <span>Remember Me</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {loading && <Loader2 className="animate-spin" size={14} />}
                      Sign In
                    </button>
                  </form>

                  {/* Create account trigger */}
                  <div className="pt-2 text-center text-xs text-slate-500 dark:text-slate-400 font-medium select-none">
                    New to FictSelf?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        clearFeedback();
                      }}
                      className="text-violet-600 dark:text-violet-400 hover:underline font-bold cursor-pointer bg-transparent border-0 p-0"
                    >
                      Create Account
                    </button>
                  </div>
                </div>
              )}

              {/* SIGN UP STEP 1: EMAIL */}
              {mode === 'signup' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1 text-left">
                    <h2 className={`text-2xl font-serif font-black tracking-tight ${
                      isLight ? 'text-slate-850' : 'text-white'
                    }`}>
                      Create Account
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-405">
                      Join a cosy community of readers and authors.
                    </p>
                  </div>

                  <form onSubmit={handleSignupRequestOtp} className="space-y-4 text-left" id="form-signup-email">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-email" className={labelStyle}>Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-404 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="signup-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={inputStyle}
                          placeholder="yourname@domain.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm tracking-wide select-none shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {loading && <Loader2 className="animate-spin" size={14} />}
                      Send Verification Code
                    </button>
                  </form>

                  <div className="pt-2 text-center text-xs text-slate-505 dark:text-slate-450 font-medium select-none">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        clearFeedback();
                      }}
                      className="text-violet-605 dark:text-violet-400 hover:underline font-bold cursor-pointer bg-transparent border-0 p-0"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* SIGN UP STEP 2: OTP VERIFICATION */}
              {mode === 'signup-otp' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1 text-left">
                    <h2 className={`text-2xl font-serif font-black tracking-tight ${
                      isLight ? 'text-slate-850' : 'text-white'
                    }`}>
                      Verify Email
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-405">
                      Enter the 6-digit code sent to {email}.
                    </p>
                  </div>

                  <form onSubmit={handleSignupVerifyOtp} className="space-y-4 text-left" id="form-signup-otp">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-otp" className={labelStyle}>Verification Code</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-404 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="signup-otp"
                          type="text"
                          required
                          maxLength={6}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          className={`${inputStyle} tracking-[0.5em] font-mono text-center pl-3`}
                          placeholder="000000"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm tracking-wide select-none shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="animate-spin" size={14} />}
                      Verify Code
                    </button>
                  </form>
                  
                  <div className="pt-2 text-center text-xs text-slate-505 dark:text-slate-450 font-medium select-none flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleSignupRequestOtp}
                      disabled={loading}
                      className="text-violet-605 dark:text-violet-400 hover:underline font-bold cursor-pointer bg-transparent border-0 p-0 disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        clearFeedback();
                      }}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline cursor-pointer bg-transparent border-0 p-0 mt-2"
                    >
                      Change Email
                    </button>
                  </div>
                </div>
              )}

              {/* SIGN UP STEP 3: ACCOUNT DETAILS */}
              {mode === 'signup-details' && (
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-1 text-left">
                    <h2 className={`text-2xl font-serif font-black tracking-tight ${
                      isLight ? 'text-slate-850' : 'text-white'
                    }`}>
                      Complete Setup
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-405">
                      Almost there! Secure your account.
                    </p>
                  </div>

                  <form onSubmit={handleSignupComplete} className="space-y-4 text-left" id="form-signup-details">
                    <div className="space-y-1.5">
                      <label htmlFor="signup-username" className={labelStyle}>Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-404 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="signup-username"
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          className={inputStyle}
                          placeholder="pen_name"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="signup-password" className={labelStyle}>Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-404 dark:text-slate-500" size={14} strokeWidth={2.2} />
                        <input
                          id="signup-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className={inputStyle}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-655 dark:hover:text-slate-300 cursor-pointer bg-transparent border-0"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 pb-1 block">
                      <label htmlFor="signup-confirm-password" className={labelStyle}>Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-404 dark:text-slate-550" size={14} strokeWidth={2.2} />
                        <input
                          id="signup-confirm-password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className={inputStyle}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold text-sm tracking-wide select-none shadow transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {loading && <Loader2 className="animate-spin" size={14} />}
                      Create Account
                    </button>
                  </form>
                </div>
              )}

              {/* PROFILE SETUP (ONBOARDING) */}
              {mode === 'onboarding' && (
                <div className="space-y-5 animate-fade-in text-left">
                  <div className="space-y-1">
                    <h2 className={`text-2xl font-serif font-black tracking-tight ${isLight ? 'text-slate-850' : 'text-white'}`}>
                      Profile Setup
                    </h2>
                    <p className="text-xs text-slate-550 dark:text-slate-400">
                      Personalize your identity. You can always change this later.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className={labelStyle}>Display Name</label>
                      <input
                        type="text"
                        value={onboardingDisplayName}
                        onChange={(e) => setOnboardingDisplayName(e.target.value)}
                        className={inputStyle}
                        placeholder="Your pen name"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelStyle}>Profile Photo (Optional)</label>
                      <div className="flex items-center gap-4 p-3 bg-white dark:bg-[#10121d] border border-[#e2e0d5] dark:border-[#1d2238] rounded-xl">
                        <div className="relative group shrink-0">
                          {onboardingAvatar ? (
                            <img 
                              src={onboardingAvatar} 
                              alt="Avatar Preview" 
                              className="w-12 h-12 rounded-full object-cover shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="space-y-1">
                          <input 
                            type="file"
                            ref={avatarInputRef}
                            accept="image/png, image/jpeg, image/jpg, image/webp"
                            className="hidden"
                            onChange={handleAvatarFileChange}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => avatarInputRef.current?.click()}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
                            >
                              Upload Image
                            </button>
                            {onboardingAvatar && (
                              <button
                                type="button"
                                onClick={() => setOnboardingAvatar('')}
                                className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-xs font-semibold text-rose-600 dark:text-rose-400 transition cursor-pointer"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">JPG, PNG, WEBP • Max 10MB</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelStyle}>Short Bio (Optional)</label>
                      <textarea
                        value={onboardingBio}
                        onChange={(e) => setOnboardingBio(e.target.value)}
                        className={`${inputStyle} resize-none`}
                        rows={3}
                        placeholder="Tell the community a bit about yourself..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className={labelStyle}>Favorite Genres (Optional)</label>
                      <div className="flex flex-wrap gap-2">
                        {['Fantasy', 'Sci-Fi', 'Romance', 'Mystery', 'Horror', 'Adventure'].map(genre => (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              if (onboardingGenres.includes(genre)) {
                                setOnboardingGenres(onboardingGenres.filter(g => g !== genre));
                              } else {
                                setOnboardingGenres([...onboardingGenres, genre]);
                              }
                            }}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer select-none ${
                              onboardingGenres.includes(genre)
                                ? 'bg-violet-600 text-white border-violet-600'
                                : isLight ? 'bg-white text-slate-600 border-slate-200' : 'bg-[#10121d] text-slate-400 border-[#1d2238]'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleOnboardingSubmit(false)}
                      disabled={loading}
                      className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-750 text-white font-bold text-sm tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {loading && <Loader2 className="animate-spin" size={14} />}
                      Continue
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOnboardingSubmit(true)}
                      disabled={loading}
                      className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Cozy minimal privacy and terms declaration footer */}
            <footer className="text-center text-[10px] text-slate-400 dark:text-slate-500 tracking-wide font-sans py-4 select-none max-w-lg mx-auto">
              By using Fictself AI, you agree to our <span className="underline hover:text-violet-750 dark:hover:text-[#8b5cf6] cursor-pointer">Terms of Service</span> and <span className="underline hover:text-violet-750 dark:hover:text-[#8b5cf6] cursor-pointer">Privacy Policy</span>.
            </footer>

          </section>
          
        </div>
    </div>
  );
}
