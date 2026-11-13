/**
 * FictSelf Characters API
 *
 * Wraps all Character CRUD endpoints and adapts backend responses
 * to the frontend Character type so no UI component needs to change.
 */

import { Character } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete, apiPostFormData } from './client';

// ─── Adapter ─────────────────────────────────────────────────────────────────

export function adaptCharacter(b: Record<string, any>): Character {
  return {
    id: b.id,
    storyId: b.story_id,
    name: b.name ?? '',
    role: (b.role ?? 'Custom') as Character['role'],
    age: b.age ?? '',
    avatar: b.avatar_url
      ?? `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(b.name ?? 'char')}`,
    personality: b.personality ?? '',
    goals: b.goals ?? '',
    fears: b.fears ?? '',
    values: b.values ?? '',
    strengths: b.strengths ?? '',
    weaknesses: b.weaknesses ?? '',
    relationships: b.relationships ?? '',
    speechStyle: b.speech_style ?? '',
    background: b.backstory ?? '',
    characterArc: b.character_arc ?? '',
    notes: b.notes ?? '',
  };
}

/** Map frontend Character fields to backend CharacterCreate/CharacterUpdate shape */
function toBackendPayload(char: Partial<Character>) {
  return {
    name: char.name,
    role: char.role,
    age: char.age,
    avatar_url: char.avatar,
    personality: char.personality,
    goals: char.goals,
    fears: char.fears,
    values: char.values,
    strengths: char.strengths,
    weaknesses: char.weaknesses,
    relationships: char.relationships,
    speech_style: char.speechStyle,
    backstory: char.background,
    character_arc: char.characterArc,
    notes: char.notes,
  };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export async function fetchCharacters(storyId: string): Promise<Character[]> {
  const raw = await apiGet<Record<string, any>[]>(`/stories/${storyId}/characters`);
  return raw.map(adaptCharacter);
}

export async function fetchCharacter(characterId: string): Promise<Character> {
  const b = await apiGet<Record<string, any>>(`/characters/${characterId}`);
  return adaptCharacter(b);
}

export async function createCharacter(storyId: string, data: Partial<Character>): Promise<Character> {
  const b = await apiPost<Record<string, any>>(
    `/stories/${storyId}/characters`,
    toBackendPayload(data)
  );
  return adaptCharacter(b);
}

export async function updateCharacter(characterId: string, data: Partial<Character>): Promise<Character> {
  const b = await apiPut<Record<string, any>>(
    `/characters/${characterId}`,
    toBackendPayload(data)
  );
  return adaptCharacter(b);
}

export async function deleteCharacter(characterId: string): Promise<void> {
  await apiDelete(`/characters/${characterId}`);
}

export async function uploadCharacterAvatar(storyId: string, characterId: string, file: File): Promise<Character> {
  const formData = new FormData();
  formData.append('file', file);
  const b = await apiPostFormData<Record<string, any>>(`/stories/${storyId}/characters/${characterId}/avatar`, formData);
  return adaptCharacter(b);
}

export async function removeCharacterAvatar(storyId: string, characterId: string): Promise<Character> {
  const b = await apiDelete<Record<string, any>>(`/stories/${storyId}/characters/${characterId}/avatar`);
  return adaptCharacter(b);
}
