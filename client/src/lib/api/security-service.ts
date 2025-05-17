import { apiClient } from "@/lib/api";

// 用户安全设置接口
export interface UserSecurity {
  email: string;
  lastPasswordChange: string | null;
  securityQuestionSet: boolean;
  loginNotification: boolean;
  recoveryEmailSet: boolean;
  recoveryEmail: string | null;
}

// 会话接口
export interface Session {
  id: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// 安全日志类型
export enum SecurityLogType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  EMAIL_CHANGE = 'email_change',
  DEVICE_LOGOUT = 'device_logout',
  SECURITY_SETTING_CHANGE = 'security_setting_change'
}

// 安全日志接口
export interface SecurityLog {
  id: string;
  type: SecurityLogType;
  description: string;
  deviceInfo: string;
  ipAddress: string;
  location: string;
  createdAt: string;
}

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

// 发送验证码请求
export interface SendVerificationCodeRequest {
  email: string;
}

// 安全日志查询参数
export interface SecurityLogQueryParams {
  page?: number;
  limit?: number;
  type?: SecurityLogType;
  startDate?: string;
  endDate?: string;
}

// 安全服务
export const securityService = {
  /**
   * 获取用户安全设置
   */
  async getUserSecurity(): Promise<UserSecurity> {
    try {
      console.log('发送获取用户安全设置请求: /security/me/security');
      const response = await apiClient.get<UserSecurity>('/security/me/security');
      console.log('用户安全设置响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取用户安全设置失败:', error);
      throw error;
    }
  },

  /**
   * 修改密码
   */
  async changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
    try {
      console.log('发送修改密码请求: /security/me/password');
      const response = await apiClient.put<{ message: string }>('/security/me/password', data);
      console.log('修改密码响应数据:', response);
      return response;
    } catch (error) {
      console.error('修改密码失败:', error);
      throw error;
    }
  },

  /**
   * 发送邮箱验证码
   */
  async sendEmailVerificationCode(data: SendVerificationCodeRequest): Promise<{ message: string }> {
    try {
      console.log('发送邮箱验证码请求: /security/me/email/verification-code');
      const response = await apiClient.post<{ message: string }>('/security/me/email/verification-code', data);
      console.log('发送邮箱验证码响应数据:', response);
      return response;
    } catch (error) {
      console.error('发送邮箱验证码失败:', error);
      throw error;
    }
  },

  /**
   * 修改邮箱
   */
  async changeEmail(data: ChangeEmailRequest): Promise<{ message: string }> {
    try {
      console.log('发送修改邮箱请求: /security/me/email');
      const response = await apiClient.put<{ message: string }>('/security/me/email', data);
      console.log('修改邮箱响应数据:', response);
      return response;
    } catch (error) {
      console.error('修改邮箱失败:', error);
      throw error;
    }
  },

  /**
   * 获取登录会话列表
   */
  async getUserSessions(): Promise<{ sessions: Session[] }> {
    try {
      console.log('发送获取登录会话请求: /security/me/sessions');
      const response = await apiClient.get<{ sessions: Session[] }>('/security/me/sessions');
      console.log('登录会话响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取登录会话失败:', error);
      throw error;
    }
  },

  /**
   * 登出指定会话
   */
  async logoutSession(sessionId: string): Promise<{ message: string }> {
    try {
      console.log(`发送登出会话请求: /security/me/sessions/${sessionId}`);
      const response = await apiClient.delete<{ message: string }>(`/security/me/sessions/${sessionId}`);
      console.log('登出会话响应数据:', response);
      return response;
    } catch (error) {
      console.error('登出会话失败:', error);
      throw error;
    }
  },

  /**
   * 获取安全日志
   */
  async getSecurityLogs(params?: SecurityLogQueryParams): Promise<{ logs: SecurityLog[], total: number }> {
    try {
      console.log('发送获取安全日志请求: /security/me/security-logs');
      const response = await apiClient.get<{ logs: SecurityLog[], total: number }>('/security/me/security-logs', { params });
      console.log('安全日志响应数据:', response);
      return response;
    } catch (error) {
      console.error('获取安全日志失败:', error);
      throw error;
    }
  }
};
