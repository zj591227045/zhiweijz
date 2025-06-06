'use client';

import { FamilyMember } from '@/types/family';
import { formatCurrency } from '@/lib/utils/format-utils';
import { cn } from '@/lib/utils';

interface MemberStatisticsProps {
  members: FamilyMember[];
  totalExpense: number;
  period: 'month' | 'last_month' | 'all';
  onPeriodChange: (period: 'month' | 'last_month' | 'all') => void;
}

export function MemberStatistics({
  members,
  totalExpense,
  period,
  onPeriodChange,
}: MemberStatisticsProps) {
  // 按消费金额排序成员
  const sortedMembers = [...members].sort(
    (a, b) => (b.statistics?.totalExpense || 0) - (a.statistics?.totalExpense || 0),
  );

  // 获取排名样式
  const getRankClass = (index: number) => {
    if (index === 0) return 'top-1';
    if (index === 1) return 'top-2';
    if (index === 2) return 'top-3';
    return '';
  };

  // 获取头像显示文本（用户名首字）
  const getAvatarText = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <div className="stats-overview">
      <div className="period-selector">
        <button
          className={cn('period-tab', period === 'all' && 'active')}
          onClick={() => onPeriodChange('all')}
        >
          全部
        </button>
        <button
          className={cn('period-tab', period === 'month' && 'active')}
          onClick={() => onPeriodChange('month')}
        >
          本月
        </button>
        <button
          className={cn('period-tab', period === 'last_month' && 'active')}
          onClick={() => onPeriodChange('last_month')}
        >
          上月
        </button>
      </div>

      <div className="member-ranking">
        {sortedMembers.map((member, index) => (
          <div key={member.memberId} className="ranking-item">
            <div className={cn('rank-number', getRankClass(index))}>{index + 1}</div>
            <div className="ranking-avatar">
              {member.avatar ? (
                <img src={member.avatar} alt={member.username || '用户'} />
              ) : (
                getAvatarText(member.username || '')
              )}
            </div>
            <div className="ranking-details">
              <div className="ranking-name">
                {member.username || '未知用户'}
                {member.isCurrentUser && ' (你)'}
              </div>
            </div>
            <div className="ranking-amount">
              {formatCurrency(member.statistics?.totalExpense || 0)}
            </div>
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-6 text-gray-500">暂无成员消费数据</div>
        )}
      </div>
    </div>
  );
}
