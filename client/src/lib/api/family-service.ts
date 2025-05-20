import { apiClient } from "./index";
import { 
  Family, 
  FamilyMember, 
  CreateFamilyData, 
  CreateFamilyMemberData,
  CreateCustodialMemberData,
  UpdateCustodialMemberData
} from "@/types";

// 家庭服务
export const familyService = {
  /**
   * 获取家庭列表
   */
  async getFamilies() {
    try {
      const response = await apiClient.get<Family[]>('/families');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('获取家庭列表失败:', error);
      return [];
    }
  },

  /**
   * 获取家庭详情
   */
  async getFamilyById(id: string) {
    try {
      const response = await apiClient.get<Family>(`/families/${id}`);
      return response;
    } catch (error) {
      console.error(`获取家庭详情失败 (ID: ${id}):`, error);
      throw error;
    }
  },

  /**
   * 创建家庭
   */
  async createFamily(data: CreateFamilyData) {
    try {
      const response = await apiClient.post<Family>('/families', data);
      return response;
    } catch (error) {
      console.error('创建家庭失败:', error);
      throw error;
    }
  },

  /**
   * 更新家庭
   */
  async updateFamily(id: string, data: CreateFamilyData) {
    try {
      const response = await apiClient.put<Family>(`/families/${id}`, data);
      return response;
    } catch (error) {
      console.error(`更新家庭失败 (ID: ${id}):`, error);
      throw error;
    }
  },

  /**
   * 删除家庭
   */
  async deleteFamily(id: string) {
    try {
      await apiClient.delete(`/families/${id}`);
      return true;
    } catch (error) {
      console.error(`删除家庭失败 (ID: ${id}):`, error);
      throw error;
    }
  },

  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers(familyId: string) {
    try {
      const response = await apiClient.get<{members: FamilyMember[]}>(`/families/${familyId}/members`);
      return Array.isArray(response.members) ? response.members : [];
    } catch (error) {
      console.error(`获取家庭成员列表失败 (家庭ID: ${familyId}):`, error);
      return [];
    }
  },

  /**
   * 添加家庭成员
   */
  async addFamilyMember(familyId: string, data: CreateFamilyMemberData) {
    try {
      const response = await apiClient.post<FamilyMember>(`/families/${familyId}/members`, data);
      return response;
    } catch (error) {
      console.error(`添加家庭成员失败 (家庭ID: ${familyId}):`, error);
      throw error;
    }
  },

  /**
   * 更新成员角色
   */
  async updateMemberRole(familyId: string, memberId: string, role: string) {
    try {
      const response = await apiClient.put<FamilyMember>(
        `/families/${familyId}/members/${memberId}/role`,
        { role }
      );
      return response;
    } catch (error) {
      console.error(`更新成员角色失败 (家庭ID: ${familyId}, 成员ID: ${memberId}):`, error);
      throw error;
    }
  },

  /**
   * 删除家庭成员
   */
  async removeMember(familyId: string, memberId: string) {
    try {
      await apiClient.delete(`/families/${familyId}/members/${memberId}`);
      return true;
    } catch (error) {
      console.error(`删除家庭成员失败 (家庭ID: ${familyId}, 成员ID: ${memberId}):`, error);
      throw error;
    }
  },

  /**
   * 获取托管成员列表
   */
  async getCustodialMembers(familyId: string) {
    try {
      const response = await apiClient.get<{members: FamilyMember[]}>(`/families/${familyId}/custodial-members`);
      return Array.isArray(response.members) ? response.members : [];
    } catch (error) {
      console.error(`获取托管成员列表失败 (家庭ID: ${familyId}):`, error);
      return [];
    }
  },

  /**
   * 添加托管成员
   */
  async addCustodialMember(familyId: string, data: CreateCustodialMemberData) {
    try {
      const response = await apiClient.post<FamilyMember>(`/families/${familyId}/custodial-members`, data);
      return response;
    } catch (error) {
      console.error(`添加托管成员失败 (家庭ID: ${familyId}):`, error);
      throw error;
    }
  },

  /**
   * 更新托管成员
   */
  async updateCustodialMember(familyId: string, memberId: string, data: UpdateCustodialMemberData) {
    try {
      const response = await apiClient.put<FamilyMember>(
        `/families/${familyId}/custodial-members/${memberId}`,
        data
      );
      return response;
    } catch (error) {
      console.error(`更新托管成员失败 (家庭ID: ${familyId}, 成员ID: ${memberId}):`, error);
      throw error;
    }
  },

  /**
   * 删除托管成员
   */
  async deleteCustodialMember(familyId: string, memberId: string) {
    try {
      await apiClient.delete(`/families/${familyId}/custodial-members/${memberId}`);
      return true;
    } catch (error) {
      console.error(`删除托管成员失败 (家庭ID: ${familyId}, 成员ID: ${memberId}):`, error);
      throw error;
    }
  }
};
