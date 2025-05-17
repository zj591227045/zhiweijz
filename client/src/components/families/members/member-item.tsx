'use client';

import { FamilyMember } from '@/lib/stores/family-members-store';
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
    return name.charAt(0);
  };

  return (
    <>
      <div className="member-header">
        <div className="member-avatar">
          {member.avatar ? (
            <img src={member.avatar} alt={member.username} />
          ) : (
            getAvatarText(member.username)
          )}
        </div>
        <div className="member-info">
          <div className="member-name">
            {member.username}
            {member.isCurrentUser && (
              <span className="current-user-badge">你</span>
            )}
          </div>
          <div className="member-role">
            角色
            <RoleBadge role={member.role} />
          </div>
        </div>
        <div className="member-actions">
          {canRemove && (
            <button 
              className="action-button danger" 
              onClick={onRemove}
              aria-label="移除成员"
            >
              <i className="fas fa-user-times"></i>
            </button>
          )}
          {canChangeRole && (
            <button 
              className="action-button" 
              onClick={onToggleRoleSelector}
              aria-label="管理角色"
            >
              <i className="fas fa-ellipsis-v"></i>
            </button>
          )}
        </div>
      </div>
      
      <div className="member-details">
        <div className="detail-column">
          <div className="detail-item">
            <div className="detail-label">加入时间</div>
            <div className="detail-value">{formatDate(member.joinedAt)}</div>
          </div>
          <div className="detail-item">
            <div className="detail-label">交易次数</div>
            <div className="detail-value">{member.statistics.transactionCount}次</div>
          </div>
        </div>
        <div className="stats-column">
          <div className="stats-item">
            <div className="stats-value expense-value">
              {formatCurrency(member.statistics.totalExpense)}
            </div>
            <div className="stats-label">总消费</div>
          </div>
          <div className="stats-item">
            <div className="stats-value">{member.statistics.percentage}%</div>
            <div className="stats-label">消费占比</div>
          </div>
        </div>
      </div>
    </>
  );
}
