'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuthStore } from '@/lib/store/auth-store';

// 注册表单验证模式
const registerSchema = z.object({
  name: z.string().min(2, '姓名至少需要2个字符'),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string().min(6, '确认密码至少需要6个字符'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 注册表单类型
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 表单控制
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  // 处理表单提交
  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);

    try {
      await registerUser(data.email, data.password, data.name);
      toast.success('注册成功，请登录');
      router.push('/auth/login');
    } catch (error) {
      console.error('注册失败:', error);
      toast.error('注册失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  // 密码强度计算
  const calculatePasswordStrength = (password: string) => {
    if (!password) return 0;

    let strength = 0;

    // 长度检查
    if (password.length >= 8) strength += 1;

    // 包含数字
    if (/\d/.test(password)) strength += 1;

    // 包含小写字母
    if (/[a-z]/.test(password)) strength += 1;

    // 包含大写字母
    if (/[A-Z]/.test(password)) strength += 1;

    // 包含特殊字符
    if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

    return strength;
  };

  // 获取密码强度文本和颜色
  const getPasswordStrengthInfo = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { text: '弱', color: 'bg-red-500' };
      case 2:
      case 3:
        return { text: '中', color: 'bg-yellow-500' };
      case 4:
      case 5:
        return { text: '强', color: 'bg-green-500' };
      default:
        return { text: '', color: '' };
    }
  };

  const passwordStrength = calculatePasswordStrength(form.watch('password'));
  const strengthInfo = getPasswordStrengthInfo(passwordStrength);

  return (
    <div className="app-container">
      <div className="theme-switcher absolute top-4 right-4">
        <ThemeSwitcher />
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-primary">只为记账</h1>
            <p className="text-muted-foreground mt-2">简单、高效的个人财务管理工具</p>
          </div>

          <div className="bg-card rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-1">注册</h2>
              <p className="text-muted-foreground text-sm mb-6">创建您的账号开始使用系统</p>

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1">
                    姓名
                  </label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="请输入您的姓名"
                      className="w-full h-12 px-4 rounded-lg border border-border bg-background"
                      {...form.register('name')}
                    />
                  </div>
                  {form.formState.errors.name && (
                    <p className="mt-1 text-sm text-error">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    邮箱
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱地址"
                      className="w-full h-12 px-4 rounded-lg border border-border bg-background"
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p className="mt-1 text-sm text-error">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    密码
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      className="w-full h-12 px-4 rounded-lg border border-border bg-background pr-10"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="mt-1 text-sm text-error">
                      {form.formState.errors.password.message}
                    </p>
                  )}

                  {/* 密码强度指示器 */}
                  {form.watch('password') && (
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs">密码强度:</span>
                        <span className="text-xs">{strengthInfo.text}</span>
                      </div>
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            passwordStrength <= 1
                              ? 'bg-error'
                              : passwordStrength <= 3
                                ? 'bg-warning'
                                : 'bg-success'
                          }`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                    确认密码
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入密码"
                      className="w-full h-12 px-4 rounded-lg border border-border bg-background pr-10"
                      {...form.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="mt-1 text-sm text-error">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div>
                  <Button
                    type="submit"
                    className="w-full h-12 bg-primary text-primary-foreground rounded-lg font-medium text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? '注册中...' : '注册'}
                  </Button>
                </div>

                <div className="text-center">
                  <p className="text-sm">
                    已有账号？{' '}
                    <Link
                      href="/auth/login"
                      className="text-primary hover:underline"
                    >
                      登录
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>

          <div className="text-center mt-8 text-sm text-muted-foreground">
            &copy; 2023 只为记账 - 版权所有
          </div>
        </div>
      </div>
    </div>
  );
}
