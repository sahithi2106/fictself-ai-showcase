import { Story } from '../../types';
import { adaptStory } from './stories';
import { apiGet } from './client';

export async function fetchTrendingStories(): Promise<Story[]> {
  try {
    const data = await apiGet<any[]>('/home/trending');
    return Array.isArray(data) ? data.map(s => adaptStory(s)) : [];
  } catch (err) {
    console.error('Failed to fetch trending stories', err);
    return [];
  }
}

export async function fetchRecommendedStories(): Promise<Story[]> {
  const token = localStorage.getItem('fictself_access_token');
  if (!token) return [];
  try {
    const data = await apiGet<any[]>('/home/recommended');
    return Array.isArray(data) ? data.map(s => adaptStory(s)) : [];
  } catch (err) {
    console.warn('Failed to fetch recommended stories safely', err);
    return [];
  }
}

export async function fetchNewReleases(): Promise<Story[]> {
  const token = localStorage.getItem('fictself_access_token');
  if (!token) return [];
  try {
    const data = await apiGet<any[]>('/home/new-releases');
    return Array.isArray(data) ? data.map(s => adaptStory(s)) : [];
  } catch (err) {
    console.warn('Failed to fetch new releases safely', err);
    return [];
  }
}

export async function fetchRecentlyViewed(): Promise<Story[]> {
  const token = localStorage.getItem('fictself_access_token');
  if (!token) return [];
  try {
    const data = await apiGet<any[]>('/home/recently-viewed');
    return Array.isArray(data) ? data.map(s => adaptStory(s)) : [];
  } catch (err) {
    console.warn('Failed to fetch recently viewed safely', err);
    return [];
  }
}
