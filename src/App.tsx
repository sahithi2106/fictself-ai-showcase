import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import HomeView from './components/HomeView';
import MyStoriesView from './components/MyStoriesView';
import StoryView from './components/StoryView';
import PublicStoryView from './components/PublicStoryView';
import ReaderChapterView from './components/ReaderChapterView';
import DashboardView from './components/DashboardView';
import EditorView from './components/EditorView';
import CharacterView from './components/CharacterView';
import ProfileView from './components/ProfileView';
import PublicProfileView from './components/PublicProfileView';
import CommunityView from './components/CommunityView';
import LibraryView from './components/LibraryView';
import ErrorBoundary from './components/ErrorBoundary';
import NotificationsView from './components/NotificationsView';
import SettingsView from './components/SettingsView';
import StoryCoverView from './components/StoryCoverView';
import StoryEditModal from './components/StoryEditModal';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import CoverImageUploader from './components/CoverImageUploader';
import ArchiveConfirmationModal from './components/ArchiveConfirmationModal';
import ChangeCoverModal from './components/ChangeCoverModal';
import AuthGate from './components/AuthGate';
import PersonasView from './components/PersonasView';
import { authService } from './lib/authService';
import { PRIMARY_GENRES } from './genresData';

import { Story, Chapter, Character, Notification, UserProfile, ReadingList } from './types';
import { fetchStories, fetchPublicStories, createStory, updateStory, deleteStory } from './lib/api/stories';
import { fetchNotifications, markNotificationRead, markAllNotificationsRead, clearAllNotifications } from './lib/api/notifications';
import { fetchChapters, createChapter, updateChapter, deleteChapter } from './lib/api/chapters';
import { fetchCharacters, createCharacter, updateCharacter, deleteCharacter } from './lib/api/characters';

import {
  Plus,
  Trash2,
  BookOpen,
  ChevronRight,
  Settings,
  Sparkles,
  Globe,
  Tag,
  PenTool,
  FileText,
  AlertTriangle,
  MoreVertical,
  Archive,
  RotateCw,
  Eye,
  Heart,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

const getStatusEmoji = (status?: string) => {
  switch (status) {
    case 'On Hold': return '🟡';
    case 'Planned': return '🔵';
    case 'Draft': return '⚫';
    case 'Completed': return '🏁';
    case 'Archived': return '📦';
    case 'Ongoing':
    default: return '🟢';
  }
};

export default function App() {
  // Authentication & Session States
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    return authService.getCurrentUserSync();
  });
  const [sessionExpiredTriggered, setSessionExpiredTriggered] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Dynamic Theme Preference synchronized state and observer
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('themePreference') as 'light' | 'dark' | null;
    return stored || (authService.getCurrentUserSync()?.themePreference) || 'dark';
  });

  useEffect(() => {
    if (currentUser?.themePreference) {
      setThemeMode(currentUser.themePreference);
    }
  }, [currentUser]);

  useEffect(() => {
    if (themeMode === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('themePreference', themeMode);
  }, [themeMode]);

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setThemeMode(newTheme);
    if (currentUser) {
      try {
        const updatedUser = await authService.updateProfile(currentUser.id, {
          themePreference: newTheme
        });
        setCurrentUser(updatedUser);
      } catch (err) {
        console.error("Failed to update profile theme preference in remote service", err);
      }
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Navigation & Side collapse states
  const [currentView, setView] = useState<string>('home');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(true);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  // Core Persistent States — stories & characters loaded from API on login
  const [stories, setStories] = useState<Story[]>([]);
  const [discoverStories, setDiscoverStories] = useState<Story[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [storiesLoading, setStoriesLoading] = useState<boolean>(false);

  const [readingLists, setReadingLists] = useState<ReadingList[]>(() => {
    const user = authService.getCurrentUserSync();
    const key = user ? `fictself_reading_lists_${user.id}` : 'fictself_reading_lists_anon';
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ReadingList[];
        // Sanitize out old demo reading lists that polluted localStorage
        const fakeIds = new Set(['rl-1', 'rl-2', 'rl-3', 'rl-4']);
        const fakeNames = new Set(['Fantasy Worlds', 'Books To Read', 'Romance Favorites', 'Summer Reads']);
        const validLists = parsed.filter(rl =>
          rl && rl.id && rl.name &&
          !fakeIds.has(rl.id) &&
          !fakeNames.has(rl.name)
        );
        return validLists;
      } catch (e) { }
    }
    return [];
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load all stories + their chapters + characters when user logs in
  useEffect(() => {
    if (!currentUser) {
      setStories([]);
      setDiscoverStories([]);
      setCharacters([]);
      return;
    }
    const reloadData = async () => {
      setStoriesLoading(true);
      try {
        const [rawStories, rawPublicStories, rawNotifs] = await Promise.all([
          fetchStories(),
          fetchPublicStories(),
          fetchNotifications().catch(() => [])
        ]);
        setNotifications(rawNotifs);
        setDiscoverStories(rawPublicStories);

        const enriched = await Promise.all(
          rawStories.map(async (story) => {
            const [chapters, chars] = await Promise.all([
              fetchChapters(story.id).catch(() => [] as Chapter[]),
              fetchCharacters(story.id).catch(() => [] as Character[]),
            ]);
            return { story: { ...story, chapters }, chars };
          })
        );
        const allStories = enriched.map(e => e.story);
        const allChars = enriched.flatMap(e => e.chars);
        setStories(allStories);
        setCharacters(allChars);
        if (allStories.length > 0 && selectedStoryId === '') {
          setSelectedStoryId(allStories[0].id);
        }
      } catch (err) {
        console.error('Failed to load stories:', err);
        showToast('Failed to load your stories. Please refresh.', 'error');
      } finally {
        setStoriesLoading(false);
      }
    };

    reloadData();
  }, [currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Session-expired event listener (fired by api/client.ts on 401)
  useEffect(() => {
    const handler = () => {
      authService.logoutSync();
      setCurrentUser(null);
      setSessionExpiredTriggered(true);
      setStories([]);
      setDiscoverStories([]);
      setCharacters([]);
      showToast('Session expired. Please log in again.', 'warning');
    };
    window.addEventListener('fictself:session-expired', handler);
    return () => window.removeEventListener('fictself:session-expired', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  // Active navigation entity references
  const [selectedStoryId, setSelectedStoryId] = useState<string>('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');

  // Wizard state for new story co-creation
  const [wizardTitle, setWizardTitle] = useState('');
  const [wizardTagline, setWizardTagline] = useState('');
  const [wizardDesc, setWizardDesc] = useState('');
  const [wizardPrimaryGenre, setWizardPrimaryGenre] = useState('');
  const [wizardSubgenre, setWizardSubgenre] = useState('');
  const [wizardCover, setWizardCover] = useState('');
  const [wizardLanguage, setWizardLanguage] = useState('English');
  const [wizardStatus, setWizardStatus] = useState<'draft' | 'published'>('draft');
  const [wizardTagsInput, setWizardTagsInput] = useState('');

  const [wizardCoverFile, setWizardCoverFile] = useState<File | null>(null);
  const [isCreatingStory, setIsCreatingStory] = useState(false);

  // Additional Story Management state
  const [activeNotebookTab, setActiveNotebookTab] = useState<'active' | 'archived'>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingChapter, setIsCreatingChapter] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [archivingStory, setArchivingStory] = useState<Story | null>(null);
  const [changingCoverStory, setChangingCoverStory] = useState<Story | null>(null);

  useEffect(() => {
    const key = currentUser ? `fictself_reading_lists_${currentUser.id}` : 'fictself_reading_lists_anon';
    localStorage.setItem(key, JSON.stringify(readingLists));
  }, [readingLists, currentUser]);



  // Derived variables
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  // Handlers for Notifications
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      showToast('Failed to mark notification read', 'error');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (e) {
      showToast('Failed to mark all read', 'error');
    }
  };

  const handleClearNotifications = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (e) {
      showToast('Failed to clear notifications', 'error');
    }
  };

  const handleClearRead = () => {
    setNotifications(prev => prev.filter(n => !n.read));
  };

  // Combine user's stories and public stories for resolution across the app (like in Library)
  const allKnownStories = useMemo(() => {
    const map = new Map<string, Story>();
    discoverStories.forEach(s => map.set(s.id, s));
    stories.forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  }, [stories, discoverStories]);

  const activeStory = allKnownStories.find(s => s.id === selectedStoryId) || allKnownStories[0];
  const activeChapter = activeStory?.chapters.find(c => c.id === selectedChapterId) || activeStory?.chapters[0];

  // Helper code: check if the currentUser has permissions to modify a story (and its characters/chapters)
  const canModifyStory = (sId: string | undefined): boolean => {
    if (!sId) return false;
    if (!currentUser) return false;
    if (currentUser.role === 'Admin') return true;
    if (currentUser.role === 'Reader') return false;

    const target = stories.find(s => s.id === sId);
    if (!target) return false;
    if (!target.authorId) {
      return false; // Safely return false if no authorId
    }
    return target.authorId === currentUser.id;
  };

  // Story CRUD actions
  const handleCreateStory = async (e: any) => {
    e.preventDefault();
    if (isCreatingStory) return;

    if (currentUser?.role === 'Reader') {
      showToast("Reader mode is read-only. Please edit your role in Profile settings to enable Writer mode!", "warning");
      return;
    }
    if (!wizardTitle.trim()) return;

    setIsCreatingStory(true);
    const wizardGenre = wizardSubgenre ? `${wizardPrimaryGenre} / ${wizardSubgenre}` : wizardPrimaryGenre;
    const parsedTags = wizardTagsInput
      ? wizardTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 10)
      : [wizardPrimaryGenre, wizardSubgenre].filter(Boolean).slice(0, 10);

    try {
      // 1. Create the story WITHOUT the base64 cover to avoid huge payloads
      let newStory = await createStory({
        title: wizardTitle,
        tagline: wizardTagline || 'An immersive creative spark co-designed with AI...',
        description: wizardDesc || 'Writers outline narrative nodes and let character agents challenge pacing choices.',
        coverUrl: '', // Explicitly empty to prevent base64 storage
        genre: wizardPrimaryGenre,
        subgenre: wizardSubgenre || undefined,
        language: wizardLanguage,
        tags: parsedTags,
        isPublished: wizardStatus === 'published',
        status: wizardStatus === 'published' ? 'Ongoing' : 'Draft',
        wordCount: 0,
      });

      // 2. Upload the real cover file if selected
      if (wizardCoverFile) {
        try {
          const { uploadStoryCover } = await import('./lib/api/stories');
          newStory = await uploadStoryCover(newStory.id, wizardCoverFile);
        } catch (uploadError) {
          console.error("Cover upload failed:", uploadError);
          showToast("Story created, but cover upload failed.", "warning");
        }
      }

      const enrichedStory = { ...newStory, chapters: [] };
      setStories([enrichedStory, ...stories]);
      setView('story-dashboard');
      setSelectedStoryId(enrichedStory.id);
      setSelectedChapterId(null);

      // Reset wizard
      setWizardTitle('');
      setWizardTagline('');
      setWizardDesc('');
      setWizardCover('');
      setWizardCoverFile(null);
      setWizardTagsInput('');
      setWizardLanguage('English');
      setWizardStatus('draft');
      showToast(`Created new story: ${wizardTitle}`, 'success');
    } catch (error) {
      console.error("Failed to create story", error);
      showToast("Failed to create story", "error");
    } finally {
      setIsCreatingStory(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!canModifyStory(storyId)) {
      showToast("Story Ownership Violation: You are not authorized to delete another storyteller's nodes.", "error");
      return;
    }
    try {
      await deleteStory(storyId);
      setStories(prev => prev.filter(s => s.id !== storyId));
      setCharacters(prev => prev.filter(c => c.storyId !== storyId));
      setView('my-stories');
    } catch (err: any) {
      showToast(err.message || 'Failed to delete story.', 'error');
    }
  };

  const handleDuplicateStory = (storyId: string) => {
    // Note: duplicating makes a copy under the current creator!
    const parentStory = stories.find(s => s.id === storyId);
    if (!parentStory) return;
    const duplicatedStoryId = `story-dup-${Date.now()}`;
    const duplicated: Story = {
      ...parentStory,
      id: duplicatedStoryId,
      title: `${parentStory.title} (Copy)`,
      author: currentUser?.displayName || 'Author',
      authorId: currentUser?.id || 'user-writer-1',
      lastUpdated: new Date().toISOString(),
      views: 0,
      likes: 0,
      isPublished: false,
      chapters: parentStory.chapters.map(ch => ({
        ...ch,
        id: `chap-${ch.id.replace('chap-', '')}-${Date.now()}`,
        storyId: duplicatedStoryId,
      }))
    };
    setStories([duplicated, ...stories]);
    showToast(`Duplicated "${parentStory.title}" to your stories!`);
  };

  const handleArchiveStory = async (storyId: string, isArchiving: boolean) => {
    if (!canModifyStory(storyId)) {
      showToast("Story Ownership Violation: You are not authorized to archive another storyteller's nodes.", "error");
      return;
    }
    try {
      await updateStory(storyId, { isArchived: isArchiving });
      // Force reload to get updated status and lists
      // Ideally we'd call reloadData() here but it's inside useEffect, so we trigger a local reload logic or mutate state.
      // Since reloadData is trapped in useEffect, let's just trigger a re-fetch manually.
      const rawStories = await fetchStories();
      const rawPublicStories = await fetchPublicStories();
      setDiscoverStories(rawPublicStories);
      const enriched = await Promise.all(
        rawStories.map(async (story) => {
          const [chapters, chars] = await Promise.all([
            fetchChapters(story.id).catch(() => [] as Chapter[]),
            fetchCharacters(story.id).catch(() => [] as Character[]),
          ]);
          return { ...story, chapters };
        })
      );
      setStories(enriched);
      showToast(isArchiving ? 'Story archived successfully.' : 'Story restored to Active Stories.');
    } catch (err: any) {
      showToast(err.message || 'Failed to archive story.', 'error');
    }
  };

  const handleUpdateStory = async (updated: Story) => {
    if (!canModifyStory(updated.id)) {
      showToast("Story Ownership Violation: You are not authorized to update another storyteller's nodes.", "error");
      return;
    }
    try {
      const saved = await updateStory(updated.id, updated);
      setStories(prev => prev.map(s => s.id === updated.id ? { ...saved, chapters: updated.chapters } : s));
    } catch (err: any) {
      showToast(err.message || 'Failed to save story.', 'error');
    }
  };

  const handlePublishStoryToggle = async (storyId: string) => {
    if (!canModifyStory(storyId)) {
      showToast("Story Ownership Violation: You are not authorized to publish another storyteller's nodes.", "error");
      return;
    }
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    const hasPublishedChapter = story.chapters && story.chapters.some(c => c.status === 'published');
    if (!story.isPublished && !hasPublishedChapter) {
      showToast("You must publish at least one chapter before publishing the story blueprint.", "error");
      return;
    }

    try {
      await updateStory(storyId, { isPublished: !story.isPublished });
      const rawStories = await fetchStories();
      const rawPublicStories = await fetchPublicStories();
      setDiscoverStories(rawPublicStories);
      const enriched = await Promise.all(
        rawStories.map(async (story) => {
          const [chapters, chars] = await Promise.all([
            fetchChapters(story.id).catch(() => [] as Chapter[]),
            fetchCharacters(story.id).catch(() => [] as Character[]),
          ]);
          return { ...story, chapters };
        })
      );
      setStories(enriched);
    } catch (err: any) {
      showToast(err.message || 'Failed to update publish state.', 'error');
    }
  };

  // Chapter content save — persists to backend
  const handleSaveChapterContent = async (
    storyId: string,
    chapterId: string,
    updatedText: string,
    updatedTitle: string,
    statusState: 'draft' | 'published',
    pinnedState: boolean
  ) => {
    if (!canModifyStory(storyId)) {
      showToast("Story Ownership Violation: You are not authorized to modify chapters of another storyteller's story.", "error");
      return;
    }
    const wCount = updatedText.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(x => x.length > 0).length;
    try {
      await updateChapter(chapterId, {
        content: updatedText,
        title: updatedTitle,
        status: statusState,
        isPinned: pinnedState,
        wordCount: wCount,
      });
      const rawStories = await fetchStories();
      const rawPublicStories = await fetchPublicStories();
      setDiscoverStories(rawPublicStories);
      const enriched = await Promise.all(
        rawStories.map(async (story) => {
          const [chapters, chars] = await Promise.all([
            fetchChapters(story.id).catch(() => [] as Chapter[]),
            fetchCharacters(story.id).catch(() => [] as Character[]),
          ]);
          return { ...story, chapters };
        })
      );
      setStories(enriched);
    } catch (err: any) {
      showToast(err.message || 'Failed to save chapter.', 'error');
    }
  };

  const handleAddNewChapter = async (storyId: string) => {
    if (isCreatingChapter) return;
    if (!canModifyStory(storyId)) {
      showToast("Story Ownership Violation: You are not authorized to add chapters to another storyteller's story.", "error");
      return;
    }
    const story = stories.find(s => s.id === storyId);
    if (!story) return;

    setIsCreatingChapter(true);
    const nextSeq = story.chapters.length + 1;
    try {
      const newChap = await createChapter(storyId, {
        title: `Chapter ${nextSeq}`,
        content: ``,
        summary: '',
        sequence: nextSeq,
        status: 'draft',
        isPinned: false,
        wordCount: 0,
      });
      setStories(prev => prev.map(s => {
        if (s.id !== storyId) return s;
        return { ...s, chapters: [...s.chapters, newChap], draftCount: s.draftCount + 1 };
      }));
      setSelectedChapterId(newChap.id);
      setSelectedStoryId(storyId);

      setView('writing-studio');
    } catch (err: any) {
      showToast(err.message || 'Failed to create new chapter.', 'error');
    } finally {
      setIsCreatingChapter(false);
    }
  };

  // Interactions Increment
  const handleUpdateStoryStats = (storyId: string, type: 'like' | 'favorite') => {
    setStories(stories.map(s => {
      if (s.id === storyId) {
        return {
          ...s,
          likes: type === 'like' ? s.likes + 1 : s.likes,
          favorites: type === 'favorite' ? s.favorites + 1 : s.favorites
        };
      }
      return s;
    }));
  };

  // Character codex list updates
  const handleAddCharacter = async (newChar: Character, avatarFile?: File) => {
    if (!canModifyStory(newChar.storyId)) {
      showToast("Story Ownership Violation: You are not authorized to add characters to this story.", "error");
      return;
    }
    try {
      // Create character first to get the ID, stripping local base64 avatar
      const charToCreate = { ...newChar, avatar: '' };
      let saved = await createCharacter(newChar.storyId, charToCreate);

      // Upload avatar file if provided
      if (avatarFile) {
        try {
          const { uploadCharacterAvatar } = await import('./lib/api/characters');
          saved = await uploadCharacterAvatar(newChar.storyId, saved.id, avatarFile);
        } catch (uploadErr) {
          console.error("Failed to upload character avatar:", uploadErr);
          showToast("Character created, but avatar upload failed.", "warning");
        }
      } else if (newChar.avatar && newChar.avatar.startsWith('http')) {
        // Fallback for preset avatars
        saved = await updateCharacter(saved.id, { ...saved, avatar: newChar.avatar });
      }

      setCharacters(prev => [...prev, saved]);
    } catch (err: any) {
      showToast(err.message || 'Failed to create character.', 'error');
    }
  };

  const handleDeleteCharacter = async (charId: string) => {
    const char = characters.find(c => c.id === charId);
    if (char && !canModifyStory(char.storyId)) {
      showToast("Story Ownership Violation: You are not authorized to delete characters from this story.", "error");
      return;
    }
    try {
      await deleteCharacter(charId);
      setCharacters(prev => prev.filter(c => c.id !== charId));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete character.', 'error');
    }
  };

  const handleUpdateCharacter = async (updatedChar: Character, avatarFile?: File) => {
    if (!canModifyStory(updatedChar.storyId)) {
      showToast("Story Ownership Violation: You are not authorized to update characters of this story.", "error");
      return;
    }
    try {
      // Save text fields without polluting with base64 if it's currently a data URL
      const charToUpdate = { ...updatedChar };
      if (charToUpdate.avatar?.startsWith('data:image')) {
        charToUpdate.avatar = '';
      }

      let saved = await updateCharacter(updatedChar.id, charToUpdate);

      // Upload avatar file if provided
      if (avatarFile) {
        try {
          const { uploadCharacterAvatar } = await import('./lib/api/characters');
          saved = await uploadCharacterAvatar(updatedChar.storyId, saved.id, avatarFile);
        } catch (uploadErr) {
          console.error("Failed to upload character avatar:", uploadErr);
          showToast("Character updated, but avatar upload failed.", "warning");
        }
      }

      setCharacters(prev => prev.map(c => c.id === updatedChar.id ? { ...saved, storyId: updatedChar.storyId } : c));
    } catch (err: any) {
      showToast(err.message || 'Failed to update character.', 'error');
    }
  };


  // Secure Route Protection variables
  const isProtectedView = [
    'my-stories', 'story-dashboard', 'drafts', 'favorites',
    'character-manager', 'notifications', 'profile', 'settings',
    'writing-studio', 'new-story-flow', 'personas'
  ].includes(currentView);

  const showLoginGate = currentUser === null || sessionExpiredTriggered;

  return (
    <div className={`flex flex-col md:flex-row min-h-screen transition-all duration-305 ${themeMode === 'light' ? 'bg-[#f8f9fa] text-[#0f172a]' : 'bg-[#0d0f17] text-[#f1f5f9]'}`} id="fictself-app-root">

      {/* 1. COLLAPSIBLE PERSISTENT SIDEBAR */}
      {!showLoginGate && (
        <Sidebar
          currentView={currentView}
          setView={setView}
          isExpanded={isSidebarExpanded}
          setIsExpanded={setIsSidebarExpanded}
          unreadNotifications={unreadNotificationsCount}
          currentUser={currentUser}
          onLogout={() => {
            authService.logoutSync();
            setCurrentUser(null);
            setSessionExpiredTriggered(false);
            showToast("Successfully disconnected active token session.");
          }}
          onSimulateExpiry={() => {
            setSessionExpiredTriggered(true);
            authService.logoutSync();
            setCurrentUser(null);
            setView('profile'); // Forces active login screen routing!
            showToast("Security Session Expelled! Please log in again to renew tokens.", "warning");
          }}
          themeMode={themeMode}
        />
      )}

      {/* 2. MAIN WORKING CANVAS WRAPPER */}
      <main className="flex-1 overflow-y-auto h-screen relative focus:outline-none">

        {!showLoginGate && (
          <div className={`flex items-center justify-between px-4 md:px-8 py-3 border-b transition-all duration-300 ${themeMode === 'light' ? 'bg-white/90 border-slate-200/80' : 'bg-[#0a0a0a]/95 border-[#1a1a1a]/60'} sticky top-0 z-30 backdrop-blur-md`}>
            {/* Left Workspace Indicator */}
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-extrabold tracking-wider uppercase ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-450'}`}>
                Workspace
              </span>
              <ChevronRight size={11} className={themeMode === 'light' ? 'text-slate-400' : 'text-slate-500'} />
              <span className={`text-xs font-mono font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${themeMode === 'light' ? 'bg-violet-100/60 text-violet-650' : 'bg-violet-950/30 text-violet-400'}`}>
                {currentView.replace('-', ' ')}
              </span>
            </div>

            {/* Modern Adaptive Toggle Tool */}
            <div className="flex items-center gap-3">
              <span className={`text-[9px] font-mono font-bold uppercase tracking-wider hidden sm:inline ${themeMode === 'light' ? 'text-slate-500' : 'text-slate-450'}`}>
                {themeMode === 'light' ? 'Stark Light Mode' : 'Cosmic Dark Mode'}
              </span>
              <div
                className={`p-1 rounded-lg flex items-center gap-1 border transition-all duration-300 ${themeMode === 'light'
                    ? 'bg-slate-100 border-slate-200'
                    : 'bg-[#121212] border-slate-800'
                  }`}
              >
                <button
                  type="button"
                  onClick={() => handleThemeChange('dark')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${themeMode === 'dark'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  title="Shift to cosmic dark mode"
                >
                  <Moon size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleThemeChange('light')}
                  className={`p-1.5 rounded-md transition-all cursor-pointer ${themeMode === 'light'
                      ? 'bg-violet-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-200'
                    }`}
                  title="Shift to stark light mode"
                >
                  <Sun size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW ROUTING ENGINE */}
        <div className={['writing-studio', 'story-reader'].includes(currentView) || showLoginGate ? "" : "p-4 md:p-8"}>

          {showLoginGate ? (
            <div className={`min-h-screen w-full flex items-center justify-center transition-all duration-300 ${themeMode === 'light' ? 'bg-[#f8f9fa]' : 'bg-[#07090e]'
              }`}>
              <AuthGate
                onLoginSuccess={(user) => {
                  setCurrentUser(user);
                  setSessionExpiredTriggered(false);
                  showToast(`Credentials verified for ${user.displayName}. Welcome!`, "success");
                }}
                onLogout={() => {
                  authService.logoutSync();
                  setCurrentUser(null);
                  setSessionExpiredTriggered(false);
                  showToast("Successfully logged out.", "success");
                }}
                currentUser={currentUser}
                triggerSessionExpirySignal={sessionExpiredTriggered}
                themeMode={themeMode}
                onThemeChange={handleThemeChange}
              />
            </div>
          ) : (
            <>
              {currentView === 'home' && (
                <HomeView
                  stories={discoverStories}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  currentUser={currentUser}
                  readingLists={readingLists}
                  setReadingLists={setReadingLists}
                  navigateTo={(view, storyId, chapterId, userId) => {
                    if (storyId) setSelectedStoryId(storyId);
                    if (chapterId) setSelectedChapterId(chapterId);
                    if (userId) setViewingUserId(userId);
                    setView(view);
                  }}
                />
              )}

              {currentView === 'public-story' && (
                <PublicStoryView
                  storyId={selectedStoryId}
                  navigateTo={(view, storyId, chapterId, userId) => {
                    if (storyId) setSelectedStoryId(storyId);
                    if (chapterId) setSelectedChapterId(chapterId);
                    if (userId) setViewingUserId(userId);
                    setView(view);
                  }}
                />
              )}

              {currentView === 'reader-chapter' && (
                <ReaderChapterView
                  storyId={selectedStoryId}
                  chapterId={selectedChapterId}
                  navigateTo={(view, storyId, chapterId, userId) => {
                    if (storyId) setSelectedStoryId(storyId);
                    if (chapterId) setSelectedChapterId(chapterId);
                    if (userId) setViewingUserId(userId);
                    setView(view);
                  }}
                  currentUser={currentUser}
                  readingLists={readingLists}
                  setReadingLists={setReadingLists}
                />
              )}

              {currentView === 'communities' && (
                <ErrorBoundary>
                  <CommunityView currentUser={currentUser} />
                </ErrorBoundary>
              )}

              {currentView === 'library' && (
                <LibraryView
                  stories={allKnownStories}
                  setStories={setStories}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  readingLists={readingLists}
                  setReadingLists={setReadingLists}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'my-stories' && (
                <MyStoriesView
                  stories={stories}
                  setStories={setStories}
                  characters={characters}
                  currentUser={currentUser}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  handleDeleteStory={handleDeleteStory}
                  handleDuplicateStory={handleDuplicateStory}
                  handleArchiveStory={handleArchiveStory}
                  handleUpdateStory={handleUpdateStory}
                  handlePublishStoryToggle={handlePublishStoryToggle}
                  handleAddNewChapter={handleAddNewChapter}
                  handleAddCharacter={handleAddCharacter}
                  handleDeleteCharacter={handleDeleteCharacter}
                  handleUpdateCharacter={handleUpdateCharacter}
                  canModifyStory={canModifyStory}
                  initialTab="stories"
                />
              )}

              {currentView === 'drafts' && (
                <MyStoriesView
                  stories={stories}
                  setStories={setStories}
                  characters={characters}
                  currentUser={currentUser}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  handleDeleteStory={handleDeleteStory}
                  handleDuplicateStory={handleDuplicateStory}
                  handleArchiveStory={handleArchiveStory}
                  handleUpdateStory={handleUpdateStory}
                  handlePublishStoryToggle={handlePublishStoryToggle}
                  handleAddNewChapter={handleAddNewChapter}
                  handleAddCharacter={handleAddCharacter}
                  handleDeleteCharacter={handleDeleteCharacter}
                  handleUpdateCharacter={handleUpdateCharacter}
                  canModifyStory={canModifyStory}
                  initialTab="drafts"
                />
              )}

              {currentView === 'favorites' && (
                <MyStoriesView
                  stories={stories}
                  setStories={setStories}
                  characters={characters}
                  currentUser={currentUser}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  handleDeleteStory={handleDeleteStory}
                  handleDuplicateStory={handleDuplicateStory}
                  handleArchiveStory={handleArchiveStory}
                  handleUpdateStory={handleUpdateStory}
                  handlePublishStoryToggle={handlePublishStoryToggle}
                  handleAddNewChapter={handleAddNewChapter}
                  handleAddCharacter={handleAddCharacter}
                  handleDeleteCharacter={handleDeleteCharacter}
                  handleUpdateCharacter={handleUpdateCharacter}
                  canModifyStory={canModifyStory}
                  initialTab="favorites"
                />
              )}

              {currentView === 'character-manager' && (
                <MyStoriesView
                  stories={stories}
                  setStories={setStories}
                  characters={characters}
                  currentUser={currentUser}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  setSelectedChapterId={setSelectedChapterId}
                  handleDeleteStory={handleDeleteStory}
                  handleDuplicateStory={handleDuplicateStory}
                  handleArchiveStory={handleArchiveStory}
                  handleUpdateStory={handleUpdateStory}
                  handlePublishStoryToggle={handlePublishStoryToggle}
                  handleAddNewChapter={handleAddNewChapter}
                  handleAddCharacter={handleAddCharacter}
                  handleDeleteCharacter={handleDeleteCharacter}
                  handleUpdateCharacter={handleUpdateCharacter}
                  canModifyStory={canModifyStory}
                  initialTab="characters"
                />
              )}

              {currentView === 'notifications' && (
                <NotificationsView
                  notifications={notifications}
                  onMarkRead={handleMarkRead}
                  onClearAll={handleClearNotifications}
                  onMarkAllRead={handleMarkAllRead}
                  onClearRead={handleClearRead}
                />
              )}

              {currentView === 'profile' && (
                <ProfileView
                  stories={stories}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  currentUser={currentUser}
                  onUpdateProfile={setCurrentUser}
                />
              )}

              {currentView === 'public-profile' && viewingUserId && (
                <PublicProfileView
                  userId={viewingUserId}
                  setView={setView}
                  setSelectedStoryId={setSelectedStoryId}
                  currentUserId={currentUser?.id}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  setView={setView}
                  currentUser={currentUser}
                  onUpdateProfile={setCurrentUser}
                  onLogout={() => {
                    authService.logoutSync();
                    setCurrentUser(null);
                    setSessionExpiredTriggered(false);
                    setView('home');
                    showToast("Logged out successfully.", "success");
                  }}
                />
              )}

              {currentView === 'personas' && (
                <PersonasView />
              )}

              {currentView === 'story-dashboard' && activeStory && (
                <DashboardView
                  story={activeStory}
                  characters={characters}
                  stories={stories}
                  setView={setView}
                  setSelectedChapterId={setSelectedChapterId}
                  onNewChapter={handleAddNewChapter}
                  onDeleteStory={handleDeleteStory}
                  onPublishStoryToggle={handlePublishStoryToggle}
                  onAddCharacter={handleAddCharacter}
                  onDeleteCharacter={handleDeleteCharacter}
                  onUpdateCharacter={handleUpdateCharacter}
                  onUpdateStory={handleUpdateStory}
                  onDuplicateStory={handleDuplicateStory}
                  onArchiveStory={handleArchiveStory}
                />
              )}

              {currentView === 'story-reader' && activeStory && (
                <StoryView
                  story={activeStory}
                  setView={setView}
                  selectedChapterId={selectedChapterId}
                  setSelectedChapterId={setSelectedChapterId}
                  onUpdateStats={handleUpdateStoryStats}
                  currentUser={currentUser}
                  readingLists={readingLists}
                  setReadingLists={setReadingLists}
                />
              )}

              {(currentView === 'writing-studio' || currentView === 'chapter-preview') && activeStory && activeChapter && (
                <EditorView
                  story={activeStory}
                  chapter={activeChapter}
                  characters={characters}
                  setView={setView}
                  onSaveContent={handleSaveChapterContent}
                  onNavigateToCharacterManager={() => setView('character-manager')}
                  currentUser={currentUser}
                  mode={currentView === 'chapter-preview' ? 'view' : 'edit'}
                />
              )}

              {/* New story co-creation wizard form */}
              {currentView === 'new-story-flow' && (
                <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 select-none animate-fade-in" id="new-story-flow-form">

                  {/* Form Entry Column (7 Cols) */}
                  <div className="lg:col-span-7 bg-[#0f1422] border border-slate-800 rounded-2xl p-6 space-y-6 shadow-2xl">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3.5 shrink-0">
                      <Sparkles size={20} className="text-violet-400 animate-pulse" />
                      <h1 className="text-lg font-bold text-white font-sans">Co-create Story Blueprint</h1>
                    </div>

                    <form onSubmit={handleCreateStory} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Story Title *</label>
                        <input
                          type="text"
                          required
                          value={wizardTitle}
                          onChange={(e) => setWizardTitle(e.target.value)}
                          placeholder="e.g. Cyber Genesis"
                          className="w-full bg-[#111827] border border-slate-800 focus:border-violet-500 font-semibold text-xs py-2 px-3.5 rounded-lg outline-none text-slate-100"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Catchy Tagline</label>
                        <input
                          type="text"
                          value={wizardTagline}
                          onChange={(e) => setWizardTagline(e.target.value)}
                          placeholder="e.g. A digital code uprising under neon shadows..."
                          className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3.5 rounded-lg outline-none text-slate-200"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Genre *</label>
                          <input
                            type="text"
                            required
                            value={wizardPrimaryGenre}
                            onChange={(e) => setWizardPrimaryGenre(e.target.value)}
                            placeholder="e.g. Fantasy, Dark Academia"
                            className="w-full bg-[#111827] border border-slate-800 text-slate-100 text-xs py-2 px-3.5 rounded-lg outline-none focus:border-violet-500"
                            id="wizard-primary-genre-input"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Subgenre (Optional)</label>
                          <input
                            type="text"
                            value={wizardSubgenre}
                            onChange={(e) => setWizardSubgenre(e.target.value)}
                            placeholder="e.g. Mythological Romance"
                            className="w-full bg-[#111827] border border-slate-800 text-slate-100 text-xs py-2 px-3.5 rounded-lg outline-none focus:border-violet-500"
                            id="wizard-subgenre-input"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
                            <Globe size={11} className="text-slate-500" /> Language *
                          </label>
                          <input
                            type="text"
                            required
                            value={wizardLanguage}
                            onChange={(e) => setWizardLanguage(e.target.value)}
                            placeholder="e.g. English, Español"
                            className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3.5 rounded-lg outline-none text-slate-100 focus:border-violet-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Required Status</label>
                          <select
                            value={wizardStatus}
                            onChange={(e) => setWizardStatus(e.target.value as any)}
                            className="w-full bg-[#111827] border border-slate-800 text-slate-350 text-xs py-2 px-3.5 rounded-lg outline-none cursor-pointer focus:border-violet-500"
                          >
                            <option value="draft">Draft Outlines Only (WIP)</option>
                            <option value="published">Publish story immediately</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Tag size={11} className="text-slate-500" /> Tags (Comma separated)
                          </span>
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${wizardTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).length > 10 ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-900 text-slate-500'}`}>
                            {wizardTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).length}/10 tags
                          </span>
                        </label>
                        <input
                          type="text"
                          value={wizardTagsInput}
                          onChange={(e) => setWizardTagsInput(e.target.value)}
                          placeholder="Adventure, Drama, SciFi, Romance"
                          className="w-full bg-[#111827] border border-slate-800 text-xs py-2 px-3.5 rounded-lg outline-none text-slate-100 focus:border-violet-500"
                        />
                        {wizardTagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).length > 10 && (
                          <p className="text-[10px] text-amber-500">
                            ⚠️ Maximum 10 tags allowed. Extra tags will be truncated.
                          </p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Story Description & Synopsis *</label>
                        <textarea
                          rows={3}
                          required
                          value={wizardDesc}
                          onChange={(e) => setWizardDesc(e.target.value)}
                          placeholder="Outline your world lore and central dynamic conflict..."
                          className="w-full bg-[#111827] border border-slate-800 rounded-lg text-xs p-2.5 outline-none resize-none text-slate-350 font-sans"
                        />
                      </div>

                      {/* Drag and Drop Cover Image Segment */}
                      <div className="space-y-2 pt-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Cover Image Section</label>
                        <CoverImageUploader
                          coverUrl={wizardCover}
                          onChange={(url) => setWizardCover(url)}
                          onFileSelect={setWizardCoverFile}
                          onRemove={() => setWizardCover('')}
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-850 shrink-0">
                        <button
                          type="button"
                          onClick={() => setView('my-stories')}
                          className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isCreatingStory}
                          className="px-5 py-2.5 rounded-xl bg-violet-605 text-white font-bold text-xs bg-violet-600 hover:bg-violet-550 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          id="new-story-wizard-submit"
                        >
                          {isCreatingStory ? "Creating..." : "Create Story"}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Cover Live Preview Side Column (5 Cols) */}
                  <div className="lg:col-span-5 flex flex-col justify-start space-y-6">
                    <div className="bg-[#0d0d0d] border border-slate-850 rounded-2xl p-6 space-y-4">
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono select-none">
                        Story Cover Preview
                      </h3>

                      {/* Beautiful Book Card Preview */}
                      <div className="max-w-[190px] mx-auto shadow-2xl relative group rounded-xl overflow-hidden border border-slate-800">
                        <StoryCoverView
                          coverUrl={wizardCover}
                          title={wizardTitle || "UNTITLED CHRONICLE"}
                          genre={wizardSubgenre ? `${wizardPrimaryGenre} / ${wizardSubgenre}` : wizardPrimaryGenre}
                          author="Author"
                        />
                      </div>

                      <div className="space-y-2 text-center pt-2">
                        <h2 className="text-sm font-extrabold text-slate-200 truncate">
                          {wizardTitle || "Story Title Preview"}
                        </h2>
                        <p className="text-[11px] text-slate-450 leading-relaxed line-clamp-3 italic px-4">
                          {wizardDesc || "Your main story description will render here to present context to readers."}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </>
          )}

        </div>
      </main>

      {/* Dynamic Toast Feedback Overlay element */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-55 flex items-center gap-2.5 py-3 px-4.5 rounded-xl border border-slate-800 shadow-2xl transition-all duration-300 transform translate-y-0 animate-bounce select-none font-sans text-xs font-bold ${toastMessage.type === 'error'
              ? 'bg-red-950/95 text-red-200 border-red-550/40 shadow-red-900/10'
              : toastMessage.type === 'warning'
                ? 'bg-amber-950/95 text-amber-200 border-amber-500/40 shadow-amber-900/10'
                : 'bg-[#0c1410] text-[#a7f3d0] border-[#065f46]/40 shadow-emerald-950/20'
            }`}
          id="fictself-floating-toast"
        >
          <div className={`w-1.5 h-1.5 rounded-full animate-ping ${toastMessage.type === 'error' ? 'bg-red-400' : toastMessage.type === 'warning' ? 'bg-amber-450' : 'bg-emerald-400'
            }`} />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 4. MODALS MANAGEMENT PORTALS */}
      {editingStory && (
        <StoryEditModal
          story={editingStory}
          isOpen={true}
          onClose={() => setEditingStory(null)}
          onSave={handleUpdateStory}
        />
      )}

      {deletingStory && (
        <DeleteConfirmationModal
          storyTitle={deletingStory.title}
          isOpen={true}
          onClose={() => setDeletingStory(null)}
          onConfirm={() => handleDeleteStory(deletingStory.id)}
        />
      )}

      {archivingStory && (
        <ArchiveConfirmationModal
          story={archivingStory}
          isOpen={true}
          onClose={() => setArchivingStory(null)}
          onConfirm={() => handleArchiveStory(archivingStory.id, true)}
        />
      )}

      {changingCoverStory && (
        <ChangeCoverModal
          story={changingCoverStory}
          isOpen={true}
          onClose={() => setChangingCoverStory(null)}
          onSave={handleUpdateStory}
        />
      )}

    </div>
  );
}
