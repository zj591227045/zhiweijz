import { TransactionService } from '../services/transaction.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetTransactionService } from '../services/budget-transaction.service';
import { BudgetService } from '../services/budget.service';
import { TransactionType } from '@prisma/client';

// Mock dependencies
jest.mock('../repositories/transaction.repository');
jest.mock('../repositories/category.repository');
jest.mock('../services/budget-transaction.service');
jest.mock('../services/budget.service');

describe('TransactionService - 交易类型更新测试', () => {
  let transactionService: TransactionService;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockBudgetTransactionService: jest.Mocked<BudgetTransactionService>;
  let mockBudgetService: jest.Mocked<BudgetService>;

  beforeEach(() => {
    // 创建mock实例
    mockTransactionRepository = new TransactionRepository() as jest.Mocked<TransactionRepository>;
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;
    mockBudgetTransactionService = new BudgetTransactionService() as jest.Mocked<BudgetTransactionService>;
    mockBudgetService = new BudgetService() as jest.Mocked<BudgetService>;

    // 创建服务实例
    transactionService = new TransactionService();

    // 注入mock依赖
    (transactionService as any).transactionRepository = mockTransactionRepository;
    (transactionService as any).categoryRepository = mockCategoryRepository;
    (transactionService as any).budgetTransactionService = mockBudgetTransactionService;
    (transactionService as any).budgetService = mockBudgetService;

    // 清除所有mock
    jest.clearAllMocks();
  });

  describe('updateTransaction - 交易类型变更', () => {
    const userId = 'test-user-id';
    const transactionId = 'test-transaction-id';
    const categoryId = 'test-category-id';

    it('应该成功将收入交易更新为支出交易', async () => {
      // 准备原始交易数据（收入）
      const originalTransaction = {
        id: transactionId,
        amount: 1000,
        type: TransactionType.INCOME,
        categoryId: 'income-category-id',
        description: '工资收入',
        date: new Date('2023-01-01'),
        userId,
        familyId: null,
        familyMemberId: null,
        accountBookId: 'account-book-id',
        budgetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备支出分类数据
      const expenseCategory = {
        id: categoryId,
        name: '餐饮',
        type: TransactionType.EXPENSE,
        icon: 'food',
        userId,
        familyId: null,
        accountBookId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备更新数据（改为支出）
      const updateData = {
        type: TransactionType.EXPENSE,
        categoryId: categoryId,
        amount: 500,
        description: '午餐费用',
      };

      // 准备更新后的交易数据
      const updatedTransaction = {
        ...originalTransaction,
        ...updateData,
        date: originalTransaction.date,
      };

      // Mock repository方法
      mockTransactionRepository.findById.mockResolvedValue(originalTransaction);
      mockCategoryRepository.findById.mockResolvedValue(expenseCategory);
      mockTransactionRepository.update.mockResolvedValue(updatedTransaction);

      // Mock权限检查方法
      (transactionService as any).checkTransactionPermission = jest.fn().mockResolvedValue(true);

      // Mock预算相关方法
      mockBudgetTransactionService.recordTransaction.mockResolvedValue(undefined);
      (transactionService as any).isHistoricalTransaction = jest.fn().mockResolvedValue(false);

      // 执行更新
      const result = await transactionService.updateTransaction(transactionId, userId, updateData);

      // 验证分类查询使用了正确的分类ID
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);

      // 验证repository更新被调用
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        transactionId,
        expect.objectContaining({
          type: TransactionType.EXPENSE,
          categoryId: categoryId,
          amount: 500,
          description: '午餐费用',
        }),
        undefined
      );

      // 验证预算更新使用了正确的交易类型
      expect(mockBudgetTransactionService.recordTransaction).toHaveBeenCalledWith(
        originalTransaction.accountBookId,
        categoryId,
        500,
        TransactionType.EXPENSE, // 应该使用更新后的类型
        originalTransaction.date
      );

      // 验证返回结果
      expect(result.type).toBe(TransactionType.EXPENSE);
      expect(result.categoryId).toBe(categoryId);
    });

    it('应该在交易类型与分类类型不匹配时抛出错误', async () => {
      // 准备原始交易数据（收入）
      const originalTransaction = {
        id: transactionId,
        amount: 1000,
        type: TransactionType.INCOME,
        categoryId: 'income-category-id',
        description: '工资收入',
        date: new Date('2023-01-01'),
        userId,
        familyId: null,
        familyMemberId: null,
        accountBookId: 'account-book-id',
        budgetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备收入分类数据（类型不匹配）
      const incomeCategory = {
        id: categoryId,
        name: '工资',
        type: TransactionType.INCOME, // 收入分类
        icon: 'salary',
        userId,
        familyId: null,
        accountBookId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备更新数据（尝试改为支出但使用收入分类）
      const updateData = {
        type: TransactionType.EXPENSE, // 支出类型
        categoryId: categoryId, // 但使用收入分类
        amount: 500,
        description: '午餐费用',
      };

      // Mock repository方法
      mockTransactionRepository.findById.mockResolvedValue(originalTransaction);
      mockCategoryRepository.findById.mockResolvedValue(incomeCategory);

      // Mock权限检查方法
      (transactionService as any).checkTransactionPermission = jest.fn().mockResolvedValue(true);

      // 执行更新并期望抛出错误
      await expect(
        transactionService.updateTransaction(transactionId, userId, updateData)
      ).rejects.toThrow('记账类型与分类类型不匹配');

      // 验证分类查询被调用
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);

      // 验证repository更新没有被调用
      expect(mockTransactionRepository.update).not.toHaveBeenCalled();
    });

    it('应该在只更新分类时使用原始交易类型进行验证', async () => {
      // 准备原始交易数据（支出）
      const originalTransaction = {
        id: transactionId,
        amount: 1000,
        type: TransactionType.EXPENSE,
        categoryId: 'old-category-id',
        description: '旧的支出',
        date: new Date('2023-01-01'),
        userId,
        familyId: null,
        familyMemberId: null,
        accountBookId: 'account-book-id',
        budgetId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备新的支出分类数据
      const newExpenseCategory = {
        id: categoryId,
        name: '交通',
        type: TransactionType.EXPENSE,
        icon: 'transport',
        userId,
        familyId: null,
        accountBookId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 准备更新数据（只更新分类，不更新类型）
      const updateData = {
        categoryId: categoryId,
        description: '地铁费用',
      };

      // 准备更新后的交易数据
      const updatedTransaction = {
        ...originalTransaction,
        ...updateData,
      };

      // Mock repository方法
      mockTransactionRepository.findById.mockResolvedValue(originalTransaction);
      mockCategoryRepository.findById.mockResolvedValue(newExpenseCategory);
      mockTransactionRepository.update.mockResolvedValue(updatedTransaction);

      // Mock权限检查方法
      (transactionService as any).checkTransactionPermission = jest.fn().mockResolvedValue(true);

      // Mock预算相关方法
      mockBudgetTransactionService.recordTransaction.mockResolvedValue(undefined);
      (transactionService as any).isHistoricalTransaction = jest.fn().mockResolvedValue(false);

      // 执行更新
      const result = await transactionService.updateTransaction(transactionId, userId, updateData);

      // 验证分类查询使用了正确的分类ID
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);

      // 验证repository更新被调用
      expect(mockTransactionRepository.update).toHaveBeenCalledWith(
        transactionId,
        expect.objectContaining({
          categoryId: categoryId,
          description: '地铁费用',
        }),
        undefined
      );

      // 验证返回结果
      expect(result.categoryId).toBe(categoryId);
      expect(result.description).toBe('地铁费用');
    });
  });
});
