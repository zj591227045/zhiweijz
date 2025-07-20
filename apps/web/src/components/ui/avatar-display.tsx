'use client';

import { getAvatarUrlById } from '@/data/preset-avatars';
import { processAvatarUrl, handleImageError } from '@/lib/image-proxy';
import { AuthenticatedImage } from './authenticated-image';
import { useAuthStore } from '@/store/auth-store';
import { useEffect, useState } from 'react';

interface Badge {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface AvatarDisplayProps {
  avatar?: string; // 头像ID或URL
  username?: string;
  userId?: string; // 用户ID，用于头像代理
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  alt?: string;
  badge?: Badge; // 徽章装饰
  showBadge?: boolean; // 是否显示徽章
}

export function AvatarDisplay({
  avatar,
  username,
  userId,
  size = 'medium',
  className = '',
  alt = '头像',
  badge,
  showBadge = true,
}: AvatarDisplayProps) {
  const { user } = useAuthStore();
  const [currentAvatar, setCurrentAvatar] = useState(avatar);

  // 当用户是当前登录用户时，优先使用 auth-store 中的最新头像
  useEffect(() => {
    if (user && userId === user.id && user.avatar !== currentAvatar) {
      console.log('🔄 检测到当前用户头像更新:', {
        userId,
        currentUserId: user.id,
        oldAvatar: currentAvatar,
        newAvatar: user.avatar,
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
        console.log('🔔 收到全局头像更新事件:', {
          userId,
          updatedUserId: updatedUser.id,
          newAvatar: updatedUser.avatar,
        });
        setCurrentAvatar(updatedUser.avatar);
      }
    };

    const handleUserProfileUpdate = (event: CustomEvent) => {
      const { user: updatedUser } = event.detail;
      if (updatedUser && userId === updatedUser.id) {
        console.log('🔔 收到全局用户信息更新事件:', {
          userId,
          updatedUserId: updatedUser.id,
          newAvatar: updatedUser.avatar,
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

  // 使用当前头像状态而不是直接使用props中的avatar
  const displayAvatar = currentAvatar;
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

  // 获取徽章尺寸
  const getBadgeSize = () => {
    switch (size) {
      case 'small':
        return 'w-3 h-3 text-xs';
      case 'medium':
        return 'w-4 h-4 text-xs';
      case 'large':
        return 'w-5 h-5 text-sm';
      case 'xlarge':
        return 'w-6 h-6 text-sm';
      default:
        return 'w-4 h-4 text-xs';
    }
  };

  // 获取内联样式（用于特殊尺寸）
  const getInlineStyle = () => {
    if (size === 'large') {
      return { width: '60px', height: '60px' };
    }
    return {};
  };

  // 获取头像内容
  const getAvatarContent = () => {
    if (displayAvatar) {
      // 检查是否是头像ID
      const avatarUrl = getAvatarUrlById(displayAvatar);
      if (avatarUrl) {
        return (
          <img
            src={avatarUrl}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
            onError={(e) => {
              const event = e.nativeEvent;
              handleImageError(event);
            }}
          />
        );
      } else if (displayAvatar.startsWith('http') || displayAvatar.startsWith('/')) {
        // 处理URL格式的头像（包括S3 URL转代理URL）
        const processedUrl = processAvatarUrl(displayAvatar, userId);
        return (
          <AuthenticatedImage
            src={processedUrl}
            alt={alt}
            className="w-full h-full object-cover rounded-full"
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600">
                {username?.charAt(0) || '用'}
              </div>
            }
          />
        );
      } else {
        // 可能是旧的emoji格式，显示为文字
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600">
            {displayAvatar}
          </div>
        );
      }
    } else {
      // 显示用户名首字母
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white font-semibold rounded-full">
          {username?.charAt(0)?.toUpperCase() || '用'}
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

      {/* 徽章装饰 */}
      {badge && showBadge && (
        <div
          className={`
            absolute top-0 right-0 ${getBadgeSize()}
            rounded-full border-2 border-white shadow-sm
            flex items-center justify-center font-bold z-10
          `}
          style={{
            backgroundColor: badge.color,
            color: '#ffffff',
          }}
          title={badge.name}
        >
          {badge.icon}
        </div>
      )}
    </div>
  );
}
