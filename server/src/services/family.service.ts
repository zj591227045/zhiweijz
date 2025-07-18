// 定义角色枚举
enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { FamilyRepository, FamilyWithMembers } from '../repositories/family.repository';
import { UserRepository } from '../repositories/user.repository';
import { AccountBookService } from './account-book.service';
import { FamilyBudgetService } from './family-budget.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
import {
  AcceptInvitationDto,
  CreateFamilyDto,
  CreateFamilyMemberDto,
  CreateCustodialMemberDto,
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
      const accountBook = await this.createDefaultFamilyAccountBook(userId, family.id, family.name);

      // 为家庭创建者创建个人预算
      try {
        if (accountBook) {
          await this.familyBudgetService.createDefaultBudgetsForNewMember(
            userId,
            family.id,
            accountBook.id,
          );
        }
      } catch (budgetError) {
        console.error(`为家庭创建者 ${userId} 创建默认预算失败:`, budgetError);
        // 不影响家庭创建流程，继续执行
      }
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
      },
      userId,
    );
  }

  /**
   * 为家庭创建默认账本
   * @private
   * @returns 创建的账本
   */
  private async createDefaultFamilyAccountBook(
    userId: string,
    familyId: string,
    familyName: string,
  ): Promise<any> {
    const accountBook = await this.accountBookService.createFamilyAccountBook(userId, familyId, {
      name: `${familyName}家庭账本`,
      description: '系统自动创建的家庭账本',
      isDefault: true,
    });
    console.log(`已为家庭 ${familyId} 创建默认账本: ${accountBook.id}`);
    return accountBook;
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
          creator
            ? {
                id: creator.id,
                name: creator.name,
                email: creator.email,
              }
            : undefined,
        ),
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
      creator
        ? {
            id: creator.id,
            name: creator.name,
            email: creator.email,
          }
        : undefined,
      userId,
    );
  }

  /**
   * 更新家庭
   */
  async updateFamily(
    id: string,
    userId: string,
    familyData: UpdateFamilyDto,
  ): Promise<FamilyResponseDto> {
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
      creator
        ? {
            id: creator.id,
            name: creator.name,
            email: creator.email,
          }
        : undefined,
      userId,
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

    // 获取家庭关联的所有账本
    try {
      const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(userId, id, {
        limit: 100,
      });

      // 删除每个家庭账本
      if (familyAccountBooks && familyAccountBooks.data && familyAccountBooks.data.length > 0) {
        for (const accountBook of familyAccountBooks.data) {
          try {
            await this.accountBookService.deleteAccountBook(accountBook.id, userId);
            console.log(`已删除家庭账本: ${accountBook.id}`);
          } catch (error) {
            console.error(`删除家庭账本 ${accountBook.id} 失败:`, error);
            // 继续删除其他账本
          }
        }
      }
    } catch (error) {
      console.error(`获取或删除家庭 ${id} 的账本失败:`, error);
      // 继续删除家庭
    }

    // 删除家庭
    await this.familyRepository.deleteFamily(id);
  }

  /**
   * 添加家庭成员
   */
  async addFamilyMember(
    familyId: string,
    userId: string,
    memberData: CreateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
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
      const existingMember = await this.familyRepository.findFamilyMemberByUserAndFamily(
        memberData.userId,
        familyId,
      );
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
      isRegistered:
        memberData.isRegistered !== undefined ? memberData.isRegistered : !!memberData.userId,
    });

    // 如果是已注册用户，为其创建默认预算
    if (member.userId && member.isRegistered) {
      try {
        // 获取家庭账本
        const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(
          userId,
          familyId,
          { limit: 100 },
        );
        if (familyAccountBooks && familyAccountBooks.data && familyAccountBooks.data.length > 0) {
          // 为每个家庭账本创建默认预算
          for (const accountBook of familyAccountBooks.data) {
            await this.familyBudgetService.createDefaultBudgetsForNewMember(
              member.userId,
              familyId,
              accountBook.id,
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
  async updateFamilyMember(
    familyId: string,
    memberId: string,
    userId: string,
    memberData: UpdateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
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
    const userMember = await this.familyRepository.findFamilyMemberByUserAndFamily(
      userId,
      familyId,
    );
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
  async createInvitation(
    familyId: string,
    userId: string,
    invitationData: CreateInvitationDto,
    baseUrl: string,
  ): Promise<InvitationResponseDto> {
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

    // 生成8位数字邀请码
    const invitationCode = Math.floor(10000000 + Math.random() * 90000000).toString();

    // 设置邀请过期时间（默认8小时）
    const expiresInHours = 8;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);

    // 创建邀请
    const invitation = await this.familyRepository.createInvitation(
      familyId,
      invitationCode,
      expiresAt,
    );

    return toInvitationResponseDto(invitation, baseUrl);
  }

  /**
   * 获取家庭邀请列表
   */
  async getFamilyInvitations(
    familyId: string,
    userId: string,
    baseUrl: string,
  ): Promise<InvitationResponseDto[]> {
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

    // 获取邀请列表
    const invitations = await this.familyRepository.findFamilyInvitations(familyId);

    // 转换为响应DTO
    return invitations.map((invitation) => toInvitationResponseDto(invitation, baseUrl));
  }

  /**
   * 接受邀请
   */
  async acceptInvitation(
    userId: string,
    invitationData: AcceptInvitationDto,
  ): Promise<FamilyMemberResponseDto> {
    // 获取邀请
    const invitation = await this.familyRepository.findInvitationByCode(
      invitationData.invitationCode,
    );
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
    const existingMember = await this.familyRepository.findFamilyMemberByUserAndFamily(
      userId,
      invitation.familyId,
    );
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

    // 为新成员创建默认预算
    try {
      // 获取家庭账本
      const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(
        userId,
        invitation.familyId,
        { limit: 100 },
      );
      if (familyAccountBooks && familyAccountBooks.data && familyAccountBooks.data.length > 0) {
        // 为每个家庭账本创建默认预算
        for (const accountBook of familyAccountBooks.data) {
          await this.familyBudgetService.createDefaultBudgetsForNewMember(
            userId,
            invitation.familyId,
            accountBook.id,
          );
        }
      }
    } catch (error) {
      console.error(`为通过邀请加入的家庭成员 ${userId} 创建默认预算失败:`, error);
      // 不影响成员添加流程，继续执行
    }

    // 标记邀请为已使用
    await this.familyRepository.markInvitationAsUsed(invitation.id, userId, user.name);

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

    return members.map((member) => toFamilyMemberResponseDto(member, userId));
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

    // 计算时间范围
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(endDate.getFullYear(), 0, 1);
        break;
      case 'all':
      default:
        startDate = new Date(2020, 0, 1); // 从2020年开始
        break;
    }

    try {
      // 获取家庭的所有账本
      const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(
        userId,
        familyId,
        { limit: 100 },
      );

      if (!familyAccountBooks || !familyAccountBooks.data || familyAccountBooks.data.length === 0) {
        // 如果没有家庭账本，返回空数据
        return {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          memberStats: [],
          categoryStats: [],
        };
      }

      // 获取所有家庭账本的ID
      const accountBookIds = familyAccountBooks.data.map((book) => book.id);

      // 获取家庭账本的收入记账
      const incomeTransactions = await prisma.transaction.findMany({
        where: {
          accountBookId: { in: accountBookIds },
          type: 'INCOME',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
          user: true,
          familyMember: true,
        },
      });

      // 获取家庭账本的支出记账
      const expenseTransactions = await prisma.transaction.findMany({
        where: {
          accountBookId: { in: accountBookIds },
          type: 'EXPENSE',
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          category: true,
          user: true,
          familyMember: true,
        },
      });

      // 计算总收入和总支出
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
      const balance = totalIncome - totalExpense;

      // 计算成员消费统计
      const memberStats = new Map<string, { name: string; totalExpense: number }>();

      expenseTransactions.forEach((transaction) => {
        let member: any;
        let memberKey: string;
        let memberName: string;

        if (transaction.familyMemberId) {
          // 有家庭成员ID的记账
          member = members.find((m) => m.id === transaction.familyMemberId);
          if (member) {
            memberKey = member.id; // 使用家庭成员ID作为统一标识
            memberName = member.name || '未知家庭成员';
          } else {
            return; // 跳过找不到的成员
          }
        } else if (transaction.userId) {
          // 普通成员的记账（通过userId查找）
          member = members.find((m) => m.userId === transaction.userId);
          if (member) {
            memberKey = member.id; // 使用家庭成员ID作为统一标识
            memberName = member.name || transaction.user?.name || '未知用户';
          } else {
            return; // 跳过找不到的成员
          }
        } else {
          return; // 跳过无效记账
        }

        const current = memberStats.get(memberKey) || { name: memberName, totalExpense: 0 };
        current.totalExpense += Number(transaction.amount);
        memberStats.set(memberKey, current);
      });

      // 转换为数组并计算百分比，按百分比降序排列
      const memberStatsArray = Array.from(memberStats.entries())
        .map(([memberId, stats]) => ({
          memberId,
          memberName: stats.name,
          totalExpense: stats.totalExpense,
          percentage: totalExpense > 0 ? Math.round((stats.totalExpense / totalExpense) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      // 计算分类消费统计
      const categoryStats = new Map<string, { name: string; icon: string; totalExpense: number }>();

      expenseTransactions.forEach((transaction) => {
        const categoryId = transaction.categoryId;
        const categoryName = transaction.category?.name || '其他';
        const categoryIcon = transaction.category?.icon || 'tag';

        const current = categoryStats.get(categoryId) || {
          name: categoryName,
          icon: categoryIcon,
          totalExpense: 0,
        };
        current.totalExpense += Number(transaction.amount);
        categoryStats.set(categoryId, current);
      });

      // 转换为数组并计算百分比，按百分比降序排列
      const categoryStatsArray = Array.from(categoryStats.entries())
        .map(([categoryId, stats]) => ({
          categoryId,
          categoryName: stats.name,
          categoryIcon: stats.icon,
          totalExpense: stats.totalExpense,
          percentage: totalExpense > 0 ? Math.round((stats.totalExpense / totalExpense) * 100) : 0,
        }))
        .sort((a, b) => b.percentage - a.percentage);

      return {
        totalIncome,
        totalExpense,
        balance,
        memberStats: memberStatsArray,
        categoryStats: categoryStatsArray,
      };
    } catch (error) {
      console.error('获取家庭统计数据失败:', error);

      // 如果查询失败，返回空数据而不是模拟数据
      return {
        totalIncome: 0,
        totalExpense: 0,
        balance: 0,
        memberStats: [],
        categoryStats: [],
      };
    }
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

    // 计算时间范围
    let startDate: Date;
    let endDate: Date = new Date();

    switch (period) {
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
        endDate = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
        break;
      case 'all':
      default:
        startDate = new Date(2020, 0, 1); // 从2020年开始
        break;
    }

    // 获取家庭的所有账本
    const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(
      userId,
      familyId,
      { limit: 100 },
    );

    if (!familyAccountBooks || !familyAccountBooks.data || familyAccountBooks.data.length === 0) {
      // 如果没有家庭账本，返回空统计数据
      const emptyMemberStatistics = await Promise.all(
        members.map(async (member) => {
          // 手动查询用户信息
          let userInfo = null;
          if (member.userId) {
            try {
              userInfo = await prisma.user.findUnique({
                where: { id: member.userId },
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  isCustodial: true,
                },
              });
            } catch (error) {
              console.error(`查询用户 ${member.userId} 信息失败:`, error);
            }
          }

          return {
            memberId: member.id,
            userId: member.userId,
            username: member.name || '未知用户',
            avatar: userInfo?.avatar || null,
            role: member.role,
            joinedAt: member.createdAt,
            isCurrentUser: member.userId === userId,
            isCustodial: userInfo?.isCustodial || false,
            user: userInfo ? {
              id: userInfo.id,
              name: userInfo.name,
              email: userInfo.email,
              avatar: userInfo.avatar || undefined,
              isCustodial: userInfo.isCustodial,
            } : undefined,
            statistics: {
              totalExpense: 0,
              percentage: 0,
              transactionCount: 0,
            },
          };
        })
      );

      const isAdmin = await this.isUserFamilyAdmin(userId, familyId);

      return {
        members: emptyMemberStatistics,
        totalExpense: 0,
        period,
        userPermissions: {
          canInvite: isAdmin,
          canRemove: isAdmin,
          canChangeRoles: isAdmin,
        },
      };
    }

    // 获取所有家庭账本的ID
    const accountBookIds = familyAccountBooks.data.map((book) => book.id);

    // 获取真实的记账统计数据
    const memberStatistics = await Promise.all(
      members.map(async (member) => {
        let memberExpense = 0;
        let transactionCount = 0;

        try {
          // 统一使用familyMemberId查询所有成员的记账记录
          // 无论是托管成员还是普通成员，都通过familyMemberId进行归属
          const whereCondition = {
            accountBookId: { in: accountBookIds },
            type: 'EXPENSE' as const,
            date: {
              gte: startDate,
              lte: endDate,
            },
            familyMemberId: member.id, // 统一使用familyMemberId查询
          };

          const transactions = await prisma.transaction.findMany({
            where: whereCondition,
          });

          memberExpense = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
          transactionCount = transactions.length;
        } catch (error) {
          console.error(`获取成员 ${member.id} 的记账数据失败:`, error);
          // 如果查询失败，使用默认值
          memberExpense = 0;
          transactionCount = 0;
        }

        // 查询用户完整信息
        let userInfo = null;
        let isCustodial = false;
        if (member.userId) {
          try {
            userInfo = await prisma.user.findUnique({
              where: { id: member.userId },
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                isCustodial: true,
              },
            });
            isCustodial = userInfo?.isCustodial || false;
          } catch (error) {
            console.error(`查询用户 ${member.userId} 信息失败:`, error);
            isCustodial = false;
          }
        }

        return {
          memberId: member.id,
          userId: member.userId,
          username: member.name || '未知用户',
          avatar: userInfo?.avatar || null,
          role: member.role,
          joinedAt: member.createdAt,
          isCurrentUser: member.userId === userId,
          isCustodial: isCustodial,
          user: userInfo ? {
            id: userInfo.id,
            name: userInfo.name,
            email: userInfo.email,
            avatar: userInfo.avatar || undefined,
            isCustodial: userInfo.isCustodial,
          } : undefined,
          statistics: {
            totalExpense: memberExpense,
            percentage: 0, // 稍后计算
            transactionCount: transactionCount,
          },
        };
      }),
    );

    // 计算总支出
    const totalExpense = memberStatistics.reduce(
      (sum, member) => sum + member.statistics.totalExpense,
      0,
    );

    // 计算每个成员的消费占比
    const updatedMemberStatistics = memberStatistics.map((member) => ({
      ...member,
      statistics: {
        ...member.statistics,
        percentage:
          totalExpense > 0 ? Math.round((member.statistics.totalExpense / totalExpense) * 100) : 0,
      },
    }));

    // 计算用户权限
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);

    return {
      members: updatedMemberStatistics,
      totalExpense,
      period,
      userPermissions: {
        canInvite: isAdmin,
        canRemove: isAdmin,
        canChangeRoles: isAdmin,
      },
    };
  }

  /**
   * 添加托管成员（现在创建为托管用户）
   */
  async addCustodialMember(
    familyId: string,
    userId: string,
    memberData: CreateCustodialMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    // 获取家庭详情
    const family = await this.familyRepository.findFamilyById(familyId);
    if (!family) {
      throw new Error('家庭不存在');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权添加托管成员');
    }

    // 创建托管用户
    const custodialUser = await prisma.user.create({
      data: {
        email: `custodial_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}@internal.zhiweijz.local`,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 10), // 随机密码，无法登录
        name: memberData.name,
        isCustodial: true,
        birthDate: memberData.birthDate,
      },
    });

    // 创建家庭成员记录，关联到托管用户
    const member = await this.familyRepository.createFamilyMember({
      familyId,
      userId: custodialUser.id, // 关联到托管用户
      name: memberData.name,
      gender: memberData.gender,
      birthDate: memberData.birthDate,
      role: memberData.role || Role.MEMBER,
      isRegistered: false,
      isCustodial: false, // 现在通过user.isCustodial来标识
    });

    // 为托管用户创建默认预算
    try {
      // 获取家庭账本
      const familyAccountBooks = await this.accountBookService.getFamilyAccountBooks(
        userId,
        familyId,
        { limit: 100 },
      );
      if (familyAccountBooks && familyAccountBooks.data && familyAccountBooks.data.length > 0) {
        // 为每个家庭账本创建默认预算
        for (const accountBook of familyAccountBooks.data) {
          await this.familyBudgetService.createDefaultBudgetsForNewMember(
            custodialUser.id, // 使用托管用户ID作为预算的所有者
            familyId,
            accountBook.id,
            undefined, // 不再使用familyMemberId
          );
        }
      }
    } catch (error) {
      console.error(`为托管用户 ${custodialUser.id} 创建默认预算失败:`, error);
      // 不影响成员添加流程，继续执行
    }

    return toFamilyMemberResponseDto(member, userId);
  }

  /**
   * 更新托管成员（新架构：检查用户的isCustodial字段）
   */
  async updateCustodialMember(
    familyId: string,
    memberId: string,
    userId: string,
    memberData: UpdateFamilyMemberDto,
  ): Promise<FamilyMemberResponseDto> {
    // 获取家庭成员
    const member = await this.familyRepository.findFamilyMemberById(memberId);
    if (!member || member.familyId !== familyId) {
      throw new Error('托管成员不存在');
    }

    // 获取关联的用户，验证是否为托管用户
    if (!member.userId) {
      throw new Error('家庭成员没有关联用户');
    }

    const user = await prisma.user.findUnique({
      where: { id: member.userId },
    });

    if (!user || !user.isCustodial) {
      throw new Error('该成员不是托管成员');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权更新托管成员');
    }

    // 更新托管用户信息
    if (memberData.name || memberData.birthDate) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...(memberData.name && { name: memberData.name }),
          ...(memberData.birthDate && { birthDate: memberData.birthDate }),
        },
      });
    }

    // 更新家庭成员记录
    const updatedMember = await this.familyRepository.updateFamilyMember(memberId, memberData);

    return toFamilyMemberResponseDto(updatedMember);
  }

  /**
   * 删除托管成员（新架构：检查用户的isCustodial字段）
   */
  async deleteCustodialMember(familyId: string, memberId: string, userId: string): Promise<void> {
    // 获取家庭成员
    const member = await this.familyRepository.findFamilyMemberById(memberId);
    if (!member || member.familyId !== familyId) {
      throw new Error('托管成员不存在');
    }

    // 获取关联的用户，验证是否为托管用户
    if (!member.userId) {
      throw new Error('家庭成员没有关联用户');
    }

    const user = await prisma.user.findUnique({
      where: { id: member.userId },
    });

    if (!user || !user.isCustodial) {
      throw new Error('该成员不是托管成员');
    }

    // 验证用户是否为家庭管理员
    const isAdmin = await this.isUserFamilyAdmin(userId, familyId);
    if (!isAdmin) {
      throw new Error('无权删除托管成员');
    }

    // 删除托管用户的预算（使用用户ID）
    try {
      await this.familyBudgetService.deleteMemberBudgets(user.id, familyId, member.id);
    } catch (error) {
      console.error(`删除托管用户 ${user.id} 的预算失败:`, error);
      // 不影响成员删除流程，继续执行
    }

    // 删除托管用户的记账记录
    try {
      // 这里应该调用记账服务删除与该托管用户相关的记账记录
      console.log(`需要删除托管用户 ${user.id} 的记账记录`);
    } catch (error) {
      console.error(`删除托管用户 ${user.id} 的记账记录失败:`, error);
      // 不影响成员删除流程，继续执行
    }

    // 删除家庭成员记录
    await this.familyRepository.deleteFamilyMember(memberId);

    // 删除托管用户（如果该用户不属于其他家庭）
    try {
      const otherFamilyMembers = await prisma.familyMember.findMany({
        where: {
          userId: user.id,
          familyId: { not: familyId },
        },
      });

      if (otherFamilyMembers.length === 0) {
        // 该托管用户不属于其他家庭，可以安全删除
        await prisma.user.delete({
          where: { id: user.id },
        });
        console.log(`已删除托管用户 ${user.id}`);
      } else {
        console.log(`托管用户 ${user.id} 属于其他家庭，保留用户记录`);
      }
    } catch (error) {
      console.error(`删除托管用户 ${user.id} 失败:`, error);
      // 不影响成员删除流程，继续执行
    }
  }

  /**
   * 获取托管成员列表（新架构：查询托管用户）
   */
  async getCustodialMembers(familyId: string, userId: string): Promise<FamilyMemberResponseDto[]> {
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

    // 查询该家庭下的托管用户
    const custodialUsers = await prisma.user.findMany({
      where: {
        isCustodial: true,
        familyMembers: {
          some: {
            familyId: familyId,
          },
        },
      },
      include: {
        familyMembers: {
          where: {
            familyId: familyId,
          },
        },
      },
    });

    // 转换为 FamilyMemberResponseDto 格式
    return custodialUsers.map((user) => {
      const familyMember = user.familyMembers[0]; // 该用户在此家庭中的成员记录
      return {
        id: familyMember?.id || user.id,
        familyId: familyId,
        userId: user.id,
        name: user.name,
        gender: familyMember?.gender || undefined,
        birthDate: user.birthDate || familyMember?.birthDate || undefined,
        role: familyMember?.role || 'MEMBER',
        isRegistered: false, // 托管用户不允许登录
        isCustodial: true,
        createdAt: familyMember?.createdAt || user.createdAt,
        updatedAt: familyMember?.updatedAt || user.updatedAt,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || undefined,
          isCustodial: user.isCustodial ?? false,
        },
      };
    });
  }
}
