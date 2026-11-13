import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Settings, 
  Save, 
  ShieldAlert, 
  Check, 
  User, 
  Mail, 
  Lock, 
  UploadCloud, 
  Trash2, 
  Bell, 
  Sun, 
  Moon, 
  AlertTriangle, 
  Loader2,
  Sliders,
  Shield,
  Eye,
  EyeOff,
  Sparkles,
  Info
} from 'lucide-react';
import { authService } from '../lib/authService';
import { UserProfile } from '../types';
import UserAvatar from './UserAvatar';

interface SettingsViewProps {
  currentUser: UserProfile | null;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  setView: (view: string) => void;
}

type SettingsTab = 'profile' | 'security' | 'appearance' | 'notifications' | 'account';

export default function SettingsView({
  currentUser,
  onUpdateProfile,
  onLogout,
  setView
}: SettingsViewProps) {
  
  // Set Active Tab inside Settings view environment (Default is Profile)
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // SYSTEM/WORKSPACE SETTINGS STATES (Defaults or loads from currentUser extensions)
  const [autosaveFreq, setAutosaveFreq] = useState('20s');
  const [aiTone, setAiTone] = useState('Supportive');
  const [fontSize, setFontSize] = useState('16px');

  // PROFILE SETTINGS STATES
  const [username, setUsername] = useState(currentUser?.username || '');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [profileImage, setProfileImage] = useState(currentUser?.profileImage || '');

  // PASSWORD UPDATE STATES
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  
  // Password Visibility toggles
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // THEME PREFERENCE
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(currentUser?.themePreference || 'dark');

  // NOTIFICATION PREFERENCE SETTINGS
  const [notifEmail, setNotifEmail] = useState(currentUser?.notificationSettings?.emailUpdates ?? true);
  const [notifAlerts, setNotifAlerts] = useState(currentUser?.notificationSettings?.characterAlerts ?? true);
  const [notifReplies, setNotifReplies] = useState(currentUser?.notificationSettings?.communityReplies ?? true);

  // FEEDBACKS AND LOADERS
  const [loading, setLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // FILE DRAG & DROP PIPELINES
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CONTROLLER MODALS
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [showRemoveAvatarModal, setShowRemoveAvatarModal] = useState(false);

  // LIVE PASSWORD ENFORCE CHECKS
  const [reqLength, setReqLength] = useState(false);
  const [reqUpper, setReqUpper] = useState(false);
  const [reqLower, setReqLower] = useState(false);
  const [reqNumber, setReqNumber] = useState(false);
  const [reqSpecial, setReqSpecial] = useState(false);

  useEffect(() => {
    setReqLength(newPassword.length >= 8);
    setReqUpper(/[A-Z]/.test(newPassword));
    setReqLower(/[a-z]/.test(newPassword));
    setReqNumber(/[0-9]/.test(newPassword));
    setReqSpecial(/[^A-Za-z0-9]/.test(newPassword));
  }, [newPassword]);

  const getPasswordStrength = () => {
    if (!newPassword) return { label: 'Not Entered', color: 'bg-slate-300 dark:bg-slate-700', width: 'w-0', textColor: 'text-[var(--text-muted)]' };
    let score = 0;
    if (reqLength) score++;
    if (reqUpper) score++;
    if (reqLower) score++;
    if (reqNumber) score++;
    if (reqSpecial) score++;

    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4', textColor: 'text-red-500' };
    if (score === 3) return { label: 'Medium', color: 'bg-amber-500', width: 'w-2/4', textColor: 'text-amber-500' };
    if (score === 4) return { label: 'Strong', color: 'bg-violet-600', width: 'w-3/4', textColor: 'text-violet-500' };
    return { label: 'Absolute Fortress', color: 'bg-emerald-500', width: 'w-full', textColor: 'text-emerald-500' };
  };

  const strength = getPasswordStrength();

  // Reset local states if logged in user session updates
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setDisplayName(currentUser.displayName || '');
      setEmail(currentUser.email || '');
      setBio(currentUser.bio || '');
      setProfileImage(currentUser.profileImage || '');
      setThemeMode(currentUser.themePreference || 'dark');
      setNotifEmail(currentUser.notificationSettings?.emailUpdates ?? true);
      setNotifAlerts(currentUser.notificationSettings?.characterAlerts ?? true);
      setNotifReplies(currentUser.notificationSettings?.communityReplies ?? true);
    }
  }, [currentUser]);

  // Handle Photo input file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPhotoFile(file);
    }
  };

  const processPhotoFile = (file: File) => {
    setFeedbackError(null);
    setFeedbackSuccess(null);
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setFeedbackError('Invalid format. Please upload a PNG, JPG, or WEBP image.');
      return;
    }

    const maxBytes = 5 * 1024 * 1024; // 5MB Limit
    if (file.size > maxBytes) {
      setFeedbackError('File size exceeded. Profile photo must be less than 5 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result && typeof event.target.result === 'string') {
        setProfileImage(event.target.result);
        setFeedbackSuccess('Instant profile image preview ready! Press Save Changes to finalize.');
      }
    };
    reader.onerror = () => {
      setFeedbackError('Failed to read image. Please select another file.');
    };
    reader.readAsDataURL(file);
  };

  // Instant save/update logic for Avatar
  const handleSaveAvatarOnly = async () => {
    if (!currentUser) return;
    setLoading(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const updatedUser = await authService.updateProfile(currentUser.id, {
        profileImage: profileImage
      });
      onUpdateProfile(updatedUser);
      setFeedbackSuccess('Profile picture successfully updated!');
    } catch (err: any) {
      setFeedbackError(err.message || 'Error updating profile image.');
    } finally {
      setLoading(false);
    }
  };

  // Avatar removal confirm logic
  const handleRemoveAvatarConfirm = async () => {
    if (!currentUser) return;
    setLoading(true);
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      const updatedUser = await authService.updateProfile(currentUser.id, {
        profileImage: '' // Clear image
      });
      setProfileImage('');
      onUpdateProfile(updatedUser);
      setFeedbackSuccess('Profile picture successfully removed.');
      setShowRemoveAvatarModal(false);
    } catch (err: any) {
      setFeedbackError(err.message || 'Error removing profile picture.');
    } finally {
      setLoading(false);
    }
  };

  // Real-time theme visual toggler
  const toggleTheme = (targetTheme: 'light' | 'dark') => {
    setThemeMode(targetTheme);
    if (targetTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  // SAVE HANDLER FOR INDIVIDUAL SECTIONS WITH CUSTOM SUCCESS TOASTS & VALIDATIONS
  const handleSaveTabSettings = async (targetTab: SettingsTab) => {
    if (!currentUser) return;
    setFeedbackError(null);
    setFeedbackSuccess(null);

    // Dynamic Validations depending on tab
    if (targetTab === 'profile') {
      if (!username.trim()) return setFeedbackError('Username handle cannot be left empty.');
      if (!displayName.trim()) return setFeedbackError('Display name is required.');
    }

    if (targetTab === 'account') {
      if (!email.trim() || !email.includes('@')) {
        return setFeedbackError('Please specify a valid email address.');
      }
    }

    setLoading(true);
    try {
      const updatedUser = await authService.updateProfile(currentUser.id, {
        username: username.toLowerCase().trim(),
        displayName: displayName.trim(),
        email: email.trim(),
        bio: bio.trim(),
        profileImage: profileImage,
        themePreference: themeMode,
        notificationSettings: {
          emailUpdates: notifEmail,
          characterAlerts: notifAlerts,
          communityReplies: notifReplies
        }
      });

      // Update main React state Tree
      onUpdateProfile(updatedUser);
      setIsSaved(true);

      // Customized clean feedback messages
      if (targetTab === 'profile') {
        setFeedbackSuccess('Profile details successfully saved.');
      } else if (targetTab === 'appearance') {
        setFeedbackSuccess('Appearance preferences successfully saved.');
      } else if (targetTab === 'notifications') {
        setFeedbackSuccess('Notification preferences successfully saved.');
      } else if (targetTab === 'account') {
        setFeedbackSuccess('Account coordinates successfully updated.');
      }

      setTimeout(() => setIsSaved(false), 2000);
    } catch (err: any) {
      setFeedbackError(err.message || 'Error updating settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SEPARATE DEDICATED PASSWORD SECURITY HANDLER
  const handleUpdatePasswordSubmit = async () => {
    if (!currentUser) return;
    setFeedbackError(null);
    setFeedbackSuccess(null);

    if (!currentPassword) {
      return setFeedbackError('Please enter your current password to authorize registration.');
    }
    if (newPassword.length < 8) {
      return setFeedbackError('New password must meet security guidelines (minimum 8 characters).');
    }
    if (newPassword !== confirmNewPassword) {
      return setFeedbackError('Passwords do not match. Please verify.');
    }

    setLoading(true);
    try {
      await authService.resetPassword(currentUser.email, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setFeedbackSuccess('Password successfully updated!');
    } catch (err: any) {
      setFeedbackError(err.message || 'Error executing password update routine.');
    } finally {
      setLoading(false);
    }
  };

  // SECURE ACCOUNT DELETION PROMPT
  const handleDeleteAccountConfirmSubmit = async () => {
    if (!currentUser) return;
    if (deleteConfirmationText !== 'DELETE') {
      return setFeedbackError('Please type "DELETE" exactly to confirm.');
    }
    
    setLoading(true);
    try {
      await authService.deleteAccount(currentUser.id);
      setShowDeleteModal(false);
      onLogout(); // Safe disconnect to welcome gate
    } catch (err: any) {
      setFeedbackError('Account deletion encountered an issue.');
    } finally {
      setLoading(false);
    }
  };

  // List of Tabs with Icons
  const sidebarTabs = [
    { id: 'profile', name: 'Profile', desc: 'Identity & custom writing avatar', icon: User },
    { id: 'security', name: 'Security', desc: 'Credentials & password settings', icon: Shield },
    { id: 'appearance', name: 'Appearance', desc: 'Theme colors, font size & writing controls', icon: Sliders },
    { id: 'notifications', name: 'Notifications', desc: 'Toggles for email alerts', icon: Bell },
    { id: 'account', name: 'Account & Actions', desc: 'Email details & master reset control', icon: Settings },
  ] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 font-sans text-left min-h-screen" id="fictself-settings-view">
      
      {/* Top Back Navigation & Breadcrumb */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 select-none pb-4">
        <button 
          onClick={() => setView('profile')}
          className="hover:text-white text-slate-400 transition cursor-pointer font-bold flex items-center gap-1.5 bg-transparent border-0 px-0 py-1"
          id="back-to-profile"
        >
          &larr; Back to Profile
        </button>
        <span className="text-slate-700 font-mono">|</span>
        <button 
          onClick={() => setView('profile')}
          className="hover:text-blue-400 text-slate-500 transition cursor-pointer bg-transparent border-0 px-0 py-1"
        >
          Profile
        </button>
        <span className="text-slate-700 font-mono">&gt;</span>
        <span className="text-slate-300 font-semibold">Settings</span>
      </div>

      {/* HEADER SECTION (Accessible & Stunning minimal SaaS) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-8 border-b border-[var(--border)] gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] font-sans">
            Settings
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
            Optimize your workspace settings, manage credentials, custom visual styles, and configure notifications.
          </p>
        </div>
      </div>

      {/* FEEDBACK FEED ALERT INDICATORS */}
      {(feedbackError || feedbackSuccess) && (
        <div className="mb-6 animate-fade-in" id="settings-notification-banner">
          {feedbackError && (
            <div className="p-4 bg-red-500/10 border-l-4 border-red-500 text-red-700 dark:text-red-800 rounded-r-xl text-sm flex items-start gap-3">
              <ShieldAlert size={18} className="shrink-0 text-red-500 mt-0.5" />
              <div className="font-semibold">{feedbackError}</div>
            </div>
          )}

          {feedbackSuccess && (
            <div className="p-4 bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-800 dark:text-emerald-900 rounded-r-xl text-sm flex items-start gap-3">
              <Check size={18} className="shrink-0 text-emerald-500 mt-0.5" />
              <div className="font-semibold">{feedbackSuccess}</div>
            </div>
          )}
        </div>
      )}

      {/* TWO COLUMN SaaS LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Sidebar Navigation Rail */}
        <div className="md:col-span-3 space-y-1">
          {/* Scrollable Chips for Mobile layouts */}
          <div className="flex md:hidden overflow-x-auto pb-4 gap-2 scrollbar-none select-none" id="mobile-settings-navigation">
            {sidebarTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFeedbackError(null);
                    setFeedbackSuccess(null);
                  }}
                  className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 transition cursor-pointer ${
                    isActive
                      ? 'bg-violet-605 text-white font-bold shadow-sm'
                      : 'bg-[var(--card)] hover:bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]'
                  }`}
                  id={`settings-tab-mobile-${tab.id}`}
                >
                  <TabIcon size={14} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Desktop high-end vertical tab selector */}
          <div className="hidden md:flex flex-col space-y-1" id="desktop-settings-navigation">
            <span className="text-[10px] font-bold text-[var(--text-muted)] tracking-widest uppercase mb-3 px-3 block">
              Preferences
            </span>
            {sidebarTabs.map(tab => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setFeedbackError(null);
                    setFeedbackSuccess(null);
                  }}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-left transition-all flex items-center gap-3 cursor-pointer group ${
                    isActive
                      ? 'bg-violet-600/10 text-violet-650 dark:text-violet-600 border-l-4 border-violet-600 font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--card)] hover:text-[var(--text-primary)] border-l-4 border-transparent'
                  }`}
                  id={`settings-tab-desktop-${tab.id}`}
                >
                  <TabIcon 
                    size={16} 
                    className={`shrink-0 transition-transform ${isActive ? 'scale-110 text-violet-600' : 'text-[var(--text-muted)] group-hover:scale-105 group-hover:text-[var(--text-primary)]'}`} 
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold leading-normal">{tab.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5 font-sans leading-none">{tab.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Config Section Panel */}
        <div className="md:col-span-9 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              
              {/* TAB CONTENT: PROFILE */}
              {activeTab === 'profile' && (
                <div className="space-y-6" id="settings-pane-profile">
                  <div className="pb-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Public Identity</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Configure your display details, handle representation, and avatar photography.</p>
                  </div>

                  {/* AVATAR SYSTEM GRAPHICS */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-[var(--text-primary)] tracking-wide uppercase font-mono block">
                      Profile Picture Focus
                    </label>

                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      {/* Round secure avatar container */}
                      <div className="relative shrink-0">
                        <div className="relative rounded-full p-1 overflow-hidden border border-[var(--border)] bg-[var(--background)]">
                          <UserAvatar 
                            src={profileImage} 
                            name={displayName || 'Writer Companion'} 
                            size="xl" 
                            className="w-24 h-24 shadow-sm object-cover rounded-full" 
                          />
                          {/* Guide dashes to show alignment */}
                          <div className="absolute inset-0 rounded-full border-2 border-dashed border-violet-500/30 pointer-events-none m-1" />
                        </div>
                      </div>

                      {/* Photo manipulation parameters */}
                      <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
                        <h3 className="text-sm font-bold text-[var(--text-primary)]">Instant Crop Profile Preview</h3>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          JPEG, PNG or WEBP formats. Sub-5MB files. Clean, square photos display best in writing feeds.
                        </p>

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 font-mono">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-violet-600 hover:bg-violet-550 text-white text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                            id="change-photo-trigger"
                          >
                            <UploadCloud size={13} />
                            Change Photo
                          </button>

                          {(profileImage || (currentUser && currentUser.profileImage)) && (
                            <button
                              type="button"
                              onClick={() => setShowRemoveAvatarModal(true)}
                              className="px-4 py-2 border border-red-500/30 hover:bg-red-500/10 text-red-650 dark:text-red-500 text-[11px] font-bold rounded-lg transition cursor-pointer flex items-center gap-1"
                              id="remove-photo-trigger"
                            >
                              <Trash2 size={12} />
                              Remove Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      className="hidden"
                    />

                    {/* Drag-and-drop file uploader zone */}
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processPhotoFile(file);
                      }}
                      className={`border border-dashed rounded-xl p-4 text-center cursor-pointer select-none transition ${
                        isDragging 
                          ? 'border-violet-500 bg-violet-500/5 text-violet-500' 
                          : 'border-[var(--border)] bg-[var(--background)]/40 hover:bg-[var(--background)]/80 text-[var(--text-secondary)]'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <p className="text-xs font-medium">
                        {isDragging ? 'Drop raw photo coordinate...' : '💡 Drag-and-drop or click to upload your profile picture. Max 5 MB limit.'}
                      </p>
                    </div>

                    {/* Preview alert save notice */}
                    {profileImage !== (currentUser?.profileImage || '') && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-violet-550/10 border border-violet-500/20 text-xs mt-3">
                        <div>
                          <span className="font-bold text-[var(--text-primary)] block">Avatar Photo Modified</span>
                          <span className="text-[10px] text-[var(--text-secondary)] block">Uncommitted changes. Please press Save Changes to finalize profile coordinates.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={handleSaveAvatarOnly}
                            type="button"
                            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-lg transition cursor-pointer text-[10px] flex items-center gap-1"
                          >
                            <Check size={11} />
                            Save Picture
                          </button>
                          <button 
                            onClick={() => setProfileImage(currentUser?.profileImage || '')}
                            type="button"
                            className="px-3 py-1.5 border border-[var(--border)] hover:bg-[var(--background)] text-[var(--text-secondary)] font-semibold rounded-lg text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACCOUNT FIELD DETAILS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3">
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                        Username Handle
                      </label>
                      <div className="flex items-center rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-550 transition-all">
                        <span className="bg-[var(--card)] text-[var(--text-secondary)] px-3 py-2 font-mono text-sm border-r border-[var(--border)] select-none">
                          @
                        </span>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          className="w-full bg-transparent text-[var(--text-primary)] font-mono px-3 py-2 outline-none text-xs"
                          placeholder="stephen_king"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] px-3 py-2 outline-none text-xs focus:ring-2 focus:ring-violet-500/20 focus:border-violet-550 transition"
                        placeholder="Stephen King"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                      Biography Manifesto
                    </label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      maxLength={150}
                      rows={3}
                      placeholder="Share your personal writing interests or current literary work progress..."
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-[var(--text-primary)] outline-none text-xs leading-relaxed focus:ring-2 focus:ring-violet-500/20 focus:border-violet-550 transition placeholder:text-[var(--text-muted)]"
                    />
                    <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] font-mono pt-1">
                      <span>💡 Displays in reader exploration feeds</span>
                      <span>{bio.length} / 150 chars</span>
                    </div>
                  </div>

                  {/* SAVE PROFILE BUTTON ACTIONS */}
                  <div className="flex justify-end pt-5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveTabSettings('profile')}
                      className="px-5 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow flex items-center gap-1.5"
                      id="save-profile-btn"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin text-white" size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: SECURITY */}
              {activeTab === 'security' && (
                <div className="space-y-6" id="settings-pane-security">
                  <div className="pb-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Security Coordinates</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Configure your passcode credential key details to secure your drafts pipeline.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Current password */}
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                        Current Password
                      </label>
                      <div className="relative flex items-center rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-550 transition-all">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Type current password to authorize edits"
                          className="w-full bg-transparent text-[var(--text-primary)] px-3 py-2.5 outline-none text-xs pr-10 placeholder:text-[var(--text-muted)]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        >
                          {showCurrentPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password updates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                          New Password
                        </label>
                        <div className="relative flex items-center rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-550 transition-all">
                          <input
                            type={showNewPass ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            className="w-full bg-transparent text-[var(--text-primary)] px-3 py-2.5 outline-none text-xs pr-10 placeholder:text-[var(--text-muted)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                          Confirm New Password
                        </label>
                        <div className="relative flex items-center rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-550 transition-all">
                          <input
                            type={showConfirmPass ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="Verify new passcode key"
                            className="w-full bg-transparent text-[var(--text-primary)] px-3 py-2.5 outline-none text-xs pr-10 placeholder:text-[var(--text-muted)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPass(!showConfirmPass)}
                            className="absolute right-3 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          >
                            {showConfirmPass ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* STRENGTH FEEDBACK CHIPS */}
                    <div className="p-4 bg-[var(--background)] border border-[var(--border)] rounded-xl space-y-3 mt-3">
                      <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                        <span className="text-[var(--text-muted)] uppercase tracking-wide">Strength Level</span>
                        <span className={`${strength.textColor} font-bold uppercase tracking-wider`}>{strength.label}</span>
                      </div>
                      
                      {/* Strength indicator line slider */}
                      <div className="bg-[var(--card)] h-1.5 rounded-full overflow-hidden border border-[var(--border)]">
                        <div className={`${strength.color} h-full transition-all duration-300 ${strength.width}`} />
                      </div>

                      {/* Rule item tags inline */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[9.5px]">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-center transition ${reqLength ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-500' : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {reqLength ? '✓' : '○'} 8+ Characters
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-center transition ${reqUpper ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-500' : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {reqUpper ? '✓' : '○'} Capital (A-Z)
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-center transition ${reqLower ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-500' : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {reqLower ? '✓' : '○'} Lowcase (a-z)
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-center transition ${reqNumber ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-500' : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {reqNumber ? '✓' : '○'} Digit (0-9)
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md border text-center transition ${reqSpecial ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-700 dark:text-emerald-500' : 'bg-[var(--card)] border-[var(--border)] text-[var(--text-muted)]'}`}>
                          {reqSpecial ? '✓' : '○'} Character Symbol
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SAVE PASSCODE COORDINATES BUTTON */}
                  <div className="flex justify-end pt-5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={loading || !newPassword}
                      onClick={handleUpdatePasswordSubmit}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        newPassword 
                          ? 'bg-violet-600 hover:bg-violet-550 text-white cursor-pointer shadow' 
                          : 'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed'
                      }`}
                      id="save-password-btn"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin text-white" size={13} />
                      ) : (
                        <Lock size={13} />
                      )}
                      Update Password
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: APPEARANCE */}
              {activeTab === 'appearance' && (
                <div className="space-y-6" id="settings-pane-appearance">
                  <div className="pb-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Appearance & Sandbox Styles</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Configure workspace themes, sizing configurations, and text layout metrics.</p>
                  </div>

                  {/* INTERACTIVE BENTO CARD CHOICES */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-[var(--text-primary)] tracking-wide uppercase font-mono block">
                      Preferred App Theme Layout
                    </label>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Dark mode choices card */}
                      <button
                        type="button"
                        onClick={() => toggleTheme('dark')}
                        className={`p-4 rounded-xl border text-left transition duration-200 relative overflow-hidden group select-none flex flex-col justify-between h-24 cursor-pointer ${
                          themeMode === 'dark'
                            ? 'bg-violet-550/10 border-violet-500 text-violet-500 shadow-sm shadow-violet-950/10'
                            : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                        id="theme-dark-bttn"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Moon size={11} className="text-indigo-400" />
                            Cosmic Dark
                          </span>
                          {themeMode === 'dark' && (
                            <div className="p-0.5 bg-violet-600 text-white rounded-full">
                              <Check size={10} />
                            </div>
                          )}
                        </div>
                        {/* Miniature layout mockup */}
                        <div className="space-y-1 bg-[#090b11] rounded p-1 border border-slate-900 w-full mt-2">
                          <div className="h-1 bg-[#8b5cf6]/30 rounded w-1/2" />
                          <div className="h-0.5 bg-slate-800 rounded w-full" />
                          <div className="h-0.5 bg-slate-850 rounded w-2/3" />
                        </div>
                      </button>

                      {/* Light theme choices card */}
                      <button
                        type="button"
                        onClick={() => toggleTheme('light')}
                        className={`p-4 rounded-xl border text-left transition duration-200 relative overflow-hidden group select-none flex flex-col justify-between h-24 cursor-pointer ${
                          themeMode === 'light'
                            ? 'bg-violet-500/10 border-violet-550 text-violet-650 shadow-sm'
                            : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                        }`}
                        id="theme-light-bttn"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <Sun size={11} className="text-amber-500" />
                            Stark Light
                          </span>
                          {themeMode === 'light' && (
                            <div className="p-0.5 bg-violet-600 text-white rounded-full">
                              <Check size={10} />
                            </div>
                          )}
                        </div>
                        {/* Miniature light layout mockup */}
                        <div className="space-y-1 bg-white rounded p-1 border border-slate-200 w-full mt-2">
                          <div className="h-1 bg-violet-500/20 rounded w-1/2" />
                          <div className="h-0.5 bg-slate-100 rounded w-full" />
                          <div className="h-0.5 bg-slate-200 rounded w-2/3" />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* ADDITIONAL PREFERENCE SELECTS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[9.5px] block">
                        Workspace Autosave Interval
                      </label>
                      <select
                        value={autosaveFreq}
                        onChange={(e) => setAutosaveFreq(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs py-2 px-3 outline-none cursor-pointer focus:border-violet-550 focus:ring-1 focus:ring-violet-500/20"
                      >
                        <option value="10s">Fast Cache (10s)</option>
                        <option value="20s">Normal Frequency (20s)</option>
                        <option value="1m">Generous Delay (1m)</option>
                        <option value="5m">Lazy Cooldown (5m)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 text-xs font-sans">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[9.5px] block">
                        AI Guidance Dialogue Tone
                      </label>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs py-2 px-3 outline-none cursor-pointer focus:border-violet-550 focus:ring-1 focus:ring-violet-500/20"
                      >
                        <option value="Supportive">Collaborative / Cozy</option>
                        <option value="Direct">Concise / Brutalist</option>
                        <option value="Creative">Poetic / Expressive</option>
                        <option value="Analytical">Literary Critic / Precise</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[9.5px] block">
                        Editor Focus Font Size
                      </label>
                      <select
                        value={fontSize}
                        onChange={(e) => setFontSize(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-xs py-2 px-3 outline-none cursor-pointer focus:border-violet-550 focus:ring-1 focus:ring-violet-500/20"
                      >
                        <option value="14px">Compact Writing (14px)</option>
                        <option value="16px">Draft Default (16px)</option>
                        <option value="18px">Readable Display (18px)</option>
                        <option value="20px">High Visibility (20px)</option>
                      </select>
                    </div>
                  </div>

                  {/* SAVE PREFERENCES TRIGGER BUTTON */}
                  <div className="flex justify-end pt-5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveTabSettings('appearance')}
                      className="px-5 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow flex items-center gap-1.5"
                      id="save-appearance-btn"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin text-white" size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: NOTIFICATIONS */}
              {activeTab === 'notifications' && (
                <div className="space-y-6" id="settings-pane-notifications">
                  <div className="pb-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Notifications Registry</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Select and configure updates email, reply alerts or writing system digests.</p>
                  </div>

                  <div className="space-y-4 pt-1">
                    {/* Toggle row: Email Updates */}
                    <div className="flex items-start justify-between p-4 bg-[var(--background)]/50 border border-[var(--border)] rounded-xl gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-[var(--text-primary)] block">Weekly Creative Digest Digests</label>
                        <span className="text-xs text-[var(--text-secondary)] leading-relaxed block">
                          Receive custom drafts statistics, word counts charts, and community highlight summary coordinates.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifEmail(!notifEmail)}
                        className={`w-11 h-6 rounded-full transition flex items-center p-0.5 cursor-pointer shrink-0 ${
                          notifEmail ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        id="toggle-digest"
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifEmail ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle row: Character Alerts */}
                    <div className="flex items-start justify-between p-4 bg-[var(--background)]/50 border border-[var(--border)] rounded-xl gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-[var(--text-primary)] block">Character Alignment Updates</label>
                        <span className="text-xs text-[var(--text-secondary)] leading-relaxed block">
                          Triggers real-time suggestions and analytical warnings when character behaviors deviate from profiles.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifAlerts(!notifAlerts)}
                        className={`w-11 h-6 rounded-full transition flex items-center p-0.5 cursor-pointer shrink-0 ${
                          notifAlerts ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        id="toggle-alerts"
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifAlerts ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>

                    {/* Toggle row: Community Alerts */}
                    <div className="flex items-start justify-between p-4 bg-[var(--background)]/50 border border-[var(--border)] rounded-xl gap-4">
                      <div className="space-y-1">
                        <label className="text-sm font-bold text-[var(--text-primary)] block">Community Reviews & Likes</label>
                        <span className="text-xs text-[var(--text-secondary)] leading-relaxed block">
                          Receive instant push tokens/emails when a fan provides positive review notes, favorites or duplicates layouts.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifReplies(!notifReplies)}
                        className={`w-11 h-6 rounded-full transition flex items-center p-0.5 cursor-pointer shrink-0 ${
                          notifReplies ? 'bg-violet-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                        id="toggle-replies"
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${notifReplies ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* SAVE PREFERENCES TRIGGER BUTTON */}
                  <div className="flex justify-end pt-5 border-t border-[var(--border)]">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSaveTabSettings('notifications')}
                      className="px-5 py-2.5 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-lg text-xs transition cursor-pointer shadow flex items-center gap-1.5"
                      id="save-notifications-btn"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin text-white" size={13} />
                      ) : (
                        <Save size={13} />
                      )}
                      Save Preferences
                    </button>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: ACCOUNT */}
              {activeTab === 'account' && (
                <div className="space-y-6" id="settings-pane-account">
                  <div className="pb-4 border-b border-[var(--border)]">
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">Account Coordinates</h2>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Manage core account email registration and master workspace parameters.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5 text-xs">
                      <label className="font-bold text-[var(--text-primary)] font-mono uppercase text-[10px] block">
                        Associated Email Address
                      </label>
                      <div className="flex items-center rounded-lg bg-[var(--background)] border border-[var(--border)] overflow-hidden focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-550 transition-all">
                        <span className="bg-[var(--card)] text-[var(--text-secondary)] px-3 py-2 font-mono text-sm border-r border-[var(--border)] select-none">
                          <Mail size={13} />
                        </span>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent text-[var(--text-primary)] px-3 py-2 outline-none text-xs"
                          placeholder="writer@fictself.com"
                        />
                      </div>
                    </div>

                    {/* SAVE ACCOUNT CHANGES */}
                    <div className="flex justify-end pt-3">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSaveTabSettings('account')}
                        className="px-5 py-2 bg-violet-600 hover:bg-violet-550 text-white font-bold rounded-lg text-xs transition cursor-pointer flex items-center gap-1.5"
                        id="save-account-btn"
                      >
                        {loading ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                        Save Preferences
                      </button>
                    </div>

                    {/* REDESIGNED PREMIUM DANGER ZONE PANEL */}
                    <div className="border border-red-500/35 bg-red-500/5 rounded-2xl p-6 mt-8 space-y-4" id="account-danger-zone-panel">
                      <div className="flex items-center gap-2 pb-2 border-b border-red-500/20">
                        <ShieldAlert className="text-red-650 dark:text-red-500 shrink-0" size={18} />
                        <h3 className="text-sm font-extrabold text-red-650 dark:text-red-500 font-sans tracking-wide uppercase">Danger Zone</h3>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-[var(--text-primary)]">Delete Fictself AI Writing Account Permanently</h4>
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          Once initiated, account removal deletes your entire writer profiles, character companion nodes, active outline files, and all stories (both active and archived). There is no self-service recovery available.
                        </p>
                      </div>

                      <div className="pt-2 flex justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteConfirmationText('');
                            setShowDeleteModal(true);
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow"
                          id="btn-delete-account-modal-open"
                        >
                          <Trash2 size={13} />
                          Delete Account Permanently
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* CONFIRMATION MODAL: REMOVE PHOTO */}
      {showRemoveAvatarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none bg-black/60 backdrop-blur-xs">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4 shadow-xl"
            id="modal-remove-avatar"
          >
            <div className="flex items-center gap-2 text-amber-500">
              <AlertTriangle size={18} />
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Remove Profile Picture?</h3>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              This will remove your current avatar. Your layout will revert to an automatically generated initials monogram placeholder feed identifier inside community forums.
            </p>

            <div className="flex items-center justify-end gap-2.5 font-mono pt-2">
              <button
                type="button"
                onClick={() => setShowRemoveAvatarModal(false)}
                className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--background)] bg-transparent rounded-lg cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveAvatarConfirm}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-550 rounded-lg cursor-pointer transition shadow"
                id="btn-confirm-remove-photo"
              >
                Remove
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CONFIRMATION MODAL: SECURE ACCOUNT DELETION */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-[var(--card)] border border-red-500/35 rounded-2xl p-6 space-y-4 shadow-2xl text-left"
            id="modal-delete-account-confirmation"
          >
            <div className="flex items-center gap-2 text-red-500 pb-2 border-b border-[var(--border)]">
              <ShieldAlert size={20} className="animate-bounce" />
              <h3 className="font-extrabold text-base text-[var(--text-primary)] font-sans">Delete Fictself AI Account?</h3>
            </div>
            
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              You are about to initiate account deletion. All your draft manuscripts, writer dashboard configurations, custom character logs, active chronicles, and all archived books will be permanently deleted from Fictself AI database records.
            </p>

            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-xl text-[11px] text-red-650 dark:text-red-500 leading-normal font-sans">
              ⚠️ Warning: This is an irreversible master process data erasure action and can never be undone.
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wide font-mono block">
                To confirm, type <span className="font-extrabold text-[var(--text-primary)] select-all px-1 py-0.5 bg-[var(--background)] border border-[var(--border)] rounded">DELETE</span> in the text input box:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Type 'DELETE' exactly to authorize account deletion"
                className="w-full bg-[var(--background)] border border-red-500/30 text-[var(--text-primary)] font-mono font-bold text-xs p-3 rounded-lg outline-none focus:ring-2 focus:ring-red-550/20 focus:border-red-500"
                id="input-delete-confirm-text"
              />
            </div>

            <div className="flex justify-end gap-2.5 font-mono pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--background)] bg-transparent rounded-lg cursor-pointer transition border border-[var(--border)]"
              >
                No, Keep Account
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText !== 'DELETE'}
                onClick={handleDeleteAccountConfirmSubmit}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition shadow flex items-center gap-1.5 ${
                  deleteConfirmationText === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-750 cursor-pointer'
                    : 'bg-[var(--background)] text-[var(--text-muted)] border border-[var(--border)] cursor-not-allowed'
                }`}
                id="btn-confirm-delete-account-submit"
              >
                <Trash2 size={12} />
                Permanently Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
