/**
 * 安全相关的数据模型
 */

// 修改密码请求
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// 修改邮箱请求
export interface ChangeEmailDto {
  newEmail: string;
  verificationCode: string;
}

// 发送验证码请求
export interface SendVerificationCodeDto {
  email: string;
}

// 登录会话
export interface Session {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Date;
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

// 安全日志
export interface SecurityLog {
  id: string;
  userId: string;
  type: SecurityLogType;
  description: string;
  deviceInfo: string;
  ipAddress: string;
  location: string;
  createdAt: Date;
}

// 安全日志查询参数
export interface SecurityLogQueryParams {
  page?: number;
  limit?: number;
  type?: SecurityLogType;
  startDate?: string;
  endDate?: string;
}

// 用户安全设置
export interface UserSecurity {
  email: string;
  lastPasswordChange: Date | null;
  securityQuestionSet: boolean;
  loginNotification: boolean;
  recoveryEmailSet: boolean;
  recoveryEmail: string | null;
}
