import { PinnedMemory } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export function adaptPinnedMemory(b: Record<string, any>): PinnedMemory {
  return {
    id: b.id,
    storyId: b.story_id,
    title: b.title,
    content: b.content,
    memoryType: b.memory_type,
    characterId: b.character_id,
    sourceChapterId: b.source_chapter_id,
    sourceType: b.source_type,
    chatMessageId: b.chat_message_id,
    isActive: b.is_active,
    createdAt: b.created_at,
    updatedAt: b.updated_at,
  };
}

function toBackendPayload(memory: Partial<PinnedMemory>) {
  return {
    title: memory.title,
    content: memory.content,
    memory_type: memory.memoryType,
    character_id: memory.characterId,
    source_chapter_id: memory.sourceChapterId,
    is_active: memory.isActive,
  };
}

export async function fetchPinnedMemories(storyId: string): Promise<PinnedMemory[]> {
  const raw = await apiGet<Record<string, any>[]>(`/stories/${storyId}/pinned-memories`);
  return raw.map(adaptPinnedMemory);
}

export async function createPinnedMemory(storyId: string, data: Partial<PinnedMemory>): Promise<PinnedMemory> {
  const b = await apiPost<Record<string, any>>(`/stories/${storyId}/pinned-memories`, toBackendPayload(data));
  return adaptPinnedMemory(b);
}

export async function updatePinnedMemory(memoryId: string, data: Partial<PinnedMemory>): Promise<PinnedMemory> {
  const b = await apiPut<Record<string, any>>(`/pinned-memories/${memoryId}`, toBackendPayload(data));
  return adaptPinnedMemory(b);
}

export async function deletePinnedMemory(memoryId: string): Promise<void> {
  await apiDelete(`/pinned-memories/${memoryId}`);
}
