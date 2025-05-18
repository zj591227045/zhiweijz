'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';

interface FamilyMember {
  id: string;
  name: string;
  avatar?: string;
  role: string;
  isCurrentUser?: boolean;
}

interface FamilyMemberSelectorProps {
  familyId: string;
  currentMemberId: string | null;
  onMemberChange: (memberId: string | null) => void;
}

export function FamilyMemberSelector({
  familyId,
  currentMemberId,
  onMemberChange
}: FamilyMemberSelectorProps) {
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 获取家庭成员
  useEffect(() => {
    const fetchFamilyMembers = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get<{members: FamilyMember[], totalCount: number}>(`/families/${familyId}/members`);

        // 检查响应格式
        console.log('家庭成员响应:', response);

        // 获取成员数组
        const membersList = response.members || [];

        if (Array.isArray(membersList) && membersList.length > 0) {
          // 添加一个"全部成员"选项
          const allMembersOption: FamilyMember = {
            id: 'all',
            name: '全部成员',
            role: 'ALL',
          };

          const membersWithAll = [allMembersOption, ...membersList];
          setMembers(membersWithAll);

          // 找到当前成员的索引
          const index = currentMemberId
            ? membersWithAll.findIndex(member => member.id === currentMemberId)
            : 0; // 默认选择"全部成员"

          setCurrentIndex(index !== -1 ? index : 0);
        } else {
          console.warn('没有找到家庭成员');
        }
      } catch (error) {
        console.error('获取家庭成员失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (familyId) {
      fetchFamilyMembers();
    }
  }, [familyId, currentMemberId]);

  // 处理滑动切换
  const handleSwipe = (direction: 'prev' | 'next') => {
    if (members.length <= 1) return;

    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : members.length - 1;
    } else {
      newIndex = currentIndex < members.length - 1 ? currentIndex + 1 : 0;
    }

    setCurrentIndex(newIndex);
    onMemberChange(members[newIndex].id === 'all' ? null : members[newIndex].id);
  };

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return <Skeleton className="h-12 w-full mb-4" />;
  }

  // 如果没有家庭成员，不显示选择器
  if (members.length <= 1) {
    return null;
  }

  const currentMember = members[currentIndex];

  return (
    <div className="family-member-selector cursor-pointer mb-4">
      <div className="flex items-center justify-between">
        <div className="member-selector-info">
          <i className={`fas fa-user member-selector-icon`}></i>
          <div className="member-selector-text">
            <div className="member-selector-name">{currentMember.name}</div>
            <div className="member-selector-role">
              {currentMember.role === 'ADMIN' ? '管理员' :
               currentMember.role === 'MEMBER' ? '成员' : '全部'}
            </div>
          </div>
        </div>

        <div className="member-selector-controls">
          <button
            className="member-selector-button"
            onClick={(e) => {
              e.stopPropagation();
              handleSwipe('prev');
            }}
          >
            <i className="fas fa-chevron-left"></i>
          </button>
          <div className="member-selector-count">
            {currentIndex + 1}/{members.length}
          </div>
          <button
            className="member-selector-button"
            onClick={(e) => {
              e.stopPropagation();
              handleSwipe('next');
            }}
          >
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}
