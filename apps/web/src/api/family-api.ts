import { apiClient } from '@/lib/api-client';

export interface CreateFamilyRequest {
  name: string;
}

export interface JoinFamilyRequest {
  invitationCode: string;
}

export interface CreateCustodialMemberRequest {
  name: string;
  gender?: string;
  birthDate?: string;
}

export interface FamilyResponse {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: FamilyMember[];
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  inviteCode?: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  name: string;
  role: 'admin' | 'member';
  isRegistered: boolean;
  isCustodial: boolean;
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CustodialMemberResponse {
  id: string;
  familyId: string;
  userId: string;
  name: string;
  role: string;
  isRegistered: boolean;
  isCustodial: boolean;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    isCustodial: boolean;
    birthDate?: string;
  };
}

/**
 * 家庭API服务
 */
export class FamilyApiService {
  /**
   * 创建家庭
   */
  static async createFamily(data: CreateFamilyRequest): Promise<FamilyResponse> {
    try {
      const response = await apiClient.post('/families', data);
      return response;
    } catch (error: any) {
      console.error('创建家庭失败:', error);
      throw new Error(error.response?.data?.message || '创建家庭失败');
    }
  }

  /**
   * 加入家庭
   */
  static async joinFamily(data: JoinFamilyRequest): Promise<FamilyResponse> {
    try {
      const response = await apiClient.post('/families/join', data);
      return response;
    } catch (error: any) {
      console.error('加入家庭失败:', error);
      throw new Error(error.response?.data?.message || '加入家庭失败，请检查邀请码是否正确');
    }
  }

  /**
   * 获取家庭列表
   */
  static async getFamilies(): Promise<FamilyResponse[]> {
    try {
      const response = await apiClient.get('/families');
      return Array.isArray(response) ? response : response.data || [];
    } catch (error: any) {
      console.error('获取家庭列表失败:', error);
      throw new Error(error.response?.data?.message || '获取家庭列表失败');
    }
  }

  /**
   * 获取家庭详情
   */
  static async getFamilyById(id: string): Promise<FamilyResponse> {
    try {
      const response = await apiClient.get(`/families/${id}`);
      return response;
    } catch (error: any) {
      console.error('获取家庭详情失败:', error);
      throw new Error(error.response?.data?.message || '获取家庭详情失败');
    }
  }

  /**
   * 创建家庭邀请码
   */
  static async createInvitation(familyId: string): Promise<{ invitationCode: string }> {
    try {
      const response = await apiClient.post(`/families/${familyId}/invitations`);
      return response;
    } catch (error: any) {
      console.error('创建邀请码失败:', error);
      throw new Error(error.response?.data?.message || '创建邀请码失败');
    }
  }

  /**
   * 添加托管成员
   */
  static async addCustodialMember(
    familyId: string,
    data: CreateCustodialMemberRequest
  ): Promise<CustodialMemberResponse> {
    try {
      const response = await apiClient.post(`/families/${familyId}/custodial-members`, data);
      return response;
    } catch (error: any) {
      console.error('添加托管成员失败:', error);
      throw new Error(error.response?.data?.message || '添加托管成员失败');
    }
  }

  /**
   * 获取托管成员列表
   */
  static async getCustodialMembers(familyId: string): Promise<CustodialMemberResponse[]> {
    try {
      const response = await apiClient.get(`/families/${familyId}/custodial-members`);
      return Array.isArray(response) ? response : response.data || [];
    } catch (error: any) {
      console.error('获取托管成员列表失败:', error);
      throw new Error(error.response?.data?.message || '获取托管成员列表失败');
    }
  }
}
