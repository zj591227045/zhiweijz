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
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useAuthStore } from '@/lib/store/auth-store';

// 登录表单验证模式
const loginSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少需要6个字符'),
  remember: z.boolean().default(false),
});

// 登录表单类型
type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 表单控制
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  // 处理表单提交
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);

    try {
      await login(data.email, data.password, data.remember);
      toast.success('登录成功');
      router.push('/dashboard');
    } catch (error) {
      console.error('登录失败:', error);
      toast.error('登录失败，请检查您的邮箱和密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: '480px',
      margin: '0 auto',
      position: 'relative',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
      }}>
        <ThemeSwitcher />
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '1rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '28rem',
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem',
          }}>
            <h1 style={{
              fontSize: '1.875rem',
              lineHeight: '2.25rem',
              fontWeight: '700',
              color: 'rgb(59, 130, 246)',
            }}>只为记账</h1>
            <p style={{
              color: 'rgb(107, 114, 128)',
              marginTop: '0.5rem',
            }}>简单、高效的个人财务管理工具</p>
          </div>

          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.5rem',
            }}>
              <form onSubmit={form.handleSubmit(onSubmit)} style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}>
                <div>
                  <label htmlFor="email" style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                  }}>
                    邮箱
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="email"
                      type="email"
                      placeholder="请输入邮箱地址"
                      style={{
                        width: '100%',
                        height: '3rem',
                        paddingLeft: '1rem',
                        paddingRight: '1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgb(229, 231, 235)',
                        backgroundColor: 'rgb(249, 250, 251)',
                      }}
                      {...form.register('email')}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <p style={{
                      marginTop: '0.25rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                      color: 'rgb(239, 68, 68)',
                    }}>
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    lineHeight: '1.25rem',
                    fontWeight: '500',
                    marginBottom: '0.25rem',
                  }}>
                    密码
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="请输入密码"
                      style={{
                        width: '100%',
                        height: '3rem',
                        paddingLeft: '1rem',
                        paddingRight: '2.5rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgb(229, 231, 235)',
                        backgroundColor: 'rgb(249, 250, 251)',
                      }}
                      {...form.register('password')}
                    />
                    <button
                      type="button"
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'rgb(107, 114, 128)',
                      }}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff style={{ height: '1.25rem', width: '1.25rem' }} />
                      ) : (
                        <Eye style={{ height: '1.25rem', width: '1.25rem' }} />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <p style={{
                      marginTop: '0.25rem',
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                      color: 'rgb(239, 68, 68)',
                    }}>
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '1.25rem' }}>
                    <Checkbox
                      id="remember"
                      style={{
                        height: '1rem',
                        width: '1rem',
                        color: 'rgb(59, 130, 246)',
                        border: '1px solid rgb(229, 231, 235)',
                        borderRadius: '0.25rem',
                      }}
                      {...form.register('remember')}
                    />
                  </div>
                  <div style={{ marginLeft: '0.5rem' }}>
                    <label htmlFor="remember" style={{
                      fontSize: '0.875rem',
                      lineHeight: '1.25rem',
                      color: 'rgb(31, 41, 55)',
                    }}>
                      记住我
                    </label>
                  </div>
                </div>

                <div>
                  <Button
                    type="submit"
                    style={{
                      width: '100%',
                      height: '3rem',
                      backgroundColor: 'rgb(59, 130, 246)',
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      fontSize: '1rem',
                      lineHeight: '1.5rem',
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                    disabled={isLoading}
                  >
                    {isLoading ? '登录中...' : '登录'}
                  </Button>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.875rem',
                  lineHeight: '1.25rem',
                }}>
                  <Link
                    href="/auth/register"
                    style={{
                      color: 'rgb(59, 130, 246)',
                      textDecoration: 'none',
                    }}
                  >
                    注册账号
                  </Link>
                  <Link
                    href="/auth/forgot-password"
                    style={{
                      color: 'rgb(59, 130, 246)',
                      textDecoration: 'none',
                    }}
                  >
                    忘记密码？
                  </Link>
                </div>
              </form>
            </div>
          </div>

          <div style={{
            textAlign: 'center',
            marginTop: '2rem',
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
            color: 'rgb(107, 114, 128)',
          }}>
            &copy; 2023 只为记账 - 版权所有
          </div>
        </div>
      </div>
    </div>
  );
}
