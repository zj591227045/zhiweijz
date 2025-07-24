/**
 * 订阅升级卡片组件
 * 用于会员中心显示升级选项
 */

import React, { useState } from 'react';
import {
  ArrowUpIcon,
  StarIcon,
  CheckCircleIcon,
  SparklesIcon,
  HeartIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import {
  StarIcon as StarSolidIcon,
} from '@heroicons/react/24/solid';

interface SubscriptionUpgradeCardProps {
  currentMemberType: string;
  onUpgradeClick: () => void;
  onInfoClick: () => void;
}

export function SubscriptionUpgradeCard({ 
  currentMemberType, 
  onUpgradeClick, 
  onInfoClick 
}: SubscriptionUpgradeCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // 获取会员类型图标
  const getMemberTypeIcon = (memberType: string) => {
    switch (memberType) {
      case 'DONATION_ONE':
        return <StarIcon className="h-6 w-6 text-blue-500" />;
      case 'DONATION_TWO':
        return <SparklesIcon className="h-6 w-6 text-purple-500" />;
      case 'DONATION_THREE':
        return <TrophyIcon className="h-6 w-6 text-yellow-500" />;
      case 'LIFETIME':
        return <HeartIcon className="h-6 w-6 text-red-500" />;
      default:
        return <StarIcon className="h-6 w-6 text-gray-400" />;
    }
  };

  // 获取会员类型标签
  const getMemberTypeLabel = (memberType: string) => {
    switch (memberType) {
      case 'DONATION_ONE':
        return '捐赠会员（壹）';
      case 'DONATION_TWO':
        return '捐赠会员（贰）';
      case 'DONATION_THREE':
        return '捐赠会员（叁）';
      case 'LIFETIME':
        return '永久会员';
      case 'REGULAR':
        return '普通会员';
      default:
        return '未知会员';
    }
  };

  // 获取升级建议
  const getUpgradeSuggestion = () => {
    switch (currentMemberType) {
      case 'REGULAR':
        return {
          title: '升级为捐赠会员',
          subtitle: '解锁更多权益，支持应用发展',
          targetType: 'DONATION_TWO',
          benefits: ['每月1000-1500积分', '公益事业署名', '专属徽章', '支持开发']
        };
      case 'DONATION_ONE':
        return {
          title: '升级为捐赠会员（贰）',
          subtitle: '获得公益署名权益',
          targetType: 'DONATION_TWO',
          benefits: ['公益事业署名', '相同积分奖励', '更多支持权益']
        };
      case 'DONATION_TWO':
        return {
          title: '升级为捐赠会员（叁）',
          subtitle: '享受优先客服支持',
          targetType: 'DONATION_THREE',
          benefits: ['优先客服通道', '所有权益', '最高支持级别']
        };
      default:
        return null;
    }
  };

  const upgradeSuggestion = getUpgradeSuggestion();

  if (!upgradeSuggestion) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-5 border border-purple-200">
        <div className="text-center">
          <TrophyIcon className="h-12 w-12 text-purple-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            您已是最高级别会员
          </h3>
          <p className="text-purple-700 text-sm mb-4">
            感谢您对应用的支持！
          </p>
          <button
            onClick={onInfoClick}
            className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors min-h-[40px]"
          >
            查看会员权益
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {getMemberTypeIcon(upgradeSuggestion.targetType)}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {upgradeSuggestion.title}
            </h3>
            <p className="text-sm text-gray-600">
              {upgradeSuggestion.subtitle}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-blue-600 text-sm font-medium hover:text-blue-700 flex-shrink-0"
        >
          {showDetails ? '收起' : '详情'}
        </button>
      </div>

      {/* 权益预览 */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {upgradeSuggestion.benefits.slice(0, 4).map((benefit, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm text-gray-700">{benefit}</span>
          </div>
        ))}
      </div>

      {/* 详细信息 */}
      {showDetails && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">升级后您将获得：</h4>
          <div className="space-y-2">
            {upgradeSuggestion.benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-2">
                <StarSolidIcon className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h5 className="font-medium text-gray-900 mb-2">价格信息：</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-900">月付</p>
                <p className="text-gray-600">
                  {upgradeSuggestion.targetType === 'DONATION_TWO' ? '¥10/月' : '¥15/月'}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <p className="font-medium text-gray-900">年付</p>
                <p className="text-gray-600">
                  {upgradeSuggestion.targetType === 'DONATION_TWO' ? '¥110/年' : '¥165/年'}
                </p>
                <p className="text-green-600 text-xs">省钱推荐</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3">
        <button
          onClick={onUpgradeClick}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 min-h-[48px]"
        >
          <ArrowUpIcon className="h-5 w-5" />
          立即升级
        </button>
        <button
          onClick={onInfoClick}
          className="bg-white text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors border border-gray-300 min-h-[48px]"
        >
          了解更多
        </button>
      </div>

      {/* 底部说明 */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <p className="text-xs text-gray-500 text-center">
          订阅支持应用持续发展和公益事业 • 随时可取消
        </p>
      </div>
    </div>
  );
}

export default SubscriptionUpgradeCard;
