import { apiGet, apiPost, apiDelete } from './client';

export const fetchReadingProgress = async () => {
  return await apiGet('/library/progress');
};

export const fetchReadingProgressForStory = async (storyId: string) => {
  return await apiGet(`/library/progress/${storyId}`);
};

export const saveReadingProgress = async (payload: any) => {
  return await apiPost('/library/progress', payload);
};

export const fetchSavedStories = async (listType?: string) => {
  const q = listType ? `?list_type=${listType}` : '';
  return await apiGet(`/library/saved${q}`);
};

export const saveStoryToList = async (storyId: string, listType: string) => {
  return await apiPost('/library/saved', { story_id: storyId, list_type: listType });
};

export const removeStoryFromList = async (storyId: string, listType: string) => {
  return await apiDelete(`/library/saved/${storyId}/${listType}`);
};

import { ReadingList } from '../../types';

function mapReadingList(l: any): ReadingList {
  return {
    id: l.id,
    name: l.name,
    description: l.description || '',
    isPublic: l.is_public,
    storyIds: (l.items || []).map((i: any) => i.story_id),
    coverUrl: l.cover_url,
    followersCount: 0,
    creatorName: 'You',
    creatorId: l.user_id,
    lastUpdated: new Date(l.updated_at).toLocaleDateString()
  };
}

export const fetchReadingLists = async (): Promise<ReadingList[]> => {
  const data = (await apiGet('/library/lists')) as any[];
  return data.map(mapReadingList);
};

export const createReadingList = async (payload: any): Promise<ReadingList> => {
  const data = await apiPost('/library/lists', payload);
  return mapReadingList(data);
};

export const deleteReadingList = async (listId: string) => {
  return await apiDelete(`/library/lists/${listId}`);
};

export const addToList = async (listId: string, storyId: string) => {
  return await apiPost(`/library/lists/${listId}/items`, { story_id: storyId });
};

export const removeFromList = async (listId: string, storyId: string) => {
  return await apiDelete(`/library/lists/${listId}/items/${storyId}`);
};
