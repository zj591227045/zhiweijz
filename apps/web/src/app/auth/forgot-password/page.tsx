"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

// 忘记密码表单验证模式
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "邮箱不能为空" })
    .email({ message: "请输入有效的邮箱地址" }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // 表单处理
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  // 提交表单
  const onSubmit = async (data: ForgotPasswordFormValues) => {
    try {
      setIsLoading(true);
      await apiClient.post("/auth/forgot-password", data);
      setIsSubmitted(true);
      toast.success("重置密码链接已发送到您的邮箱");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "发送重置密码链接失败，请稍后再试"
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="auth-form flex flex-col gap-4 sm:gap-5 w-full max-w-[95%] sm:max-w-sm md:max-w-md mx-auto">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">忘记密码</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              输入您的邮箱，我们将发送重置密码链接
            </p>
          </div>

          {isSubmitted ? (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">邮件已发送</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-300">
                  我们已向您的邮箱发送了重置密码链接，请查收并按照邮件中的指示操作。
                </p>
              </div>
              <Link
                href="/auth/login"
                className="submit-button bg-blue-600 text-white py-2.5 sm:py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 block text-center dark:bg-blue-500 dark:hover:bg-blue-600 text-sm sm:text-base"
              >
                返回登录
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 rounded-lg shadow-md box-border">
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

              <button
                type="submit"
                className="submit-button bg-blue-600 text-white py-2.5 sm:py-3 rounded-md font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 w-full dark:bg-blue-500 dark:hover:bg-blue-600 text-sm sm:text-base"
                disabled={isLoading}
              >
                {isLoading ? "发送中..." : "发送重置链接"}
              </button>

              <div className="auth-links flex justify-center mt-3 sm:mt-4">
                <Link href="/auth/login" className="auth-link text-blue-600 dark:text-blue-400 text-xs sm:text-sm hover:underline">
                  返回登录
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* 页脚 */}
        <div className="auth-footer mt-auto text-center py-4 sm:py-6 text-gray-500 dark:text-gray-400 text-xs mb-2">
          &copy; {new Date().getFullYear()} 只为记账 - 版权所有
        </div>
      </div>
    </div>
  );
}
