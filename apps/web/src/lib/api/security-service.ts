import { apiClient } from "@/api/api-client";

// 修改密码请求
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// 修改邮箱请求
export interface ChangeEmailRequest {
  newEmail: string;
  verificationCode: string;
}

// 安全服务
export const securityService = {
  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    try {
      console.log('发送修改密码请求: /security/me/password');
      const response = await apiClient.put('/security/me/password', data);
      console.log('修改密码响应数据:', response);
      return response;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  },

  /**
   * 修改邮箱
   */
  async changeEmail(data: ChangeEmailRequest): Promise<{ message: string }> {
    try {
      console.log('发送修改邮箱请求: /security/me/email');
      const response = await apiClient.put('/security/me/email', data);
      console.log('修改邮箱响应数据:', response);
      return response;
    } catch (error) {
      console.error('修改邮箱失败:', error);
      throw error;
    }
  }
}; 