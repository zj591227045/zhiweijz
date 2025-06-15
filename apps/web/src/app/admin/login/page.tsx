'use client';

// 强制动态渲染，避免静态生成时的模块解析问题
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/store/admin/useAdminAuth';
import { toast } from 'sonner';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import MobileNotSupported from '@/components/admin/MobileNotSupported';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, error, clearError } = useAdminAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // 添加调试信息
  useEffect(() => {
    console.log('🔍 [AdminLoginPage] Component mounted');
    console.log('🔍 [AdminLoginPage] Auth state:', { isAuthenticated, isLoading, error });
  }, []);

  useEffect(() => {
    console.log('🔍 [AdminLoginPage] Auth state changed:', { isAuthenticated, isLoading, error });
  }, [isAuthenticated, isLoading, error]);

  // 如果是移动端构建，直接返回404
  if (process.env.IS_MOBILE_BUILD === 'true') {
    console.log('🔍 [AdminLoginPage] Mobile build detected, showing not supported');
    return <MobileNotSupported />;
  }

  // 如果已经登录，跳转到管理页面
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔍 [AdminLoginPage] User authenticated, redirecting to /admin');
      router.push('/admin');
    }
  }, [isAuthenticated, router]);

  // 处理登录提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔍 [AdminLoginPage] Login form submitted');
    
    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码');
      return;
    }

    try {
      clearError();
      console.log('🔍 [AdminLoginPage] Attempting login...');
      await login(username.trim(), password);
      toast.success('登录成功');
      // 登录成功后会自动跳转（通过useEffect监听isAuthenticated）
    } catch (err) {
      console.error('🔍 [AdminLoginPage] Login failed:', err);
      // 错误已在store中处理，这里显示toast
      const errorMessage = error || '登录失败，请重试';
      toast.error(errorMessage);
    }
  };

  console.log('🔍 [AdminLoginPage] Rendering login form');

  return (
    <div className="admin-login-container bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4">
        <div className="space-y-6 sm:space-y-8">
          {/* 头部 */}
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              管理员登录
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              请使用管理员账户登录
            </p>
          </div>

          {/* 登录表单 */}
          <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* 用户名输入 */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  用户名
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none relative block w-full px-3 py-3 sm:py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base sm:text-sm"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* 密码输入 */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  密码
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="appearance-none relative block w-full px-3 py-3 sm:py-2 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 text-base sm:text-sm"
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 错误信息显示 */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>
            )}

            {/* 登录按钮 */}
            <div>
              <button
                type="submit"
                disabled={isLoading || !username.trim() || !password.trim()}
                className="group relative w-full flex justify-center py-3 sm:py-2 px-4 border border-transparent text-base sm:text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    登录中...
                  </>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>

          {/* 底部信息 */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              只为记账 - 管理后台
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 