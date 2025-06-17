'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import '@/styles/account-deletion.css';

interface AccountDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeletionStep = 'warning' | 'password' | 'confirm' | 'cooldown';

interface DeletionStatus {
  isDeletionRequested: boolean;
  deletionRequestedAt?: string;
  deletionScheduledAt?: string;
  remainingHours?: number;
}

export function AccountDeletionModal({ isOpen, onClose }: AccountDeletionModalProps) {
  const [step, setStep] = useState<DeletionStep>('warning');
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null);
  const { logout } = useAuthStore();
  const router = useRouter();

  // 控制页面滚动
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      console.log('Account deletion modal opened'); // 调试信息
    } else {
      document.body.classList.remove('modal-open');
      console.log('Account deletion modal closed'); // 调试信息
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // 检查注销状态
  useEffect(() => {
    if (isOpen) {
      checkDeletionStatus();
    }
  }, [isOpen]);

  const checkDeletionStatus = async () => {
    try {
      const response = await apiClient.get('/users/me/deletion-status');
      setDeletionStatus(response.data);

      if (response.data.isDeletionRequested) {
        setStep('cooldown');
      } else {
        setStep('warning');
      }
    } catch (error: any) {
      console.error('检查注销状态失败:', error);

      // 如果是423错误，说明用户在冷静期
      if (error.response?.status === 423) {
        const data = error.response.data;
        setDeletionStatus({
          isDeletionRequested: true,
          deletionRequestedAt: data.deletionRequestedAt,
          deletionScheduledAt: data.deletionScheduledAt,
          remainingHours: data.remainingHours
        });
        setStep('cooldown');
      } else {
        // 其他错误，默认显示警告步骤
        setStep('warning');
      }
    }
  };

  const handleClose = () => {
    setStep('warning');
    setPassword('');
    setConfirmText('');
    setError('');
    onClose();
  };

  const handleNextStep = async () => {
    setError('');
    if (step === 'warning') {
      setStep('password');
    } else if (step === 'password') {
      if (!password.trim()) {
        setError('请输入当前密码');
        return;
      }

      // 验证密码
      setIsLoading(true);
      try {
        // 发送一个测试请求来验证密码
        await apiClient.post('/users/me/verify-password', { password });
        setStep('confirm');
      } catch (error: any) {
        setError(error.response?.data?.message || '密码错误');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleRequestDeletion = async () => {
    if (confirmText !== '确认注销') {
      setError('请输入正确的确认文字');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/users/me/request-deletion', {
        password,
        confirmText
      });

      // 注销请求成功，清除本地存储并跳转到登录页面
      console.log('注销请求成功，准备跳转到登录页面');

      // 清除认证信息
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user');
        localStorage.removeItem('account-book-storage');
        localStorage.removeItem('auth-storage');
      }

      // 跳转到登录页面
      window.location.href = '/auth/login?message=账户注销请求已提交，24小时后将自动删除';

    } catch (error: any) {
      console.error('注销请求失败:', error);
      setError(error.response?.data?.message || '注销请求失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsLoading(true);
    setError('');

    try {
      await apiClient.post('/users/me/cancel-deletion');

      // 重置本地注销状态
      setDeletionStatus({
        isDeletionRequested: false,
        deletionRequestedAt: undefined,
        deletionScheduledAt: undefined,
        remainingHours: 0
      });

      // 重置全局认证状态
      const { setDeletionStatus: setGlobalDeletionStatus } = useAuthStore.getState();
      setGlobalDeletionStatus(false, null, 0);

      setStep('warning');
    } catch (error: any) {
      console.error('取消注销失败:', error);
      setError(error.response?.data?.message || '取消注销失败');
    } finally {
      setIsLoading(false);
    }
  };

  const renderWarningStep = () => (
    <div className="deletion-step">
      <div className="step-header">
        <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
        <h3 className="text-xl font-bold text-red-600 mb-4">注销账户警告</h3>
      </div>
      
      <div className="warning-content space-y-4 mb-6">
        <div className="warning-item">
          <i className="fas fa-times-circle text-red-500 mr-2"></i>
          <span>所有个人数据将被永久删除，无法恢复</span>
        </div>
        <div className="warning-item">
          <i className="fas fa-times-circle text-red-500 mr-2"></i>
          <span>账户将被彻底删除，无法重新激活</span>
        </div>
        <div className="warning-item">
          <i className="fas fa-times-circle text-red-500 mr-2"></i>
          <span>所有记账流水和历史记录将被清空</span>
        </div>
        <div className="warning-item">
          <i className="fas fa-times-circle text-red-500 mr-2"></i>
          <span>如果您是账本管理员，需要先转移管理权或删除账本</span>
        </div>
      </div>

      <div className="step-actions">
        <button variant="outline" onClick={handleClose}>
          取消
        </button>
        <button variant="destructive" onClick={handleNextStep}>
          我已了解，继续
        </button>
      </div>
    </div>
  );

  const renderPasswordStep = () => (
    <div className="deletion-step">
      <div className="step-header">
        <i className="fas fa-lock text-blue-500 text-3xl mb-4"></i>
        <h3 className="text-xl font-bold mb-4">验证身份</h3>
        <p className="text-gray-600 mb-6">请输入当前登录密码以验证您的身份</p>
      </div>

      <div className="form-group mb-6">
        <Input
          type="password"
          placeholder="请输入当前密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
        />
      </div>

      {error && (
        <div className="error-message mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <div className="step-actions">
        <button variant="outline" onClick={() => setStep('warning')}>
          上一步
        </button>
        <button
          variant="destructive"
          onClick={handleNextStep}
          disabled={isLoading}
        >
          {isLoading ? '验证中...' : '下一步'}
        </button>
      </div>
    </div>
  );

  const renderConfirmStep = () => (
    <div className="deletion-step">
      <div className="step-header">
        <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
        <h3 className="text-xl font-bold text-red-600 mb-4">最终确认</h3>
        <p className="text-gray-600 mb-6">
          这是最后一步！请在下方输入 <strong>"确认注销"</strong> 来确认删除您的账户
        </p>
      </div>

      <div className="form-group mb-6">
        <Input
          type="text"
          placeholder="请输入：确认注销"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full"
        />
      </div>

      {error && (
        <div className="error-message mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <div className="step-actions">
        <button variant="outline" onClick={() => setStep('password')}>
          上一步
        </button>
        <button
          variant="destructive"
          onClick={handleRequestDeletion}
          disabled={isLoading}
        >
          {isLoading ? '处理中...' : '确认注销账户'}
        </button>
      </div>
    </div>
  );

  const renderCooldownStep = () => (
    <div className="deletion-step">
      <div className="step-header">
        <i className="fas fa-clock text-orange-500 text-3xl mb-4"></i>
        <h3 className="text-xl font-bold text-orange-600 mb-4">注销冷静期</h3>
        <p className="text-gray-600 mb-6">
          您的账户将在 <strong>{deletionStatus?.remainingHours || 0} 小时</strong> 后被永久删除
        </p>
      </div>

      <div className="cooldown-info mb-6">
        <div className="info-item">
          <span className="label">注销请求时间：</span>
          <span className="value">
            {deletionStatus?.deletionRequestedAt ? 
              new Date(deletionStatus.deletionRequestedAt).toLocaleString('zh-CN') : 
              '-'
            }
          </span>
        </div>
        <div className="info-item">
          <span className="label">预定删除时间：</span>
          <span className="value">
            {deletionStatus?.deletionScheduledAt ? 
              new Date(deletionStatus.deletionScheduledAt).toLocaleString('zh-CN') : 
              '-'
            }
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message mb-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <div className="step-actions">
        <button variant="outline" onClick={handleClose}>
          关闭
        </button>
        <button
          variant="default"
          onClick={handleCancelDeletion}
          disabled={isLoading}
        >
          {isLoading ? '处理中...' : '取消注销'}
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'warning':
        return renderWarningStep();
      case 'password':
        return renderPasswordStep();
      case 'confirm':
        return renderConfirmStep();
      case 'cooldown':
        return renderCooldownStep();
      default:
        return renderWarningStep();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="account-deletion-modal">
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close-btn" onClick={handleClose} aria-label="关闭">
            <i className="fas fa-times"></i>
          </button>
          <div className="modal-body">
            {renderCurrentStep()}
          </div>
        </div>
      </div>
    </div>
  );

  // 使用Portal确保模态框渲染到body中
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}
