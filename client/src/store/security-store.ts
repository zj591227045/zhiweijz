import { create } from 'zustand';
import {
  UserSecurity,
  Session,
  SecurityLog,
  ChangePasswordRequest,
  ChangeEmailRequest,
  SendVerificationCodeRequest,
  securityService
} from '@/lib/api/security-service';

// 表单类型
export type FormType = 'password' | 'email' | null;

// 操作状态
export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

// 安全状态接口
interface SecurityState {
  // 数据
  security: UserSecurity | null;
  sessions: Session[];
  logs: SecurityLog[];
  totalLogs: number;

  // UI状态
  activeForm: FormType;
  isLoading: boolean;
  error: string | null;
  operationStatus: OperationStatus;

  // 表单数据
  passwordForm: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    passwordStrength: 'weak' | 'medium' | 'strong' | null;
  };
  emailForm: {
    newEmail: string;
    verificationCode: string;
    isCodeSent: boolean;
    countdown: number;
  };

  // 确认对话框
  confirmDialog: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  };

  // 操作
  fetchSecurity: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  fetchLogs: (page?: number, limit?: number) => Promise<void>;

  changePassword: (data: ChangePasswordRequest) => Promise<void>;
  sendVerificationCode: (email: string) => Promise<void>;
  changeEmail: (data: ChangeEmailRequest) => Promise<void>;
  logoutSession: (sessionId: string) => Promise<void>;

  setActiveForm: (form: FormType) => void;
  updatePasswordForm: (data: Partial<SecurityState['passwordForm']>) => void;
  updateEmailForm: (data: Partial<SecurityState['emailForm']>) => void;
  resetForms: () => void;

  openConfirmDialog: (title: string, message: string, onConfirm: () => void) => void;
  closeConfirmDialog: () => void;

  startCountdown: () => void;
  resetCountdown: () => void;
  decrementCountdown: () => void;

  calculatePasswordStrength: (password: string) => void;
}

// 创建安全状态存储
export const useSecurityStore = create<SecurityState>((set, get) => ({
  // 初始数据
  security: null,
  sessions: [],
  logs: [],
  totalLogs: 0,

  // 初始UI状态
  activeForm: null,
  isLoading: false,
  error: null,
  operationStatus: 'idle',

  // 初始表单数据
  passwordForm: {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    passwordStrength: null,
  },
  emailForm: {
    newEmail: '',
    verificationCode: '',
    isCodeSent: false,
    countdown: 0,
  },

  // 初始确认对话框
  confirmDialog: {
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  },

  // 获取用户安全设置
  fetchSecurity: async () => {
    try {
      set({ isLoading: true, error: null });
      const security = await securityService.getUserSecurity();
      set({ security, isLoading: false });
    } catch (error) {
      console.error('获取安全设置失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取安全设置失败'
      });
    }
  },

  // 获取登录会话列表
  fetchSessions: async () => {
    try {
      set({ isLoading: true, error: null });
      const { sessions } = await securityService.getUserSessions();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('获取登录会话失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取登录会话失败'
      });
    }
  },

  // 获取安全日志
  fetchLogs: async (page = 1, limit = 10) => {
    try {
      set({ isLoading: true, error: null });
      const { logs, total } = await securityService.getSecurityLogs({ page, limit });
      set({ logs, totalLogs: total, isLoading: false });
    } catch (error) {
      console.error('获取安全日志失败:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '获取安全日志失败'
      });
    }
  },

  // 修改密码
  changePassword: async (data) => {
    try {
      set({ operationStatus: 'loading', error: null });
      await securityService.changePassword(data);
      set({
        operationStatus: 'success',
        activeForm: null,
        passwordForm: {
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
          passwordStrength: null,
        }
      });
      // 刷新安全设置
      get().fetchSecurity();
    } catch (error) {
      console.error('修改密码失败:', error);
      set({
        operationStatus: 'error',
        error: error instanceof Error ? error.message : '修改密码失败'
      });
    }
  },

  // 发送验证码
  sendVerificationCode: async (email) => {
    try {
      set({ operationStatus: 'loading', error: null });
      await securityService.sendEmailVerificationCode({ email });
      set({
        operationStatus: 'success',
        emailForm: {
          ...get().emailForm,
          isCodeSent: true,
        }
      });
      get().startCountdown();
    } catch (error) {
      console.error('发送验证码失败:', error);
      set({
        operationStatus: 'error',
        error: error instanceof Error ? error.message : '发送验证码失败'
      });
    }
  },

  // 修改邮箱
  changeEmail: async (data) => {
    try {
      set({ operationStatus: 'loading', error: null });
      await securityService.changeEmail(data);
      set({
        operationStatus: 'success',
        activeForm: null,
        emailForm: {
          newEmail: '',
          verificationCode: '',
          isCodeSent: false,
          countdown: 0,
        }
      });
      // 刷新安全设置
      get().fetchSecurity();
    } catch (error) {
      console.error('修改邮箱失败:', error);
      set({
        operationStatus: 'error',
        error: error instanceof Error ? error.message : '修改邮箱失败'
      });
    }
  },

  // 登出会话
  logoutSession: async (sessionId) => {
    try {
      set({ operationStatus: 'loading', error: null });
      await securityService.logoutSession(sessionId);
      set({ operationStatus: 'success' });
      // 刷新会话列表
      get().fetchSessions();
    } catch (error) {
      console.error('登出会话失败:', error);
      set({
        operationStatus: 'error',
        error: error instanceof Error ? error.message : '登出会话失败'
      });
    }
  },

  // 设置当前活动表单
  setActiveForm: (form) => {
    set({
      activeForm: form,
      operationStatus: 'idle',
      error: null
    });

    // 如果打开表单，禁止背景滚动
    if (form) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  },

  // 更新密码表单
  updatePasswordForm: (data) => {
    set({
      passwordForm: {
        ...get().passwordForm,
        ...data
      }
    });

    // 如果更新了密码，计算密码强度
    if (data.newPassword !== undefined) {
      get().calculatePasswordStrength(data.newPassword);
    }
  },

  // 更新邮箱表单
  updateEmailForm: (data) => {
    set({
      emailForm: {
        ...get().emailForm,
        ...data
      }
    });
  },

  // 重置表单
  resetForms: () => {
    set({
      passwordForm: {
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        passwordStrength: null,
      },
      emailForm: {
        newEmail: '',
        verificationCode: '',
        isCodeSent: false,
        countdown: 0,
      },
      operationStatus: 'idle',
      error: null
    });
  },

  // 打开确认对话框
  openConfirmDialog: (title, message, onConfirm) => {
    set({
      confirmDialog: {
        isOpen: true,
        title,
        message,
        onConfirm,
      }
    });
  },

  // 关闭确认对话框
  closeConfirmDialog: () => {
    set({
      confirmDialog: {
        ...get().confirmDialog,
        isOpen: false,
      }
    });
  },

  // 开始倒计时
  startCountdown: () => {
    set({ emailForm: { ...get().emailForm, countdown: 60 } });
  },

  // 重置倒计时
  resetCountdown: () => {
    set({ emailForm: { ...get().emailForm, countdown: 0 } });
  },

  // 减少倒计时
  decrementCountdown: () => {
    const { countdown } = get().emailForm;
    if (countdown > 0) {
      set({
        emailForm: {
          ...get().emailForm,
          countdown: countdown - 1
        }
      });
    }
  },

  // 计算密码强度
  calculatePasswordStrength: (password) => {
    if (!password) {
      set({
        passwordForm: {
          ...get().passwordForm,
          passwordStrength: null
        }
      });
      return;
    }

    // 密码强度计算逻辑
    let strength: 'weak' | 'medium' | 'strong' = 'weak';

    // 长度检查
    if (password.length >= 8) {
      // 复杂度检查
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      const complexity = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChars].filter(Boolean).length;

      if (complexity >= 3 && password.length >= 10) {
        strength = 'strong';
      } else if (complexity >= 2 && password.length >= 8) {
        strength = 'medium';
      }
    }

    set({
      passwordForm: {
        ...get().passwordForm,
        passwordStrength: strength
      }
    });
  }
}));
