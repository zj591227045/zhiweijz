/**
 * 测试多人预算分摊在仪表盘和预算分析页面的显示
 * 
 * 问题描述：
 * 1. 多人预算分摊的记账记录在仪表盘的预算执行情况中没有统计
 * 2. 多人预算分摊的记账记录在预算分析页面(/budgets/statistics)中没有统计
 * 3. 但在统计页面(/statistics)中能正确显示
 * 
 * 根本原因：
 * - calculateSpentAmount 方法只查询 budgetId 字段匹配的记录
 * - 多人预算分摊记录的 budgetId 为 null，分摊信息存储在 budgetAllocation JSON 字段中
 * 
 * 修复方案：
 * - 修改 calculateSpentAmount 方法，增加对多人预算分摊记录的查询和计算
 * - 修改 calculateMemberSpentAmount 方法，增加对多人预算分摊记录的查询和计算
 */

import { BudgetRepository } from '../repositories/budget.repository';
import { TransactionRepository } from '../repositories/transaction.repository';
import prisma from '../config/database';
import { BudgetPeriod, BudgetType, TransactionType } from '@prisma/client';

describe('多人预算分摊修复测试', () => {
  let budgetRepository: BudgetRepository;
  let transactionRepository: TransactionRepository;
  let testUserId: string;
  let testAccountBookId: string;
  let testBudgetId1: string;
  let testBudgetId2: string;
  let testCategoryId: string;

  beforeAll(async () => {
    budgetRepository = new BudgetRepository();
    transactionRepository = new TransactionRepository();

    // 创建测试用户
    const user = await prisma.user.create({
      data: {
        email: 'test-multibudget@example.com',
        password: 'test123',
        name: '测试用户',
      },
    });
    testUserId = user.id;

    // 创建测试账本
    const accountBook = await prisma.accountBook.create({
      data: {
        name: '测试账本',
        type: 'PERSONAL',
        userId: testUserId,
      },
    });
    testAccountBookId = accountBook.id;

    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: '购物',
        type: 'EXPENSE',
        icon: 'shopping',
        userId: testUserId,
      },
    });
    testCategoryId = category.id;

    // 创建两个测试预算
    const startDate = new Date('2025-10-01');
    const endDate = new Date('2025-10-31');

    const budget1 = await prisma.budget.create({
      data: {
        name: '个人预算1',
        amount: 2000,
        period: BudgetPeriod.MONTHLY,
        startDate,
        endDate,
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetType: BudgetType.PERSONAL,
        rollover: false,
      },
    });
    testBudgetId1 = budget1.id;

    const budget2 = await prisma.budget.create({
      data: {
        name: '个人预算2',
        amount: 3000,
        period: BudgetPeriod.MONTHLY,
        startDate,
        endDate,
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetType: BudgetType.PERSONAL,
        rollover: false,
      },
    });
    testBudgetId2 = budget2.id;
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.transaction.deleteMany({ where: { userId: testUserId } });
    await prisma.budget.deleteMany({ where: { userId: testUserId } });
    await prisma.category.deleteMany({ where: { userId: testUserId } });
    await prisma.accountBook.deleteMany({ where: { userId: testUserId } });
    await prisma.user.delete({ where: { id: testUserId } });
  });

  test('应该正确计算单人预算记录的支出', async () => {
    // 创建单人预算记录
    await prisma.transaction.create({
      data: {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: '单人预算测试',
        date: new Date('2025-10-15'),
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetId: testBudgetId1,
        isMultiBudget: false,
      },
    });

    const spent = await budgetRepository.calculateSpentAmount(testBudgetId1);
    expect(spent).toBe(100);
  });

  test('应该正确计算多人预算分摊记录的支出', async () => {
    // 创建多人预算分摊记录
    const budgetAllocation = [
      {
        budgetId: testBudgetId1,
        budgetName: '个人预算1',
        memberName: '测试用户',
        amount: 26,
      },
      {
        budgetId: testBudgetId2,
        budgetName: '个人预算2',
        memberName: '测试用户',
        amount: 26,
      },
    ];

    await prisma.transaction.create({
      data: {
        amount: 52,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: '多人预算分摊测试',
        date: new Date('2025-10-15'),
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetId: null, // 多人预算分摊记录的budgetId为null
        isMultiBudget: true,
        budgetAllocation: budgetAllocation as any,
      },
    });

    // 验证预算1的支出（应该包含单人预算100 + 多人预算分摊26）
    const spent1 = await budgetRepository.calculateSpentAmount(testBudgetId1);
    expect(spent1).toBe(126);

    // 验证预算2的支出（应该只包含多人预算分摊26）
    const spent2 = await budgetRepository.calculateSpentAmount(testBudgetId2);
    expect(spent2).toBe(26);
  });

  test('应该正确处理混合的单人和多人预算记录', async () => {
    // 再创建一条单人预算记录
    await prisma.transaction.create({
      data: {
        amount: 50,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: '单人预算测试2',
        date: new Date('2025-10-16'),
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetId: testBudgetId1,
        isMultiBudget: false,
      },
    });

    // 再创建一条多人预算分摊记录
    const budgetAllocation = [
      {
        budgetId: testBudgetId1,
        budgetName: '个人预算1',
        memberName: '测试用户',
        amount: 30,
      },
      {
        budgetId: testBudgetId2,
        budgetName: '个人预算2',
        memberName: '测试用户',
        amount: 20,
      },
    ];

    await prisma.transaction.create({
      data: {
        amount: 50,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: '多人预算分摊测试2',
        date: new Date('2025-10-16'),
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetId: null,
        isMultiBudget: true,
        budgetAllocation: budgetAllocation as any,
      },
    });

    // 验证预算1的总支出（100 + 26 + 50 + 30 = 206）
    const spent1 = await budgetRepository.calculateSpentAmount(testBudgetId1);
    expect(spent1).toBe(206);

    // 验证预算2的总支出（26 + 20 = 46）
    const spent2 = await budgetRepository.calculateSpentAmount(testBudgetId2);
    expect(spent2).toBe(46);
  });

  test('应该忽略不属于该预算的多人预算分摊记录', async () => {
    // 创建一个不包含testBudgetId1的多人预算分摊记录
    const budgetAllocation = [
      {
        budgetId: testBudgetId2,
        budgetName: '个人预算2',
        memberName: '测试用户',
        amount: 100,
      },
    ];

    await prisma.transaction.create({
      data: {
        amount: 100,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: '不相关的多人预算分摊',
        date: new Date('2025-10-17'),
        userId: testUserId,
        accountBookId: testAccountBookId,
        budgetId: null,
        isMultiBudget: true,
        budgetAllocation: budgetAllocation as any,
      },
    });

    // 验证预算1的支出不应该包含这条记录（仍然是206）
    const spent1 = await budgetRepository.calculateSpentAmount(testBudgetId1);
    expect(spent1).toBe(206);

    // 验证预算2的支出应该增加100（46 + 100 = 146）
    const spent2 = await budgetRepository.calculateSpentAmount(testBudgetId2);
    expect(spent2).toBe(146);
  });
});

