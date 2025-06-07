'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useServerConfigStore } from '@/store/server-config-store';
import { toast } from 'sonner';
import { ThemeSwitcher } from '../../../components/theme/theme-switcher';
import { SimpleSlidingCaptcha } from '@/components/captcha/simple-sliding-captcha';
import ServerSettings from '@/components/server/server-settings';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError, getLoginAttempts } = useAuthStore();
  const { isDockerEnvironment, config } = useServerConfigStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [showServerSettings, setShowServerSettings] = useState(false);

  // 检测是否为Docker环境
  const isDocker = isDockerEnvironment();

  // 如果已登录，重定向到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 检查是否需要验证码
    const loginAttempts = getLoginAttempts(email);

    if (loginAttempts.requiresCaptcha && !captchaToken) {
      setShowCaptcha(true);
      return;
    }

    try {
      const success = await login({
        email,
        password,
        captchaToken: captchaToken || undefined,
      });

      if (success) {
        // 登录成功，重置验证码状态
        setCaptchaToken(null);
        setShowCaptcha(false);
      }
    } catch (err) {
      // 错误已在store中处理
      // 如果登录失败且需要验证码，重置验证码
      const updatedAttempts = getLoginAttempts(email);
      if (updatedAttempts.requiresCaptcha) {
        setCaptchaToken(null);
      }
    }
  };

  // 处理验证码成功
  const handleCaptchaSuccess = async (token: string) => {
    setCaptchaToken(token);
    setShowCaptcha(false);

    // 直接调用登录API，不再通过handleSubmit
    try {
      const success = await login({
        email,
        password,
        captchaToken: token,
      });

      if (success) {
        // 登录成功，重置验证码状态
        setCaptchaToken(null);
        setShowCaptcha(false);
      }
    } catch (err) {
      // 错误已在store中处理
      // 如果登录失败，重置验证码
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

  // 清除错误
  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  return (
    <div className="app-container min-h-screen flex flex-col">
      <div className="auth-container px-3 sm:px-6 md:px-8 flex flex-col min-h-screen max-w-screen-xl mx-auto w-full box-border">
        {/* 主题切换器 */}
        <ThemeSwitcher />

        {/* Logo */}
        <div className="logo-container my-8">
          <div className="hexagon-logo">
            <span>
              只为
              <br />
              记账
            </span>
          </div>
        </div>

        {/* 头部 */}
        <div className="auth-header text-center mb-8">
          <div className="app-logo text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
            只为记账
          </div>
          <div className="app-slogan text-gray-500 dark:text-gray-400 text-base sm:text-lg">
            简单、高效，AI驱动的记账工具
          </div>
        </div>

        {/* 表单 */}
        <form
          onSubmit={handleSubmit}
          className="auth-form flex flex-col gap-4 sm:gap-5 w-full max-w-[95%] sm:max-w-sm md:max-w-md mx-auto bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-lg shadow-md box-border"
        >
          <div className="form-group">
            <label
              htmlFor="email"
              className="form-label text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱地址"
              className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label
              htmlFor="password"
              className="form-label text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              密码
            </label>
            <div className="password-input-wrapper relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 bg-transparent border-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path
                      fillRule="evenodd"
                      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                      clipRule="evenodd"
                    />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="remember-me flex items-center">
            <input type="checkbox" id="remember" className="w-4 h-4 mr-2 accent-blue-500" />
            <label htmlFor="remember" className="text-sm text-gray-700 dark:text-gray-300">
              记住我
            </label>
          </div>

          <button
            type="submit"
            className="submit-button bg-blue-600 text-white py-2.5 sm:py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm sm:text-base"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>

          <div className="auth-links flex justify-between mt-3 sm:mt-4">
            <Link
              href="/auth/register"
              className="auth-link text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline"
            >
              注册账号
            </Link>
            <Link
              href="/auth/forgot-password"
              className="auth-link text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline"
            >
              忘记密码？
            </Link>
          </div>
        </form>

        {/* 服务器设置按钮 - 放在表单外，仅在非Docker环境显示 */}
        {!isDocker && (
          <div className="w-full max-w-[95%] sm:max-w-sm md:max-w-md mx-auto mt-4">
            <button
              type="button"
              onClick={() => setShowServerSettings(true)}
              className="relative flex items-center justify-center w-full px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-gray-300 dark:border-gray-600 rounded-md text-xs sm:text-sm hover:border-blue-500 dark:hover:border-blue-400 bg-white dark:bg-gray-800"
            >
              <div className="flex items-center space-x-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span>服务器设置</span>
              </div>
              <span className={`absolute right-3 px-2 py-1 rounded-full text-xs font-medium ${
                config.type === 'official' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
              }`}>
                {config.type === 'official' ? '官方' : '自托管'}
              </span>
            </button>
          </div>
        )}

        {/* 页脚 */}
        <div className="auth-footer mt-auto text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400 text-xs mb-2">
          <div>&copy; {new Date().getFullYear()} 只为记账 - 版权所有</div>
        </div>
      </div>

      {/* 验证码组件 */}
      <SimpleSlidingCaptcha
        isOpen={showCaptcha}
        onClose={handleCaptchaClose}
        onSuccess={handleCaptchaSuccess}
        onError={handleCaptchaError}
        title="安全验证"
      />

      {/* 服务器设置组件 */}
      {showServerSettings && (
        <ServerSettings
          onClose={() => setShowServerSettings(false)}
          onSave={() => {
            setShowServerSettings(false);
            // 可以在这里添加其他逻辑，比如重新获取用户信息等
          }}
        />
      )}
    </div>
  );
}
