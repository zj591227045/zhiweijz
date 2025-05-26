// 角色类型
export type Role = 'ADMIN' | 'MEMBER';

// 成员统计数据
export interface MemberStatistics {
  totalExpense: number;
  percentage: number;
  transactionCount: number;
}

// 家庭成员
export interface FamilyMember {
  memberId: string;
  userId: string | null;
  username: string;
  avatar: string | null;
  role: Role;
  joinedAt: string;
  isCurrentUser: boolean;
  statistics: MemberStatistics;
}

// 邀请链接数据
export interface InvitationData {
  id: string;
  familyId: string;
  invitationCode: string;
  expiresAt: string;
  url: string;
  createdAt: string;
  isUsed: boolean;
  usedAt?: string;
  usedByUserId?: string;
  usedByUserName?: string;
}

// 用户权限
export interface UserPermissions {
  canInvite: boolean;
  canRemove: boolean;
  canChangeRoles: boolean;
}
