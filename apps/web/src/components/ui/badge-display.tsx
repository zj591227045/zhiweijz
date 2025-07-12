'use client';

import { useState } from 'react';
import membershipApi from '../../lib/api/membership-service';

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  category: string;
}

interface UserBadge {
  id: string;
  badgeId: string;
  awardedAt: string;
  awardReason: string | null;
  isDisplayed: boolean;
  badge: Badge;
}

interface BadgeDisplayProps {
  badge: Badge;
  userBadge?: UserBadge;
  size?: 'small' | 'medium' | 'large';
  showRarity?: boolean;
  showTooltip?: boolean;
  onClick?: () => void;
  isSelected?: boolean;
  className?: string;
}

export function BadgeDisplay({
  badge,
  userBadge,
  size = 'medium',
  showRarity = true,
  showTooltip = true,
  onClick,
  isSelected = false,
  className = ''
}: BadgeDisplayProps) {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    medium: 'w-12 h-12 text-xl',
    large: 'w-16 h-16 text-2xl'
  };

  const containerSizeClasses = {
    small: 'p-2',
    medium: 'p-3',
    large: 'p-4'
  };

  const isOwned = !!userBadge;
  const isDisplayed = userBadge?.isDisplayed || false;

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          ${containerSizeClasses[size]}
          rounded-lg border-2 transition-all duration-200 cursor-pointer
          ${isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : isDisplayed
            ? 'border-green-500 bg-green-50'
            : isOwned
            ? 'border-gray-300 bg-white hover:border-gray-400'
            : 'border-gray-200 bg-gray-50'
          }
          ${!isOwned ? 'opacity-60' : ''}
        `}
        onClick={onClick}
        onMouseEnter={() => showTooltip && setShowTooltipState(true)}
        onMouseLeave={() => showTooltip && setShowTooltipState(false)}
      >
        {/* 显示状态指示器 */}
        {isDisplayed && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
            <i className="fas fa-check text-white text-xs"></i>
          </div>
        )}

        {/* 徽章图标 */}
        <div className="text-center">
          <div 
            className={`
              ${sizeClasses[size]}
              mx-auto rounded-full flex items-center justify-center font-bold
              ${!isOwned ? 'grayscale' : ''}
            `}
            style={{ 
              backgroundColor: badge.color + '20', 
              color: badge.color 
            }}
          >
            {badge.icon}
          </div>
          
          {/* 徽章名称 */}
          {size !== 'small' && (
            <p className="text-xs font-medium text-gray-900 mt-1 truncate">
              {badge.name}
            </p>
          )}
          
          {/* 稀有度标签 */}
          {showRarity && size !== 'small' && (
            <span className={`
              inline-flex px-1 py-0.5 text-xs font-semibold rounded-full mt-1
              ${membershipApi.getBadgeRarityColor(badge.rarity)}
            `}>
              {membershipApi.getBadgeRarityLabel(badge.rarity)}
            </span>
          )}

          {/* 未获得提示 */}
          {!isOwned && size !== 'small' && (
            <p className="text-xs text-gray-400 mt-1">未获得</p>
          )}
        </div>
      </div>

      {/* 工具提示 */}
      {showTooltip && showTooltipState && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2">
          <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm min-w-max max-w-xs">
            <div className="font-medium">{badge.name}</div>
            {badge.description && (
              <div className="text-gray-300 text-xs mt-1">{badge.description}</div>
            )}
            <div className="text-gray-400 text-xs mt-1">
              稀有度: {membershipApi.getBadgeRarityLabel(badge.rarity)}
            </div>
            {userBadge && (
              <div className="text-gray-400 text-xs mt-1">
                获得时间: {new Date(userBadge.awardedAt).toLocaleDateString()}
              </div>
            )}
            {userBadge?.awardReason && (
              <div className="text-gray-400 text-xs mt-1">
                获得原因: {userBadge.awardReason}
              </div>
            )}
            {/* 箭头 */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 头像徽章装饰组件
interface AvatarBadgeProps {
  badge: Badge;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  size?: 'small' | 'medium';
}

export function AvatarBadge({ 
  badge, 
  position = 'top-right',
  size = 'small'
}: AvatarBadgeProps) {
  const positionClasses = {
    'top-right': 'top-0 right-0',
    'top-left': 'top-0 left-0',
    'bottom-right': 'bottom-0 right-0',
    'bottom-left': 'bottom-0 left-0'
  };

  const sizeClasses = {
    small: 'w-4 h-4 text-xs',
    medium: 'w-6 h-6 text-sm'
  };

  return (
    <div className={`
      absolute ${positionClasses[position]}
      ${sizeClasses[size]}
      rounded-full border-2 border-white shadow-sm
      flex items-center justify-center font-bold z-10
    `}
    style={{ 
      backgroundColor: badge.color, 
      color: '#ffffff' 
    }}
    title={badge.name}
    >
      {badge.icon}
    </div>
  );
}

// 增强版头像显示组件（带徽章装饰）
interface EnhancedAvatarProps {
  avatar?: string;
  username: string;
  userId: string;
  size?: 'small' | 'medium' | 'large';
  badge?: Badge;
  className?: string;
  alt?: string;
}

export function EnhancedAvatar({
  avatar,
  username,
  userId,
  size = 'medium',
  badge,
  className = '',
  alt = '用户头像'
}: EnhancedAvatarProps) {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16'
  };

  const avatarUrl = avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`;

  return (
    <div className={`relative inline-block ${className}`}>
      <img
        className={`${sizeClasses[size]} rounded-full object-cover`}
        src={avatarUrl}
        alt={alt}
        onError={(e) => {
          // 如果头像加载失败，使用默认头像
          const target = e.target as HTMLImageElement;
          target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=128`;
        }}
      />
      
      {/* 徽章装饰 */}
      {badge && (
        <AvatarBadge 
          badge={badge} 
          size={size === 'large' ? 'medium' : 'small'}
          position="top-right"
        />
      )}
    </div>
  );
}