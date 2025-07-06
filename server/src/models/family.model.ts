import { Family, FamilyMember, Invitation, Role } from '@prisma/client';

/**
 * 家庭创建DTO
 */
export interface CreateFamilyDto {
  name: string;
}

/**
 * 家庭更新DTO
 */
export interface UpdateFamilyDto {
  name?: string;
}

/**
 * 家庭成员创建DTO
 */
export interface CreateFamilyMemberDto {
  name: string;
  role?: Role;
  isRegistered?: boolean;
  userId?: string;
  gender?: string;
  birthDate?: Date;
  isCustodial?: boolean;
}

/**
 * 托管成员创建DTO
 */
export interface CreateCustodialMemberDto {
  name: string;
  gender?: string;
  birthDate?: Date;
  role?: Role;
}

/**
 * 家庭成员更新DTO
 */
export interface UpdateFamilyMemberDto {
  name?: string;
  role?: Role;
  gender?: string;
  birthDate?: Date;
}

/**
 * 邀请创建DTO
 */
export interface CreateInvitationDto {
  expiresInDays?: number;
}

/**
 * 接受邀请DTO
 */
export interface AcceptInvitationDto {
  invitationCode: string;
}

/**
 * 用户简要信息
 */
export interface UserBriefDto {
  id: string;
  name: string;
  email: string;
}

/**
 * 家庭成员响应DTO
 */
export interface FamilyMemberResponseDto {
  id: string;
  familyId: string;
  userId?: string;
  user?: UserBriefDto;
  name: string;
  gender?: string;
  birthDate?: Date;
  role: Role;
  isRegistered: boolean;
  isCustodial: boolean;
  isCurrentUser?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 家庭响应DTO
 */
export interface FamilyResponseDto {
  id: string;
  name: string;
  createdBy: string;
  creator?: UserBriefDto;
  members?: FamilyMemberResponseDto[];
  memberCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 家庭列表响应DTO
 */
export interface FamilyListResponseDto {
  id: string;
  name: string;
  createdBy: string;
  creator?: UserBriefDto;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 邀请响应DTO
 */
export interface InvitationResponseDto {
  id: string;
  familyId: string;
  invitationCode: string;
  expiresAt: Date;
  url: string;
  createdAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedByUserId?: string;
  usedByUserName?: string;
}

/**
 * 将家庭实体转换为响应DTO
 */
export function toFamilyResponseDto(
  family: Family,
  members?: FamilyMember[],
  creator?: UserBriefDto,
  currentUserId?: string,
): FamilyResponseDto {
  return {
    id: family.id,
    name: family.name,
    createdBy: family.createdBy,
    creator,
    members: members?.map((member) => toFamilyMemberResponseDto(member, currentUserId)),
    memberCount: members?.length,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  };
}

/**
 * 将家庭实体转换为列表响应DTO
 */
export function toFamilyListResponseDto(
  family: Family,
  memberCount: number,
  creator?: UserBriefDto,
): FamilyListResponseDto {
  return {
    id: family.id,
    name: family.name,
    createdBy: family.createdBy,
    creator,
    memberCount,
    createdAt: family.createdAt,
    updatedAt: family.updatedAt,
  };
}

/**
 * 将家庭成员实体转换为响应DTO
 */
export function toFamilyMemberResponseDto(
  member: FamilyMember & { user?: { id: string; name: string; email: string } | null },
  currentUserId?: string,
): FamilyMemberResponseDto {
  return {
    id: member.id,
    familyId: member.familyId,
    userId: member.userId || undefined,
    user: member.user
      ? {
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
        }
      : undefined,
    name: member.name || '未知用户',
    gender: member.gender || undefined,
    birthDate: member.birthDate || undefined,
    role: member.role,
    isRegistered: member.isRegistered,
    isCustodial: member.isCustodial || false,
    isCurrentUser: member.userId === currentUserId,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  };
}

/**
 * 将邀请实体转换为响应DTO
 */
export function toInvitationResponseDto(
  invitation: Invitation,
  baseUrl: string,
): InvitationResponseDto {
  return {
    id: invitation.id,
    familyId: invitation.familyId,
    invitationCode: invitation.invitationCode,
    expiresAt: invitation.expiresAt,
    url: `${baseUrl}/join?code=${invitation.invitationCode}`,
    createdAt: invitation.createdAt,
    isUsed: invitation.isUsed || false,
    usedAt: invitation.usedAt || undefined,
    usedByUserId: invitation.usedByUserId || undefined,
    usedByUserName: invitation.usedByUserName || undefined,
  };
}
