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
import { PresetAvatar } from '@/data/preset-avatars';
import { useMobileBackHandler } from '@/hooks/use-mobile-back-handler';
import { PageLevel } from '@/lib/mobile-navigation';

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, syncUserToLocalStorage, updateAvatar } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // 移动端后退处理
  useMobileBackHandler({
    pageId: 'settings-profile',
    pageLevel: PageLevel.MODAL,
    enableHardwareBack: true,
    enableBrowserBack: true,
    onBack: () => {
      // 个人资料页面后退到设置页面
      router.push('/settings');
      return true; // 已处理
    },
  });

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

  // 处理头像变更
  const handleAvatarChange = async (
    avatarData: { type: 'preset'; data: PresetAvatar } | { type: 'file'; data: File },
  ) => {
    setIsUploadingAvatar(true);

    try {
      let avatarUrl: string;

      if (avatarData.type === 'preset') {
        // 预设头像，保存头像ID到数据库
        const data = await userService.updateAvatarId(avatarData.data.id);
        avatarUrl = data.avatar;

        // 更新本地状态
        setProfile((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));

        // 同步更新 auth store 中的头像信息
        await updateAvatar(avatarUrl);

        toast.success('头像更换成功');
      } else {
        // 文件上传到S3存储
        console.log('📤 开始上传头像文件...');

        // 显示文件大小信息
        const fileSizeMB = (avatarData.data.size / 1024 / 1024).toFixed(2);
        console.log('📤 上传文件大小:', fileSizeMB, 'MB');

        const data = await userService.uploadAvatar(avatarData.data);
        avatarUrl = data.avatar;

        // 更新本地状态
        setProfile((prev) => (prev ? { ...prev, avatar: avatarUrl } : null));

        // 同步更新 auth store 中的头像信息
        await updateAvatar(avatarUrl);

        toast.success(`头像上传成功！文件大小: ${fileSizeMB}MB`);
        console.log('📤 头像上传完成:', avatarUrl);
      }
    } catch (error) {
      console.error('头像变更失败:', error);

      // 根据错误类型显示不同的提示信息
      let errorMessage = '头像变更失败';

      if (error instanceof Error) {
        if (error.message.includes('文件存储服务未启用')) {
          errorMessage = '文件存储服务未启用，请联系管理员配置';
        } else if (error.message.includes('文件大小')) {
          errorMessage = '文件大小超出限制，请选择较小的图片';
        } else if (error.message.includes('文件格式')) {
          errorMessage = '不支持的文件格式，请选择JPG、PNG等图片格式';
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('权限')) {
          errorMessage = '权限不足，请联系管理员';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage);
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
