import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface ReviewQueueItem {
  id: string;
  story_id: string;
  character_id?: string | null;
  source_chapter_id?: string | null;
  job_id?: string | null;
  title?: string | null;
  content?: string | null;
  suggestion_type?: string | null;
  source_excerpt?: string | null;
  proposed_target_label?: string | null;
  proposed_target_type?: string | null;
  created_by: string;
  memory_type?: string | null;
  importance_score: number;
  status: 'pending' | 'approved' | 'rejected' | 'auto_accepted';
  reviewed_at?: string | null;
  committed_memory_id?: string | null;
  created_at: string;
}

export interface ReviewQueueItemCreate {
  title: string;
  content: string;
  suggestion_type: string;
  source_excerpt?: string;
  source_chapter_id?: string;
  proposed_target_label?: string;
  proposed_target_type?: string;
  character_id?: string;
  importance_score?: number;
  created_by?: string;
}

export interface ReviewQueueItemUpdate {
  title?: string;
  content?: string;
  suggestion_type?: string;
  source_excerpt?: string;
  proposed_target_label?: string;
  proposed_target_type?: string;
  character_id?: string;
  importance_score?: number;
}

export async function fetchReviewItems(storyId: string, status?: string): Promise<ReviewQueueItem[]> {
  const params = status ? `?status_filter=${status}` : '';
  return await apiGet<ReviewQueueItem[]>(`/stories/${storyId}/review-queue${params}`);
}

export async function createReviewItem(storyId: string, data: ReviewQueueItemCreate): Promise<ReviewQueueItem> {
  return await apiPost<ReviewQueueItem>(`/stories/${storyId}/review-queue`, data);
}

export async function updateReviewItem(itemId: string, data: ReviewQueueItemUpdate): Promise<ReviewQueueItem> {
  return await apiPut<ReviewQueueItem>(`/review-queue/${itemId}`, data);
}

export async function approveReviewItem(itemId: string): Promise<ReviewQueueItem> {
  return await apiPost<ReviewQueueItem>(`/review-queue/${itemId}/approve`, {});
}

export async function rejectReviewItem(itemId: string): Promise<ReviewQueueItem> {
  return await apiPost<ReviewQueueItem>(`/review-queue/${itemId}/reject`, {});
}
