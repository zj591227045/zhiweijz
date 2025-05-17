"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/page-container";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ProfileForm } from "@/components/profile/profile-form";
import { SaveFeedback } from "@/components/profile/save-feedback";
import { useProfileStore } from "@/store/profile-store";
import { userService } from "@/lib/api/user-service";
import { useAuthStore } from "@/store/auth-store";

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const {
    profile,
    username,
    bio,
    birthDate,
    avatarFile,
    usernameError,
    bioError,
    submitStatus,
    setProfile,
    setIsLoading,
    setError,
    setSubmitStatus,
    resetForm,
    resetErrors,
  } = useProfileStore();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // 获取用户资料
  const { isLoading, error } = useQuery({
    queryKey: ["userProfile"],
    queryFn: userService.getUserProfile,
    onSuccess: (data) => {
      setProfile(data);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "获取用户资料失败");
    },
  });

  // 更新用户资料
  const updateProfileMutation = useMutation({
    mutationFn: userService.updateUserProfile,
    onSuccess: (data) => {
      setProfile(data);
      setSubmitStatus("success");
    },
    onError: (err) => {
      setSubmitStatus("error");
      setError(err instanceof Error ? err.message : "更新用户资料失败");
    },
  });

  // 上传头像
  const uploadAvatarMutation = useMutation({
    mutationFn: userService.uploadAvatar,
    onSuccess: (data) => {
      // 更新用户资料中的头像
      if (profile) {
        setProfile({
          ...profile,
          avatar: data.avatar,
        });
      }
    },
    onError: (err) => {
      setSubmitStatus("error");
      setError(err instanceof Error ? err.message : "上传头像失败");
    },
  });

  // 验证表单
  const validateForm = () => {
    resetErrors();

    let isValid = true;

    // 验证用户名
    if (!username.trim()) {
      setError("用户名不能为空");
      isValid = false;
    } else if (username.length < 2) {
      setError("用户名至少需要2个字符");
      isValid = false;
    } else if (username.length > 20) {
      setError("用户名最多20个字符");
      isValid = false;
    }

    // 验证个人简介
    if (bio.length > 200) {
      setError("个人简介最多200个字符");
      isValid = false;
    }

    return isValid;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证表单
    if (!validateForm()) {
      return;
    }

    // 设置提交状态
    setSubmitStatus("submitting");

    try {
      // 如果有头像文件，先上传头像
      if (avatarFile) {
        await uploadAvatarMutation.mutateAsync(avatarFile);
      }

      // 更新用户资料
      await updateProfileMutation.mutateAsync({
        username,
        bio,
        birthDate,
      });
    } catch (err) {
      // 错误处理已在mutation中完成
      console.error("提交表单失败:", err);
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button"
      type="submit"
      form="profile-form"
      disabled={submitStatus === "submitting"}
    >
      {submitStatus === "submitting" ? (
        <i className="fas fa-spinner fa-spin"></i>
      ) : (
        <i className="fas fa-save"></i>
      )}
    </button>
  );

  return (
    <PageContainer
      title="个人资料"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 头像上传组件 */}
      <AvatarUploader />

      {/* 个人资料表单 */}
      <ProfileForm id="profile-form" />

      {/* 保存反馈 */}
      <SaveFeedback />

      {/* 底部保存按钮 */}
      <div className="bottom-button-container">
        <button
          className={`save-button ${submitStatus === "submitting" ? "loading" : ""}`}
          type="submit"
          form="profile-form"
          disabled={submitStatus === "submitting"}
          onClick={handleSubmit}
        >
          {submitStatus === "submitting" ? (
            <>
              <span className="loading-spinner"></span>
              保存中...
            </>
          ) : (
            "保存"
          )}
        </button>
      </div>
    </PageContainer>
  );
}
