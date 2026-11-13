import { apiGet, apiPut, apiPost, apiDelete } from './client';
import { Notification } from '../../types';

export const fetchNotifications = async (): Promise<Notification[]> => {
  const data = (await apiGet('/notifications')) as any[];
  return data.map((n: any) => ({
    id: n.id,
    category: (n.type === 'comment' || n.type === 'reply') ? 'comments' : n.type === 'like' ? 'likes' : n.type === 'follow' ? 'followers' : 'updates',
    title: n.title,
    message: n.message,
    timestamp: n.created_at,
    read: n.is_read
  }));
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await apiPut(`/notifications/${id}/read`, {});
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiPost('/notifications/mark-all-read', {});
};

export const clearAllNotifications = async (): Promise<void> => {
  await apiDelete('/notifications');
};
