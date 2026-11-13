/**
 * FictSelf Stories API
 *
 * Wraps all Story CRUD endpoints and adapts backend responses
 * to the frontend Story type so no UI component needs to change.
 */

import { Story, Chapter } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from './client';

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function adaptStory(b: Record<string, any>, chapters: Chapter[] = []): Story {
  return {
    id: b.id,
    title: b.title ?? '',
    description: b.description ?? '',
    tagline: b.tagline ?? '',
    coverUrl: b.cover_url ?? '',
    // Use resolved author_username from backend response
    author: b.author_username ?? b.author ?? '',
    authorId: b.author_id,
    isPublished: b.is_published ?? false,
    isArchived: b.is_archived ?? false,
    archivedAt: b.archived_at ?? undefined,
    publishedCount: b.published_count ?? chapters.filter(c => c.status === 'published').length,
    draftCount: b.draft_count ?? chapters.filter(c => c.status === 'draft').length,
    wordCount: b.word_count ?? 0,
    // Map exact metrics from backend
    views: b.total_views ?? b.views ?? 0,
    likes: b.total_votes ?? b.likes ?? 0,
    favorites: 0,
    followers: 0,
    rating: 5.0,
    genre: b.genre ?? '',
    subgenre: b.subgenre ?? undefined,
    tags: Array.isArray(b.tags) ? b.tags : [],
    language: b.language ?? 'English',
    lastUpdated: b.updated_at ?? new Date().toISOString(),
    // characterBible now persisted to backend
    characterBible: b.character_bible ?? '',
    chapters,
    status: mapBackendStatus(b.status),
  };
}

/**
 * Maps the backend status field to the frontend Story status type.
 *
 * The backend stores status as a freeform string. We accept all 6 valid
 * frontend values as passthrough, and only apply legacy mapping for the
 * old boolean-style backend values ('published', 'archived', 'draft').
 */
function mapBackendStatus(s: string | undefined): Story['status'] {
  // Accept all valid frontend status values as-is (passthrough)
  const validStatuses = ['Ongoing', 'On Hold', 'Planned', 'Draft', 'Completed', 'Archived'];
  if (s && validStatuses.includes(s)) {
    return s as Story['status'];
  }
  // Legacy backend value mapping
  switch (s) {
    case 'published': return 'Ongoing';
    case 'archived':  return 'Archived';
    case 'draft':
    default:          return 'Draft';
  }
}

/** Map frontend Story fields to the backend StoryCreate/StoryUpdate shape */
function toBackendPayload(story: Partial<Story>) {
  return {
    title: story.title,
    description: story.description,
    tagline: story.tagline,
    cover_url: story.coverUrl,
    genre: story.genre,
    subgenre: story.subgenre,
    status: story.status,
    language: story.language,
    tags: story.tags ?? [],
    is_published: story.isPublished,
    is_archived: story.isArchived,
    word_count: story.wordCount ?? 0,
    // Now persisted: story notes/character bible
    character_bible: story.characterBible,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchStories(): Promise<Story[]> {
  const raw = await apiGet<Record<string, any>[]>('/stories/');
  return raw.map(b => adaptStory(b));
}

export async function fetchPublicStories(): Promise<Story[]> {
  const raw = await apiGet<Record<string, any>[]>('/stories/public');
  return raw.map(b => adaptStory(b));
}

export async function fetchStory(storyId: string): Promise<Story> {
  const b = await apiGet<Record<string, any>>(`/stories/${storyId}`);
  return adaptStory(b);
}

export async function createStory(data: Partial<Story>): Promise<Story> {
  const b = await apiPost<Record<string, any>>('/stories/', toBackendPayload(data));
  return adaptStory(b);
}

export async function updateStory(storyId: string, data: Partial<Story>): Promise<Story> {
  const b = await apiPut<Record<string, any>>(`/stories/${storyId}`, toBackendPayload(data));
  return adaptStory(b);
}

export async function submitStoryReviewDecision(storyId: string, data: { decision: string, reviewer_notes?: string }): Promise<void> {
  await apiPost(`/stories/${storyId}/review`, data);
}

export async function toggleStoryLike(storyId: string): Promise<{is_liked: boolean, likes: number}> {
  return await apiPost<{is_liked: boolean, likes: number}>(`/stories/${storyId}/like`, {});
}

export async function recordStoryView(storyId: string, chapterId?: string): Promise<void> {
  const url = chapterId ? `/stories/${storyId}/read?chapter_id=${chapterId}` : `/stories/${storyId}/read`;
  await apiPost(url, {});
}

export async function deleteStory(storyId: string): Promise<void> {
  await apiDelete(`/stories/${storyId}`);
}

export async function uploadStoryCover(storyId: string, file: File): Promise<Story> {
  const formData = new FormData();
  formData.append('file', file);
  const b = await apiPostFormData<Record<string, any>>(`/stories/${storyId}/cover`, formData);
  return adaptStory(b);
}

export async function removeStoryCover(storyId: string): Promise<Story> {
  const b = await apiDelete<Record<string, any>>(`/stories/${storyId}/cover`);
  return adaptStory(b);
}
