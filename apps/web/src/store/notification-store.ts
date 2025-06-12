import { create } from 'zustand';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

export interface UserAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt: string;
  expiresAt: string | null;
  isRead: boolean;
}

interface NotificationState {
  announcements: UserAnnouncement[];
  unreadCount: number;
  isLoading: boolean;
  isModalOpen: boolean;
  hasCheckedOnLogin: boolean;
  
  // Actions
  fetchAnnouncements: () => Promise<void>;
  markAsRead: (announcementId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  setHasCheckedOnLogin: (checked: boolean) => void;
  checkUnreadOnLogin: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  announcements: [],
  unreadCount: 0,
  isLoading: false,
  isModalOpen: false,
  hasCheckedOnLogin: false,

  fetchAnnouncements: async () => {
    set({ isLoading: true });
    try {
      const response = await apiClient.get('/user/announcements');
      const announcements = response.data || [];
      const unreadCount = announcements.filter((a: UserAnnouncement) => !a.isRead).length;

      set({ 
        announcements,
        unreadCount,
        isLoading: false 
      });
    } catch (error) {
      console.error('获取通知失败:', error);
      set({ isLoading: false });
      toast.error('获取通知失败');
    }
  },

  markAsRead: async (announcementId: string) => {
    try {
      await apiClient.post(`/user/announcements/${announcementId}/read`);

      // 更新本地状态
      const { announcements } = get();
      const updatedAnnouncements = announcements.map(a => 
        a.id === announcementId ? { ...a, isRead: true } : a
      );
      const unreadCount = updatedAnnouncements.filter(a => !a.isRead).length;

      set({ 
        announcements: updatedAnnouncements,
        unreadCount 
      });
    } catch (error) {
      console.error('标记已读失败:', error);
      toast.error('标记已读失败');
    }
  },

  markAllAsRead: async () => {
    try {
      await apiClient.post('/user/announcements/read-all');

      // 更新本地状态
      const { announcements } = get();
      const updatedAnnouncements = announcements.map(a => ({ ...a, isRead: true }));

      set({ 
        announcements: updatedAnnouncements,
        unreadCount: 0 
      });

      toast.success('已标记全部通知为已读');
    } catch (error) {
      console.error('标记全部已读失败:', error);
      toast.error('标记全部已读失败');
    }
  },

  openModal: () => {
    set({ isModalOpen: true });
    // 打开模态框时获取最新通知
    get().fetchAnnouncements();
  },

  closeModal: () => {
    set({ isModalOpen: false });
  },

  setHasCheckedOnLogin: (checked: boolean) => {
    set({ hasCheckedOnLogin: checked });
  },

  checkUnreadOnLogin: async () => {
    const { hasCheckedOnLogin, fetchAnnouncements } = get();
    
    // 如果已经检查过，不重复检查
    if (hasCheckedOnLogin) {
      return;
    }

    try {
      await fetchAnnouncements();
      const { unreadCount, announcements } = get();
      
      // 如果有未读通知，自动打开模态框
      if (unreadCount > 0) {
        // 延迟1秒打开，让用户先看到页面
        setTimeout(() => {
          set({ isModalOpen: true });
        }, 1000);
      }

      set({ hasCheckedOnLogin: true });
    } catch (error) {
      console.error('登录时检查通知失败:', error);
      set({ hasCheckedOnLogin: true });
    }
  },
})); 