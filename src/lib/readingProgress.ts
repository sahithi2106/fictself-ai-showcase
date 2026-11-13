import { authService } from './authService';

function getStorageKey(): string {
  const user = authService.getCurrentUserSync();
  return user ? `fictself_reading_progress_${user.id}` : 'fictself_reading_progress_anon';
}

function getHistoryKey(): string {
  const user = authService.getCurrentUserSync();
  return user ? `fictself_reading_history_${user.id}` : 'fictself_reading_history_anon';
}

export interface ReadingProgressEntry {
  storyId: string;
  chapterId: string;
  chapterSequence: number;
  totalChapters: number;
  progressPercent: number;
  lastReadAt: number;
  title: string;
  author: string;
  coverUrl: string;
  genre: string;
  scrollY?: number;
}

interface ReadingProgressMap {
  [storyId: string]: string | ReadingProgressEntry; 
}

/**
 * Saves full reading progress metadata for a story.
 */
export function saveReadingProgress(entry: ReadingProgressEntry): void {
  try {
    const raw = localStorage.getItem(getStorageKey());
    const progress: ReadingProgressMap = raw ? JSON.parse(raw) : {};
    progress[entry.storyId] = entry;
    localStorage.setItem(getStorageKey(), JSON.stringify(progress));

    // Update history
    const historyRaw = localStorage.getItem(getHistoryKey());
    let history: string[] = historyRaw ? JSON.parse(historyRaw) : [];
    history = history.filter(id => id !== entry.storyId);
    history.unshift(entry.storyId);
    localStorage.setItem(getHistoryKey(), JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save reading progress', error);
  }
}

/**
 * Retrieves full reading progress entry. Upgrades legacy strings to basic objects.
 */
export function getReadingProgress(storyId: string): ReadingProgressEntry | null {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return null;
    
    let progress: ReadingProgressMap;
    try {
      progress = JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse reading progress JSON, ignoring.', e);
      return null;
    }

    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      return null;
    }

    const data = progress[storyId];
    if (!data) return null;

    if (typeof data === 'string') {
      // Legacy string chapterId fallback
      return {
        storyId,
        chapterId: data,
        chapterSequence: 1,
        totalChapters: 1,
        progressPercent: 0,
        lastReadAt: Date.now(),
        title: 'Unknown Title',
        author: 'Unknown Author',
        coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop',
        genre: 'Storytelling'
      };
    }

    // Defensive mapping for object
    if (typeof data === 'object') {
      return {
        storyId: data.storyId || storyId,
        chapterId: data.chapterId || 'chap-1',
        chapterSequence: data.chapterSequence || 1,
        totalChapters: data.totalChapters || 1,
        progressPercent: data.progressPercent || 0,
        lastReadAt: data.lastReadAt || Date.now(),
        title: data.title || 'Unknown Title',
        author: data.author || 'Unknown Author',
        coverUrl: data.coverUrl || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?q=80&w=300&auto=format&fit=crop',
        genre: data.genre || 'Storytelling',
        scrollY: data.scrollY
      };
    }

    return null;
  } catch (error) {
    console.error('Failed to retrieve reading progress', error);
    return null;
  }
}

/**
 * Saves just the scroll position for a story
 */
export function saveScrollPosition(storyId: string, scrollY: number): void {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (!raw) return;
    const progress: ReadingProgressMap = JSON.parse(raw);
    const data = progress[storyId];
    if (data && typeof data !== 'string') {
      data.scrollY = scrollY;
      progress[storyId] = data;
      localStorage.setItem(getStorageKey(), JSON.stringify(progress));
    }
  } catch (error) {
    console.error('Failed to save scroll position', error);
  }
}

/**
 * Retrieves the list of recently read story IDs, ordered by most recent first.
 * Automatically filters out legacy polluted history items (e.g. raw titles instead of IDs).
 */
export function getReadingHistory(): string[] {
  try {
    const historyRaw = localStorage.getItem(getHistoryKey());
    if (!historyRaw) return [];
    
    let history;
    try {
      history = JSON.parse(historyRaw);
    } catch (e) {
      console.warn('Failed to parse reading history JSON, resetting.', e);
      return [];
    }

    // Defensive check to ensure history is an array. If it's a string/object (corrupted), return empty.
    if (!Array.isArray(history)) {
      console.warn('Reading history was not an array, resetting.', history);
      return [];
    }

    // Filter out polluted data (titles). Titles usually contain spaces, whereas IDs are UUIDs or start with 'story-'/'exp-'
    return history.filter(id => typeof id === 'string' && id.trim().length > 0 && !id.includes(' '));
  } catch (error) {
    console.error('Failed to retrieve reading history', error);
    return [];
  }
}

/**
 * Removes a story from the reading history and progress map.
 */
export function removeReadingProgress(storyId: string): void {
  try {
    // 1. Remove from progress map
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const progress: ReadingProgressMap = JSON.parse(raw);
      if (progress[storyId]) {
        delete progress[storyId];
        localStorage.setItem(getStorageKey(), JSON.stringify(progress));
      }
    }
    
    // 2. Remove from history array
    const historyRaw = localStorage.getItem(getHistoryKey());
    if (historyRaw) {
      let history: any;
      try { history = JSON.parse(historyRaw); } catch { history = []; }
      if (!Array.isArray(history)) history = [];
      history = (history as string[]).filter(id => id !== storyId);
      localStorage.setItem(getHistoryKey(), JSON.stringify(history));
    }
  } catch (error) {
    console.error('Failed to remove reading progress', error);
  }
}
