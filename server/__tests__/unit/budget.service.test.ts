import { BudgetService } from '../../src/services/budget.service';
import { BudgetRepository, BudgetWithCategory } from '../../src/repositories/budget.repository';
import { CategoryRepository } from '../../src/repositories/category.repository';
import { TransactionType, Prisma } from '@prisma/client';
import { CreateBudgetDto, UpdateBudgetDto } from '../../src/models/budget.model';

// 模拟依赖
jest.mock('../../src/repositories/budget.repository');
jest.mock('../../src/repositories/category.repository');

describe('BudgetService', () => {
  let budgetService: BudgetService;
  let mockBudgetRepository: jest.Mocked<BudgetRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    // 清除所有模拟的调用记录
    jest.clearAllMocks();

    // 创建模拟对象
    mockBudgetRepository = new BudgetRepository() as jest.Mocked<BudgetRepository>;
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;

    // 替换构造函数，使服务使用模拟对象
    (BudgetRepository as jest.Mock).mockImplementation(() => mockBudgetRepository);
    (CategoryRepository as jest.Mock).mockImplementation(() => mockCategoryRepository);

    // 创建服务实例
    budgetService = new BudgetService();
  });

  describe('createBudget', () => {
    it('should create a budget successfully', async () => {
      // 准备
      const userId = 'user-id';
      const categoryId = 'category-id';
      const budgetData: CreateBudgetDto = {
        name: 'Test Budget',
        amount: 1000,
        period: 'MONTHLY',
        categoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
      };

      const category = {
        id: categoryId,
        name: 'Test Category',
        type: TransactionType.EXPENSE,
        icon: 'test-icon',
        userId,
        familyId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const budget: BudgetWithCategory = {
        id: 'budget-id',
        name: budgetData.name,
        amount: new Prisma.Decimal(budgetData.amount),
        period: budgetData.period,
        categoryId: budgetData.categoryId || null,
        startDate: budgetData.startDate,
        endDate: budgetData.endDate,
        rollover: budgetData.rollover,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category,
      };

      // 模拟行为
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockBudgetRepository.create.mockResolvedValue(budget);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: 'budget-id',
        name: 'Test Budget',
        amount: 1000,
        period: budgetData.period,
        categoryId: budgetData.categoryId,
        category: category ? {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
        } : undefined,
        startDate: budgetData.startDate,
        endDate: budgetData.endDate,
        rollover: budgetData.rollover,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 执行
      const result = await budgetService.createBudget(userId, budgetData);

      // 验证
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);
      expect(mockBudgetRepository.create).toHaveBeenCalledWith(userId, budgetData);
      expect(result).toHaveProperty('id', 'budget-id');
      expect(result).toHaveProperty('name', 'Test Budget');
      expect(result).toHaveProperty('amount');
      expect(result.amount).toBeCloseTo(1000);
      expect(result).toHaveProperty('category');
      expect(result.category).toHaveProperty('id', categoryId);
    });

    it('should throw error if category does not exist', async () => {
      // 准备
      const userId = 'user-id';
      const categoryId = 'non-existent-category-id';
      const budgetData: CreateBudgetDto = {
        name: 'Test Budget',
        amount: 1000,
        period: 'MONTHLY',
        categoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
      };

      // 模拟行为
      mockCategoryRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(budgetService.createBudget(userId, budgetData)).rejects.toThrow('分类不存在');
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);
      expect(mockBudgetRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getBudgets', () => {
    it('should get budgets with pagination', async () => {
      // 准备
      const userId = 'user-id';
      const params = {
        page: 1,
        limit: 10,
      };

      const budgets: BudgetWithCategory[] = [
        {
          id: 'budget-id-1',
          name: 'Budget 1',
          amount: new Prisma.Decimal(1000),
          period: 'MONTHLY',
          categoryId: 'category-id',
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          rollover: false,
          userId,
          familyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-id',
            name: 'Test Category',
            type: TransactionType.EXPENSE,
            icon: 'test-icon',
            userId,
            familyId: null,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      // 模拟行为
      mockBudgetRepository.findAll.mockResolvedValue({ budgets, total: 1 });
      mockBudgetRepository.calculateSpentAmount.mockResolvedValue(500);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: 'budget-id-1',
        name: 'Budget 1',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: 'category-id',
        category: {
          id: 'category-id',
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        spent: 500,
        remaining: 500,
        progress: 50,
      });

      // 执行
      const result = await budgetService.getBudgets(userId, params);

      // 验证
      expect(mockBudgetRepository.findAll).toHaveBeenCalledWith(userId, params);
      expect(mockBudgetRepository.calculateSpentAmount).toHaveBeenCalledWith('budget-id-1');
      expect(result).toHaveProperty('total', 1);
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 10);
      expect(result).toHaveProperty('data');
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toHaveProperty('id', 'budget-id-1');
      expect(result.data[0]).toHaveProperty('spent', 500);
      expect(result.data[0]).toHaveProperty('remaining');
      expect(result.data[0].remaining).toBeCloseTo(500);
      expect(result.data[0]).toHaveProperty('progress');
      expect(result.data[0].progress).toBeCloseTo(50);
    });
  });

  describe('getBudgetById', () => {
    it('should get a budget by id', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'budget-id';

      const budget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: 'category-id',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: 'category-id',
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
          userId,
          familyId: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(budget);
      mockBudgetRepository.calculateSpentAmount.mockResolvedValue(500);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: budgetId,
        name: 'Test Budget',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: 'category-id',
        category: {
          id: 'category-id',
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        spent: 500,
        remaining: 500,
        progress: 50,
      });

      // 执行
      const result = await budgetService.getBudgetById(budgetId, userId);

      // 验证
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.calculateSpentAmount).toHaveBeenCalledWith(budgetId);
      expect(result).toHaveProperty('id', budgetId);
      expect(result).toHaveProperty('spent', 500);
      expect(result).toHaveProperty('remaining');
      expect(result.remaining).toBeCloseTo(500);
      expect(result).toHaveProperty('progress');
      expect(result.progress).toBeCloseTo(50);
    });

    it('should throw error if budget does not exist', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'non-existent-budget-id';

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(budgetService.getBudgetById(budgetId, userId)).rejects.toThrow('预算不存在');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.calculateSpentAmount).not.toHaveBeenCalled();
    });

    it('should throw error if user has no access to budget', async () => {
      // 准备
      const userId = 'user-id';
      const otherUserId = 'other-user-id';
      const budgetId = 'budget-id';

      const budget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: {
          toNumber: () => 1000
        } as any,
        period: 'MONTHLY',
        categoryId: 'category-id',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId: otherUserId, // 不同的用户ID
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(budget);

      // 执行和验证
      await expect(budgetService.getBudgetById(budgetId, userId)).rejects.toThrow('无权访问此预算');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.calculateSpentAmount).not.toHaveBeenCalled();
    });
  });

  describe('updateBudget', () => {
    it('should update a budget successfully', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'budget-id';
      const categoryId = 'category-id';
      const updateData: UpdateBudgetDto = {
        name: 'Updated Budget',
        amount: 1500,
        rollover: true,
      };

      const originalBudget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: categoryId,
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
          userId,
          familyId: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const updatedBudget: BudgetWithCategory = {
        id: budgetId,
        name: updateData.name!,
        amount: new Prisma.Decimal(updateData.amount!),
        period: 'MONTHLY',
        categoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: updateData.rollover!,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: originalBudget.category,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(originalBudget);
      mockBudgetRepository.update.mockResolvedValue(updatedBudget);
      mockBudgetRepository.calculateSpentAmount.mockResolvedValue(500);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: budgetId,
        name: updateData.name!,
        amount: updateData.amount!,
        period: 'MONTHLY',
        categoryId,
        category: {
          id: categoryId,
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: updateData.rollover!,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        spent: 500,
        remaining: 1000,
        progress: 50,
      });

      // 执行
      const result = await budgetService.updateBudget(budgetId, userId, updateData);

      // 验证
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.update).toHaveBeenCalledWith(budgetId, updateData);
      expect(result).toHaveProperty('id', budgetId);
      expect(result).toHaveProperty('name', updateData.name);
      expect(result).toHaveProperty('amount');
      expect(result.amount).toBeCloseTo(updateData.amount!);
      expect(result).toHaveProperty('rollover', updateData.rollover);
    });

    it('should throw error if budget does not exist', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'non-existent-budget-id';
      const updateData: UpdateBudgetDto = {
        name: 'Updated Budget',
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(budgetService.updateBudget(budgetId, userId, updateData)).rejects.toThrow('预算不存在');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if user has no access to budget', async () => {
      // 准备
      const userId = 'user-id';
      const otherUserId = 'other-user-id';
      const budgetId = 'budget-id';
      const updateData: UpdateBudgetDto = {
        name: 'Updated Budget',
      };

      const budget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: 'category-id',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId: otherUserId, // 不同的用户ID
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(budget);

      // 执行和验证
      await expect(budgetService.updateBudget(budgetId, userId, updateData)).rejects.toThrow('无权修改此预算');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.update).not.toHaveBeenCalled();
    });

    it('should update budget with new category if provided', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'budget-id';
      const oldCategoryId = 'old-category-id';
      const newCategoryId = 'new-category-id';
      const updateData: UpdateBudgetDto = {
        categoryId: newCategoryId,
      };

      const originalBudget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: oldCategoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: {
          id: oldCategoryId,
          name: 'Old Category',
          type: TransactionType.EXPENSE,
          icon: 'old-icon',
          userId,
          familyId: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const newCategory = {
        id: newCategoryId,
        name: 'New Category',
        type: TransactionType.EXPENSE,
        icon: 'new-icon',
        userId,
        familyId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedBudget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: newCategoryId,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: newCategory,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(originalBudget);
      mockCategoryRepository.findById.mockResolvedValue(newCategory);
      mockBudgetRepository.update.mockResolvedValue(updatedBudget);
      mockBudgetRepository.calculateSpentAmount.mockResolvedValue(500);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: budgetId,
        name: 'Test Budget',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: newCategoryId,
        category: {
          id: newCategoryId,
          name: 'New Category',
          type: TransactionType.EXPENSE,
          icon: 'new-icon',
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        spent: 500,
        remaining: 500,
        progress: 50,
      });

      // 执行
      const result = await budgetService.updateBudget(budgetId, userId, updateData);

      // 验证
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(newCategoryId);
      expect(mockBudgetRepository.update).toHaveBeenCalledWith(budgetId, updateData);
      expect(result).toHaveProperty('categoryId', newCategoryId);
      expect(result.category).toHaveProperty('id', newCategoryId);
      expect(result.category).toHaveProperty('name', 'New Category');
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget successfully', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'budget-id';

      const budget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: 'category-id',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(budget);
      mockBudgetRepository.delete.mockResolvedValue(budget);

      // 执行
      await budgetService.deleteBudget(budgetId, userId);

      // 验证
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.delete).toHaveBeenCalledWith(budgetId);
    });

    it('should throw error if budget does not exist', async () => {
      // 准备
      const userId = 'user-id';
      const budgetId = 'non-existent-budget-id';

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(budgetService.deleteBudget(budgetId, userId)).rejects.toThrow('预算不存在');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.delete).not.toHaveBeenCalled();
    });

    it('should throw error if user has no access to budget', async () => {
      // 准备
      const userId = 'user-id';
      const otherUserId = 'other-user-id';
      const budgetId = 'budget-id';

      const budget: BudgetWithCategory = {
        id: budgetId,
        name: 'Test Budget',
        amount: new Prisma.Decimal(1000),
        period: 'MONTHLY',
        categoryId: 'category-id',
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId: otherUserId, // 不同的用户ID
        familyId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
      };

      // 模拟行为
      mockBudgetRepository.findById.mockResolvedValue(budget);

      // 执行和验证
      await expect(budgetService.deleteBudget(budgetId, userId)).rejects.toThrow('无权删除此预算');
      expect(mockBudgetRepository.findById).toHaveBeenCalledWith(budgetId);
      expect(mockBudgetRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getActiveBudgets', () => {
    it('should get active budgets', async () => {
      // 准备
      const userId = 'user-id';
      const budgets: BudgetWithCategory[] = [
        {
          id: 'budget-id-1',
          name: 'Active Budget 1',
          amount: new Prisma.Decimal(1000),
          period: 'MONTHLY',
          categoryId: 'category-id',
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          rollover: false,
          userId,
          familyId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-id',
            name: 'Test Category',
            type: TransactionType.EXPENSE,
            icon: 'test-icon',
            userId,
            familyId: null,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      // 模拟行为
      mockBudgetRepository.findActiveBudgets.mockResolvedValue(budgets);
      mockBudgetRepository.calculateSpentAmount.mockResolvedValue(500);

      // 模拟toBudgetResponseDto函数的行为
      jest.spyOn(require('../../src/models/budget.model'), 'toBudgetResponseDto').mockReturnValue({
        id: 'budget-id-1',
        name: 'Active Budget 1',
        amount: 1000,
        period: 'MONTHLY',
        categoryId: 'category-id',
        category: {
          id: 'category-id',
          name: 'Test Category',
          type: TransactionType.EXPENSE,
          icon: 'test-icon',
        },
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        spent: 500,
        remaining: 500,
        progress: 50,
      });

      // 执行
      const result = await budgetService.getActiveBudgets(userId);

      // 验证
      expect(mockBudgetRepository.findActiveBudgets).toHaveBeenCalledWith(userId);
      expect(mockBudgetRepository.calculateSpentAmount).toHaveBeenCalledWith('budget-id-1');
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', 'budget-id-1');
      expect(result[0]).toHaveProperty('spent', 500);
      expect(result[0]).toHaveProperty('remaining');
      expect(result[0].remaining).toBeCloseTo(500);
      expect(result[0]).toHaveProperty('progress');
      expect(result[0].progress).toBeCloseTo(50);
    });
  });
});
