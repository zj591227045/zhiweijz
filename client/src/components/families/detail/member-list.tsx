"use client";

import Link from "next/link";
import { FamilyMember } from "@/lib/stores/family-store";
import { formatDate } from "@/lib/utils/date-utils";

interface MemberListProps {
  members: FamilyMember[];
  isAdmin: boolean;
  familyId: string;
  onInvite: () => void;
}

export function MemberList({ members, isAdmin, familyId, onInvite }: MemberListProps) {
  // 显示最多3个成员，其余的在成员管理页面查看
  const displayMembers = members.slice(0, 3);

  // 获取成员头像文本（取名字的第一个字）
  const getAvatarText = (name: string) => {
    return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?';
  };

  return (
    <>
      <div className="section-title">
        <span>成员列表</span>
        <Link href={`/families/${familyId}/members`} className="view-all">查看全部</Link>
      </div>

      <div className="members-list">
        {displayMembers.map((member) => (
          <div key={member.id} className="member-item">
            <div className="member-avatar">
              {getAvatarText(member.name || '')}
            </div>
            <div className="member-details">
              <div className="member-name">
                {member.name || '未知用户'}
                <span className={`member-role ${member.role === "ADMIN" ? "role-admin" : "role-member"}`}>
                  {member.role === "ADMIN" ? "管理员" : "成员"}
                </span>
              </div>
              <div className="member-joined">
                {formatDate(member.createdAt)}加入
              </div>
            </div>
          </div>
        ))}
      </div>

      {isAdmin && (
        <div className="invite-button" onClick={onInvite}>
          <i className="fas fa-user-plus"></i>
          <span>邀请成员</span>
        </div>
      )}
    </>
  );
}
