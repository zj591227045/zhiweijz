'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { securityService } from '@/lib/api/security-service';

// 密码修改表单验证模式
const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, '请输入当前密码'),
    newPassword: z
      .string()
      .min(8, '新密码长度不能少于8个字符')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '密码必须包含大小写字母和数字'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

interface PasswordChangeFormProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function PasswordChangeForm({ onClose, onSuccess }: PasswordChangeFormProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const newPassword = watch('newPassword');

  // 计算密码强度
  const getPasswordStrength = (password: string) => {
    if (!password) return null;

    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score < 3) return 'weak';
    if (score < 4) return 'medium';
    return 'strong';
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // 获取密码强度文本
  const getStrengthText = () => {
    switch (passwordStrength) {
      case 'weak':
        return '弱';
      case 'medium':
        return '中等';
      case 'strong':
        return '强';
      default:
        return '';
    }
  };

  // 处理表单提交
  const onSubmit = async (data: PasswordChangeFormValues) => {
    setIsSubmitting(true);

    try {
      await securityService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast.success('密码修改成功');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('密码修改失败:', error);
      const errorMessage = error instanceof Error ? error.message : '密码修改失败';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="modal-header">
        <div className="modal-title">修改密码</div>
        <div className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="current-password">
              当前密码
            </label>
            <div className="password-input-container">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                id="current-password"
                className={`form-input ${errors.currentPassword ? 'border-red-500' : ''}`}
                placeholder="输入当前密码"
                {...register('currentPassword')}
              />
              <div
                className="password-toggle"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              >
                <i className={`fas fa-${showCurrentPassword ? 'eye-slash' : 'eye'}`}></i>
              </div>
            </div>
            {errors.currentPassword && (
              <div className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="new-password">
              新密码
            </label>
            <div className="password-input-container">
              <input
                type={showNewPassword ? 'text' : 'password'}
                id="new-password"
                className={`form-input ${errors.newPassword ? 'border-red-500' : ''}`}
                placeholder="输入新密码"
                {...register('newPassword')}
              />
              <div className="password-toggle" onClick={() => setShowNewPassword(!showNewPassword)}>
                <i className={`fas fa-${showNewPassword ? 'eye-slash' : 'eye'}`}></i>
              </div>
            </div>
            {passwordStrength && (
              <div className="password-strength">
                <div className="strength-meter">
                  <div className={`strength-fill strength-${passwordStrength}`}></div>
                </div>
                <div className="strength-text">
                  <span>密码强度：{getStrengthText()}</span>
                  <span>至少8个字符，包含大小写字母和数字</span>
                </div>
              </div>
            )}
            {errors.newPassword && (
              <div className="text-red-500 text-xs mt-1">{errors.newPassword.message}</div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">
              确认新密码
            </label>
            <div className="password-input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirm-password"
                className={`form-input ${errors.confirmPassword ? 'border-red-500' : ''}`}
                placeholder="再次输入新密码"
                {...register('confirmPassword')}
              />
              <div
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
              </div>
            </div>
            {errors.confirmPassword && (
              <div className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="modal-button cancel-button"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </button>
          <button type="submit" className="modal-button submit-button" disabled={isSubmitting}>
            {isSubmitting ? '提交中...' : '确认修改'}
          </button>
        </div>
      </form>
    </>
  );
}
