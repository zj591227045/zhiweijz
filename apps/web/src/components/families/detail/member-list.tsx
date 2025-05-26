"use client";

import Link from "next/link";

interface FamilyMember {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  name: string;
  createdAt: string;
}

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

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="member-section">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-users"></i>
          <span>成员列表</span>
        </div>
        <Link href={`/families/${familyId}/members`} className="view-all-link">
          查看全部
          <i className="fas fa-chevron-right"></i>
        </Link>
      </div>

      <div className="members-preview">
        {displayMembers.map((member) => (
          <div key={member.id} className="member-item">
            <div className="member-avatar">
              {getAvatarText(member.username || member.name)}
            </div>
            <div className="member-details">
              <div className="member-name">
                {member.username || member.name}
                <span className={`member-role ${member.role === "ADMIN" ? "role-admin" : "role-member"}`}>
                  {member.role === "ADMIN" ? "管理员" : "成员"}
                </span>
              </div>
              <div className="member-joined">
                {formatDate(member.joinedAt || member.createdAt)}加入
              </div>
            </div>
          </div>
        ))}
        
        {members.length === 0 && (
          <div className="empty-state">
            <i className="fas fa-users"></i>
            <p>暂无成员</p>
          </div>
        )}
      </div>

      {isAdmin && (
        <button className="invite-button" onClick={onInvite}>
          <i className="fas fa-user-plus"></i>
          <span>邀请成员</span>
        </button>
      )}
    </div>
  );
}
