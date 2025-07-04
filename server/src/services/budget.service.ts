import { BudgetPeriod, BudgetType, Budget, Category, RolloverType, PrismaClient, Transaction } from '@prisma/client';
import { BudgetRepository, BudgetWithCategory } from '../repositories/budget.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import { BudgetDateUtils } from '../utils/budget-date-utils';

// 创建Prisma客户端实例
const prisma = new PrismaClient();
import {
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetResponseDto,
  BudgetPaginatedResponseDto,
  BudgetQueryParams,
  toBudgetResponseDto
} from '../models/budget.model';
import { toCategoryResponseDto } from '../models/category.model';
import { toCategoryBudgetResponseDto, CategoryBudgetResponseDto } from '../models/category-budget.model';

export class BudgetService {
  private budgetRepository: BudgetRepository;
  private categoryRepository: CategoryRepository;
  private categoryBudgetRepository: CategoryBudgetRepository;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.categoryRepository = new CategoryRepository();
    this.categoryBudgetRepository = new CategoryBudgetRepository();
  }

  /**
   * 创建预算
   */
  async createBudget(userId: string, budgetData: CreateBudgetDto): Promise<BudgetResponseDto> {
    // 验证分类是否存在
    if (budgetData.categoryId) {
      const category = await this.categoryRepository.findById(budgetData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    // 如果启用分类预算且总预算金额为0，标记为自动计算
    if (budgetData.enableCategoryBudget && budgetData.amount === 0) {
      budgetData.isAutoCalculated = true;
    }

    // 如果指定了账本ID但没有设置家庭相关字段，自动设置
    if (budgetData.accountBookId && !budgetData.familyId) {
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: budgetData.accountBookId },
        select: { type: true, familyId: true }
      });

      if (accountBook && accountBook.type === 'FAMILY' && accountBook.familyId) {
        budgetData.familyId = accountBook.familyId;

        // 如果没有设置familyMemberId，查找用户在家庭中的成员记录
        if (!budgetData.familyMemberId) {
          const familyMember = await prisma.familyMember.findFirst({
            where: {
              familyId: accountBook.familyId,
              userId: userId
            }
          });

          if (familyMember) {
            budgetData.familyMemberId = familyMember.id;
          }
        }
      }
    }

    // 创建预算
    const budget = await this.budgetRepository.create(userId, budgetData);

    return toBudgetResponseDto(
      budget,
      budget.category ? toCategoryResponseDto(budget.category) : undefined
    );
  }

  /**
   * 获取预算列表
   */
  async getBudgets(userId: string, params: BudgetQueryParams): Promise<BudgetPaginatedResponseDto> {
    console.log('BudgetService.getBudgets 参数:', {
      userId,
      params
    });

    // 如果查询个人预算且指定了账本ID，先尝试自动创建缺失的预算
    if (params.budgetType === 'PERSONAL' && params.accountBookId) {
      const currentDate = new Date();
      const currentMonthBudgets = await this.budgetRepository.findByPeriodAndDate(
        userId,
        BudgetPeriod.MONTHLY,
        new Date(currentDate.getFullYear(), currentDate.getMonth(), 1),
        new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0),
        undefined,
        params.accountBookId,
        true // 排除托管成员预算
      );

      if (currentMonthBudgets.length === 0) {
        console.log(`用户 ${userId} 在账本 ${params.accountBookId} 中没有当前月份的个人预算，尝试自动创建`);
        await this.autoCreateMissingBudgets(userId, params.accountBookId);
      }
    }

    // 简化实现：只根据账本ID和预算类型过滤
    const { budgets, total } = await this.budgetRepository.findAll(userId, params);

    console.log('BudgetService.getBudgets 查询结果:', {
      total,
      budgetsCount: budgets.length
    });

    // 获取每个预算的已使用金额
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);

        // 创建预算响应DTO
        const budgetDto = toBudgetResponseDto(
          budget,
          budget.category ? toCategoryResponseDto(budget.category) : undefined,
          spent
        );

        // 添加用户名称信息
        if (budget.user) {
          budgetDto.userName = budget.user.name;
        }

        // 添加账本信息
        if (budget.accountBook) {
          budgetDto.accountBookName = budget.accountBook.name;
          budgetDto.accountBookType = budget.accountBook.type;
        }

        // 处理成员信息 - 按照指定逻辑获取预算名称
        try {
          // 1. 判断预算是否有family_member_id
          if (budgetDto.familyMemberId) {
            // 如果有family_member_id，按照托管用户的方式处理
            if ((budget as any).familyMember) {
              // 如果已经关联查询了familyMember，直接使用
              budgetDto.familyMemberName = (budget as any).familyMember.name;
            } else {
              // 否则查询托管成员信息
              const familyMember = await prisma.familyMember.findUnique({
                where: { id: budgetDto.familyMemberId }
              });

              if (familyMember) {
                budgetDto.familyMemberName = familyMember.name;
              }
            }
          }
          // 2. 如果family_member_id为空，则根据user_id查询用户名称
          else if (budgetDto.userId) {
            // 从users表中查询用户名称
            if (budget.user) {
              // 如果已经关联查询了user，直接使用
              budgetDto.familyMemberName = budget.user.name;
            } else {
              // 否则查询用户信息
              const user = await prisma.user.findUnique({
                where: { id: budgetDto.userId },
                select: { name: true }
              });

              if (user) {
                budgetDto.familyMemberName = user.name;
              }
            }
          }
        } catch (error) {
          console.error(`获取预算用户名称失败: ${error}`);
        }

        return budgetDto;
      })
    );

    return {
      total,
      page: params.page || 1,
      limit: params.limit || 20,
      data: budgetsWithSpent,
    };
  }

  /**
   * 获取单个预算
   */
  async getBudgetById(id: string, userId: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findById(id);

    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限 - 允许家庭成员查看家庭账本的所有预算
    const hasAccess = await this.checkBudgetAccess(userId, budget);
    if (!hasAccess) {
      throw new Error('无权访问此预算');
    }

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(id);

    // 获取分类预算
    let categoryBudgets: CategoryBudgetResponseDto[] = [];
    if (budget.enableCategoryBudget && budget.categoryBudgets) {
      categoryBudgets = budget.categoryBudgets.map(cb =>
        toCategoryBudgetResponseDto(
          cb,
          cb.category ? toCategoryResponseDto(cb.category) : undefined
        )
      );
    }

    const result = toBudgetResponseDto(
      budget,
      budget.category ? toCategoryResponseDto(budget.category) : undefined,
      spent
    );

    // 添加分类预算到响应
    result.categoryBudgets = categoryBudgets;

    return result;
  }

  /**
   * 更新预算
   */
  async updateBudget(id: string, userId: string, budgetData: UpdateBudgetDto): Promise<BudgetResponseDto> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(id);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限 - 允许家庭成员修改家庭账本的预算
    const hasAccess = await this.checkBudgetAccess(userId, budget);
    if (!hasAccess) {
      throw new Error('无权修改此预算');
    }

    // 如果更新了分类，验证分类是否存在
    if (budgetData.categoryId) {
      const category = await this.categoryRepository.findById(budgetData.categoryId);
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    // 检查预算金额修改限制
    if (budgetData.amount !== undefined && Number(budget.amount) !== budgetData.amount) {
      // 只对个人月度预算应用修改限制
      if (budget.period === BudgetPeriod.MONTHLY && (budget as any).budgetType === BudgetType.PERSONAL) {
        // 检查是否已经修改过预算金额
        if ((budget as any).amountModified) {
          throw new Error('每个预算周期内只能修改一次预算金额');
        }

        // 标记预算金额已被修改
        budgetData.amountModified = true;
        budgetData.lastAmountModifiedAt = new Date();

        console.log(`预算金额已修改: ${Number(budget.amount)} -> ${budgetData.amount}`);
      }
    }

    // 处理分类预算启用状态变更
    if (budgetData.enableCategoryBudget !== undefined &&
        budgetData.enableCategoryBudget !== budget.enableCategoryBudget) {

      // 如果启用分类预算且总预算金额为0，标记为自动计算
      if (budgetData.enableCategoryBudget && Number(budget.amount) === 0) {
        budgetData.isAutoCalculated = true;
      }

      // 如果禁用分类预算，删除所有分类预算
      if (!budgetData.enableCategoryBudget) {
        await this.categoryBudgetRepository.deleteByBudgetId(id);
      }
    }

    // 更新预算
    const updatedBudget = await this.budgetRepository.update(id, budgetData);

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(id);

    // 获取分类预算
    let categoryBudgets: CategoryBudgetResponseDto[] = [];
    if (updatedBudget.enableCategoryBudget && updatedBudget.categoryBudgets) {
      categoryBudgets = updatedBudget.categoryBudgets.map(cb =>
        toCategoryBudgetResponseDto(
          cb,
          cb.category ? toCategoryResponseDto(cb.category) : undefined
        )
      );
    }

    const result = toBudgetResponseDto(
      updatedBudget,
      updatedBudget.category ? toCategoryResponseDto(updatedBudget.category) : undefined,
      spent
    );

    // 添加分类预算到响应
    result.categoryBudgets = categoryBudgets;

    return result;
  }

  /**
   * 删除预算
   */
  async deleteBudget(id: string, userId: string): Promise<void> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(id);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限 - 允许家庭成员删除家庭账本的预算
    const hasAccess = await this.checkBudgetAccess(userId, budget);
    if (!hasAccess) {
      throw new Error('无权删除此预算');
    }

    // 删除预算
    await this.budgetRepository.delete(id);
  }

  /**
   * 根据日期获取预算列表
   * @param userId 用户ID
   * @param date 交易日期 (YYYY-MM-DD)
   * @param accountBookId 账本ID
   * @returns 该日期范围内的预算列表
   */
  async getBudgetsByDate(userId: string, date: string, accountBookId: string): Promise<BudgetResponseDto[]> {
    try {
      console.log('BudgetService.getBudgetsByDate 参数:', {
        userId,
        date,
        accountBookId
      });

      // 首先验证用户是否有权限访问该账本
      const hasAccess = await this.checkAccountBookAccess(userId, accountBookId);
      if (!hasAccess) {
        throw new Error('无权访问该账本');
      }

      const transactionDate = new Date(date);
      
      // 查询该日期所在预算周期内该账本下的所有预算
      // 不再按用户过滤，而是按账本过滤，显示账本下所有成员的预算（包括个人、家庭成员、托管成员）
      const budgets = await prisma.budget.findMany({
        where: {
          accountBookId,
          startDate: { lte: transactionDate },
          endDate: { gte: transactionDate }
          // 移除 familyMemberId: null 的限制，显示所有成员的预算
        },
        include: {
          category: true,
          accountBook: {
            select: {
              id: true,
              name: true,
              type: true,
              familyId: true
            }
          },
          familyMember: {
            select: {
              id: true,
              name: true,
              gender: true,
              birthDate: true,
              isCustodial: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`找到 ${budgets.length} 个匹配的预算`);

      // 转换为响应DTO并计算spent
      const budgetDtos: BudgetResponseDto[] = [];
      
      for (const budget of budgets) {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);
        const category = budget.category ? toCategoryResponseDto(budget.category) : undefined;
        const budgetDto = toBudgetResponseDto(budget, category, spent);
        
        // 添加额外的计算字段
        budgetDto.spent = spent;
        budgetDto.remaining = budgetDto.amount - spent;
        budgetDto.adjustedRemaining = (budgetDto.amount + (budgetDto.rolloverAmount || 0)) - spent;
        budgetDto.progress = budgetDto.amount > 0 ? (spent / (budgetDto.amount + (budgetDto.rolloverAmount || 0))) * 100 : 0;
        
        // 添加账本信息
        if (budget.accountBook) {
          budgetDto.accountBookType = budget.accountBook.type;
          budgetDto.accountBookName = budget.accountBook.name;
          budgetDto.familyId = budget.accountBook.familyId || undefined;
        }

        // 处理用户名称
        try {
          if (budgetDto.familyMemberId) {
            const familyMember = await prisma.familyMember.findUnique({
              where: { id: budgetDto.familyMemberId },
              select: { name: true }
            });
            if (familyMember) {
              budgetDto.familyMemberName = familyMember.name;
            }
          } else if (budgetDto.userId) {
            const user = await prisma.user.findUnique({
              where: { id: budgetDto.userId },
              select: { name: true }
            });
            if (user) {
              budgetDto.familyMemberName = user.name;
            }
          }
        } catch (error) {
          console.error(`获取预算用户名称失败: ${error}`);
        }
        
        budgetDtos.push(budgetDto);
      }

      return budgetDtos;
    } catch (error) {
      console.error('根据日期获取预算失败:', error);
      throw new Error('根据日期获取预算失败');
    }
  }

  /**
   * 获取当前活跃的预算
   * 包括用户的个人预算和用户所属家庭的预算
   * 可选根据账本ID进行过滤
   * 如果没有找到当前月份的预算，自动创建
   */
  async getActiveBudgets(userId: string, accountBookId?: string): Promise<BudgetResponseDto[]> {
    // 先尝试查询当前月份的预算
    let budgets = await this.budgetRepository.findActiveBudgets(userId, new Date(), accountBookId);

    // 如果没有找到预算，尝试自动创建缺失的月份预算
    if (budgets.length === 0 && accountBookId) {
      console.log(`用户 ${userId} 在账本 ${accountBookId} 中没有找到活跃预算，尝试自动创建`);
      await this.autoCreateMissingBudgets(userId, accountBookId);

      // 重新查询预算
      budgets = await this.budgetRepository.findActiveBudgets(userId, new Date(), accountBookId);
    }

    // 获取每个预算的已使用金额
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpentAmount(budget.id);

        // 确保预算包含账本信息
        let accountBookType = 'PERSONAL';
        let accountBookName = '个人账本';
        let familyId = undefined;

        if (budget.accountBook) {
          accountBookType = budget.accountBook.type;
          accountBookName = budget.accountBook.name;
          familyId = budget.accountBook.familyId || undefined;
        }

        // 转换为响应DTO
        const budgetDto = toBudgetResponseDto(
          budget,
          budget.category ? toCategoryResponseDto(budget.category) : undefined,
          spent
        );

        // 添加账本信息
        budgetDto.accountBookType = accountBookType;
        budgetDto.accountBookName = accountBookName;
        budgetDto.familyId = familyId;

        // 处理成员信息 - 按照指定逻辑获取预算名称
        try {
          // 1. 判断预算是否有family_member_id
          if (budgetDto.familyMemberId) {
            // 如果有family_member_id，按照托管用户的方式处理
            const familyMember = await prisma.familyMember.findUnique({
              where: { id: budgetDto.familyMemberId }
            });

            if (familyMember) {
              budgetDto.familyMemberName = familyMember.name;
            }
          }
          // 2. 如果family_member_id为空，则根据user_id查询用户名称
          else if (budgetDto.userId) {
            // 从users表中查询用户名称
            const user = await prisma.user.findUnique({
              where: { id: budgetDto.userId },
              select: { name: true }
            });

            if (user) {
              budgetDto.familyMemberName = user.name;
            }
          }
        } catch (error) {
          console.error(`获取预算用户名称失败: ${error}`);
        }

        return budgetDto;
      })
    );

    console.log(`处理完成，返回 ${budgetsWithSpent.length} 个预算`);
    return budgetsWithSpent;
  }

  /**
   * 获取预算结转历史（基于预算记录）
   */
  async getBudgetRolloverHistory(budgetId: string, userId: string): Promise<any[]> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限 - 允许家庭成员查看家庭账本的所有预算
    const hasAccess = await this.checkBudgetAccess(userId, budget);
    if (!hasAccess) {
      throw new Error('无权访问此预算');
    }

    console.log(`获取预算结转历史，预算ID: ${budgetId}`);

    // 直接从budget_histories表查询真实的历史记录
    try {
      const histories = await prisma.budgetHistory.findMany({
        where: {
          budgetId: budgetId
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log(`从budget_histories表查询到 ${histories.length} 条记录`);

      // 转换为前端需要的格式
      const rolloverHistory = histories.map(history => ({
        id: history.id,
        budgetId: history.budgetId,
        period: history.period,
        amount: Number(history.amount),
        type: history.type,
        description: history.description,
        createdAt: history.createdAt.toISOString(),
        budgetAmount: history.budgetAmount ? Number(history.budgetAmount) : undefined,
        spentAmount: history.spentAmount ? Number(history.spentAmount) : undefined,
        previousRollover: history.previousRollover ? Number(history.previousRollover) : undefined
      }));

      return rolloverHistory;
    } catch (error) {
      console.error('查询budget_histories表失败:', error);
      return [];
    }
  }



  /**
   * 处理预算结转（简化版本）
   * 在创建新月份预算时，将上月剩余金额设置为新预算的rolloverAmount
   */
  async processBudgetRollover(budgetId: string): Promise<number> {
    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 只处理启用了结转的预算
    if (!budget.rollover) {
      return 0;
    }

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);
    const currentRolloverAmount = Number(budget.rolloverAmount || 0);

    // 计算总可用金额
    const totalAvailable = amount + currentRolloverAmount;

    // 计算剩余金额（这就是要结转到下个月的金额）
    const remaining = totalAvailable - spent;

    const endDate = budget.endDate;
    const period = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`;

    console.log(`处理预算结转 - 预算ID: ${budgetId}, 期间: ${period}`);
    console.log(`基础预算: ${amount}, 上月结转: ${currentRolloverAmount}, 已使用: ${spent}, 结转金额: ${remaining}`);

    return remaining;
  }

  /**
   * 重新计算预算结转（完整版本）
   * 用于在添加/修改历史交易后重新计算预算结转链条
   * @param budgetId 预算ID
   * @param recalculateChain 是否重新计算后续链条（默认true）
   */
  async recalculateBudgetRollover(budgetId: string, recalculateChain: boolean = true): Promise<void> {
    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 只处理启用了结转的预算
    if (!budget.rollover) {
      console.log(`预算 ${budgetId} 未启用结转功能，无需重新计算`);
      return;
    }

    console.log(`开始重新计算预算结转链条 - 起始预算ID: ${budgetId}`);

    if (recalculateChain) {
      // 重新计算整个结转链条
      await this.recalculateBudgetRolloverChain(budgetId);
    } else {
      // 只计算单个预算
      await this.recalculateSingleBudgetRollover(budgetId);
    }

    console.log(`预算结转重新计算完成`);
  }

  /**
   * 重新计算预算结转链条
   * 当历史交易发生变化时，需要重新计算从指定预算开始的所有后续预算结转
   */
  private async recalculateBudgetRolloverChain(startBudgetId: string): Promise<void> {
    const startBudget = await this.budgetRepository.findById(startBudgetId);
    if (!startBudget) {
      throw new Error('起始预算不存在');
    }

    // 查找从起始预算开始的所有后续预算（按时间顺序）
    const subsequentBudgets = await prisma.budget.findMany({
      where: {
        userId: startBudget.userId,
        accountBookId: startBudget.accountBookId,
        budgetType: startBudget.budgetType,
        familyMemberId: startBudget.familyMemberId,
        rollover: true,
        startDate: {
          gte: startBudget.startDate
        }
      },
      orderBy: {
        startDate: 'asc'
      }
    });

    console.log(`找到 ${subsequentBudgets.length} 个需要重新计算的预算`);

    // 按顺序重新计算每个预算的结转
    for (let i = 0; i < subsequentBudgets.length; i++) {
      const currentBudget = subsequentBudgets[i];
      const previousBudget = i > 0 ? subsequentBudgets[i - 1] : null;

      console.log(`重新计算预算 ${i + 1}/${subsequentBudgets.length}: ${currentBudget.name} (${currentBudget.id})`);

      // 计算当前预算的实际支出
      const spent = await this.budgetRepository.calculateSpentAmount(currentBudget.id);
      
      // 计算上个预算的结转金额
      let rolloverFromPrevious = 0;
      if (previousBudget) {
        const prevSpent = await this.budgetRepository.calculateSpentAmount(previousBudget.id);
        const prevAmount = Number(previousBudget.amount);
        const prevRollover = Number(previousBudget.rolloverAmount || 0);
        const prevTotalAvailable = prevAmount + prevRollover;
        rolloverFromPrevious = prevTotalAvailable - prevSpent;
      }

      // 更新当前预算的结转金额
      if (Number(currentBudget.rolloverAmount || 0) !== rolloverFromPrevious) {
        await this.budgetRepository.update(currentBudget.id, {
          rolloverAmount: rolloverFromPrevious
        });
        console.log(`更新预算 ${currentBudget.id} 的结转金额: ${rolloverFromPrevious}`);
      }

      // 更新或创建结转历史记录
      await this.updateBudgetHistory(currentBudget, spent, rolloverFromPrevious);
    }
  }

  /**
   * 重新计算单个预算的结转（不影响后续预算）
   */
  private async recalculateSingleBudgetRollover(budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);
    const rolloverAmount = Number(budget.rolloverAmount || 0);
    const totalAvailable = amount + rolloverAmount;
    const remaining = totalAvailable - spent;

    console.log(`预算详情 - 基础: ${amount}, 结转: ${rolloverAmount}, 总可用: ${totalAvailable}, 已用: ${spent}, 剩余: ${remaining}`);

    // 更新结转历史记录
    await this.updateBudgetHistory(budget, spent, rolloverAmount);
  }

  /**
   * 更新或创建预算历史记录
   */
  private async updateBudgetHistory(budget: any, spent: number, previousRollover: number): Promise<void> {
    const amount = Number(budget.amount);
    const totalAvailable = amount + previousRollover;
    const remaining = totalAvailable - spent;
    
    const endDate = new Date(budget.endDate);
    const period = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}`;

    // 检查是否已有历史记录
    const existingHistory = await prisma.budgetHistory.findFirst({
      where: {
        budgetId: budget.id,
        period: period
      }
    });

    const rolloverType = remaining >= 0 ? 'SURPLUS' : 'DEFICIT';
    const historyData = {
      budgetId: budget.id,
      period: period,
      amount: remaining,
      type: rolloverType as any,
      description: `${period} ${remaining >= 0 ? '结余' : '透支'}`,
      budgetAmount: amount,
      spentAmount: spent,
      previousRollover: previousRollover,
      updatedAt: new Date()
    };

    if (existingHistory) {
      // 更新现有记录
      await prisma.budgetHistory.update({
        where: { id: existingHistory.id },
        data: historyData
      });
      console.log(`更新历史记录: ${period}, 结转金额: ${remaining}`);
    } else {
      // 创建新记录（只有在预算周期结束后才创建）
      const currentDate = new Date();
      if (endDate < currentDate) {
        await prisma.budgetHistory.create({
          data: {
            id: `history-${budget.id}-${period}`,
            budgetId: budget.id,
            period: period,
            amount: remaining,
            type: rolloverType as any,
            description: `${period} ${remaining >= 0 ? '结余' : '透支'}`,
            budgetAmount: amount,
            spentAmount: spent,
            previousRollover: previousRollover,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
        console.log(`创建历史记录: ${period}, 结转金额: ${remaining}`);
      }
    }
  }

  /**
   * 检查用户是否有权限访问预算
   * @param userId 用户ID
   * @param budget 预算对象
   * @returns 是否有权限
   */
  private async checkBudgetAccess(userId: string, budget: any): Promise<boolean> {
    // 如果是用户自己的预算，直接允许
    if (budget.userId === userId) {
      return true;
    }

    // 如果是家庭预算，检查用户是否是家庭成员
    if (budget.accountBookId) {
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: budget.accountBookId },
        include: {
          family: {
            include: {
              members: {
                where: { userId: { not: null } },
                select: { userId: true }
              }
            }
          }
        }
      });

      if (accountBook) {
        // 如果是个人账本，只有所有者可以访问
        if (accountBook.type === 'PERSONAL') {
          return accountBook.userId === userId;
        }

        // 如果是家庭账本，检查用户是否是家庭成员
        if (accountBook.type === 'FAMILY' && accountBook.family) {
          const familyUserIds = accountBook.family.members
            .map(member => member.userId)
            .filter(id => id !== null);
          return familyUserIds.includes(userId);
        }
      }
    }

    return false;
  }

  /**
   * 检查用户是否有权限访问账本
   * @param userId 用户ID
   * @param accountBookId 账本ID
   * @returns 是否有权限
   */
  private async checkAccountBookAccess(userId: string, accountBookId: string): Promise<boolean> {
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
      include: {
        family: {
          include: {
            members: {
              where: { userId: { not: null } },
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!accountBook) {
      return false;
    }

    // 如果是个人账本，只有所有者可以访问
    if (accountBook.type === 'PERSONAL') {
      return accountBook.userId === userId;
    }

    // 如果是家庭账本，检查用户是否是家庭成员
    if (accountBook.type === 'FAMILY' && accountBook.family) {
      const familyUserIds = accountBook.family.members
        .map(member => member.userId)
        .filter(id => id !== null);
      return familyUserIds.includes(userId);
    }

    return false;
  }

  /**
   * 获取预算趋势数据
   * @param budgetId 预算ID
   * @param viewMode 视图模式：日/周/月
   * @param familyMemberId 家庭成员ID（可选）
   * @returns 趋势数据数组
   */
  async getBudgetTrends(
    budgetId: string,
    viewMode: 'daily' | 'weekly' | 'monthly' = 'monthly',
    familyMemberId?: string
  ): Promise<any[]> {
    console.log(`获取预算趋势数据，预算ID: ${budgetId}, 视图模式: ${viewMode}, 家庭成员ID: ${familyMemberId || '无'}`);

    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 获取预算的账本ID
    const accountBookId = budget.accountBookId;
    if (!accountBookId) {
      throw new Error('预算未关联账本');
    }

    // 目前只实现月视图，其他视图模式暂时返回月视图数据
    // 获取最近12个月的日期范围
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const formattedMonth = month < 10 ? `0${month}` : `${month}`;
      months.push({
        date: `${year}-${formattedMonth}`,
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0)
      });
    }

    console.log(`生成了${months.length}个月份的日期范围`);

    // 获取每个月的交易数据
    const result = [];
    for (const month of months) {
      try {
        // 构建查询条件
        const whereCondition: any = {
          accountBookId,
          date: {
            gte: month.startDate,
            lte: month.endDate
          },
          type: 'EXPENSE',
          ...(budget.categoryId && { categoryId: budget.categoryId })
        };

        // 处理家庭成员ID
        if (familyMemberId) {
          // 检查是否为托管成员ID
          const familyMember = await prisma.familyMember.findUnique({
            where: { id: familyMemberId },
            select: { id: true, userId: true, isCustodial: true }
          });

          if (familyMember) {
            if (familyMember.isCustodial) {
              // 如果是托管成员，使用familyMemberId查询
              whereCondition.familyMemberId = familyMemberId;
            } else if (familyMember.userId) {
              // 如果是普通家庭成员，使用userId查询
              whereCondition.userId = familyMember.userId;
            }
            // 如果familyMember.userId为null，不添加userId条件
          } else {
            // 如果找不到家庭成员，且familyMemberId不为空，默认使用userId查询
            if (familyMemberId) {
              whereCondition.userId = familyMemberId;
            }
          }
        } else if (budget.familyMemberId) {
          // 如果预算本身关联了托管成员，使用预算的familyMemberId查询
          whereCondition.familyMemberId = budget.familyMemberId;
        } else if (budget.userId) {
          // 如果预算关联了用户，使用预算的userId查询
          whereCondition.userId = budget.userId;
        }

        // 查询该月的交易总额
        const transactions = await prisma.transaction.findMany({
          where: whereCondition
        });

        console.log(`${month.date}月份找到${transactions.length}条交易记录`);

        // 计算总支出
        const amount = transactions.reduce(
          (sum: number, transaction: Transaction) => sum + Number(transaction.amount),
          0
        );

        // 计算结转影响（如果预算启用了结转）
        let rolloverImpact = 0;
        let total = amount;

        if (budget.rollover) {
          // 对于启用结转的预算，结转影响已经体现在rolloverAmount字段中
          // 这里不需要额外计算结转影响
          rolloverImpact = 0;
          total = amount;
        }

        // 添加到结果中
        result.push({
          date: month.date,
          amount,
          rolloverImpact,
          total // 如果有结转影响，total会不等于amount
        });
      } catch (error) {
        console.error(`获取${month.date}月份交易数据失败:`, error);
        // 如果查询失败，添加0值
        result.push({
          date: month.date,
          amount: 0,
          rolloverImpact: 0,
          total: 0
        });
      }
    }

    console.log(`生成了${result.length}条趋势数据`);
    return result;
  }

  /**
   * 自动创建缺失的月份预算
   * 查找用户最近的预算，并创建从上个月结束到当前月份的所有缺失预算
   * 包括用户个人预算和托管成员预算
   */
  async autoCreateMissingBudgets(userId: string, accountBookId: string): Promise<void> {
    try {
      console.log(`开始为用户 ${userId} 在账本 ${accountBookId} 中自动创建缺失预算`);

      // 1. 处理用户个人预算
      console.log(`开始为用户 ${userId} 创建缺失的个人预算`);
      const latestPersonalBudget = await this.findLatestPersonalBudget(userId, accountBookId);

      if (latestPersonalBudget) {
        const refreshDay = (latestPersonalBudget as any).refreshDay || 1;
        console.log(`找到最近的个人预算: ${latestPersonalBudget.name}, 结束日期: ${latestPersonalBudget.endDate}, 刷新日期: ${refreshDay}`);

        const currentDate = new Date();
        const latestEndDate = new Date(latestPersonalBudget.endDate);

        if (latestEndDate < currentDate) {
          const periodsToCreate = BudgetDateUtils.calculateMissingPeriods(latestEndDate, currentDate, refreshDay);
          console.log(`需要创建 ${periodsToCreate.length} 个个人预算周期`);

          let previousBudgetId = latestPersonalBudget.id;
          for (const period of periodsToCreate) {
            console.log(`创建个人预算周期: ${BudgetDateUtils.formatPeriod(period)}`);

            // 处理上个预算的结转（如果启用了结转）
            let rolloverAmount = 0;
            if (latestPersonalBudget.rollover) {
              rolloverAmount = await this.processBudgetRollover(previousBudgetId);
            }

            // 创建新预算周期的预算（包含结转金额）
            const newBudget = await this.createBudgetForPeriod(latestPersonalBudget, period, rolloverAmount);
            previousBudgetId = newBudget.id;

            console.log(`成功创建个人预算: ${newBudget.name} (${newBudget.id})`);
          }
        }
      } else {
        console.log('未找到历史个人预算，无法自动创建');
      }

      // 2. 处理托管成员预算
      console.log(`开始为用户 ${userId} 创建缺失的托管成员预算`);

      // 查找该账本对应的家庭ID
      const accountBook = await prisma.accountBook.findUnique({
        where: { id: accountBookId },
        select: { familyId: true }
      });

      if (accountBook?.familyId) {
        // 查找该家庭的所有托管成员
        const custodialMembers = await prisma.familyMember.findMany({
          where: {
            familyId: accountBook.familyId,
            isCustodial: true
          }
        });

        console.log(`找到 ${custodialMembers.length} 个托管成员`);

        // 为每个托管成员创建缺失的预算
        for (const member of custodialMembers) {
          console.log(`开始为托管成员 ${member.name} (${member.id}) 创建缺失预算`);

          // 查找该托管成员最近的预算
          const latestCustodialBudget = await this.findLatestCustodialMemberBudget(member.id, accountBookId);

          if (latestCustodialBudget) {
            const refreshDay = (latestCustodialBudget as any).refreshDay || 1;
            console.log(`托管成员 ${member.name} 最新预算结束日期: ${latestCustodialBudget.endDate}, 结转日: ${refreshDay}`);

            const currentDate = new Date();
            const latestEndDate = new Date(latestCustodialBudget.endDate);

            if (latestEndDate < currentDate) {
              const periodsToCreate = BudgetDateUtils.calculateMissingPeriods(latestEndDate, currentDate, refreshDay);
              console.log(`需要为托管成员 ${member.name} 创建 ${periodsToCreate.length} 个预算周期`);

              let previousBudgetId = latestCustodialBudget.id;
              for (const period of periodsToCreate) {
                console.log(`为托管成员 ${member.name} 创建预算周期: ${BudgetDateUtils.formatPeriod(period)}`);

                // 处理上个预算的结转（如果启用了结转）
                let rolloverAmount = 0;
                if (latestCustodialBudget.rollover) {
                  rolloverAmount = await this.processBudgetRollover(previousBudgetId);
                }

                // 创建新预算周期的预算（包含结转金额）
                const newBudget = await this.createBudgetForPeriod(latestCustodialBudget, period, rolloverAmount);
                previousBudgetId = newBudget.id;

                console.log(`成功为托管成员 ${member.name} 创建预算: ${newBudget.name} (${newBudget.id})`);
              }
            }
          } else {
            console.log(`托管成员 ${member.name} 没有历史预算，无法自动创建`);
          }
        }
      } else {
        console.log('账本不属于家庭，跳过托管成员预算创建');
      }

    } catch (error) {
      console.error('自动创建缺失预算失败:', error);
      // 不抛出错误，避免影响正常的预算查询
    }
  }



  /**
   * 查找用户最近的个人预算
   */
  private async findLatestPersonalBudget(userId: string, accountBookId: string): Promise<any> {
    const budgets = await prisma.budget.findMany({
      where: {
        userId,
        accountBookId,
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY,
        familyMemberId: null // 排除托管成员的预算
      },
      orderBy: {
        endDate: 'desc'
      },
      take: 1
    });

    return budgets.length > 0 ? budgets[0] : null;
  }

  /**
   * 查找托管成员最近的预算
   */
  private async findLatestCustodialMemberBudget(memberId: string, accountBookId: string): Promise<any> {
    const budgets = await prisma.budget.findMany({
      where: {
        familyMemberId: memberId,
        accountBookId,
        budgetType: BudgetType.PERSONAL,
        period: BudgetPeriod.MONTHLY
      },
      orderBy: {
        endDate: 'desc'
      },
      take: 1
    });

    return budgets.length > 0 ? budgets[0] : null;
  }



  /**
   * 为特定预算周期创建预算
   * @param templateBudget 模板预算（用于复制配置）
   * @param period 预算周期
   * @param rolloverAmount 结转金额（可选）
   * @returns 新创建的预算
   */
  private async createBudgetForPeriod(templateBudget: any, period: any, rolloverAmount: number = 0): Promise<BudgetResponseDto> {
    const newBudgetData: CreateBudgetDto = {
      name: templateBudget.name,
      amount: Number(templateBudget.amount),
      period: templateBudget.period,
      categoryId: templateBudget.categoryId || undefined,
      startDate: period.startDate,
      endDate: period.endDate,
      rollover: templateBudget.rollover,
      familyId: templateBudget.familyId || undefined,
      accountBookId: templateBudget.accountBookId || undefined,
      enableCategoryBudget: templateBudget.enableCategoryBudget || false,
      isAutoCalculated: templateBudget.isAutoCalculated || false,
      budgetType: templateBudget.budgetType || BudgetType.PERSONAL,
      familyMemberId: templateBudget.familyMemberId || undefined, // 添加托管成员ID
      refreshDay: period.refreshDay
    };

    // 创建新预算
    const userId = templateBudget.userId || '';
    const newBudget = await this.createBudget(userId, newBudgetData);

    // 如果有结转金额，更新新预算的结转金额
    if (rolloverAmount !== 0 && templateBudget.rollover) {
      await this.budgetRepository.update(newBudget.id, {
        rolloverAmount: rolloverAmount
      });

      console.log(`新预算 ${newBudget.id} 设置结转金额: ${rolloverAmount}`);

      // 重新获取更新后的预算信息
      const updatedBudget = await this.budgetRepository.findById(newBudget.id);
      if (updatedBudget) {
        return toBudgetResponseDto(updatedBudget);
      }
    }

    return newBudget;
  }

  /**
   * 创建下一个周期的预算
   * 对于月度预算，创建下个月的预算
   */
  async createNextPeriodBudget(budgetId: string): Promise<BudgetResponseDto> {
    // 获取当前预算
    const currentBudget = await this.budgetRepository.findById(budgetId);
    if (!currentBudget) {
      throw new Error('预算不存在');
    }

    // 只处理个人预算
    if ((currentBudget as any).budgetType !== BudgetType.PERSONAL) {
      throw new Error('只能为个人预算创建下一周期');
    }

    const refreshDay = (currentBudget as any).refreshDay || 1;

    if (currentBudget.period === BudgetPeriod.MONTHLY) {
      // 根据当前预算的结束日期计算下一个周期
      const currentEndDate = new Date(currentBudget.endDate);
      const nextPeriod = BudgetDateUtils.calculateMissingPeriods(
        currentEndDate,
        new Date(currentEndDate.getTime() + 24 * 60 * 60 * 1000), // 下一天
        refreshDay
      )[0];

      if (!nextPeriod) {
        throw new Error('无法计算下一个预算周期');
      }

      // 创建新预算数据
      const newBudgetData: CreateBudgetDto = {
        name: currentBudget.name,
        amount: Number(currentBudget.amount),
        period: currentBudget.period,
        categoryId: currentBudget.categoryId || undefined,
        startDate: nextPeriod.startDate,
        endDate: nextPeriod.endDate,
        rollover: currentBudget.rollover,
        familyId: currentBudget.familyId || undefined,
        accountBookId: (currentBudget as any).accountBookId || undefined,
        enableCategoryBudget: (currentBudget as any).enableCategoryBudget || false,
        isAutoCalculated: (currentBudget as any).isAutoCalculated || false,
        budgetType: BudgetType.PERSONAL,
        refreshDay: refreshDay,
      };

      // 创建新预算
      const userId = currentBudget.userId || '';
      return this.createBudget(userId, newBudgetData);
    } else {
      throw new Error('暂不支持非月度预算的自动创建');
    }
  }
}
