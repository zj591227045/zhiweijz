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

    // 计算已使用金额
    const spent = await this.budgetRepository.calculateSpentAmount(budgetId);
    const amount = Number(budget.amount);
    const remaining = amount - spent;

    // 格式化期间（例如：2023年5月）
    const endDate = budget.endDate;
    const period = `${endDate.getFullYear()}年${endDate.getMonth() + 1}月`;

    // 记录结转历史
    await this.budgetHistoryService.recordRollover(
      budgetId,
      period,
      remaining,
      `${period}预算结转`
    );

    // 更新预算的结转金额
    await this.budgetRepository.update(budgetId, {
      rolloverAmount: remaining
    });
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
        // 查询该月的交易总额
        const transactions = await prisma.transaction.findMany({
          where: {
            accountBookId,
            date: {
              gte: month.startDate,
              lte: month.endDate
            },
            type: 'EXPENSE',
            ...(budget.categoryId && { categoryId: budget.categoryId }),
            ...(familyMemberId && { userId: familyMemberId }) // 如果指定了家庭成员ID，只查询该成员的交易
          }
        });

        console.log(`${month.date}月份找到${transactions.length}条交易记录`);

        // 计算总支出
        const amount = transactions.reduce(
          (sum: number, transaction: Transaction) => sum + Number(transaction.amount),
          0
        );

        // 计算结转影响（如果预算启用了结转）
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
            const rolloverAmount = rolloverHistory.reduce(
              (sum: number, history: BudgetHistory) => sum + Number(history.amount),
              0
            );
            total = amount + rolloverAmount;
          }
        }

        // 添加到结果中
        result.push({
          date: month.date,
          amount,
          total // 如果有结转影响，total会不等于amount
        });
      } catch (error) {
        console.error(`获取${month.date}月份交易数据失败:`, error);
        // 如果查询失败，添加0值
        result.push({
          date: month.date,
          amount: 0,
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
