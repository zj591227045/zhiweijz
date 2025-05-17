'use client';

import { useState } from 'react';
import { InvitationData } from '@/lib/stores/family-members-store';
import { formatDate } from '@/lib/utils/date-utils';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface InvitationSectionProps {
  invitation: InvitationData | null;
  isLoading: boolean;
  onGenerateInvitation: (expiresInDays: number) => Promise<void>;
}

export function InvitationSection({ 
  invitation, 
  isLoading,
  onGenerateInvitation 
}: InvitationSectionProps) {
  const [expiryDays, setExpiryDays] = useState(7);
  const [showExpiryOptions, setShowExpiryOptions] = useState(false);

  // 复制邀请链接
  const copyInviteLink = () => {
    if (!invitation) return;
    
    navigator.clipboard.writeText(invitation.url)
      .then(() => toast.success('邀请链接已复制到剪贴板'))
      .catch(() => toast.error('复制失败，请手动复制'));
  };

  // 分享邀请链接
  const shareInviteLink = () => {
    if (!invitation) return;
    
    if (navigator.share) {
      navigator.share({
        title: '加入我的家庭账本',
        text: '点击链接加入我的家庭账本',
        url: invitation.url
      })
        .then(() => toast.success('分享成功'))
        .catch((error) => {
          if (error.name !== 'AbortError') {
            toast.error('分享失败');
          }
        });
    } else {
      copyInviteLink();
    }
  };

  // 设置有效期并生成邀请
  const handleExpiryChange = (days: number) => {
    setExpiryDays(days);
    setShowExpiryOptions(false);
    onGenerateInvitation(days);
  };

  // 如果没有邀请链接且不在加载中，显示生成按钮
  if (!invitation && !isLoading) {
    return (
      <div className="invitation-section">
        <button 
          className="invite-button"
          onClick={() => onGenerateInvitation(expiryDays)}
        >
          <i className="fas fa-user-plus"></i>
          生成邀请链接
        </button>
      </div>
    );
  }

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="invitation-section">
        <div className="flex items-center justify-center p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="invitation-section">
      <div className="invite-header">
        <div className="invite-icon">
          <i className="fas fa-user-plus"></i>
        </div>
        <div className="invite-title">邀请链接</div>
      </div>
      
      <div className="invite-code-container">
        <div className="invite-code">{invitation?.invitationCode}</div>
        <div className="invite-expiry">
          有效期至 {invitation ? formatDate(invitation.expiresAt) : ''}
        </div>
      </div>
      
      <div className="invite-actions">
        <button 
          className="invite-button copy-button"
          onClick={copyInviteLink}
        >
          <i className="fas fa-copy"></i>
          <span>复制链接</span>
        </button>
        <button 
          className="invite-button share-button"
          onClick={shareInviteLink}
        >
          <i className="fas fa-share-alt"></i>
          <span>分享</span>
        </button>
      </div>
      
      <div className="qr-code-container">
        {/* 这里可以使用实际的二维码库生成二维码 */}
        <div className="qr-code">二维码区域</div>
        <div className="qr-code-hint">扫描二维码加入家庭</div>
      </div>
      
      <div className="expiry-selector">
        <div className="expiry-label">有效期</div>
        <div 
          className="expiry-value cursor-pointer"
          onClick={() => setShowExpiryOptions(!showExpiryOptions)}
        >
          <span>{expiryDays}天</span>
          <i className="fas fa-chevron-down"></i>
          
          {/* 有效期选项下拉菜单 */}
          {showExpiryOptions && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10">
              <div className="py-1">
                {[1, 3, 7, 30].map((days) => (
                  <button
                    key={days}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    onClick={() => handleExpiryChange(days)}
                  >
                    {days}天
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
