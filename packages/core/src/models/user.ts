/**
 * 用户相关类型
 */
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface ForgotPasswordData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

/**
 * 家庭相关类型
 */
export enum FamilyRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}

export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  members?: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  gender?: string;
  birthDate?: string;
  role: FamilyRole;
  isRegistered: boolean;
  isCustodial?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFamilyData {
  name: string;
}

export interface CreateFamilyMemberData {
  name: string;
  role?: FamilyRole;
  userId?: string;
  isRegistered?: boolean;
}

export interface CreateCustodialMemberData {
  name: string;
  gender?: string;
  birthDate?: string;
  role?: FamilyRole;
}

export interface UpdateCustodialMemberData {
  name?: string;
  gender?: string;
  birthDate?: string;
  role?: FamilyRole;
}
