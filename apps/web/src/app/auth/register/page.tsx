'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { SimpleSlidingCaptcha } from '@/components/captcha/simple-sliding-captcha';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const validatePassword = () => {
    if (password !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return false;
    }

    if (password.length < 8) {
      setPasswordError('密码长度至少为8位');
      return false;
    }

    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    // 检查是否需要验证码
    if (!captchaToken) {
      setShowCaptcha(true);
      return;
    }

    try {
      const success = await register({
        name,
        email,
        password,
        captchaToken,
      });

      if (success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('注册失败:', error);
      // 注册失败，重置验证码
      setCaptchaToken(null);
    }
  };

  // 处理验证码成功
  const handleCaptchaSuccess = async (token: string) => {
    setCaptchaToken(token);
    setShowCaptcha(false);

    // 直接调用注册API，不再通过handleSubmit
    try {
      const success = await register({
        name,
        email,
        password,
        captchaToken: token,
      });

      if (success) {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('注册失败:', error);
      // 注册失败，重置验证码
      setCaptchaToken(null);
    }
  };

  // 处理验证码错误
  const handleCaptchaError = (error: string) => {
    toast.error(error);
    setCaptchaToken(null);
  };

  // 处理验证码关闭
  const handleCaptchaClose = () => {
    setShowCaptcha(false);
    setCaptchaToken(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1 className="app-logo">只为记账</h1>
        <p className="app-slogan">简单高效的个人记账应用</p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div
            className="px-4 py-3 rounded mb-4"
            style={{
              backgroundColor: 'rgba(var(--error-color), 0.1)',
              borderColor: 'var(--error-color)',
              color: 'var(--error-color)',
              border: '1px solid',
            }}
          >
            <span>{error}</span>
            <button
              type="button"
              className="float-right"
              onClick={clearError}
              style={{ color: 'var(--error-color)' }}
            >
              &times;
            </button>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="name" className="form-label">
            姓名
          </label>
          <input
            type="text"
            id="name"
            className="form-input full-width"
            placeholder="请输入姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="email" className="form-label">
            邮箱
          </label>
          <input
            type="email"
            id="email"
            className="form-input full-width"
            placeholder="请输入邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password" className="form-label">
            密码
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              className="form-input full-width"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">
            确认密码
          </label>
          <div className="password-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              className="form-input full-width"
              placeholder="请再次输入密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {passwordError && (
            <p className="text-sm mt-1" style={{ color: 'var(--error-color)' }}>
              {passwordError}
            </p>
          )}
        </div>

        <button type="submit" className="submit-button" disabled={isLoading}>
          {isLoading ? '注册中...' : '注册'}
        </button>

        <div className="auth-links">
          <span style={{ color: 'var(--text-secondary)' }}>已有账号?</span>
          <Link href="/auth/login" className="auth-link">
            登录
          </Link>
        </div>
      </form>

      <div className="auth-footer">
        <p>&copy; {new Date().getFullYear()} 只为记账. 保留所有权利.</p>
      </div>

      {/* 验证码组件 */}
      <SimpleSlidingCaptcha
        isOpen={showCaptcha}
        onClose={handleCaptchaClose}
        onSuccess={handleCaptchaSuccess}
        onError={handleCaptchaError}
        title="完成注册验证"
      />
    </div>
  );
}
