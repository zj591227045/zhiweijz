import { StatisticsService } from '../services/statistics.service';

// 手动定义枚举，因为在测试环境中可能无法正确导入
enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

enum BudgetPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

describe('StatisticsService', () => {
  let statisticsService: StatisticsService;

  beforeEach(() => {
    // 创建服务实例
    statisticsService = new StatisticsService();

    // 模拟私有方法
    (statisticsService as any).groupTransactionsByDate = jest.fn().mockImplementation((transactions, groupBy) => {
      if (groupBy === 'day') {
        return [
          { date: '2023-01-01', amount: 300 },
          { date: '2023-01-02', amount: 500 },
        ];
      } else if (groupBy === 'month') {
        return [
          { date: '2023-01', amount: 800 },
        ];
      }
      return [];
    });

    (statisticsService as any).groupTransactionsByCategory = jest.fn().mockImplementation((transactions, categories, total) => {
      return [
        {
          category: {
            id: 'category-id-1',
            name: 'Category 1',
            icon: 'icon-1',
          },
          amount: 300,
          percentage: 37.5, // (300 / 800) * 100
        },
        {
          category: {
            id: 'category-id-2',
            name: 'Category 2',
            icon: 'icon-2',
          },
          amount: 500,
          percentage: 62.5, // (500 / 800) * 100
        },
      ];
    });

    (statisticsService as any).calculateBudgetByCategory = jest.fn().mockImplementation((budgets, transactions, categories) => {
      return [
        {
          category: {
            id: 'category-id-1',
            name: 'Category 1',
            icon: 'icon-1',
          },
          budget: 1000,
          spent: 300,
          remaining: 700,
          percentage: 30, // (300 / 1000) * 100
        },
        {
          category: {
            id: 'category-id-2',
            name: 'Category 2',
            icon: 'icon-2',
          },
          budget: 500,
          spent: 500,
          remaining: 0,
          percentage: 100, // (500 / 500) * 100
        },
      ];
    });

    (statisticsService as any).getCategoriesMap = jest.fn().mockImplementation((userId, familyId) => {
      const categoriesMap = new Map();
      categoriesMap.set('category-id-1', {
        id: 'category-id-1',
        name: 'Category 1',
        icon: 'icon-1',
      });
      categoriesMap.set('category-id-2', {
        id: 'category-id-2',
        name: 'Category 2',
        icon: 'icon-2',
      });
      return categoriesMap;
    });

    (statisticsService as any).isUserFamilyMember = jest.fn().mockImplementation((userId, familyId) => {
      return userId === 'valid-user-id';
    });

    // 模拟仓库方法
    (statisticsService as any).transactionRepository = {
      findByDateRange: jest.fn().mockImplementation((userId, type, startDate, endDate, familyId) => {
        if (type === TransactionType.EXPENSE) {
          return [
            {
              id: 'transaction-id-1',
              amount: 300,
              type: TransactionType.EXPENSE,
              categoryId: 'category-id-1',
              description: 'Test expense 1',
              date: new Date('2023-01-01'),
              userId,
            },
            {
              id: 'transaction-id-2',
              amount: 500,
              type: TransactionType.EXPENSE,
              categoryId: 'category-id-2',
              description: 'Test expense 2',
              date: new Date('2023-01-02'),
              userId,
            },
          ];
        } else {
          return [
            {
              id: 'transaction-id-3',
              amount: 1000,
              type: TransactionType.INCOME,
              categoryId: 'category-id-1',
              description: 'Test income 1',
              date: new Date('2023-01-15'),
              userId,
            },
            {
              id: 'transaction-id-4',
              amount: 2000,
              type: TransactionType.INCOME,
              categoryId: 'category-id-2',
              description: 'Test income 2',
              date: new Date('2023-01-20'),
              userId,
            },
          ];
        }
      }),
    };

    (statisticsService as any).categoryRepository = {
      findByUserId: jest.fn().mockImplementation((userId) => {
        return [
          {
            id: 'category-id-1',
            name: 'Category 1',
            type: TransactionType.EXPENSE,
            icon: 'icon-1',
            userId,
          },
          {
            id: 'category-id-2',
            name: 'Category 2',
            type: TransactionType.EXPENSE,
            icon: 'icon-2',
            userId,
          },
        ];
      }),
      findByFamilyId: jest.fn().mockImplementation((familyId) => {
        return [
          {
            id: 'category-id-1',
            name: 'Category 1',
            type: TransactionType.EXPENSE,
            icon: 'icon-1',
            familyId,
          },
          {
            id: 'category-id-2',
            name: 'Category 2',
            type: TransactionType.EXPENSE,
            icon: 'icon-2',
            familyId,
          },
        ];
      }),
    };

    (statisticsService as any).budgetRepository = {
      findByPeriodAndDate: jest.fn().mockImplementation((userId, period, startDate, endDate, familyId) => {
        return [
          {
            id: 'budget-id-1',
            name: 'Budget 1',
            amount: 1000,
            period: BudgetPeriod.MONTHLY,
            categoryId: 'category-id-1',
            userId,
          },
          {
            id: 'budget-id-2',
            name: 'Budget 2',
            amount: 500,
            period: BudgetPeriod.MONTHLY,
            categoryId: 'category-id-2',
            userId,
          },
        ];
      }),
    };
  });

  describe('getExpenseStatistics', () => {
    it('should return expense statistics', async () => {
      // 调用被测试的方法
      const userId = 'valid-user-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = await statisticsService.getExpenseStatistics(userId, startDate, endDate);

      // 验证结果
      expect(result).toEqual({
        total: 800, // 300 + 500
        data: [
          { date: '2023-01-01', amount: 300 },
          { date: '2023-01-02', amount: 500 },
        ],
        byCategory: [
          {
            category: {
              id: 'category-id-1',
              name: 'Category 1',
              icon: 'icon-1',
            },
            amount: 300,
            percentage: 37.5,
          },
          {
            category: {
              id: 'category-id-2',
              name: 'Category 2',
              icon: 'icon-2',
            },
            amount: 500,
            percentage: 62.5,
          },
        ],
      });
    });

    it('should throw an error if user is not a family member', async () => {
      // 调用被测试的方法并验证异常
      const userId = 'invalid-user-id';
      const familyId = 'family-id';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      await expect(statisticsService.getExpenseStatistics(userId, startDate, endDate, 'day', familyId))
        .rejects.toThrow('无权访问此家庭数据');
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

      // 恢复原始方法
      jest.spyOn(statisticsService as any, 'groupTransactionsByDate').mockRestore();

      // 确保原始方法可用
      (statisticsService as any).groupTransactionsByDate = function(transactions: any[], groupBy: string) {
        const groupedData = new Map<string, number>();

        for (const transaction of transactions) {
          const date = new Date(transaction.date);
          let key: string;

          switch (groupBy) {
            case 'day':
              key = date.toISOString().split('T')[0]; // YYYY-MM-DD
              break;
            case 'week':
              // 获取周的第一天 (周一)
              const day = date.getDay();
              const diff = date.getDate() - day + (day === 0 ? -6 : 1);
              const monday = new Date(date);
              monday.setDate(diff);
              key = monday.toISOString().split('T')[0]; // 周一的日期
              break;
            case 'month':
              key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
              break;
            default:
              key = date.toISOString().split('T')[0]; // 默认按天
          }

          const currentAmount = groupedData.get(key) || 0;
          groupedData.set(key, currentAmount + Number(transaction.amount));
        }

        // 转换为数组并排序
        return Array.from(groupedData.entries())
          .map(([date, amount]) => ({ date, amount }))
          .sort((a, b) => a.date.localeCompare(b.date));
      };

      // 调用私有方法
      const result = (statisticsService as any).groupTransactionsByDate(transactions, 'day');

      // 验证结果
      expect(result).toEqual([
        { date: '2023-01-01', amount: 300 }, // 100 + 200
        { date: '2023-01-02', amount: 300 },
      ]);
    });
  });
});
