'use client';

import { FamilyMember } from '@/types/family';
import { formatDate } from '@/lib/utils/date-utils';
import { formatCurrency } from '@/lib/utils/format-utils';
import { RoleBadge } from './role-badge';

interface MemberItemProps {
  member: FamilyMember;
  canRemove: boolean;
  canChangeRole: boolean;
  onToggleRoleSelector: () => void;
  onRemove: () => void;
}

export function MemberItem({
  member,
  canRemove,
  canChangeRole,
  onToggleRoleSelector,
  onRemove
}: MemberItemProps) {
  // 获取头像显示文本（用户名首字）
  const getAvatarText = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <>
      {/* 成员信息和详情的横向容器 */}
      <div className="member-info-section">
        {/* 头像和基本信息区域 - 上下排列 */}
        <div className="member-avatar-container">
          <div className="member-avatar">
            {member.avatar ? (
              <img src={member.avatar} alt={member.username || '用户'} />
            ) : (
              getAvatarText(member.username || '')
            )}
          </div>
          
          {/* 成员基本信息 - 在头像下方 */}
          <div className="member-info-container">
            <div className="member-name">
              {member.username || '未知用户'}
              {member.isCurrentUser && (
                <span className="current-user-badge">你</span>
              )}
            </div>
            <div className="member-role">
              角色
              <RoleBadge role={member.role} />
            </div>
          </div>
        </div>

        {/* 成员详情区域 - 在同一行的右侧 */}
        <div className="member-details">
          <div className="detail-column">
            <div className="detail-item">
              <div className="detail-label">加入时间</div>
              <div className="detail-value">{member.joinedAt ? formatDate(member.joinedAt) : '未知'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">交易次数</div>
              <div className="detail-value">{member.statistics?.transactionCount || 0}次</div>
            </div>
          </div>
          <div className="stats-column">
            <div className="stats-item">
              <div className="stats-value expense-value">
                {formatCurrency(member.statistics?.totalExpense || 0)}
              </div>
              <div className="stats-label">总消费</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{(member.statistics?.percentage || 0).toFixed(1)}%</div>
              <div className="stats-label">消费占比</div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮区域 - 移动到最下方，在同一行中显示 */}
      {(canRemove || canChangeRole) && (
        <div className="member-actions-row">
          {canChangeRole && (
            <button
              className="action-button primary"
              onClick={onToggleRoleSelector}
              aria-label="管理角色"
            >
              <i className="fas fa-user-shield"></i>
              <span className="action-text">管理角色</span>
            </button>
          )}
          {canRemove && (
            <button
              className="action-button danger"
              onClick={onRemove}
              aria-label="移除成员"
            >
              <i className="fas fa-user-times"></i>
              <span className="action-text">移除成员</span>
            </button>
          )}
        </div>
      )}
    </>
  );
}
