import { StatisticsService } from '../services/statistics.service';
import { TransactionRepository } from '../repositories/transaction.repository';
import { CategoryRepository } from '../repositories/category.repository';
import { BudgetRepository } from '../repositories/budget.repository';
import { FamilyRepository } from '../repositories/family.repository';

// 手动定义枚举，因为在测试环境中可能无法正确导入
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum BudgetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

// 模拟依赖
jest.mock('../repositories/transaction.repository');
jest.mock('../repositories/category.repository');
jest.mock('../repositories/budget.repository');
jest.mock('../repositories/family.repository');

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;
  let mockTransactionRepository: jest.Mocked<TransactionRepository>;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;
  let mockBudgetRepository: jest.Mocked<BudgetRepository>;
  let mockFamilyRepository: jest.Mocked<FamilyRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 创建模拟实例
    mockTransactionRepository = {} as jest.Mocked<TransactionRepository>;
    mockTransactionRepository.findByDateRange = jest.fn();

    mockCategoryRepository = {} as jest.Mocked<CategoryRepository>;
    mockCategoryRepository.findByUserId = jest.fn();
    mockCategoryRepository.findByFamilyId = jest.fn();

    mockBudgetRepository = {} as jest.Mocked<BudgetRepository>;
    mockBudgetRepository.findByPeriodAndDate = jest.fn();

    mockFamilyRepository = {} as jest.Mocked<FamilyRepository>;
    mockFamilyRepository.findFamilyById = jest.fn();
    mockFamilyRepository.findFamilyMemberByUserAndFamily = jest.fn();

    // 模拟StatisticsService中的依赖注入
    jest.mock('../repositories/transaction.repository', () => ({
      TransactionRepository: jest.fn().mockImplementation(() => mockTransactionRepository),
    }));

    jest.mock('../repositories/category.repository', () => ({
      CategoryRepository: jest.fn().mockImplementation(() => mockCategoryRepository),
    }));

    jest.mock('../repositories/budget.repository', () => ({
      BudgetRepository: jest.fn().mockImplementation(() => mockBudgetRepository),
    }));

    jest.mock('../repositories/family.repository', () => ({
      FamilyRepository: jest.fn().mockImplementation(() => mockFamilyRepository),
    }));

    // 创建服务实例
    statisticsService = new StatisticsService();

    // 手动设置服务实例的仓库
    (statisticsService as any).transactionRepository = mockTransactionRepository;
    (statisticsService as any).categoryRepository = mockCategoryRepository;
    (statisticsService as any).budgetRepository = mockBudgetRepository;
    (statisticsService as any).familyRepository = mockFamilyRepository;
  });

  describe('getExpenseStatistics', () => {
    it('should return expense statistics', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const mockTransactions = [
        {
          id: 'transaction-id-1',
          amount: 100,
          type: TransactionType.EXPENSE,
          categoryId: 'category-id-1',
          description: 'Test expense 1',
          date: new Date('2023-01-15'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction-id-2',
          amount: 200,
          type: TransactionType.EXPENSE,
          categoryId: 'category-id-2',
          description: 'Test expense 2',
          date: new Date('2023-01-20'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockCategories = [
        {
          id: 'category-id-1',
          name: 'Category 1',
          type: TransactionType.EXPENSE,
          icon: 'icon-1',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category-id-2',
          name: 'Category 2',
          type: TransactionType.EXPENSE,
          icon: 'icon-2',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 设置模拟行为
      // 模拟isUserFamilyMember方法
      jest.spyOn(statisticsService, 'isUserFamilyMember' as any).mockResolvedValue(true);
      mockTransactionRepository.findByDateRange = jest.fn().mockResolvedValue(mockTransactions);
      mockCategoryRepository.findByUserId = jest.fn().mockResolvedValue(mockCategories);

      // 调用被测试的方法
      const result = await statisticsService.getExpenseStatistics(userId, startDate, endDate);

      // 验证结果
      expect(mockTransactionRepository.findByDateRange).toHaveBeenCalledWith(
        userId,
        TransactionType.EXPENSE,
        startDate,
        endDate,
        undefined,
      );
      expect(mockCategoryRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          total: 300, // 100 + 200
          data: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              amount: expect.any(Number),
            }),
          ]),
          byCategory: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
              }),
              amount: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
        }),
      );
    });

    it('should throw an error if user is not a family member', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const familyId = 'family-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      // 设置模拟行为
      // 模拟isUserFamilyMember方法
      jest.spyOn(statisticsService, 'isUserFamilyMember' as any).mockResolvedValue(false);

      // 调用被测试的方法并验证异常
      await expect(
        statisticsService.getExpenseStatistics(userId, startDate, endDate, 'day', familyId),
      ).rejects.toThrow('无权访问此家庭数据');
      expect((statisticsService as any).isUserFamilyMember).toHaveBeenCalledWith(userId, familyId);
      expect(mockTransactionRepository.findByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('getBudgetStatistics', () => {
    it('should return budget statistics', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const month = '2023-01';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31T23:59:59.999');
      const mockBudgets = [
        {
          id: 'budget-id-1',
          name: 'Budget 1',
          amount: 1000,
          period: BudgetPeriod.MONTHLY,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
          categoryId: 'category-id-1',
          userId,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-id-1',
            name: 'Category 1',
            type: TransactionType.EXPENSE,
            icon: 'icon-1',
            userId,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        {
          id: 'budget-id-2',
          name: 'Budget 2',
          amount: 500,
          period: BudgetPeriod.MONTHLY,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
          categoryId: 'category-id-2',
          userId,
          rollover: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: {
            id: 'category-id-2',
            name: 'Category 2',
            type: TransactionType.EXPENSE,
            icon: 'icon-2',
            userId,
            isDefault: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ];
      const mockTransactions = [
        {
          id: 'transaction-id-1',
          amount: 300,
          type: TransactionType.EXPENSE,
          categoryId: 'category-id-1',
          description: 'Test expense 1',
          date: new Date('2023-01-15'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction-id-2',
          amount: 200,
          type: TransactionType.EXPENSE,
          categoryId: 'category-id-2',
          description: 'Test expense 2',
          date: new Date('2023-01-20'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockCategories = [
        {
          id: 'category-id-1',
          name: 'Category 1',
          type: TransactionType.EXPENSE,
          icon: 'icon-1',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category-id-2',
          name: 'Category 2',
          type: TransactionType.EXPENSE,
          icon: 'icon-2',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 设置模拟行为
      // 模拟isUserFamilyMember方法
      jest.spyOn(statisticsService, 'isUserFamilyMember' as any).mockResolvedValue(true);
      mockBudgetRepository.findByPeriodAndDate = jest.fn().mockResolvedValue(mockBudgets);
      mockTransactionRepository.findByDateRange = jest.fn().mockResolvedValue(mockTransactions);
      mockCategoryRepository.findByUserId = jest.fn().mockResolvedValue(mockCategories);

      // 调用被测试的方法
      const result = await statisticsService.getBudgetStatistics(userId, month);

      // 验证结果
      expect(mockBudgetRepository.findByPeriodAndDate).toHaveBeenCalledWith(
        userId,
        BudgetPeriod.MONTHLY,
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
      expect(mockTransactionRepository.findByDateRange).toHaveBeenCalledWith(
        userId,
        TransactionType.EXPENSE,
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
      expect(mockCategoryRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          totalBudget: 1500, // 1000 + 500
          totalSpent: 500, // 300 + 200
          remaining: 1000, // 1500 - 500
          percentage: expect.any(Number),
          categories: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
              }),
              budget: expect.any(Number),
              spent: expect.any(Number),
              remaining: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
        }),
      );
    });
  });

  describe('getIncomeStatistics', () => {
    it('should return income statistics', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const mockTransactions = [
        {
          id: 'transaction-id-1',
          amount: 1000,
          type: TransactionType.INCOME,
          categoryId: 'category-id-1',
          description: 'Test income 1',
          date: new Date('2023-01-15'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction-id-2',
          amount: 2000,
          type: TransactionType.INCOME,
          categoryId: 'category-id-2',
          description: 'Test income 2',
          date: new Date('2023-01-20'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockCategories = [
        {
          id: 'category-id-1',
          name: 'Income Category 1',
          type: TransactionType.INCOME,
          icon: 'icon-1',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category-id-2',
          name: 'Income Category 2',
          type: TransactionType.INCOME,
          icon: 'icon-2',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 设置模拟行为
      mockFamilyRepository.isUserFamilyMember = jest.fn().mockResolvedValue(true);
      mockTransactionRepository.findByDateRange = jest.fn().mockResolvedValue(mockTransactions);
      mockCategoryRepository.findByUserId = jest.fn().mockResolvedValue(mockCategories);

      // 调用被测试的方法
      const result = await statisticsService.getIncomeStatistics(userId, startDate, endDate);

      // 验证结果
      expect(mockTransactionRepository.findByDateRange).toHaveBeenCalledWith(
        userId,
        TransactionType.INCOME,
        startDate,
        endDate,
        undefined,
      );
      expect(mockCategoryRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          total: 3000, // 1000 + 2000
          data: expect.arrayContaining([
            expect.objectContaining({
              date: expect.any(String),
              amount: expect.any(Number),
            }),
          ]),
          byCategory: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
              }),
              amount: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
        }),
      );
    });
  });

  describe('getFinancialOverview', () => {
    it('should return financial overview', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const mockIncomeTransactions = [
        {
          id: 'transaction-id-1',
          amount: 5000,
          type: TransactionType.INCOME,
          categoryId: 'income-category-id-1',
          description: 'Test income 1',
          date: new Date('2023-01-15'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction-id-2',
          amount: 3000,
          type: TransactionType.INCOME,
          categoryId: 'income-category-id-2',
          description: 'Test income 2',
          date: new Date('2023-01-20'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockExpenseTransactions = [
        {
          id: 'transaction-id-3',
          amount: 1000,
          type: TransactionType.EXPENSE,
          categoryId: 'expense-category-id-1',
          description: 'Test expense 1',
          date: new Date('2023-01-15'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'transaction-id-4',
          amount: 2000,
          type: TransactionType.EXPENSE,
          categoryId: 'expense-category-id-2',
          description: 'Test expense 2',
          date: new Date('2023-01-20'),
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      const mockCategories = [
        {
          id: 'income-category-id-1',
          name: 'Income Category 1',
          type: TransactionType.INCOME,
          icon: 'icon-1',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'income-category-id-2',
          name: 'Income Category 2',
          type: TransactionType.INCOME,
          icon: 'icon-2',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'expense-category-id-1',
          name: 'Expense Category 1',
          type: TransactionType.EXPENSE,
          icon: 'icon-3',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'expense-category-id-2',
          name: 'Expense Category 2',
          type: TransactionType.EXPENSE,
          icon: 'icon-4',
          userId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 设置模拟行为
      // 模拟isUserFamilyMember方法
      jest.spyOn(statisticsService, 'isUserFamilyMember' as any).mockResolvedValue(true);
      mockTransactionRepository.findByDateRange = jest
        .fn()
        .mockImplementation((userId, type, startDate, endDate, familyId) => {
          if (type === TransactionType.INCOME) {
            return Promise.resolve(mockIncomeTransactions);
          } else {
            return Promise.resolve(mockExpenseTransactions);
          }
        });
      mockCategoryRepository.findByUserId = jest.fn().mockResolvedValue(mockCategories);

      // 调用被测试的方法
      const result = await statisticsService.getFinancialOverview(userId, startDate, endDate);

      // 验证结果
      expect(mockTransactionRepository.findByDateRange).toHaveBeenCalledTimes(2);
      expect(mockCategoryRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          income: 8000, // 5000 + 3000
          expense: 3000, // 1000 + 2000
          netIncome: 5000, // 8000 - 3000
          topIncomeCategories: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
              }),
              amount: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
          topExpenseCategories: expect.arrayContaining([
            expect.objectContaining({
              category: expect.objectContaining({
                id: expect.any(String),
                name: expect.any(String),
              }),
              amount: expect.any(Number),
              percentage: expect.any(Number),
            }),
          ]),
        }),
      );
    });

    it('should throw an error if user is not a family member', async () => {
      // 准备测试数据
      const userId = 'user-id';
      const familyId = 'family-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      // 设置模拟行为
      // 模拟isUserFamilyMember方法
      jest.spyOn(statisticsService, 'isUserFamilyMember' as any).mockResolvedValue(false);

      // 调用被测试的方法并验证异常
      await expect(
        statisticsService.getFinancialOverview(userId, startDate, endDate, familyId),
      ).rejects.toThrow('无权访问此家庭数据');
      expect((statisticsService as any).isUserFamilyMember).toHaveBeenCalledWith(userId, familyId);
      expect(mockTransactionRepository.findByDateRange).not.toHaveBeenCalled();
    });
  });

  describe('groupTransactionsByDate', () => {
    it('should group transactions by day', () => {
      // 准备测试数据
      const transactions = [
        {
          id: 'transaction-id-1',
          amount: 100,
          date: new Date('2023-01-01'),
        },
        {
          id: 'transaction-id-2',
          amount: 200,
          date: new Date('2023-01-01'),
        },
        {
          id: 'transaction-id-3',
          amount: 300,
          date: new Date('2023-01-02'),
        },
      ];

      // 调用私有方法（通过反射）
      const result = (statisticsService as any).groupTransactionsByDate(transactions, 'day');

      // 验证结果
      expect(result).toEqual([
        { date: '2023-01-01', amount: 300 }, // 100 + 200
        { date: '2023-01-02', amount: 300 },
      ]);
    });

    it('should group transactions by month', () => {
      // 准备测试数据
      const transactions = [
        {
          id: 'transaction-id-1',
          amount: 100,
          date: new Date('2023-01-15'),
        },
        {
          id: 'transaction-id-2',
          amount: 200,
          date: new Date('2023-01-20'),
        },
        {
          id: 'transaction-id-3',
          amount: 300,
          date: new Date('2023-02-10'),
        },
      ];

      // 调用私有方法（通过反射）
      const result = (statisticsService as any).groupTransactionsByDate(transactions, 'month');

      // 验证结果
      expect(result).toEqual([
        { date: '2023-01', amount: 300 }, // 100 + 200
        { date: '2023-02', amount: 300 },
      ]);
    });
  });
});
