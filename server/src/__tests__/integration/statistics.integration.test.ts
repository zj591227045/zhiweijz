import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../../utils/jwt';
import { hashPassword } from '../../utils/password';

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

enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

// 创建一个新的Prisma客户端实例用于测试
const prisma = new PrismaClient();

describe('Statistics API Integration Tests', () => {
  // 测试用户数据
  const testUser = {
    id: '',
    email: 'stats-test-user@example.com',
    password: 'Password123!',
    name: 'Stats Test User',
  };

  // 测试家庭数据
  const testFamily = {
    id: '',
    name: 'Stats Test Family',
    createdBy: '',
  };

  // 测试分类数据
  const testIncomeCategory = {
    id: '',
    name: 'Test Income Category',
    type: TransactionType.INCOME,
  };

  const testExpenseCategory = {
    id: '',
    name: 'Test Expense Category',
    type: TransactionType.EXPENSE,
  };

  // 测试预算数据
  const testBudget = {
    id: '',
    name: 'Test Budget',
    amount: 1000,
  };

  // 测试令牌
  let token: string;

  // 在所有测试之前设置测试数据
  beforeAll(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({
      where: {
        user: {
          email: testUser.email,
        },
      },
    });
    await prisma.budget.deleteMany({
      where: {
        user: {
          email: testUser.email,
        },
      },
    });
    await prisma.category.deleteMany({
      where: {
        user: {
          email: testUser.email,
        },
      },
    });
    await prisma.familyMember.deleteMany({
      where: {
        family: {
          name: testFamily.name,
        },
      },
    });
    await prisma.family.deleteMany({
      where: {
        name: testFamily.name,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: testUser.email,
      },
    });

    // 创建测试用户
    const hashedPassword = await hashPassword(testUser.password);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash: hashedPassword,
        name: testUser.name,
      },
    });
    testUser.id = user.id;
    token = generateToken({ id: user.id });

    // 创建测试家庭
    const family = await prisma.family.create({
      data: {
        name: testFamily.name,
        createdBy: testUser.id,
      },
    });
    testFamily.id = family.id;
    testFamily.createdBy = family.createdBy;

    // 创建家庭成员
    await prisma.familyMember.create({
      data: {
        familyId: testFamily.id,
        userId: testUser.id,
        name: testUser.name,
        role: Role.ADMIN,
        isRegistered: true,
      },
    });

    // 创建测试分类
    const incomeCategory = await prisma.category.create({
      data: {
        name: testIncomeCategory.name,
        type: testIncomeCategory.type,
        icon: 'income-icon',
        userId: testUser.id,
        isDefault: false,
      },
    });
    testIncomeCategory.id = incomeCategory.id;

    const expenseCategory = await prisma.category.create({
      data: {
        name: testExpenseCategory.name,
        type: testExpenseCategory.type,
        icon: 'expense-icon',
        userId: testUser.id,
        isDefault: false,
      },
    });
    testExpenseCategory.id = expenseCategory.id;

    // 创建测试预算
    const budget = await prisma.budget.create({
      data: {
        name: testBudget.name,
        amount: testBudget.amount,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        categoryId: testExpenseCategory.id,
        userId: testUser.id,
        rollover: false,
      },
    });
    testBudget.id = budget.id;

    // 创建测试记账记录
    // 收入记账
    await prisma.transaction.create({
      data: {
        amount: 2000,
        type: TransactionType.INCOME,
        categoryId: testIncomeCategory.id,
        description: 'Test income transaction 1',
        date: new Date(),
        userId: testUser.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: 1500,
        type: TransactionType.INCOME,
        categoryId: testIncomeCategory.id,
        description: 'Test income transaction 2',
        date: new Date(new Date().setDate(new Date().getDate() - 5)),
        userId: testUser.id,
      },
    });

    // 支出记账
    await prisma.transaction.create({
      data: {
        amount: 500,
        type: TransactionType.EXPENSE,
        categoryId: testExpenseCategory.id,
        description: 'Test expense transaction 1',
        date: new Date(),
        userId: testUser.id,
      },
    });

    await prisma.transaction.create({
      data: {
        amount: 300,
        type: TransactionType.EXPENSE,
        categoryId: testExpenseCategory.id,
        description: 'Test expense transaction 2',
        date: new Date(new Date().setDate(new Date().getDate() - 3)),
        userId: testUser.id,
      },
    });
  });

  // 在所有测试之后清理测试数据
  afterAll(async () => {
    // 清理测试数据
    try {
      await prisma.transaction.deleteMany({
        where: {
          user: {
            email: testUser.email,
          },
        },
      });
      await prisma.budget.deleteMany({
        where: {
          user: {
            email: testUser.email,
          },
        },
      });
      await prisma.category.deleteMany({
        where: {
          user: {
            email: testUser.email,
          },
        },
      });
      await prisma.familyMember.deleteMany({
        where: {
          family: {
            name: testFamily.name,
          },
        },
      });
      await prisma.family.deleteMany({
        where: {
          name: testFamily.name,
        },
      });
      await prisma.user.deleteMany({
        where: {
          email: testUser.email,
        },
      });

      // 断开Prisma连接
      await prisma.$disconnect();
    } catch (error) {
      console.error('清理测试数据失败:', error);
      // 继续执行，不要因为清理失败而中断测试
    }
  });

  describe('GET /api/statistics/expenses', () => {
    it('should return expense statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/expenses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 800); // 500 + 300
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('byCategory');
      expect(Array.isArray(response.body.byCategory)).toBe(true);
      expect(response.body.byCategory).toHaveLength(1);
      expect(response.body.byCategory[0]).toHaveProperty('category');
      expect(response.body.byCategory[0].category).toHaveProperty('id', testExpenseCategory.id);
      expect(response.body.byCategory[0]).toHaveProperty('amount', 800);
      expect(response.body.byCategory[0]).toHaveProperty('percentage', 100);
    });

    it('should filter by date range', async () => {
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        .toISOString()
        .split('T')[0];
      const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
        .toISOString()
        .split('T')[0];

      const response = await request(app)
        .get(`/api/statistics/expenses?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 500); // 只有今天的记账
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app).get('/api/statistics/expenses');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/statistics/income', () => {
    it('should return income statistics', async () => {
      const response = await request(app)
        .get('/api/statistics/income')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total', 3500); // 2000 + 1500
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty('byCategory');
      expect(Array.isArray(response.body.byCategory)).toBe(true);
      expect(response.body.byCategory).toHaveLength(1);
      expect(response.body.byCategory[0]).toHaveProperty('category');
      expect(response.body.byCategory[0].category).toHaveProperty('id', testIncomeCategory.id);
      expect(response.body.byCategory[0]).toHaveProperty('amount', 3500);
      expect(response.body.byCategory[0]).toHaveProperty('percentage', 100);
    });
  });

  describe('GET /api/statistics/budgets', () => {
    it('should return budget statistics', async () => {
      const currentMonth = `${new Date().getFullYear()}-${String(
        new Date().getMonth() + 1,
      ).padStart(2, '0')}`;

      const response = await request(app)
        .get(`/api/statistics/budgets?month=${currentMonth}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalBudget', 1000);
      expect(response.body).toHaveProperty('totalSpent', 800); // 500 + 300
      expect(response.body).toHaveProperty('remaining', 200); // 1000 - 800
      expect(response.body).toHaveProperty('percentage', 80); // (800 / 1000) * 100
      expect(response.body).toHaveProperty('categories');
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body.categories).toHaveLength(1);
      expect(response.body.categories[0]).toHaveProperty('category');
      expect(response.body.categories[0].category).toHaveProperty('id', testExpenseCategory.id);
      expect(response.body.categories[0]).toHaveProperty('budget', 1000);
      expect(response.body.categories[0]).toHaveProperty('spent', 800);
      expect(response.body.categories[0]).toHaveProperty('remaining', 200);
      expect(response.body.categories[0]).toHaveProperty('percentage', 80);
    });
  });

  describe('GET /api/statistics/overview', () => {
    it('should return financial overview', async () => {
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('income', 3500); // 2000 + 1500
      expect(response.body).toHaveProperty('expense', 800); // 500 + 300
      expect(response.body).toHaveProperty('netIncome', 2700); // 3500 - 800
      expect(response.body).toHaveProperty('topIncomeCategories');
      expect(Array.isArray(response.body.topIncomeCategories)).toBe(true);
      expect(response.body.topIncomeCategories).toHaveLength(1);
      expect(response.body.topIncomeCategories[0]).toHaveProperty('category');
      expect(response.body.topIncomeCategories[0].category).toHaveProperty(
        'id',
        testIncomeCategory.id,
      );
      expect(response.body.topIncomeCategories[0]).toHaveProperty('amount', 3500);
      expect(response.body.topIncomeCategories[0]).toHaveProperty('percentage', 100);
      expect(response.body).toHaveProperty('topExpenseCategories');
      expect(Array.isArray(response.body.topExpenseCategories)).toBe(true);
      expect(response.body.topExpenseCategories).toHaveLength(1);
      expect(response.body.topExpenseCategories[0]).toHaveProperty('category');
      expect(response.body.topExpenseCategories[0].category).toHaveProperty(
        'id',
        testExpenseCategory.id,
      );
      expect(response.body.topExpenseCategories[0]).toHaveProperty('amount', 800);
      expect(response.body.topExpenseCategories[0]).toHaveProperty('percentage', 100);
    });
  });
});
