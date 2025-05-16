'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuthStore } from '@/lib/store/auth-store';

// 忘记密码表单验证模式
const forgotPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

// 忘记密码表单类型
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 表单控制
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  // 处理表单提交
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
      toast.success('重置密码链接已发送到您的邮箱');
    } catch (error) {
      console.error('重置密码失败:', error);
      toast.error('重置密码失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

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
            <CardTitle>忘记密码</CardTitle>
            <CardDescription>
              输入您的邮箱地址，我们将发送重置密码链接
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSubmitted ? (
              <div className="text-center py-4">
                <h3 className="text-lg font-medium mb-2">邮件已发送</h3>
                <p className="text-muted-foreground mb-4">
                  我们已向 {form.getValues().email} 发送了一封包含重置密码链接的邮件。
                  请检查您的邮箱并点击链接重置密码。
                </p>
                <p className="text-sm text-muted-foreground">
                  如果您没有收到邮件，请检查垃圾邮件文件夹，或
                  <button
                    type="button"
                    className="text-primary hover:underline ml-1"
                    onClick={() => form.handleSubmit(onSubmit)()}
                    disabled={isLoading}
                  >
                    重新发送
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    邮箱
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    {...form.register('email')}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? '提交中...' : '发送重置链接'}
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
