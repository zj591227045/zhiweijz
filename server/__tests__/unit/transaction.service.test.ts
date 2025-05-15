import { TransactionService } from '../../src/services/transaction.service';
import { TransactionRepository } from '../../src/repositories/transaction.repository';
import { CategoryRepository } from '../../src/repositories/category.repository';
import { TransactionType, Prisma } from '@prisma/client';

// 模拟依赖
jest.mock('../../src/repositories/transaction.repository');
jest.mock('../../src/repositories/category.repository');

describe('TransactionService', () => {
  let transactionService: TransactionService;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 设置模拟
    mockTransactionRepository = new TransactionRepository() as jest.Mocked<TransactionRepository>;
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;

    // 创建服务实例
    transactionService = new TransactionService();

    // 替换私有属性
    (transactionService as any).transactionRepository = mockTransactionRepository;
    (transactionService as any).categoryRepository = mockCategoryRepository;
  });

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      // 准备
      const userId = 'user-id';
      const categoryId = 'category-id';
      const transactionData = {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId,
        description: 'Test transaction',
        date: new Date(),
      };
      const category = {
        id: categoryId,
        name: 'Test Category',
        type: TransactionType.EXPENSE,
        icon: 'test-icon',
        userId: null,
        familyId: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const transaction = {
        id: 'transaction-id',
        amount: transactionData.amount,
        type: transactionData.type,
        categoryId: transactionData.categoryId,
        description: transactionData.description,
        date: transactionData.date,
        userId,
        familyId: null,
        familyMemberId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        category,
      };

      // 模拟行为
      mockCategoryRepository.findById.mockResolvedValue(category);
      mockTransactionRepository.create.mockResolvedValue(transaction);

      // 执行
      const result = await transactionService.createTransaction(userId, transactionData);

      // 验证
      expect(mockCategoryRepository.findById).toHaveBeenCalledWith(categoryId);
      expect(mockTransactionRepository.create).toHaveBeenCalledWith(userId, transactionData);
      expect(result.amount).toBe(transactionData.amount);
      expect(result.type).toBe(transactionData.type);
      expect(result.description).toBe(transactionData.description);
    });

    it('should throw error if category does not exist', async () => {
      // 准备
      const userId = 'user-id';
      const categoryId = 'nonexistent-category-id';
      const transactionData = {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId,
        description: 'Test transaction',
        date: new Date(),
      };

      // 模拟行为
      mockCategoryRepository.findById.mockResolvedValue(null);

      // 执行和验证
      await expect(transactionService.createTransaction(userId, transactionData)).rejects.toThrow('分类不存在');
      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if transaction type does not match category type', async () => {
      // 准备
      const userId = 'user-id';
      const categoryId = 'category-id';
      const transactionData = {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId,
        description: 'Test transaction',
        date: new Date(),
      };
      const category = {
        id: categoryId,
        name: 'Income Category',
        type: TransactionType.INCOME, // 不匹配的类型
        icon: 'income-icon',
        userId: null,
        familyId: null,
        isDefault: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 模拟行为
      mockCategoryRepository.findById.mockResolvedValue(category);

      // 执行和验证
      await expect(transactionService.createTransaction(userId, transactionData)).rejects.toThrow('交易类型与分类类型不匹配');
      expect(mockTransactionRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('should get transactions with pagination', async () => {
      // 准备
      const userId = 'user-id';
      const params = {
        page: 1,
        limit: 10,
      };
      const transactions = [
        {
          id: 'transaction1-id',
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: 'category-id',
          description: 'Transaction 1',
          date: new Date(),
          userId,
          familyId: null,
          familyMemberId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-id',
            name: 'Test Category',
            type: TransactionType.EXPENSE,
            icon: 'test-icon',
            userId: null,
            familyId: null,
            isDefault: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];

      // 模拟行为
      mockTransactionRepository.findAll.mockResolvedValue({
        transactions,
        total: 1,
      });

      // 执行
      const result = await transactionService.getTransactions(userId, params);

      // 验证
      expect(mockTransactionRepository.findAll).toHaveBeenCalledWith(userId, params);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].amount).toBe(100);
      expect(result.data[0].type).toBe(TransactionType.EXPENSE);
    });
  });
});
