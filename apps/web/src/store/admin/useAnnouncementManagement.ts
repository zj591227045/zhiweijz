import { create } from 'zustand';
import { useAdminAuth } from './useAdminAuth';
import { toast } from 'sonner';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: string | null;
  expiresAt: string | null;
  targetUserType: string;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: string;
    username: string;
  };
  updater?: {
    id: string;
    username: string;
  };
  readCount: number;
  totalUsers: number;
  readRate: number;
}

export interface AnnouncementStats {
  totalCount: number;
  publishedCount: number;
  draftCount: number;
  archivedCount: number;
  totalReadCount: number;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt?: string;
  expiresAt?: string;
  targetUserType?: string;
}

export interface UpdateAnnouncementData {
  title?: string;
  content?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  publishedAt?: string;
  expiresAt?: string;
  targetUserType?: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AnnouncementManagementState {
  // 数据状态
  announcements: Announcement[];
  selectedAnnouncement: Announcement | null;
  stats: AnnouncementStats | null;
  pagination: Pagination | null;
  
  // UI状态
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  
  // 筛选和搜索状态
  searchTerm: string;
  statusFilter: 'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  priorityFilter: 'all' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  
  // 操作方法
  fetchAnnouncements: (page?: number) => Promise<void>;
  fetchAnnouncementById: (id: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  createAnnouncement: (data: CreateAnnouncementData) => Promise<boolean>;
  updateAnnouncement: (id: string, data: UpdateAnnouncementData) => Promise<boolean>;
  publishAnnouncement: (id: string) => Promise<boolean>;
  unpublishAnnouncement: (id: string) => Promise<boolean>;
  archiveAnnouncement: (id: string) => Promise<boolean>;
  deleteAnnouncement: (id: string) => Promise<boolean>;
  batchOperation: (ids: string[], operation: 'publish' | 'unpublish' | 'archive' | 'delete') => Promise<boolean>;
  
  // UI操作方法
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: 'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => void;
  setPriorityFilter: (priority: 'all' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') => void;
  clearSelectedAnnouncement: () => void;
}

export const useAnnouncementManagement = create<AnnouncementManagementState>((set, get) => ({
  // 初始状态
  announcements: [],
  selectedAnnouncement: null,
  stats: null,
  pagination: null,
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  searchTerm: '',
  statusFilter: 'all',
  priorityFilter: 'all',

  // 获取公告列表
  fetchAnnouncements: async (page = 1) => {
    try {
      set({ isLoading: true });
      const token = useAdminAuth.getState().token;
      const { searchTerm, statusFilter, priorityFilter } = get();
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (priorityFilter !== 'all') params.append('priority', priorityFilter);

      const response = await fetch(`/api/admin/announcements?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        set({
          announcements: result.data.announcements,
          pagination: result.data.pagination
        });
      } else {
        throw new Error(result.message || '获取公告列表失败');
      }
    } catch (error) {
      console.error('获取公告列表错误:', error);
      toast.error(error instanceof Error ? error.message : '获取公告列表失败');
    } finally {
      set({ isLoading: false });
    }
  },

  // 获取公告详情
  fetchAnnouncementById: async (id: string) => {
    try {
      set({ isLoading: true });
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        set({ selectedAnnouncement: result.data.announcement });
      } else {
        throw new Error(result.message || '获取公告详情失败');
      }
    } catch (error) {
      console.error('获取公告详情错误:', error);
      toast.error(error instanceof Error ? error.message : '获取公告详情失败');
    } finally {
      set({ isLoading: false });
    }
  },

  // 获取统计数据
  fetchStats: async () => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch('/api/admin/announcements/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        set({ stats: result.data });
      }
    } catch (error) {
      console.error('获取统计数据错误:', error);
    }
  },

  // 创建公告
  createAnnouncement: async (data: CreateAnnouncementData) => {
    try {
      set({ isCreating: true });
      const token = useAdminAuth.getState().token;
      
      const response = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告创建成功');
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '创建公告失败');
      }
    } catch (error) {
      console.error('创建公告错误:', error);
      toast.error(error instanceof Error ? error.message : '创建公告失败');
      return false;
    } finally {
      set({ isCreating: false });
    }
  },

  // 更新公告
  updateAnnouncement: async (id: string, data: UpdateAnnouncementData) => {
    try {
      set({ isUpdating: true });
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告更新成功');
        await get().fetchAnnouncements();
        if (get().selectedAnnouncement?.id === id) {
          await get().fetchAnnouncementById(id);
        }
        return true;
      } else {
        throw new Error(result.message || '更新公告失败');
      }
    } catch (error) {
      console.error('更新公告错误:', error);
      toast.error(error instanceof Error ? error.message : '更新公告失败');
      return false;
    } finally {
      set({ isUpdating: false });
    }
  },

  // 发布公告
  publishAnnouncement: async (id: string) => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}/publish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告发布成功');
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '发布公告失败');
      }
    } catch (error) {
      console.error('发布公告错误:', error);
      toast.error(error instanceof Error ? error.message : '发布公告失败');
      return false;
    }
  },

  // 撤回公告
  unpublishAnnouncement: async (id: string) => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}/unpublish`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告撤回成功');
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '撤回公告失败');
      }
    } catch (error) {
      console.error('撤回公告错误:', error);
      toast.error(error instanceof Error ? error.message : '撤回公告失败');
      return false;
    }
  },

  // 归档公告
  archiveAnnouncement: async (id: string) => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}/archive`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告归档成功');
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '归档公告失败');
      }
    } catch (error) {
      console.error('归档公告错误:', error);
      toast.error(error instanceof Error ? error.message : '归档公告失败');
      return false;
    }
  },

  // 删除公告
  deleteAnnouncement: async (id: string) => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch(`/api/admin/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('公告删除成功');
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '删除公告失败');
      }
    } catch (error) {
      console.error('删除公告错误:', error);
      toast.error(error instanceof Error ? error.message : '删除公告失败');
      return false;
    }
  },

  // 批量操作
  batchOperation: async (ids: string[], operation: 'publish' | 'unpublish' | 'archive' | 'delete') => {
    try {
      const token = useAdminAuth.getState().token;
      
      const response = await fetch('/api/admin/announcements/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids, operation })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(result.message);
        await get().fetchAnnouncements();
        await get().fetchStats();
        return true;
      } else {
        throw new Error(result.message || '批量操作失败');
      }
    } catch (error) {
      console.error('批量操作错误:', error);
      toast.error(error instanceof Error ? error.message : '批量操作失败');
      return false;
    }
  },

  // UI操作方法
  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
  },

  setStatusFilter: (status: 'all' | 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    set({ statusFilter: status });
  },

  setPriorityFilter: (priority: 'all' | 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT') => {
    set({ priorityFilter: priority });
  },

  clearSelectedAnnouncement: () => {
    set({ selectedAnnouncement: null });
  }
})); 