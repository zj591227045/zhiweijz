'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useServerConfigStore } from '@/store/server-config-store';
import { toast } from 'sonner';
import { SimpleSlidingCaptcha } from '@/components/captcha/simple-sliding-captcha';
import { apiClient } from '@/lib/api-client';

interface SystemInfo {
  registrationEnabled: boolean;
  isSelfHosted: boolean;
  message?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, error, clearError } = useAuthStore();
  const { config } = useServerConfigStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(true);

  // 检查注册状态
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      console.log('🔍 注册页面检查状态开始');
      console.log('🔍 当前配置:', config);
      console.log('🔍 当前window.location:', window.location.href);
      console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);

      // 如果是官方服务器，直接设置为允许注册，不进行API检查
      if (config.type === 'official') {
        console.log('🔍 官方服务器，跳过API检查');
        setSystemInfo({
          registrationEnabled: true,
          isSelfHosted: false,
        });
        setIsCheckingRegistration(false);
        return;
      }

      console.log('🔍 自托管服务器，开始API检查');
      try {
        const data = await apiClient.get('/system/registration-status');

        if (data.success) {
          setSystemInfo({
            registrationEnabled: data.data.enabled,
            isSelfHosted: true, // 自托管服务器
            message: data.data.message,
          });
        } else {
          // 如果API失败，假设是自托管服务器且允许注册
          setSystemInfo({
            registrationEnabled: true,
            isSelfHosted: true,
          });
        }
      } catch (error) {
        console.error('检查注册状态失败:', error);
        // 网络错误时，假设是自托管服务器且允许注册
        setSystemInfo({
          registrationEnabled: true,
          isSelfHosted: true,
        });
      } finally {
        setIsCheckingRegistration(false);
      }
    };

    checkRegistrationStatus();
  }, [config.type]);

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

    // 检查注册是否被禁用
    if (systemInfo?.isSelfHosted && !systemInfo.registrationEnabled) {
      toast.error('用户注册已关闭，请联系管理员');
      return;
    }

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

    // 再次检查注册状态
    if (systemInfo?.isSelfHosted && !systemInfo.registrationEnabled) {
      toast.error('用户注册已关闭，请联系管理员');
      return;
    }

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

  // 如果正在检查注册状态，显示加载界面
  if (isCheckingRegistration) {
    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="app-logo">只为记账</h1>
          <p className="app-slogan">简单高效的个人记账应用</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">检查注册状态...</span>
        </div>
      </div>
    );
  }

  // 如果是自托管服务器且注册被禁用，显示提示页面
  if (systemInfo?.isSelfHosted && !systemInfo.registrationEnabled) {
    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1 className="app-logo">只为记账</h1>
          <p className="app-slogan">简单高效的个人记账应用</p>
        </div>

        <div className="auth-form">
          <div className="text-center py-8">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">用户注册已关闭</h2>
              <p className="text-gray-600 mb-6">
                {systemInfo.message || '当前服务器已关闭用户注册功能，请联系管理员获取账号。'}
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/auth/login"
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                返回登录页面
              </Link>
              <p className="text-sm text-gray-500">如需注册账号，请联系系统管理员</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            姓名 <span className="text-red-500">*</span>
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
            邮箱 <span className="text-red-500">*</span>
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
            密码 <span className="text-red-500">*</span>
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
            确认密码 <span className="text-red-500">*</span>
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
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
          {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
        </div>

        <button type="submit" className="btn-primary full-width" disabled={isLoading}>
          {isLoading ? '注册中...' : '注册'}
        </button>

        <div className="auth-links">
          <p>
            已有账号？{' '}
            <Link href="/auth/login" className="auth-link">
              立即登录
            </Link>
          </p>
        </div>
      </form>

      {/* 验证码弹窗 */}
      <SimpleSlidingCaptcha
        isOpen={showCaptcha}
        onSuccess={handleCaptchaSuccess}
        onError={handleCaptchaError}
        onClose={handleCaptchaClose}
      />
    </div>
  );
}
