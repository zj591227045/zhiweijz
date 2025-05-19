'use client';

import { useState, useEffect } from 'react';
import { InvitationData } from '@/lib/stores/family-members-store';
import { formatDate } from '@/lib/utils/date-utils';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import './invitation-history.css';

interface InvitationHistoryProps {
  invitations: InvitationData[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
}

export function InvitationHistory({
  invitations,
  isLoading,
  onRefresh
}: InvitationHistoryProps) {
  const [expandedInvitationId, setExpandedInvitationId] = useState<string | null>(null);

  // 添加调试日志
  useEffect(() => {
    console.log(`InvitationHistory: 收到 ${invitations.length} 条邀请记录`);
    console.log('邀请记录完整数据:', JSON.stringify(invitations));
    invitations.forEach((invitation, index) => {
      console.log(`邀请记录 ${index + 1}: ID=${invitation.id}, 邀请码=${invitation.invitationCode}, isUsed=${invitation.isUsed}`);
    });
  }, [invitations]);

  // 切换邀请详情的展开状态
  const toggleInvitationDetails = (id: string) => {
    setExpandedInvitationId(expandedInvitationId === id ? null : id);
  };

  // 复制邀请码
  const copyInvitationCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        alert('邀请码已复制到剪贴板');
      })
      .catch(() => {
        alert('复制失败，请手动复制');
      });
  };

  // 如果正在加载，显示加载状态
  if (isLoading) {
    return (
      <div className="invitation-history">
        <div className="section-header">
          <h3 className="section-title">邀请码历史</h3>
          <button
            className="refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="flex items-center justify-center p-6">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // 如果没有邀请记录，显示空状态
  if (!invitations || invitations.length === 0) {
    console.log('InvitationHistory: 没有邀请记录，显示空状态');
    return (
      <div className="invitation-history">
        <div className="section-header">
          <h3 className="section-title">邀请码历史</h3>
          <button
            className="refresh-button"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <i className="fas fa-sync-alt"></i>
          </button>
        </div>
        <div className="empty-state">
          <p>暂无邀请记录</p>
        </div>
      </div>
    );
  }

  console.log('InvitationHistory: 渲染邀请列表，共 ' + invitations.length + ' 条记录');

  return (
    <div className="invitation-history">
      <div className="section-header">
        <h3 className="section-title">邀请码历史 ({invitations.length})</h3>
        <button
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      <div className="invitation-list">
        {invitations.map((invitation, index) => {
          console.log(`渲染邀请项 ${index}:`, invitation.id, invitation.invitationCode);
          return (
          <div
            key={`invitation-${invitation.id}-${index}`}
            className={`invitation-item ${invitation.isUsed ? 'used' : 'active'}`}
          >
            <div
              className="invitation-summary"
              onClick={() => toggleInvitationDetails(invitation.id)}
            >
              <div className="invitation-code">
                {invitation.invitationCode}
                <button
                  className="copy-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyInvitationCode(invitation.invitationCode);
                  }}
                >
                  <i className="fas fa-copy"></i>
                </button>
              </div>
              <div className="invitation-status">
                <span className={`status-badge ${invitation.isUsed ? 'used' : 'active'}`}>
                  {invitation.isUsed ? '已使用' : '未使用'}
                </span>
              </div>
              <div className="invitation-date">
                <div className="created-at">
                  创建于: {formatDate(invitation.createdAt)}
                </div>
                <div className="expires-at">
                  有效期至: {formatDate(invitation.expiresAt)}
                </div>
              </div>
              <div className="toggle-icon">
                <i className={`fas fa-chevron-${expandedInvitationId === invitation.id ? 'up' : 'down'}`}></i>
              </div>
            </div>

            {expandedInvitationId === invitation.id && (
              <div className="invitation-details">
                {invitation.isUsed ? (
                  <div className="used-info">
                    <div className="used-at">
                      使用时间: {formatDate(invitation.usedAt || '')}
                    </div>
                    {invitation.usedByUserName && (
                      <div className="used-by">
                        使用者: {invitation.usedByUserName}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="invite-link">
                    <div className="link-label">邀请链接:</div>
                    <div className="link-value">{invitation.url}</div>
                    <button
                      className="copy-link-button"
                      onClick={() => copyInvitationCode(invitation.url)}
                    >
                      <i className="fas fa-copy"></i>
                      <span>复制链接</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  );
}
