'use client';

import { useState } from 'react';
import { FamilyMember, UserPermissions } from '@/lib/stores/family-members-store';
import { Role } from '@/lib/stores/family-store';
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

  // 切换成员角色选择器的展开状态
  const toggleRoleSelector = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId);
  };

  // 处理角色更改
  const handleRoleChange = (memberId: string, name: string, role: Role) => {
    onRoleChange(memberId, name, role);
    setExpandedMemberId(null); // 关闭角色选择器
  };

  return (
    <div className="members-list">
      {members.map((member) => (
        <div key={member.memberId} className="member-card">
          <MemberItem 
            member={member}
            canRemove={userPermissions.canRemove && !member.isCurrentUser}
            canChangeRole={userPermissions.canChangeRoles && !member.isCurrentUser}
            onToggleRoleSelector={() => toggleRoleSelector(member.memberId)}
            onRemove={() => onRemoveMember(member.memberId, member.username)}
          />
          
          {/* 角色选择器 - 仅在展开状态且有权限时显示 */}
          {expandedMemberId === member.memberId && userPermissions.canChangeRoles && !member.isCurrentUser && (
            <RoleSelector 
              currentRole={member.role}
              onRoleChange={(role) => handleRoleChange(member.memberId, member.username, role)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
