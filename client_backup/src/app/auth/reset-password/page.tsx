'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuthStore } from '@/lib/store/auth-store';

// 重置密码表单验证模式
const resetPasswordSchema = z.object({
  password: z.string().min(6, '密码至少需要6个字符'),
  confirmPassword: z.string().min(6, '确认密码至少需要6个字符'),
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
});

// 重置密码表单类型
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setNewPassword } = useAuthStore();
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  // 获取URL中的token参数
  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setIsTokenValid(false);
    }
  }, [searchParams]);

  // 表单控制
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // 处理表单提交
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error('无效的重置链接');
      return;
    }
    
    setIsLoading(true);
    
    try {
      await setNewPassword(token, data.password);
      toast.success('密码重置成功，请登录');
      router.push('/auth/login');
    } catch (error) {
      console.error('重置密码失败:', error);
      toast.error('重置密码失败，请稍后再试');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeSwitcher />
      </div>
      
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">只为记账</h1>
          <p className="text-muted-foreground mt-2">简单、高效的个人财务管理工具</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>重置密码</CardTitle>
            <CardDescription>
              请设置您的新密码
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isTokenValid ? (
              <div className="text-center py-4">
                <h3 className="text-lg font-medium mb-2">无效的重置链接</h3>
                <p className="text-muted-foreground mb-4">
                  您的密码重置链接无效或已过期。请重新申请重置密码。
                </p>
                <Button asChild>
                  <Link href="/auth/forgot-password">
                    重新申请重置密码
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    新密码
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入新密码"
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-500">
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
                      <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strengthInfo.color}`}
                          style={{ width: `${(passwordStrength / 5) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium">
                    确认新密码
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="请再次输入新密码"
                      {...form.register('confirmPassword')}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '重置中...' : '重置密码'}
                </Button>
              </form>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-sm text-center w-full">
              记起密码了？{' '}
              <Link
                href="/auth/login"
                className="text-primary hover:underline"
              >
                返回登录
              </Link>
            </p>
          </CardFooter>
        </Card>
        
        <div className="text-center mt-8 text-sm text-muted-foreground">
          &copy; 2023 只为记账 - 版权所有
        </div>
      </div>
    </div>
  );
}
