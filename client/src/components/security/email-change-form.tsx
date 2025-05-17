"use client";

import { useEffect, useState } from "react";
import { useSecurityStore } from "@/store/security-store";

interface EmailChangeFormProps {
  onClose: () => void;
}

export function EmailChangeForm({ onClose }: EmailChangeFormProps) {
  const { 
    security,
    emailForm, 
    updateEmailForm, 
    sendVerificationCode,
    changeEmail,
    operationStatus,
    decrementCountdown
  } = useSecurityStore();

  const [error, setError] = useState<string | null>(null);

  // 处理发送验证码
  const handleSendCode = async () => {
    // 验证邮箱
    if (!emailForm.newEmail) {
      setError('请输入新邮箱');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.newEmail)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    // 发送验证码
    try {
      await sendVerificationCode(emailForm.newEmail);
    } catch (error) {
      // 错误处理在store中已经处理
    }
  };

  // 处理表单提交
  const handleSubmit = async () => {
    // 验证表单
    if (!emailForm.newEmail) {
      setError('请输入新邮箱');
      return;
    }

    if (!emailForm.verificationCode) {
      setError('请输入验证码');
      return;
    }

    // 提交表单
    try {
      await changeEmail({
        newEmail: emailForm.newEmail,
        verificationCode: emailForm.verificationCode
      });
      
      // 如果成功，关闭表单
      onClose();
    } catch (error) {
      // 错误处理在store中已经处理
    }
  };

  // 倒计时效果
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (emailForm.countdown > 0) {
      timer = setInterval(() => {
        decrementCountdown();
      }, 1000);
    }
    
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [emailForm.countdown, decrementCountdown]);

  return (
    <>
      <div className="modal-header">
        <div className="modal-title">修改邮箱</div>
        <div className="modal-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </div>
      </div>
      <div className="modal-body">
        {error && (
          <div className="text-red-500 mb-4 text-sm">{error}</div>
        )}
        
        <div className="form-group">
          <label className="form-label">当前邮箱</label>
          <div className="form-input">{security?.email || '未设置'}</div>
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="new-email">新邮箱</label>
          <input 
            type="email" 
            id="new-email" 
            className="form-input" 
            placeholder="输入新邮箱地址"
            value={emailForm.newEmail}
            onChange={(e) => updateEmailForm({ newEmail: e.target.value })}
          />
        </div>
        
        <div className="form-group">
          <label className="form-label" htmlFor="verification-code">验证码</label>
          <div className="verification-code-container">
            <input 
              type="text" 
              id="verification-code" 
              className="form-input verification-code-input" 
              placeholder="输入验证码"
              value={emailForm.verificationCode}
              onChange={(e) => updateEmailForm({ verificationCode: e.target.value })}
            />
            <button 
              className="send-code-button"
              onClick={handleSendCode}
              disabled={emailForm.countdown > 0 || operationStatus === 'loading'}
            >
              {emailForm.countdown > 0 
                ? `${emailForm.countdown}秒后重发` 
                : '发送验证码'}
            </button>
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
