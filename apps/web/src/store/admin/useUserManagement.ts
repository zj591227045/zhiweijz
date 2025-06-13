import { create } from 'zustand';
import { toast } from 'sonner';
import { useAdminAuth } from './useAdminAuth';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  transactionCount: number;
  accountBookCount: number;
}

interface UserDetail extends User {
  stats: {
    transactionCount: number;
    accountBookCount: number;
    familyMemberCount: number;
    totalAmount: number;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sort?: 'createdAt' | 'name' | 'email';
  order?: 'asc' | 'desc';
}

interface CreateUserData {
  name: string;
  email: string;
  password: string;
  bio?: string;
}

interface UpdateUserData {
  name?: string;
  email?: string;
  bio?: string;
}

interface UserManagementState {
  // 状态
  users: User[];
  selectedUser: UserDetail | null;
  isLoading: boolean;
  pagination: Pagination | null;
  registrationEnabled: boolean;

  // 操作方法
  fetchUsers: (params?: UserListParams) => Promise<void>;
  searchUsers: (search: string) => Promise<void>;
  getUserDetail: (id: string) => Promise<void>;
  createUser: (data: CreateUserData) => Promise<boolean>;
  updateUser: (id: string, data: UpdateUserData) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  resetPassword: (id: string, newPassword: string) => Promise<boolean>;
  toggleUserStatus: (id: string) => Promise<boolean>;
  batchOperation: (userIds: string[], operation: 'activate' | 'deactivate' | 'delete') => Promise<boolean>;
  getRegistrationStatus: () => Promise<void>;
  toggleRegistration: (enabled: boolean) => Promise<boolean>;
  clearSelectedUser: () => void;
}

export const useUserManagement = create<UserManagementState>((set, get) => ({
  // 初始状态
  users: [],
  selectedUser: null,
  isLoading: false,
  pagination: null,
  registrationEnabled: true,

  // 获取用户列表
  fetchUsers: async (params: UserListParams = {}) => {
    set({ isLoading: true });
    try {
      const response = await adminApi.getWithParams(ADMIN_API_ENDPOINTS.USERS, params);
      
      if (!response.ok) {
        throw new Error('获取用户列表失败');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ 
          users: result.data.users,
          pagination: result.data.pagination
        });
      } else {
        throw new Error(result.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('获取用户列表错误:', error);
      toast.error(error instanceof Error ? error.message : '获取用户列表失败');
    } finally {
      set({ isLoading: false });
    }
  },

  // 搜索用户
  searchUsers: async (search: string) => {
    await get().fetchUsers({ search });
  },

  // 获取用户详情
  getUserDetail: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.USER_DETAIL(id));
      
      if (!response.ok) {
        throw new Error('获取用户详情失败');
      }

      const result = await response.json();
      
      if (result.success) {
        set({ selectedUser: result.data.user });
      } else {
        throw new Error(result.message || '获取用户详情失败');
      }
    } catch (error) {
      console.error('获取用户详情错误:', error);
      toast.error(error instanceof Error ? error.message : '获取用户详情失败');
    } finally {
      set({ isLoading: false });
    }
  },

  // 创建用户
  createUser: async (data: CreateUserData) => {
    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.USERS, data);

      const result = await response.json();
      
      if (result.success) {
        toast.success('用户创建成功');
        // 刷新用户列表
        await get().fetchUsers();
        return true;
      } else {
        throw new Error(result.message || '创建用户失败');
      }
    } catch (error) {
      console.error('创建用户错误:', error);
      toast.error(error instanceof Error ? error.message : '创建用户失败');
      return false;
    }
  },

  // 更新用户
  updateUser: async (id: string, data: UpdateUserData) => {
    try {
      const response = await adminApi.put(ADMIN_API_ENDPOINTS.USER_DETAIL(id), data);

      const result = await response.json();
      
      if (result.success) {
        toast.success('用户更新成功');
        // 刷新用户列表
        await get().fetchUsers();
        return true;
      } else {
        throw new Error(result.message || '更新用户失败');
      }
    } catch (error) {
      console.error('更新用户错误:', error);
      toast.error(error instanceof Error ? error.message : '更新用户失败');
      return false;
    }
  },

  // 删除用户
  deleteUser: async (id: string) => {
    try {
      const response = await adminApi.delete(ADMIN_API_ENDPOINTS.USER_DETAIL(id));

      const result = await response.json();
      
      if (result.success) {
        toast.success('用户删除成功');
        // 刷新用户列表
        await get().fetchUsers();
        return true;
      } else {
        throw new Error(result.message || '删除用户失败');
      }
    } catch (error) {
      console.error('删除用户错误:', error);
      toast.error(error instanceof Error ? error.message : '删除用户失败');
      return false;
    }
  },

  // 重置密码
  resetPassword: async (id: string, newPassword: string) => {
    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.USER_RESET_PASSWORD(id), { newPassword });

      const result = await response.json();
      
      if (result.success) {
        toast.success('密码重置成功');
        return true;
      } else {
        throw new Error(result.message || '重置密码失败');
      }
    } catch (error) {
      console.error('重置密码错误:', error);
      toast.error(error instanceof Error ? error.message : '重置密码失败');
      return false;
    }
  },

  // 切换用户状态
  toggleUserStatus: async (id: string) => {
    try {
      const response = await adminApi.patch(ADMIN_API_ENDPOINTS.USER_TOGGLE_STATUS(id));

      const result = await response.json();
      
      if (result.success) {
        toast.success(`用户${result.data.user.isActive ? '启用' : '禁用'}成功`);
        // 刷新用户列表
        await get().fetchUsers();
        return true;
      } else {
        throw new Error(result.message || '切换用户状态失败');
      }
    } catch (error) {
      console.error('切换用户状态错误:', error);
      toast.error(error instanceof Error ? error.message : '切换用户状态失败');
      return false;
    }
  },

  // 批量操作
  batchOperation: async (userIds: string[], operation: 'activate' | 'deactivate' | 'delete') => {
    try {
      const response = await adminApi.post(ADMIN_API_ENDPOINTS.USER_BATCH, { userIds, operation });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`批量${operation === 'activate' ? '启用' : operation === 'deactivate' ? '禁用' : '删除'}成功`);
        // 刷新用户列表
        await get().fetchUsers();
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

  // 获取注册状态
  getRegistrationStatus: async () => {
    try {
      const response = await adminApi.get(ADMIN_API_ENDPOINTS.SYSTEM_CONFIG_REGISTRATION);

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          set({ registrationEnabled: result.data.enabled });
        }
      }
    } catch (error) {
      console.error('获取注册状态错误:', error);
    }
  },

  // 切换注册状态
  toggleRegistration: async (enabled: boolean) => {
    try {
      const response = await adminApi.put(ADMIN_API_ENDPOINTS.SYSTEM_CONFIG_REGISTRATION, { enabled });

      const result = await response.json();
      
      if (result.success) {
        set({ registrationEnabled: enabled });
        toast.success(`用户注册已${enabled ? '启用' : '禁用'}`);
        return true;
      } else {
        throw new Error(result.message || '切换注册状态失败');
      }
    } catch (error) {
      console.error('切换注册状态错误:', error);
      toast.error(error instanceof Error ? error.message : '切换注册状态失败');
      return false;
    }
  },

  // 清空选中用户
  clearSelectedUser: () => {
    set({ selectedUser: null });
  },
})); 