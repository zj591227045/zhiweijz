import { apiClient } from "@/lib/api";

// 用户资料接口
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  birthDate?: string;
  createdAt: string;
}

// 更新用户资料请求体
export interface UpdateProfileRequest {
  username?: string;
  bio?: string;
  birthDate?: string;
}

// 用户服务
export const userService = {
  /**
   * 获取当前用户资料
   */
  async getUserProfile(): Promise<UserProfile> {
    try {
      console.log('发送获取用户资料请求: /users/me/profile');
      const response = await apiClient.get<UserProfile>('/users/me/profile');
      console.log('用户资料响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取用户资料失败:', error);
      throw error;
    }
  },

  /**
   * 更新用户资料
   */
  async updateUserProfile(data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      console.log('发送更新用户资料请求: /users/me/profile', data);
      const response = await apiClient.put<UserProfile>('/users/me/profile', data);
      console.log('更新用户资料响应数据:', response);
      return response;
    } catch (error) {
      console.error('更新用户资料失败:', error);
      throw error;
    }
  },

  /**
   * 上传用户头像
   */
  async uploadAvatar(file: File): Promise<{ avatar: string }> {
    try {
      console.log('发送上传头像请求: /users/me/avatar');

      // 创建FormData对象
      const formData = new FormData();
      formData.append('avatar', file);

      // 发送请求
      const response = await apiClient.post<{ avatar: string }>('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('上传头像响应数据:', response);
      return response;
    } catch (error) {
      console.error('上传头像失败:', error);
      throw error;
    }
  }
};
