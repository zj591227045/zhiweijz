import { BudgetPeriod, BudgetType, Budget, Category, RolloverType, PrismaClient, Transaction, BudgetHistory } from '@prisma/client';
import { BudgetRepository, BudgetWithCategory } from '../repositories/budget.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { CategoryBudgetRepository } from '../repositories/category-budget.repository';
import { BudgetHistoryRepository } from '../repositories/budget-history.repository';
import { BudgetHistoryService } from './budget-history.service';

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
  private budgetHistoryRepository: BudgetHistoryRepository;
  private budgetHistoryService: BudgetHistoryService;

  constructor() {
    this.budgetRepository = new BudgetRepository();
    this.categoryRepository = new CategoryRepository();
    this.categoryBudgetRepository = new CategoryBudgetRepository();
    this.budgetHistoryRepository = new BudgetHistoryRepository();
    this.budgetHistoryService = new BudgetHistoryService();
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

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
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

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
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

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权删除此预算');
    }

    // 删除预算
    await this.budgetRepository.delete(id);
  }

  /**
   * 获取当前活跃的预算
   * 包括用户的个人预算和用户所属家庭的预算
   * 可选根据账本ID进行过滤
   */
  async getActiveBudgets(userId: string, accountBookId?: string): Promise<BudgetResponseDto[]> {
    console.log(`获取用户 ${userId} 的活跃预算，账本ID: ${accountBookId || '无'}`);
    const budgets = await this.budgetRepository.findActiveBudgets(userId, new Date(), accountBookId);
    console.log(`找到 ${budgets.length} 个活跃预算`);

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
   * 获取预算结转历史
   */
  async getBudgetRolloverHistory(budgetId: string, userId: string): Promise<any[]> {
    // 检查预算是否存在
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 验证权限
    if (budget.userId !== userId && !budget.familyId) {
      throw new Error('无权访问此预算');
    }

    // 获取预算历史记录
    return this.budgetHistoryService.getBudgetHistoriesByBudgetId(budgetId);
  }

  /**
   * 处理预算结转
   * 在月度预算结束时调用，计算结转金额并创建历史记录
   */
  async processBudgetRollover(budgetId: string): Promise<void> {
    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 只处理启用了结转的预算
    if (!budget.rollover) {
      return;
    }

    // 只处理个人月度预算
    if (budget.period !== BudgetPeriod.MONTHLY || (budget as any).budgetType !== BudgetType.PERSONAL) {
      throw new Error('只能为个人月度预算执行结转');
    }

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);

    // 获取当前结转金额（如果有）
    const currentRolloverAmount = budget.rolloverAmount ? Number(budget.rolloverAmount) : 0;

    // 计算调整后的预算金额（基础预算 + 当前结转金额）
    const adjustedAmount = amount + currentRolloverAmount;

    // 计算实际剩余金额（考虑结转）
    const remaining = adjustedAmount - spent;

    // 格式化期间（例如：2023年5月）
    const endDate = budget.endDate;
    const period = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`;

    console.log(`处理预算结转 - 预算ID: ${budgetId}, 期间: ${period}`);
    console.log(`基础预算: ${amount}, 当前结转: ${currentRolloverAmount}, 已使用: ${spent}, 剩余: ${remaining}`);

    // 记录结转历史
    await this.budgetHistoryService.recordRollover(
      budgetId,
      period,
      remaining,
      `${period}预算结转`,
      amount,                // 记录当前预算金额
      spent,                 // 记录已使用金额
      currentRolloverAmount  // 记录上一期结转金额
    );

    // 更新预算的结转金额
    await this.budgetRepository.update(budgetId, {
      rolloverAmount: remaining
    });

    console.log(`预算结转处理完成 - 新结转金额: ${remaining}`);
  }

  /**
   * 重新计算预算结转
   * 用于在添加/修改历史交易后重新计算预算结转金额
   * @param budgetId 预算ID
   * @param recalculateHistory 是否重新计算历史结转记录
   * @param affectedDate 受影响的日期（可选，用于优化计算范围）
   */
  async recalculateBudgetRollover(
    budgetId: string,
    recalculateHistory: boolean = false,
    affectedDate?: Date
  ): Promise<void> {
    // 获取预算信息
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    // 只处理启用了结转的预算
    if (!budget.rollover) {
      throw new Error('该预算未启用结转功能');
    }

    // 只处理个人月度预算
    if (budget.period !== BudgetPeriod.MONTHLY || (budget as any).budgetType !== BudgetType.PERSONAL) {
      throw new Error('只能为个人月度预算执行结转重新计算');
    }

    console.log(`开始重新计算预算结转 - 预算ID: ${budgetId}, 重新计算历史: ${recalculateHistory}, 受影响日期: ${affectedDate?.toISOString() || '无'}`);

    // 如果需要重新计算历史结转记录
    if (recalculateHistory) {
      // 获取所有历史结转记录
      const rolloverHistory = await this.budgetHistoryService.getBudgetHistoriesByBudgetId(budgetId);

      if (rolloverHistory.length > 0) {
        console.log(`找到 ${rolloverHistory.length} 条历史结转记录，准备重新计算`);

        // 按照创建时间排序历史记录
        const sortedHistory = rolloverHistory.sort((a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // 确定需要重新计算的起始索引
        let startIndex = 0;
        let previousRolloverAmount = 0;

        if (affectedDate) {
          // 如果提供了受影响的日期，找到该日期所在的月份及之后的记录
          for (let i = 0; i < sortedHistory.length; i++) {
            const history = sortedHistory[i];
            const periodMatch = history.period.match(/(\d{4})年(\d{1,2})月/);
            if (!periodMatch) continue;

            const year = parseInt(periodMatch[1]);
            const month = parseInt(periodMatch[2]) - 1; // JavaScript月份从0开始

            // 创建该月的开始和结束日期
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0); // 月份的最后一天

            // 如果受影响的日期在当前月份或之前，从这个月开始重新计算
            if (affectedDate <= endDate) {
              startIndex = i;

              // 如果不是第一个月，获取上一个月的结转金额
              if (i > 0) {
                const prevHistory = sortedHistory[i - 1];
                previousRolloverAmount = prevHistory.type === 'SURPLUS'
                  ? Number(prevHistory.amount)
                  : -Number(prevHistory.amount);
              }

              console.log(`确定重新计算起点: ${history.period}，上一个结转金额: ${previousRolloverAmount}`);
              break;
            }
          }
        }

        // 如果需要重新计算的记录存在
        if (startIndex < sortedHistory.length) {
          // 获取需要重新计算的记录
          const recordsToRecalculate = sortedHistory.slice(startIndex);
          console.log(`需要重新计算 ${recordsToRecalculate.length} 条记录，从 ${recordsToRecalculate[0].period} 开始`);

          // 删除这些记录
          for (const record of recordsToRecalculate) {
            await this.budgetHistoryService.deleteBudgetHistory(record.id);
          }
          console.log(`已删除 ${recordsToRecalculate.length} 条历史结转记录`);

          // 逐个重新计算历史结转记录
          let cumulativeRollover = previousRolloverAmount;

          for (const history of recordsToRecalculate) {
            // 解析期间字符串，获取年月
            const periodMatch = history.period.match(/(\d{4})年(\d{1,2})月/);
            if (!periodMatch) {
              console.warn(`无法解析期间格式: ${history.period}，跳过此记录`);
              continue;
            }

            const year = parseInt(periodMatch[1]);
            const month = parseInt(periodMatch[2]) - 1; // JavaScript月份从0开始

            // 创建该月的开始和结束日期
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0); // 月份的最后一天

            // 计算该月的支出
            const spent = await this.calculatePeriodSpent(budget, startDate, endDate);

            // 计算该月的预算金额（基础预算 + 上月结转）
            const periodBudget = Number(budget.amount) + cumulativeRollover;

            // 计算该月的结转金额
            const periodRemaining = periodBudget - spent;

            // 更新累计结转金额
            cumulativeRollover = periodRemaining;

            // 记录新的结转历史
            await this.budgetHistoryService.recordRollover(
              budgetId,
              history.period,
              periodRemaining,
              `${history.period}预算结转（重新计算）`,
              Number(budget.amount),  // 记录当前预算金额
              spent,                  // 记录已使用金额
              cumulativeRollover      // 记录上一期结转金额
            );

            console.log(`重新计算 ${history.period} 结转: 预算=${periodBudget}, 支出=${spent}, 结转=${periodRemaining}`);
          }

          // 更新预算的结转金额为最终计算结果
          await this.budgetRepository.update(budgetId, {
            rolloverAmount: cumulativeRollover
          });

          console.log(`预算结转历史重新计算完成，最终结转金额: ${cumulativeRollover}`);
        } else {
          console.log('受影响的日期在所有历史记录之后，无需重新计算历史记录');

          // 仅重新计算当前结转金额
          await this.recalculateCurrentRollover(budgetId);
        }
      } else {
        console.log('未找到历史结转记录，无需重新计算');
      }
    } else {
      // 仅重新计算当前结转金额
      await this.recalculateCurrentRollover(budgetId);
    }
  }

  /**
   * 仅重新计算当前结转金额
   * @param budgetId 预算ID
   */
  private async recalculateCurrentRollover(budgetId: string): Promise<void> {
    const budget = await this.budgetRepository.findById(budgetId);
    if (!budget) {
      throw new Error('预算不存在');
    }

    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);

    // 获取上一个结转记录的金额
    const previousRollover = await this.getPreviousRolloverAmount(budgetId);

    // 计算调整后的预算金额（基础预算 + 上一个结转金额）
    const adjustedAmount = amount + previousRollover;

    // 计算实际剩余金额（考虑结转）
    const remaining = adjustedAmount - spent;

    // 更新预算的结转金额
    await this.budgetRepository.update(budgetId, {
      rolloverAmount: remaining
    });

    console.log(`预算结转重新计算完成 - 新结转金额: ${remaining}`);
  }

  /**
   * 计算指定期间的预算支出
   * @param budget 预算对象
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  private async calculatePeriodSpent(budget: any, startDate: Date, endDate: Date): Promise<number> {
    // 构建查询条件 - 不再使用userId过滤，而是通过预算的其他属性
    const where: any = {
      type: 'EXPENSE',
      date: {
        gte: startDate,
        lte: endDate,
      },
      accountBookId: budget.accountBookId,
      ...(budget.categoryId && { categoryId: budget.categoryId }),
    };

    // 如果是托管成员的预算，通过familyMemberId过滤
    if (budget.familyMemberId) {
      where.familyMemberId = budget.familyMemberId;
    }
    // 如果是普通用户的预算且不是家庭预算，通过userId过滤
    else if (budget.userId && !budget.familyId) {
      where.userId = budget.userId;
    }
    // 如果是家庭预算，不需要额外过滤，已经通过accountBookId过滤了

    // 计算总支出
    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount ? Number(result._sum.amount) : 0;
  }

  /**
   * 获取上一个结转金额
   * @param budgetId 预算ID
   */
  private async getPreviousRolloverAmount(budgetId: string): Promise<number> {
    // 获取所有历史结转记录
    const rolloverHistory = await this.budgetHistoryService.getBudgetHistoriesByBudgetId(budgetId);

    if (rolloverHistory.length <= 1) {
      return 0; // 如果没有历史记录或只有一条记录，返回0
    }

    // 按照创建时间排序历史记录
    const sortedHistory = rolloverHistory.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 获取倒数第二条记录（上一个结转）
    const previousRollover = sortedHistory[1];

    // 根据结转类型计算金额
    return previousRollover.type === 'SURPLUS'
      ? Number(previousRollover.amount)
      : -Number(previousRollover.amount);
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
          } else {
            // 如果找不到家庭成员，默认使用userId查询
            whereCondition.userId = familyMemberId;
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
          // 查询该月的预算结转记录
          const rolloverHistory = await prisma.budgetHistory.findMany({
            where: {
              budgetId: budget.id,
              createdAt: {
                gte: month.startDate,
                lte: month.endDate
              }
            }
          });

          // 如果有结转记录，计算结转影响
          if (rolloverHistory.length > 0) {
            rolloverImpact = rolloverHistory.reduce((sum: number, history: BudgetHistory) => {
              // 根据结转类型计算影响
              const value = Number(history.amount);
              return sum + (history.type === RolloverType.SURPLUS ? value : -value);
            }, 0);

            total = amount + rolloverImpact;
          }
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

    // 计算下一周期的日期
    const startDate = new Date(currentBudget.endDate);
    startDate.setDate(startDate.getDate() + 1);

    const endDate = new Date(startDate);
    if (currentBudget.period === BudgetPeriod.MONTHLY) {
      // 设置为下个月的最后一天
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
    } else {
      // 年度预算，加一年
      endDate.setFullYear(endDate.getFullYear() + 1);
      endDate.setDate(endDate.getDate() - 1);
    }

    // 创建新预算数据
    const newBudgetData: CreateBudgetDto = {
      name: currentBudget.name,
      amount: Number(currentBudget.amount),
      period: currentBudget.period,
      categoryId: currentBudget.categoryId || undefined,
      startDate,
      endDate,
      rollover: currentBudget.rollover,
      familyId: currentBudget.familyId || undefined,
      accountBookId: (currentBudget as any).accountBookId || undefined,
      enableCategoryBudget: (currentBudget as any).enableCategoryBudget || false,
      isAutoCalculated: (currentBudget as any).isAutoCalculated || false,
      budgetType: BudgetType.PERSONAL
    };

    // 创建新预算
    const userId = currentBudget.userId || '';
    return this.createBudget(userId, newBudgetData);
  }
}
