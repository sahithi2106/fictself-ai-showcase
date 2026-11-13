import { ChatMessage, ChatSessionData } from '../../types';
import { apiGet, apiPost, apiDelete, apiPut } from './client';

export interface ChatSessionResponse {
  id: string;
  user_id: string;
  story_id: string;
  character_id: string;
  active_chapter_id: string | null;
  status: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

export interface BackendChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  is_system: boolean;
  trigger_event: string | null;
  created_at: string;
  memory_context_snapshot?: Record<string, any> | null;
  is_pinned?: boolean;
}

// ─── Adapters ─────────────────────────────────────────────────────────────────

export function adaptChatMessage(b: BackendChatMessage, characterName: string, characterAvatar: string, userName: string, userAvatar: string): ChatMessage {
  const isAssistant = b.role === 'character' || b.role === 'assistant';
  
  // Format timestamp (e.g. "10:05")
  const dateObj = new Date(b.created_at);
  const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return {
    id: b.id,
    role: isAssistant ? 'assistant' : 'user',
    senderName: isAssistant ? characterName : userName,
    avatar: isAssistant ? characterAvatar : userAvatar,
    content: b.content,
    timestamp: formattedTime,
    memoryContextSnapshot: b.memory_context_snapshot ?? null,
    isPinned: b.is_pinned ?? false,
  };
}

// ─── Chat Sessions ────────────────────────────────────────────────────────────

// Assuming standard FastApi setup
const API_BASE = '/api/v1';

export async function createChatSession(storyId: string, characterId: string, activeChapterId?: string, personaId?: string, title?: string): Promise<ChatSessionData> {
  return await apiPost<ChatSessionData>('/chat/sessions/', { 
    story_id: storyId, 
    character_id: characterId, 
    active_chapter_id: activeChapterId,
    persona_id: personaId,
    title: title
  });
}

export async function renameChatSession(sessionId: string, title: string): Promise<ChatSessionData> {
  return await apiPut<ChatSessionData>(`/chat/sessions/${sessionId}`, {
    title: title
  });
}

export async function fetchStoryChatSessions(storyId: string, characterId?: string): Promise<ChatSessionData[]> {
  const query = characterId ? `?character_id=${characterId}` : '';
  return await apiGet<ChatSessionData[]>(`/chat/sessions/story/${storyId}${query}`);
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  return await apiDelete<void>(`/chat/sessions/${sessionId}`);
}

// ─── Chat Messages ────────────────────────────────────────────────────────────

export async function fetchChatMessages(sessionId: string, characterName: string, characterAvatar: string, userName: string, userAvatar: string): Promise<ChatMessage[]> {
  const raw = await apiGet<BackendChatMessage[]>(`/chat/sessions/${sessionId}/messages`);
  return raw.map(m => adaptChatMessage(m, characterName, characterAvatar, userName, userAvatar));
}

export async function sendChatMessage(sessionId: string, content: string): Promise<BackendChatMessage> {
  return await apiPost<BackendChatMessage>(`/chat/sessions/${sessionId}/messages`, {
    role: 'user',
    content: content,
    is_system: false,
    trigger_event: null
  });
}

export async function clearChatMessages(sessionId: string): Promise<void> {
  return await apiDelete<void>(`/chat/sessions/${sessionId}/messages`);
}

export async function editChatMessage(sessionId: string, messageId: string, content: string): Promise<BackendChatMessage> {
  return await apiPost<BackendChatMessage>(`/chat/sessions/${sessionId}/messages/${messageId}/edit`, {
    content: content
  });
}

export async function deleteChatMessage(sessionId: string, messageId: string): Promise<void> {
  return await apiDelete<void>(`/chat/sessions/${sessionId}/messages/${messageId}`);
}

export async function regenerateChatMessage(sessionId: string, messageId: string): Promise<BackendChatMessage> {
  return await apiPost<BackendChatMessage>(`/chat/sessions/${sessionId}/messages/${messageId}/regenerate`, {});
}

export async function branchChatFromMessage(sessionId: string, messageId: string): Promise<ChatSessionResponse> {
  return await apiPost<ChatSessionResponse>(`/chat/sessions/${sessionId}/branch-from/${messageId}`, {});
}

export async function pinChatMessage(sessionId: string, messageId: string): Promise<void> {
  return await apiPost<void>(`/chat/sessions/${sessionId}/messages/${messageId}/pin`, {});
}

export async function unpinChatMessage(sessionId: string, messageId: string): Promise<void> {
  return await apiDelete<void>(`/chat/sessions/${sessionId}/messages/${messageId}/pin`);
}

export async function getPinnedChatMessages(sessionId: string, characterName: string, characterAvatar: string, userName: string, userAvatar: string): Promise<ChatMessage[]> {
  const raw = await apiGet<BackendChatMessage[]>(`/chat/sessions/${sessionId}/pinned`);
  return raw.map(m => adaptChatMessage(m, characterName, characterAvatar, userName, userAvatar));
}

