"use client";

import { useState } from "react";
import { useSecurityStore } from "@/store/security-store";

interface PasswordChangeFormProps {
  onClose: () => void;
}

export function PasswordChangeForm({ onClose }: PasswordChangeFormProps) {
  const { 
    passwordForm, 
    updatePasswordForm, 
    changePassword,
    operationStatus
  } = useSecurityStore();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 处理表单提交
  const handleSubmit = async () => {
    // 验证表单
    if (!passwordForm.currentPassword) {
      setError('请输入当前密码');
      return;
    }

    if (!passwordForm.newPassword) {
      setError('请输入新密码');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setError('新密码长度不能少于8个字符');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    // 提交表单
    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      
      // 如果成功，关闭表单
      onClose();
    } catch (error) {
      // 错误处理在store中已经处理
    }
  };

  // 获取密码强度文本
  const getStrengthText = () => {
    switch (passwordForm.passwordStrength) {
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

  return (
    <>
      <div className="modal-header">
        <div className="modal-title">修改密码</div>
        <div className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </div>
      </div>
      <div className="modal-body">
        {error && (
          <div className="text-red-500 mb-4 text-sm">{error}</div>
        )}
        
        <div className="form-group">
          <label className="form-label" htmlFor="current-password">当前密码</label>
          <div className="password-input-container">
            <input 
              type={showCurrentPassword ? "text" : "password"} 
              id="current-password" 
              className="form-input" 
              placeholder="输入当前密码"
              value={passwordForm.currentPassword}
              onChange={(e) => updatePasswordForm({ currentPassword: e.target.value })}
            />
            <div 
              className="password-toggle"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              <i className={`fas fa-${showCurrentPassword ? 'eye-slash' : 'eye'}`}></i>
            </div>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="new-password">新密码</label>
          <div className="password-input-container">
            <input 
              type={showNewPassword ? "text" : "password"} 
              id="new-password" 
              className="form-input" 
              placeholder="输入新密码"
              value={passwordForm.newPassword}
              onChange={(e) => updatePasswordForm({ newPassword: e.target.value })}
            />
            <div 
              className="password-toggle"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              <i className={`fas fa-${showNewPassword ? 'eye-slash' : 'eye'}`}></i>
            </div>
          </div>
          {passwordForm.passwordStrength && (
            <div className="password-strength">
              <div className="strength-meter">
                <div className={`strength-fill strength-${passwordForm.passwordStrength}`}></div>
              </div>
              <div className="strength-text">
                <span>密码强度：{getStrengthText()}</span>
                <span>至少8个字符</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">确认新密码</label>
          <div className="password-input-container">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              id="confirm-password" 
              className="form-input" 
              placeholder="再次输入新密码"
              value={passwordForm.confirmPassword}
              onChange={(e) => updatePasswordForm({ confirmPassword: e.target.value })}
            />
            <div 
              className="password-toggle"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <i className={`fas fa-${showConfirmPassword ? 'eye-slash' : 'eye'}`}></i>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button 
          className="modal-button cancel-button" 
          onClick={onClose}
          disabled={operationStatus === 'loading'}
        >
          取消
        </button>
        <button 
          className="modal-button submit-button"
          onClick={handleSubmit}
          disabled={operationStatus === 'loading'}
        >
          {operationStatus === 'loading' ? '提交中...' : '确认修改'}
        </button>
      </div>
    </>
  );
}
