'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import './profile.css';
import { PageContainer } from '@/components/layout/page-container';
import { AvatarUploader } from '@/components/profile/avatar-uploader';
import { ProfileForm, ProfileFormValues } from '@/components/profile/profile-form';
import { userService, UserProfile } from '@/lib/api/user-service';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, syncUserToLocalStorage, updateAvatar } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 获取用户资料
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await userService.getUserProfile();
        setProfile(data);
      } catch (error) {
        console.error('获取用户资料失败:', error);
        toast.error('获取用户资料失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // 处理头像上传
  const handleAvatarChange = async (file: File) => {
    setIsUploadingAvatar(true);

    try {
      const data = await userService.uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatar: data.avatar } : null));
      
      // 同步更新 auth store 中的头像信息
      await updateAvatar(data.avatar);
      
      toast.success('头像上传成功');
    } catch (error) {
      console.error('头像上传失败:', error);
      toast.error('头像上传失败');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // 处理表单提交
  const handleSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);

    try {
      // 调用 userService 更新数据库
      const updatedProfile = await userService.updateUserProfile(data);
      setProfile(updatedProfile);
      
      // 同步更新 auth store 和 localStorage（将前端格式转换为后端格式）
      const success = syncUserToLocalStorage({
        id: updatedProfile.id,
        name: updatedProfile.username, // 注意：前端使用username，后端使用name
        email: updatedProfile.email,
        avatar: updatedProfile.avatar,
        bio: updatedProfile.bio,
        birthDate: updatedProfile.birthDate,
        createdAt: updatedProfile.createdAt,
      });
      
      if (success) {
        console.log('🔍 用户资料更新成功，localStorage已同步更新');
        toast.success('个人资料更新成功');
      } else {
        console.warn('⚠️ localStorage同步失败，但数据库更新成功');
        toast.success('个人资料更新成功');
      }
    } catch (error) {
      console.error('更新个人资料失败:', error);
      toast.error('更新个人资料失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      className="icon-button"
      type="submit"
      form="profile-form"
      disabled={isSubmitting}
      aria-label="保存"
    >
      {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
    </button>
  );

  if (isLoading) {
    return (
      <PageContainer title="个人资料" showBackButton={true} activeNavItem="profile">
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="个人资料"
      rightActions={rightActions}
      showBackButton={true}
      activeNavItem="profile"
    >
      {/* 头像上传组件 */}
      <AvatarUploader
        currentAvatar={profile?.avatar}
        username={profile?.username}
        registrationOrder={profile?.registrationOrder}
        onAvatarChange={handleAvatarChange}
        isUploading={isUploadingAvatar}
      />

      {/* 个人资料表单 */}
      <ProfileForm
        id="profile-form"
        profile={profile || undefined}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* 底部保存按钮 */}
      <div className="bottom-button-container">
        <button
          className={`save-button ${isSubmitting ? 'loading' : ''}`}
          type="submit"
          form="profile-form"
          disabled={isSubmitting}
        >
          {isSubmitting ? '保存中...' : '保存'}
        </button>
      </div>
    </PageContainer>
  );
}
