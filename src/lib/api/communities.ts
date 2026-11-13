import { apiGet, apiPost, apiPut, apiDelete } from './client';

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  coverUrl: string;
  isPrivate: boolean;
  memberCount: number;
  isJoined: boolean;
  creator_id: string;
}

export const fetchCommunities = async (): Promise<CommunityGroup[]> => {
  const data = (await apiGet('/communities')) as any[];
  return data.map((c: any) => ({
    id: c.id,
    name: c.name,
    description: c.description || '',
    coverUrl: c.cover_url || '',
    isPrivate: c.is_private,
    memberCount: c.member_count,
    isJoined: c.is_joined,
    creator_id: c.creator_id
  }));
};

export const createCommunity = async (payload: Partial<CommunityGroup>): Promise<CommunityGroup> => {
  const data = (await apiPost('/communities', {
    name: payload.name,
    description: payload.description,
    cover_url: payload.coverUrl,
    is_private: payload.isPrivate
  })) as any;
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    coverUrl: data.cover_url || '',
    isPrivate: data.is_private,
    memberCount: data.member_count,
    isJoined: data.is_joined,
    creator_id: data.creator_id
  };
};

export const updateCommunity = async (id: string, payload: Partial<CommunityGroup>): Promise<CommunityGroup> => {
  const data = (await apiPut(`/communities/${id}`, {
    name: payload.name,
    description: payload.description,
    cover_url: payload.coverUrl,
    is_private: payload.isPrivate
  })) as any;
  return {
    id: data.id,
    name: data.name,
    description: data.description || '',
    coverUrl: data.cover_url || '',
    isPrivate: data.is_private,
    memberCount: data.member_count,
    isJoined: data.is_joined,
    creator_id: data.creator_id
  };
};

export const deleteCommunity = async (id: string): Promise<void> => {
  await apiDelete(`/communities/${id}`);
};

export const joinCommunity = async (id: string): Promise<void> => {
  await apiPost(`/communities/${id}/join`, {});
};

export const leaveCommunity = async (id: string): Promise<void> => {
  await apiPost(`/communities/${id}/leave`, {});
};

export const fetchCommunityPosts = async (communityId: string): Promise<any[]> => {
  return await apiGet(`/communities/${communityId}/posts`);
};

export const createCommunityPost = async (communityId: string, payload: any): Promise<any> => {
  return await apiPost(`/communities/${communityId}/posts`, payload);
};

export const likeCommunityPost = async (communityId: string, postId: string): Promise<any> => {
  return await apiPost(`/communities/${communityId}/posts/${postId}/like`, {});
};

export const commentCommunityPost = async (communityId: string, postId: string, content: string, parentCommentId?: string): Promise<any> => {
  return await apiPost(`/communities/${communityId}/posts/${postId}/comments`, { 
    content, 
    parent_comment_id: parentCommentId 
  });
};

export const deleteCommunityPost = async (communityId: string, postId: string): Promise<void> => {
  await apiDelete(`/communities/${communityId}/posts/${postId}`);
};

export const deleteCommunityPostComment = async (communityId: string, postId: string, commentId: string): Promise<void> => {
  await apiDelete(`/communities/${communityId}/posts/${postId}/comments/${commentId}`);
};
