"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

// 注册表单验证模式
const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, { message: "用户名不能为空" })
      .max(50, { message: "用户名不能超过50个字符" }),
    email: z
      .string()
      .min(1, { message: "邮箱不能为空" })
      .email({ message: "请输入有效的邮箱地址" }),
    password: z
      .string()
      .min(1, { message: "密码不能为空" })
      .min(8, { message: "密码至少需要8个字符" }),
    confirmPassword: z.string().min(1, { message: "请确认密码" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { register: registerUser, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  // 如果已登录，重定向到仪表盘
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  // 表单处理
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // 提交表单
  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });
      toast.success("注册成功");
    } catch (err) {
      // 错误已在store中处理
    }
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
        {/* 主题切换器和Logo */}
        <ThemeSwitcher />

        {/* 头部 */}
        <div className="auth-header text-center mb-8 sm:mb-10 md:mb-12">
          <div className="app-logo text-3xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">只为记账</div>
          <div className="app-slogan text-gray-500 dark:text-gray-400 text-base sm:text-lg">简单、高效的个人财务管理工具</div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form flex flex-col gap-4 sm:gap-5 w-full max-w-[95%] sm:max-w-sm md:max-w-md mx-auto bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-lg shadow-md box-border">
          <div className="form-group">
            <label htmlFor="name" className="form-label text-sm font-medium text-gray-700 dark:text-gray-300">
              用户名
            </label>
            <input
              id="name"
              type="text"
              placeholder="请输入用户名"
              className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label text-sm font-medium text-gray-700 dark:text-gray-300">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱地址"
              className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label text-sm font-medium text-gray-700 dark:text-gray-300">
              密码
            </label>
            <div className="password-input-wrapper relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="请输入密码"
                className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                {...register("password")}
              />
              <button
                type="button"
                className="password-toggle absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 bg-transparent border-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label text-sm font-medium text-gray-700 dark:text-gray-300">
              确认密码
            </label>
            <div className="password-input-wrapper relative">
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="请再次输入密码"
                className="form-input p-2 sm:p-3 border rounded-md w-full box-border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm sm:text-base"
                {...register("confirmPassword")}
              />
              <button
                type="button"
                className="password-toggle absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 bg-transparent border-none cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            className="submit-button bg-blue-600 text-white py-2.5 sm:py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm sm:text-base"
            disabled={isLoading}
          >
            {isLoading ? "注册中..." : "注册"}
          </button>

          <div className="auth-links flex justify-center mt-3 sm:mt-4">
            <Link href="/login" className="auth-link text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline">
              已有账号？登录
            </Link>
          </div>
        </form>

        {/* 页脚 */}
        <div className="auth-footer mt-auto text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400 text-xs mb-2">
          &copy; {new Date().getFullYear()} 只为记账 - 版权所有
        </div>
      </div>
    </div>
  );
}
