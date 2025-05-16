"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api";
import { toast } from "sonner";

// 重置密码表单验证模式
const resetPasswordSchema = z
  .object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 表单处理
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // 提交表单
  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      toast.error("无效的重置令牌");
      return;
    }

    try {
      setIsLoading(true);
      await apiClient.post("/auth/reset-password", {
        token,
        password: data.password,
      });
      toast.success("密码重置成功");
      router.push("/login");
    } catch (error: any) {
      toast.error(
        error.response?.data?.error?.message || "重置密码失败，请稍后再试"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 如果没有token，显示错误信息
  if (!token) {
    return (
      <AuthLayout>
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">无效的链接</h1>
            <p className="text-muted-foreground">
              重置密码链接无效或已过期
            </p>
          </div>
          <Button asChild className="w-full">
            <Link href="/forgot-password">重新获取重置链接</Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">重置密码</h1>
          <p className="text-muted-foreground">
            请输入您的新密码
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新密码</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                {...register("password")}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "隐藏" : "显示"}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认新密码</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "重置中..." : "重置密码"}
          </Button>
          <div className="text-center text-sm">
            <Link href="/login" className="text-primary hover:underline">
              返回登录
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
