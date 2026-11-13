/**
 * FictSelf Chapters API
 *
 * Wraps all Chapter CRUD endpoints and adapts backend responses
 * to the frontend Chapter type so no UI component needs to change.
 */

import { Chapter } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function adaptChapter(b: Record<string, any>): Chapter {
  const content: string = b.content ?? '';
  return {
    id: b.id,
    storyId: b.story_id,
    title: b.title ?? '',
    content,
    summary: b.summary ?? '',
    sequence: b.chapter_number ?? 0,
    status: (b.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
    isPinned: b.is_pinned ?? false,
    wordCount: b.word_count ?? 0,
    charCount: content.length,
    lastSaved: b.updated_at ?? new Date().toISOString(),
  };
}

/** Map frontend Chapter fields to backend ChapterCreate/ChapterUpdate shape */
function toBackendPayload(chapter: Partial<Chapter>) {
  return {
    title: chapter.title,
    content: chapter.content,
    summary: chapter.summary,
    chapter_number: chapter.sequence,
    status: chapter.status,
    is_pinned: chapter.isPinned,
    word_count: chapter.wordCount,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchChapters(storyId: string): Promise<Chapter[]> {
  const raw = await apiGet<Record<string, any>[]>(`/stories/${storyId}/chapters`);
  return raw.map(adaptChapter).sort((a, b) => a.sequence - b.sequence);
}

export async function fetchChapter(chapterId: string): Promise<Chapter> {
  const b = await apiGet<Record<string, any>>(`/chapters/${chapterId}`);
  return adaptChapter(b);
}

export async function createChapter(storyId: string, data: Partial<Chapter>): Promise<Chapter> {
  const b = await apiPost<Record<string, any>>(
    `/stories/${storyId}/chapters`,
    toBackendPayload(data)
  );
  return adaptChapter(b);
}

export async function updateChapter(chapterId: string, data: Partial<Chapter>): Promise<Chapter> {
  const b = await apiPut<Record<string, any>>(
    `/chapters/${chapterId}`,
    toBackendPayload(data)
  );
  return adaptChapter(b);
}

export async function deleteChapter(chapterId: string): Promise<void> {
  await apiDelete(`/chapters/${chapterId}`);
}

// ─── Votes ───────────────────────────────────────────────────────────────────

export interface ChapterVoteState {
  chapter_id: string;
  vote_count: number;
  user_has_voted: boolean;
}

export async function fetchChapterVote(chapterId: string): Promise<ChapterVoteState> {
  return await apiGet<ChapterVoteState>(`/chapters/${chapterId}/vote`);
}

export async function toggleChapterVote(chapterId: string): Promise<ChapterVoteState> {
  return await apiPost<ChapterVoteState>(`/chapters/${chapterId}/vote`, {});
}
