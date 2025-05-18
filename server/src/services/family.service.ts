// 定义角色枚举
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}
import { randomUUID } from 'crypto';
import { FamilyRepository, FamilyWithMembers } from '../repositories/family.repository';
import { UserRepository } from '../repositories/user.repository';
import { AccountBookService } from './account-book.service';
import { FamilyBudgetService } from './family-budget.service';
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
  private accountBookService: AccountBookService;
  private familyBudgetService: FamilyBudgetService;

  constructor() {
    this.familyRepository = new FamilyRepository();
    this.userRepository = new UserRepository();
    this.accountBookService = new AccountBookService();
    this.familyBudgetService = new FamilyBudgetService();
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

    // 自动创建家庭账本
    try {
      await this.createDefaultFamilyAccountBook(userId, family.id, family.name);
    } catch (error) {
      console.error('创建家庭账本失败:', error);
      // 不影响家庭创建流程，继续执行
    }

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
   * 为家庭创建默认账本
   * @private
   */
  private async createDefaultFamilyAccountBook(userId: string, familyId: string, familyName: string): Promise<void> {
    await this.accountBookService.createFamilyAccountBook(userId, familyId, {
      name: `${familyName}的家庭账本`,
      description: '系统自动创建的家庭账本',
      isDefault: true,
    });
    console.log(`已为家庭 ${familyId} 创建默认账本`);
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

    // 如果是已注册用户，为其创建默认预算
    if (member.userId && member.isRegistered) {
      try {
        // 获取家庭账本
        const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(userId, familyId, { limit: 100 });
        if (familyAccountBooks && familyAccountBooks.data && familyAccountBooks.data.length > 0) {
          // 为每个家庭账本创建默认预算
          for (const accountBook of familyAccountBooks.data) {
            await this.familyBudgetService.createDefaultBudgetsForNewMember(
              member.userId,
              familyId,
              accountBook.id
            );
          }
        }
      } catch (error) {
        console.error(`为新家庭成员 ${member.userId} 创建默认预算失败:`, error);
        // 不影响成员添加流程，继续执行
      }
    }

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

    // 如果是已注册用户，删除其在家庭中的预算
    if (member.userId && member.isRegistered) {
      try {
        await this.familyBudgetService.deleteMemberBudgets(member.userId, familyId);
      } catch (error) {
        console.error(`删除家庭成员 ${member.userId} 的预算失败:`, error);
        // 不影响成员删除流程，继续执行
      }
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

  /**
   * 获取家庭成员列表
   */
  async getFamilyMembers(familyId: string, userId: string): Promise<FamilyMemberResponseDto[]> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭成员
    const isMember = await this.isUserFamilyMember(userId, familyId);
    if (!isMember) {
      throw new Error('无权访问此家庭');
    }

    // 获取家庭成员列表
    const members = await this.familyRepository.findFamilyMembers(familyId);

    return members.map(member => toFamilyMemberResponseDto(member));
  }

  /**
   * 获取家庭统计数据
   */
  async getFamilyStatistics(familyId: string, userId: string, period: string): Promise<any> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭成员
    const isMember = await this.isUserFamilyMember(userId, familyId);
    if (!isMember) {
      throw new Error('无权访问此家庭');
    }

    // 获取家庭成员列表
    const members = await this.familyRepository.findFamilyMembers(familyId);

    // 这里应该从交易记录中获取统计数据
    // 由于目前没有实现交易相关功能，我们返回模拟数据

    // 根据时间范围获取不同的数据
    let totalIncome = 0;
    let totalExpense = 0;

    switch (period) {
      case 'month':
        totalIncome = 12000;
        totalExpense = 8500;
        break;
      case 'last_month':
        totalIncome = 10000;
        totalExpense = 7500;
        break;
      case 'year':
        totalIncome = 120000;
        totalExpense = 85000;
        break;
      case 'all':
      default:
        totalIncome = 150000;
        totalExpense = 100000;
        break;
    }

    // 计算结余
    const balance = totalIncome - totalExpense;

    // 生成成员分布数据
    const memberDistribution = members.map((member, index) => {
      const amount = Math.round(totalExpense * (0.1 + index * 0.2));
      const percentage = Math.round((amount / totalExpense) * 100);

      return {
        memberId: member.id,
        username: member.name,
        amount,
        percentage
      };
    });

    // 生成分类分布数据
    const categoryIcons = ['utensils', 'shopping-bag', 'home', 'car', 'plane'];
    const categoryNames = ['餐饮', '购物', '住房', '交通', '旅行'];

    const categoryDistribution = categoryNames.map((name, index) => {
      const amount = Math.round(totalExpense * (0.1 + index * 0.1));
      const percentage = Math.round((amount / totalExpense) * 100);

      return {
        categoryId: `category_${index + 1}`,
        categoryName: name,
        categoryIcon: categoryIcons[index],
        amount,
        percentage
      };
    });

    // 生成最近交易数据
    const recentTransactions = [
      {
        id: 'transaction_1',
        categoryName: '餐饮',
        categoryIcon: 'utensils',
        description: '晚餐',
        amount: 150,
        type: 'EXPENSE',
        memberName: members[0]?.name || '未知用户',
        date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 昨天
      },
      {
        id: 'transaction_2',
        categoryName: '购物',
        categoryIcon: 'shopping-bag',
        description: '超市购物',
        amount: 320,
        type: 'EXPENSE',
        memberName: members[1]?.name || members[0]?.name || '未知用户',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 前天
      },
      {
        id: 'transaction_3',
        categoryName: '工资',
        categoryIcon: 'money-bill-wave',
        description: '工资',
        amount: 6000,
        type: 'INCOME',
        memberName: members[2]?.name || members[0]?.name || '未知用户',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5天前
      }
    ];

    return {
      totalIncome,
      totalExpense,
      balance,
      memberDistribution,
      categoryDistribution,
      recentTransactions
    };
  }

  /**
   * 退出家庭
   */
  async leaveFamily(familyId: string, userId: string): Promise<void> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 检查用户是否为家庭创建者
    if (family.createdBy === userId) {
      throw new Error('家庭创建者不能退出家庭');
    }

    // 检查用户是否为家庭成员
    const member = await this.familyRepository.findFamilyMemberByUserAndFamily(userId, familyId);
    if (!member) {
      throw new Error('您不是该家庭的成员');
    }

    // 退出家庭
    await this.familyRepository.deleteFamilyMember(member.id);
  }

  /**
   * 获取成员统计
   */
  async getMemberStatistics(familyId: string, userId: string, period: string): Promise<any> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭成员
    const isMember = await this.isUserFamilyMember(userId, familyId);
    if (!isMember) {
      throw new Error('无权访问此家庭');
    }

    // 获取家庭成员列表
    const members = await this.familyRepository.findFamilyMembers(familyId);

    // 这里应该从交易记录中获取统计数据
    // 由于目前没有实现交易相关功能，我们返回模拟数据

    // 根据时间范围获取不同的数据
    let totalExpense = 0;

    switch (period) {
      case 'month':
        totalExpense = 8500;
        break;
      case 'last_month':
        totalExpense = 7500;
        break;
      case 'all':
      default:
        totalExpense = 100000;
        break;
    }

    // 生成成员消费统计数据
    const memberStatistics = members.map((member, index) => {
      // 为每个成员生成不同的消费金额，确保总和等于totalExpense
      const basePercentage = 100 / members.length;
      let percentage = basePercentage;

      // 为了让数据更有变化，根据索引调整百分比
      if (index === 0) {
        percentage = basePercentage * 1.5;
      } else if (index === members.length - 1) {
        percentage = basePercentage * 0.5;
      }

      const amount = Math.round((totalExpense * percentage) / 100);

      return {
        memberId: member.id,
        userId: member.userId,
        username: member.name,
        avatar: null, // 实际应用中应该从用户表获取
        role: member.role,
        joinedAt: member.createdAt,
        isCurrentUser: member.userId === userId,
        statistics: {
          totalExpense: amount,
          percentage: Math.round(percentage),
          transactionCount: Math.round(amount / 100) // 假设平均每笔交易100元
        }
      };
    });

    // 计算用户权限
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);

    return {
      members: memberStatistics,
      totalExpense,
      period,
      userPermissions: {
        canInvite: isAdmin,
        canRemove: isAdmin,
        canChangeRoles: isAdmin
      }
    };
  }
}
