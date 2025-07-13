'use client';

import { useState, useEffect } from 'react';
import { getAvatarUrlById } from '@/data/preset-avatars';
import {
  processAvatarUrl,
  handleImageError,
  isS3DirectUrl,
  isHttpsUrl,
  generatePresignedUrl
} from '@/lib/image-proxy';
import {
  getAccessMethod,
  requiresAuthentication,
  getPresignedUrlTTL
} from '@/lib/s3-access-config';
import { useAuthStore } from '@/store/auth-store';

interface SmartAvatarDisplayProps {
  avatar?: string; // 头像ID或URL
  username?: string;
  userId?: string; // 用户ID，用于头像代理
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  alt?: string;
  requireAuth?: boolean; // 是否需要认证访问
  presignedUrlTTL?: number; // 预签名URL过期时间（秒）
}

export function SmartAvatarDisplay({
  avatar,
  username,
  userId,
  size = 'medium',
  className = '',
  alt = '头像',
  requireAuth = false,
  presignedUrlTTL = 3600
}: SmartAvatarDisplayProps) {
  const { user } = useAuthStore();
  const [processedUrl, setProcessedUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentAvatar, setCurrentAvatar] = useState(avatar);

  // 获取尺寸样式
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-8 text-sm';
      case 'medium':
        return 'w-12 h-12 text-base';
      case 'large':
        return 'w-16 h-16 text-lg'; // 64px
      case 'xlarge':
        return 'w-24 h-24 text-xl';
      default:
        return 'w-12 h-12 text-base';
    }
  };

  // 获取内联样式（用于特殊尺寸）
  const getInlineStyle = () => {
    if (size === 'large') {
      return { width: '60px', height: '60px' };
    }
    return {};
  };

  // 当用户是当前登录用户时，优先使用 auth-store 中的最新头像
  useEffect(() => {
    if (user && userId === user.id && user.avatar !== currentAvatar) {
      console.log('🔄 SmartAvatarDisplay: 检测到当前用户头像更新:', {
        userId,
        currentUserId: user.id,
        oldAvatar: currentAvatar,
        newAvatar: user.avatar
      });
      setCurrentAvatar(user.avatar);
    } else if (!userId || userId !== user?.id) {
      // 如果不是当前用户或没有用户ID，使用传入的avatar
      setCurrentAvatar(avatar);
    }
  }, [user?.avatar, userId, user?.id, avatar, currentAvatar]);

  // 监听全局头像更新事件
  useEffect(() => {
    const handleAvatarUpdate = (event: CustomEvent) => {
      const { user: updatedUser } = event.detail;
      if (updatedUser && userId === updatedUser.id) {
        console.log('🔔 SmartAvatarDisplay: 收到全局头像更新事件:', {
          userId,
          updatedUserId: updatedUser.id,
          newAvatar: updatedUser.avatar
        });
        setCurrentAvatar(updatedUser.avatar);
      }
    };

    const handleUserProfileUpdate = (event: CustomEvent) => {
      const { user: updatedUser } = event.detail;
      if (updatedUser && userId === updatedUser.id) {
        console.log('🔔 SmartAvatarDisplay: 收到全局用户信息更新事件:', {
          userId,
          updatedUserId: updatedUser.id,
          newAvatar: updatedUser.avatar
        });
        setCurrentAvatar(updatedUser.avatar);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
      window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('avatarUpdated', handleAvatarUpdate as EventListener);
        window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
      }
    };
  }, [userId]);

  // 处理头像URL
  useEffect(() => {
    const processUrl = async () => {
      if (!currentAvatar) {
        setProcessedUrl('');
        return;
      }

      // 检查是否是头像ID
      const avatarUrl = getAvatarUrlById(currentAvatar);
      if (avatarUrl) {
        setProcessedUrl(avatarUrl);
        return;
      }

      // 如果不是HTTP URL，直接使用
      if (!currentAvatar.startsWith('http')) {
        setProcessedUrl(currentAvatar);
        return;
      }

      // 如果是S3 URL，使用智能访问策略
      if (isS3DirectUrl(currentAvatar)) {
        const accessMethod = getAccessMethod(currentAvatar);

        switch (accessMethod.method) {
          case 'direct':
            // 直接访问
            console.log('✅ 直接访问头像:', currentAvatar);
            setProcessedUrl(currentAvatar);
            break;

          case 'presigned':
            // 生成预签名URL
            console.log('🔑 生成预签名URL访问头像:', currentAvatar);
            setIsLoading(true);
            setError('');

            try {
              const ttl = requireAuth ? presignedUrlTTL : getPresignedUrlTTL(currentAvatar);
              const presignedUrl = await generatePresignedUrl(currentAvatar, ttl);
              setProcessedUrl(presignedUrl);
            } catch (err) {
              console.error('生成预签名URL失败:', err);
              setError('头像加载失败');
              // 回退到代理访问
              setProcessedUrl(processAvatarUrl(currentAvatar, userId, true));
            } finally {
              setIsLoading(false);
            }
            break;

          case 'proxy':
            // 代理访问
            console.log('🔄 代理访问头像:', currentAvatar);
            setProcessedUrl(processAvatarUrl(currentAvatar, userId, true));
            break;

          default:
            // 默认使用智能处理逻辑
            setProcessedUrl(processAvatarUrl(currentAvatar, userId, true));
        }
      } else {
        // 非S3 URL，使用智能处理逻辑
        setProcessedUrl(processAvatarUrl(currentAvatar, userId, true));
      }
    };

    processUrl();
  }, [currentAvatar, userId, requireAuth, presignedUrlTTL]);

  // 获取头像内容
  const getAvatarContent = () => {
    if (isLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full">
          <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-red-100 rounded-full text-red-600 text-xs">
          ❌
        </div>
      );
    }

    if (processedUrl && processedUrl.startsWith('http')) {
      return (
        <img 
          src={processedUrl} 
          alt={alt}
          className="w-full h-full object-cover rounded-full"
          onError={(e) => {
            console.error('图片加载失败:', processedUrl);
            setError('加载失败');
            const event = e.nativeEvent;
            handleImageError(event);
          }}
          onLoad={() => {
            console.log('✅ 头像加载成功:', processedUrl);
          }}
        />
      );
    } else if (processedUrl && !processedUrl.startsWith('http')) {
      // 可能是emoji或其他文字格式
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600">
          {processedUrl}
        </div>
      );
    } else {
      // 显示用户名首字母
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600">
          {username?.charAt(0) || '用'}
        </div>
      );
    }
  };

  return (
    <div 
      className={`${getSizeClass()} ${className} flex-shrink-0 relative`}
      style={getInlineStyle()}
    >
      {getAvatarContent()}
    </div>
  );
}

// 导出一个便捷的头像组件，用于需要认证的场景
export function AuthenticatedAvatarDisplay(props: Omit<SmartAvatarDisplayProps, 'requireAuth'>) {
  return <SmartAvatarDisplay {...props} requireAuth={true} />;
}

// 导出一个便捷的头像组件，用于公开访问的场景
export function PublicAvatarDisplay(props: Omit<SmartAvatarDisplayProps, 'requireAuth'>) {
  return <SmartAvatarDisplay {...props} requireAuth={false} />;
}
