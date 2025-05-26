'use client';

import { useState } from 'react';
import { FamilyMember, UserPermissions, Role } from '@/types/family';
import { MemberItem } from './member-item';
import { RoleSelector } from './role-selector';

interface MemberListProps {
  members: FamilyMember[];
  userPermissions: UserPermissions;
  onRoleChange: (memberId: string, name: string, role: Role) => void;
  onRemoveMember: (memberId: string, name: string) => void;
}

export function MemberList({
  members,
  userPermissions,
  onRoleChange,
  onRemoveMember
}: MemberListProps) {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  // 添加调试信息
  // console.log('MemberList 接收到的数据:', { members, userPermissions });

  // 切换成员角色选择器的展开状态
  const toggleRoleSelector = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  // 处理角色更改
  const handleRoleChange = (memberId: string, name: string, role: Role) => {
    onRoleChange(memberId, name, role);
    setExpandedMemberId(null); // 关闭角色选择器
  };

  // 添加安全检查
  if (!Array.isArray(members)) {
    console.error('members 不是数组:', members);
    return <div className="members-list">数据格式错误</div>;
  }

  return (
    <div className="members-list">
      {members.map((member, index) => {
        // console.log(`渲染成员 ${index}:`, member);

        // 确保member对象存在且有必要的属性
        if (!member || !member.memberId) {
          console.error(`成员 ${index} 数据无效:`, member);
          return null;
        }

        return (
          <div key={member.memberId} className="member-card">
            <MemberItem
              member={member}
              canRemove={userPermissions.canRemove && !member.isCurrentUser}
              canChangeRole={userPermissions.canChangeRoles && !member.isCurrentUser}
              onToggleRoleSelector={() => toggleRoleSelector(member.memberId)}
              onRemove={() => onRemoveMember(member.memberId, member.username || '未知用户')}
            />

            {/* 角色选择器 - 仅在展开状态且有权限时显示 */}
            {expandedMemberId === member.memberId && userPermissions.canChangeRoles && !member.isCurrentUser && (
              <RoleSelector
                currentRole={member.role}
                onRoleChange={(role) => handleRoleChange(member.memberId, member.username || '未知用户', role)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
