'use client';

import { getAvatarUrlById } from '@/data/preset-avatars';

interface AvatarDisplayProps {
  avatar?: string; // 头像ID或URL
  username?: string;
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  alt?: string;
}

export function AvatarDisplay({
  avatar,
  username,
  size = 'medium',
  className = '',
  alt = '头像'
}: AvatarDisplayProps) {
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

  // 获取头像内容
  const getAvatarContent = () => {
    if (avatar) {
      // 检查是否是头像ID
      const avatarUrl = getAvatarUrlById(avatar);
      if (avatarUrl) {
        return (
          <img 
            src={avatarUrl} 
            alt={alt}
            className="w-full h-full object-cover rounded-full"
          />
        );
      } else if (avatar.startsWith('http') || avatar.startsWith('/')) {
        // 兼容旧的URL格式
        return (
          <img 
            src={avatar} 
            alt={alt}
            className="w-full h-full object-cover rounded-full"
          />
        );
      } else {
        // 可能是旧的emoji格式，显示为文字
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-200 rounded-full text-gray-600">
            {avatar}
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
      className={`${getSizeClass()} ${className} flex-shrink-0`}
      style={getInlineStyle()}
    >
      {getAvatarContent()}
    </div>
  );
}
