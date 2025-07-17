import { BudgetRepository } from '../repositories/budget.repository';
import { FamilyRepository } from '../repositories/family.repository';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from '../models/budget.model';
import { BudgetPeriod, FamilyMember } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 家庭预算服务
 * 处理家庭成员预算的创建、删除等操作
 */
export class FamilyBudgetService {
  private budgetRepository: BudgetRepository;
  private familyRepository: FamilyRepository;
  private budgetService: BudgetService;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.familyRepository = new FamilyRepository();
    this.budgetService = new BudgetService();
  }

  /**
   * 为新加入的家庭成员创建默认预算
   * @param userId 用户ID
   * @param familyId 家庭ID
   * @param accountBookId 账本ID
   * @param memberId 可选的成员ID，用于托管成员（已废弃，现在统一通过userId查找）
   */
  async createDefaultBudgetsForNewMember(
    userId: string,
    familyId: string,
    accountBookId: string,
    memberId?: string,
  ): Promise<void> {
    try {
      console.log(
        `为新家庭成员创建默认预算，用户ID: ${userId}, 家庭ID: ${familyId}, 账本ID: ${accountBookId}`,
      );

      // 查找用户在家庭中的成员记录
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          familyId: familyId,
          userId: userId,
        },
      });

      if (!familyMember) {
        throw new Error(`用户 ${userId} 不是家庭 ${familyId} 的成员`);
      }

      // 获取当前月份的起止日期
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // 创建月度预算数据
      const budgetData: CreateBudgetDto = {
        name: '个人预算',
        amount: 0, // 默认为0，表示不限制
        period: 'MONTHLY' as BudgetPeriod,
        startDate,
        endDate,
        rollover: false,
        familyId,
        accountBookId,
        enableCategoryBudget: false,
        isAutoCalculated: false,
        budgetType: 'PERSONAL', // 确保创建的是个人预算
        familyMemberId: familyMember.id, // 统一设置家庭成员ID
      };

      // 创建预算（使用 budgetService 以确保重复检查）
      await this.budgetService.createBudget(userId, budgetData);
      console.log(`成功为用户 ${userId} 创建默认预算，家庭成员ID: ${familyMember.id}`);
    } catch (error) {
      console.error('为新家庭成员创建默认预算失败:', error);
      throw new Error('为新家庭成员创建默认预算失败');
    }
  }

  /**
   * 删除家庭成员的所有预算
   * @param userId 操作者用户ID
   * @param familyId 家庭ID
   * @param memberId 可选的成员ID，用于托管成员
   */
  async deleteMemberBudgets(userId: string, familyId: string, memberId?: string): Promise<void> {
    try {
      if (memberId) {
        console.log(`删除托管成员 ${memberId} 在家庭 ${familyId} 中的所有预算`);

        // 查找该托管成员在该家庭中的所有预算
        const budgets = await this.budgetRepository.findByFamilyMemberAndFamily(memberId, familyId);

        // 删除每个预算
        for (const budget of budgets) {
          await this.budgetRepository.delete(budget.id);
        }

        console.log(`已删除托管成员 ${memberId} 的 ${budgets.length} 个预算`);
      } else {
        console.log(`删除家庭成员 ${userId} 在家庭 ${familyId} 中的所有预算`);

        // 查找该成员在该家庭中的所有预算
        const budgets = await this.budgetRepository.findByUserAndFamily(userId, familyId);

        // 删除每个预算
        for (const budget of budgets) {
          await this.budgetRepository.delete(budget.id);
        }

        console.log(`已删除家庭成员 ${userId} 的 ${budgets.length} 个预算`);
      }
    } catch (error) {
      console.error('删除家庭成员预算失败:', error);
      throw new Error('删除家庭成员预算失败');
    }
  }

  /**
   * 获取家庭预算汇总
   * @param budgetId 预算ID
   * @param familyId 家庭ID
   */
  async getFamilyBudgetSummary(budgetId: string, familyId: string): Promise<any[]> {
    try {
      console.log(`获取家庭预算汇总，预算ID: ${budgetId}, 家庭ID: ${familyId}`);

      // 获取家庭成员列表
      const members = await this.familyRepository.findFamilyMembers(familyId);

      // 获取预算详情
      const budget = await this.budgetRepository.findById(budgetId);
      if (!budget) {
        throw new Error('预算不存在');
      }

      // 获取每个成员的支出情况
      const memberSummaries = await Promise.all(
        members.map(async (member: FamilyMember) => {
          // 如果是托管成员
          if (member.isCustodial) {
            // 计算该托管成员在该预算期间的支出
            const spent = await this.budgetRepository.calculateMemberSpentAmount(
              budgetId,
              member.id, // 使用成员ID
              budget.startDate,
              budget.endDate,
              true, // 标记为托管成员
            );

            // 计算占总预算的百分比
            const percentage =
              Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;

            return {
              memberId: member.id,
              memberName: member.name,
              spent,
              percentage,
              isCustodial: true,
            };
          }
          // 如果是普通成员但没有userId
          else if (!member.userId) {
            return {
              memberId: member.id,
              memberName: member.name,
              spent: 0,
              percentage: 0,
              isCustodial: false,
            };
          }
          // 普通成员
          else {
            // 计算该成员在该预算期间的支出
            const spent = await this.budgetRepository.calculateMemberSpentAmount(
              budgetId,
              member.userId,
              budget.startDate,
              budget.endDate,
              false, // 标记为非托管成员
            );

            // 计算占总预算的百分比
            const percentage =
              Number(budget.amount) > 0 ? (spent / Number(budget.amount)) * 100 : 0;

            return {
              memberId: member.userId,
              memberName: member.name,
              spent,
              percentage,
              isCustodial: false,
            };
          }
        }),
      );

      return memberSummaries;
    } catch (error) {
      console.error('获取家庭预算汇总失败:', error);
      throw new Error('获取家庭预算汇总失败');
    }
  }
}
