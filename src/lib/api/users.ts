import { apiGet, apiPost, apiDelete } from './client';
import { Story, adaptStory } from './stories';

export interface PublicProfile {
  id: string;
  username: string;
  display_name: string | null;
  profile_image: string | null;
  bio: string | null;
  about_me: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  public_story_count: number;
  public_reading_list_count: number;
  is_following_viewer: boolean;
  is_own_profile: boolean;
}

export interface FollowerUser {
  id: string;
  username: string;
  display_name: string | null;
  profile_image: string | null;
  bio: string | null;
  is_following_viewer: boolean;
}

export const followUser = async (userId: string) => {
  return await apiPost<{status: string, is_following: boolean, followers_count: number}>(`/users/${userId}/follow`, {});
};

export const unfollowUser = async (userId: string) => {
  return await apiDelete<{status: string, is_following: boolean, followers_count: number}>(`/users/${userId}/follow`);
};

export const fetchFollowerCounts = async (userId: string) => {
  // We renamed this to follow-status in the backend
  return await apiGet<{followers_count: number, following_count: number, is_following: boolean}>(`/users/${userId}/follow-status`);
};

export const fetchPublicProfile = async (userId: string) => {
  return await apiGet<PublicProfile>(`/users/${userId}/public-profile`);
};

export const fetchPublicStories = async (userId: string) => {
  const stories = await apiGet<any[]>(`/users/${userId}/public-stories`);
  return stories.map(adaptStory);
};

export const fetchFollowersList = async (userId: string) => {
  return await apiGet<FollowerUser[]>(`/users/${userId}/followers`);
};

export const fetchFollowingList = async (userId: string) => {
  return await apiGet<FollowerUser[]>(`/users/${userId}/following`);
};

export const fetchPublicReadingLists = async (userId: string) => {
  return await apiGet<any[]>(`/users/${userId}/public-reading-lists`);
};
