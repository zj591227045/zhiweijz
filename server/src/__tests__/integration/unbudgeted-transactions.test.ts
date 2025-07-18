import request from 'supertest';
import { app } from '../../app';
import { prisma } from '../../lib/prisma';
import { generateTestToken } from '../helpers/auth-helper';

describe('无预算记账功能集成测试', () => {
  let authToken: string;
  let testUserId: string;
  let testAccountBookId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    // 创建测试用户
    const testUser = await prisma.user.create({
      data: {
        email: 'test-unbudgeted@example.com',
        name: '测试用户',
        password: 'hashedpassword',
      },
    });
    testUserId = testUser.id;
    authToken = generateTestToken(testUserId);

    // 创建测试账本
    const testAccountBook = await prisma.accountBook.create({
      data: {
        name: '测试账本',
        type: 'PERSONAL',
        userId: testUserId,
      },
    });
    testAccountBookId = testAccountBook.id;

    // 创建测试分类
    const testCategory = await prisma.category.create({
      data: {
        name: '测试分类',
        type: 'EXPENSE',
        icon: '🛒',
        userId: testUserId,
      },
    });
    testCategoryId = testCategory.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.category.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.accountBook.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
  });

  beforeEach(async () => {
    // 清理记账记录
    await prisma.transaction.deleteMany({
      where: { userId: testUserId },
    });
  });

  describe('检查无预算记账API', () => {
    it('当存在无预算记账时应返回true', async () => {
      // 创建无预算记账
      await prisma.transaction.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: testCategoryId,
          description: '无预算记账',
          date: new Date('2024-01-15'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          budgetId: null, // 无预算
        },
      });

      const response = await request(app)
        .get('/api/statistics/check-unbudgeted')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          accountBookId: testAccountBookId,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.hasUnbudgetedTransactions).toBe(true);
    });

    it('当不存在无预算记账时应返回false', async () => {
      // 创建有预算的记账（需要先创建预算）
      const testBudget = await prisma.budget.create({
        data: {
          amount: 1000,
          period: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          name: '测试预算',
        },
      });

      await prisma.transaction.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: testCategoryId,
          description: '有预算记账',
          date: new Date('2024-01-15'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          budgetId: testBudget.id, // 有预算
        },
      });

      const response = await request(app)
        .get('/api/statistics/check-unbudgeted')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          accountBookId: testAccountBookId,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.hasUnbudgetedTransactions).toBe(false);

      // 清理预算
      await prisma.budget.delete({ where: { id: testBudget.id } });
    });
  });

  describe('统计数据筛选', () => {
    it('使用NO_BUDGET筛选应只返回无预算记账的统计', async () => {
      // 创建有预算的记账
      const testBudget = await prisma.budget.create({
        data: {
          amount: 1000,
          period: 'MONTHLY',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          name: '测试预算',
        },
      });

      await prisma.transaction.create({
        data: {
          amount: 200,
          type: 'EXPENSE',
          categoryId: testCategoryId,
          description: '有预算记账',
          date: new Date('2024-01-15'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          budgetId: testBudget.id,
        },
      });

      // 创建无预算记账
      await prisma.transaction.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: testCategoryId,
          description: '无预算记账',
          date: new Date('2024-01-16'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          budgetId: null,
        },
      });

      // 测试无预算筛选
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          accountBookId: testAccountBookId,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          budgetId: 'NO_BUDGET',
        });

      expect(response.status).toBe(200);
      expect(response.body.totalExpense).toBe(100); // 只包含无预算记账
      expect(response.body.expenseCategories).toHaveLength(1);
      expect(response.body.expenseCategories[0].amount).toBe(100);

      // 清理预算
      await prisma.budget.delete({ where: { id: testBudget.id } });
    });

    it('不使用预算筛选应返回所有记账的统计', async () => {
      // 创建无预算记账
      await prisma.transaction.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: testCategoryId,
          description: '无预算记账',
          date: new Date('2024-01-16'),
          userId: testUserId,
          accountBookId: testAccountBookId,
          budgetId: null,
        },
      });

      // 测试全部记账统计
      const response = await request(app)
        .get('/api/statistics/overview')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          accountBookId: testAccountBookId,
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.totalExpense).toBe(100);
      expect(response.body.expenseCategories).toHaveLength(1);
    });
  });
});
