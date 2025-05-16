// 定义角色枚举
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}
import { randomUUID } from 'crypto';
import { FamilyRepository, FamilyWithMembers } from '../repositories/family.repository';
import { UserRepository } from '../repositories/user.repository';
import {
  AcceptInvitationDto,
  CreateFamilyDto,
  CreateFamilyMemberDto,
  CreateInvitationDto,
  FamilyListResponseDto,
  FamilyMemberResponseDto,
  FamilyResponseDto,
  InvitationResponseDto,
  UpdateFamilyDto,
  UpdateFamilyMemberDto,
  toFamilyListResponseDto,
  toFamilyMemberResponseDto,
  toFamilyResponseDto,
  toInvitationResponseDto,
} from '../models/family.model';

/**
 * 家庭服务
 */
export class FamilyService {
  private familyRepository: FamilyRepository;
  private userRepository: UserRepository;

  constructor() {
    this.familyRepository = new FamilyRepository();
    this.userRepository = new UserRepository();
  }

  /**
   * 创建家庭
   */
  async createFamily(userId: string, familyData: CreateFamilyDto): Promise<FamilyResponseDto> {
    // 创建家庭
    const family = await this.familyRepository.createFamily(userId, familyData.name);

    // 获取创建者信息
    const creator = await this.userRepository.findById(userId);
    if (!creator) {
      throw new Error('用户不存在');
    }

    // 将创建者添加为管理员成员
    const member = await this.familyRepository.createFamilyMember({
      familyId: family.id,
      userId,
      name: creator.name,
      role: Role.ADMIN,
      isRegistered: true,
    });

    return toFamilyResponseDto(
      family,
      [member],
      {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      }
    );
  }

  /**
   * 获取用户的家庭列表
   */
  async getFamiliesByUserId(userId: string): Promise<FamilyListResponseDto[]> {
    // 获取用户的所有家庭
    const families = await this.familyRepository.findAllFamiliesByUserId(userId);

    // 获取每个家庭的成员数量和创建者信息
    const familyListDtos: FamilyListResponseDto[] = [];

    for (const family of families) {
      const members = await this.familyRepository.findFamilyMembers(family.id);
      const creator = await this.userRepository.findById(family.createdBy);

      familyListDtos.push(
        toFamilyListResponseDto(
          family,
          members.length,
          creator ? {
            id: creator.id,
            name: creator.name,
            email: creator.email,
          } : undefined
        )
      );
    }

    return familyListDtos;
  }

  /**
   * 获取家庭详情
   */
  async getFamilyById(id: string, userId: string): Promise<FamilyResponseDto> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(id);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭成员
    const isMember = await this.isUserFamilyMember(userId, id);
    if (!isMember) {
      throw new Error('无权访问此家庭');
    }

    // 获取创建者信息
    const creator = await this.userRepository.findById(family.createdBy);

    return toFamilyResponseDto(
      family,
      family.members,
      creator ? {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      } : undefined
    );
  }

  /**
   * 更新家庭
   */
  async updateFamily(id: string, userId: string, familyData: UpdateFamilyDto): Promise<FamilyResponseDto> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(id);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, id);
    if (!isAdmin) {
      throw new Error('无权更新此家庭');
    }

    // 更新家庭
    const updatedFamily = await this.familyRepository.updateFamily(id, familyData);

    // 获取创建者信息
    const creator = await this.userRepository.findById(updatedFamily.createdBy);

    return toFamilyResponseDto(
      updatedFamily,
      family.members,
      creator ? {
        id: creator.id,
        name: creator.name,
        email: creator.email,
      } : undefined
    );
  }

  /**
   * 删除家庭
   */
  async deleteFamily(id: string, userId: string): Promise<void> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(id);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭创建者
    if (family.createdBy !== userId) {
      throw new Error('只有家庭创建者可以删除家庭');
    }

    // 删除家庭
    await this.familyRepository.deleteFamily(id);
  }

  /**
   * 添加家庭成员
   */
  async addFamilyMember(familyId: string, userId: string, memberData: CreateFamilyMemberDto): Promise<FamilyMemberResponseDto> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权添加家庭成员');
    }

    // 如果提供了用户ID，验证用户是否存在
    let userInfo = null;
    if (memberData.userId) {
      userInfo = await this.userRepository.findById(memberData.userId);
      if (!userInfo) {
        throw new Error('用户不存在');
      }

      // 检查用户是否已经是家庭成员
      const existingMember = await this.familyRepository.findFamilyMemberByUserAndFamily(memberData.userId, familyId);
      if (existingMember) {
        throw new Error('用户已经是家庭成员');
      }
    }

    // 创建家庭成员
    const member = await this.familyRepository.createFamilyMember({
      familyId,
      userId: memberData.userId,
      name: memberData.name || (userInfo ? userInfo.name : '未命名成员'),
      role: memberData.role || Role.MEMBER,
      isRegistered: memberData.isRegistered !== undefined ? memberData.isRegistered : !!memberData.userId,
    });

    return toFamilyMemberResponseDto(member);
  }

  /**
   * 更新家庭成员
   */
  async updateFamilyMember(familyId: string, memberId: string, userId: string, memberData: UpdateFamilyMemberDto): Promise<FamilyMemberResponseDto> {
    // 获取家庭成员
    const member = await this.familyRepository.findFamilyMemberById(memberId);
    if (!member || member.familyId !== familyId) {
      throw new Error('家庭成员不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权更新家庭成员');
    }

    // 更新家庭成员
    const updatedMember = await this.familyRepository.updateFamilyMember(memberId, memberData);

    return toFamilyMemberResponseDto(updatedMember);
  }

  /**
   * 删除家庭成员
   */
  async deleteFamilyMember(familyId: string, memberId: string, userId: string): Promise<void> {
    // 获取家庭成员
    const member = await this.familyRepository.findFamilyMemberById(memberId);
    if (!member || member.familyId !== familyId) {
      throw new Error('家庭成员不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权删除家庭成员');
    }

    // 不能删除自己
    const userMember = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, familyId);
    if (userMember && userMember.id === memberId) {
      throw new Error('不能删除自己');
    }

    // 删除家庭成员
    await this.familyRepository.deleteFamilyMember(memberId);
  }

  /**
   * 创建邀请链接
   */
  async createInvitation(familyId: string, userId: string, invitationData: CreateInvitationDto, baseUrl: string): Promise<InvitationResponseDto> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权创建邀请链接');
    }

    // 生成唯一的邀请码
    const invitationCode = randomUUID();

    // 设置邀请过期时间（默认7天）
    const expiresInDays = invitationData.expiresInDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 创建邀请
    const invitation = await this.familyRepository.createInvitation(familyId, invitationCode, expiresAt);

    return toInvitationResponseDto(invitation, baseUrl);
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(userId: string, invitationData: AcceptInvitationDto): Promise<FamilyMemberResponseDto> {
    // 获取邀请
    const invitation = await this.familyRepository.findInvitationByCode(invitationData.invitationCode);
    if (!invitation) {
      throw new Error('邀请不存在或已过期');
    }

    // 检查邀请是否过期
    if (invitation.expiresAt < new Date()) {
      throw new Error('邀请已过期');
    }

    // 获取用户信息
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    // 检查用户是否已经是家庭成员
    const existingMember = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, invitation.familyId);
    if (existingMember) {
      throw new Error('您已经是该家庭的成员');
    }

    // 将用户添加为家庭成员
    const member = await this.familyRepository.createFamilyMember({
      familyId: invitation.familyId,
      userId,
      name: user.name,
      role: Role.MEMBER,
      isRegistered: true,
    });

    // 删除已使用的邀请
    await this.familyRepository.deleteInvitation(invitation.id);

    return toFamilyMemberResponseDto(member);
  }

  /**
   * 验证用户是否为家庭成员
   */
  async isUserFamilyMember(userId: string, familyId: string): Promise<boolean> {
    // 检查用户是否为家庭创建者
    const family = await this.familyRepository.findFamilyById(familyId);
    if (family && family.createdBy === userId) {
      return true;
    }

    // 检查用户是否为家庭成员
    const member = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, familyId);
    return !!member;
  }

  /**
   * 验证用户是否为家庭管理员
   */
  async isUserFamilyAdmin(userId: string, familyId: string): Promise<boolean> {
    // 检查用户是否为家庭创建者
    const family = await this.familyRepository.findFamilyById(familyId);
    if (family && family.createdBy === userId) {
      return true;
    }

    // 检查用户是否为家庭管理员
    const member = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, familyId);
    return !!member && member.role === Role.ADMIN;
  }
}
