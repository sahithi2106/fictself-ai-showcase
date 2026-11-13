import { ChapterComment } from '../../types';
import { apiGet, apiPost, apiPut, apiDelete, apiFetch } from './client';

export async function fetchChapterComments(chapterId: string): Promise<ChapterComment[]> {
  return apiGet<ChapterComment[]>(`/chapters/${chapterId}/comments`);
}

export async function createComment(chapterId: string, content: string): Promise<ChapterComment> {
  return apiPost<ChapterComment>(`/chapters/${chapterId}/comments`, { content });
}

export async function createReply(chapterId: string, parentCommentId: string, content: string): Promise<ChapterComment> {
  return apiPost<ChapterComment>(`/chapters/${chapterId}/comments/${parentCommentId}/replies`, { content });
}

export async function updateComment(commentId: string, content: string): Promise<ChapterComment> {
  return apiFetch<ChapterComment>(`/comments/${commentId}`, { 
    method: 'PATCH', 
    body: JSON.stringify({ content }) 
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  await apiDelete(`/comments/${commentId}`);
}
