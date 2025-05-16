import { BudgetPeriod, TransactionType } from '@prisma/client';
import { testBudgetId, testCategoryId, testUserId } from '../integration/setup';

// 模拟预算数据
export const mockBudgets = [
  {
    id: testBudgetId,
    name: 'Test Budget',
    amount: 1000,
    period: 'MONTHLY',
    categoryId: testCategoryId,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    rollover: false,
    userId: testUserId,
    familyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: testCategoryId,
      name: 'Test Category',
      type: TransactionType.EXPENSE,
      icon: 'test-icon',
      userId: testUserId,
      familyId: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
  {
    id: '2af5c095-e04a-4841-a24d-7fea1143cff2',
    name: 'Another Budget',
    amount: 2000,
    period: 'MONTHLY',
    categoryId: testCategoryId,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 2)),
    rollover: true,
    userId: testUserId,
    familyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: {
      id: testCategoryId,
      name: 'Test Category',
      type: TransactionType.EXPENSE,
      icon: 'test-icon',
      userId: testUserId,
      familyId: null,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
];

// 模拟BudgetRepository
export const mockBudgetRepository = {
  findAll: jest.fn().mockImplementation((userId, params) => {
    let filteredBudgets = mockBudgets.filter(budget => budget.userId === userId);
    
    // 应用过滤条件
    if (params.period) {
      filteredBudgets = filteredBudgets.filter(budget => budget.period === params.period);
    }
    
    if (params.categoryId) {
      filteredBudgets = filteredBudgets.filter(budget => budget.categoryId === params.categoryId);
    }
    
    // 应用分页
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedBudgets = filteredBudgets.slice(start, end);
    
    return {
      budgets: paginatedBudgets,
      total: filteredBudgets.length,
    };
  }),
  
  findById: jest.fn().mockImplementation((id) => {
    return mockBudgets.find(budget => budget.id === id) || null;
  }),
  
  findActiveBudgets: jest.fn().mockImplementation((userId) => {
    const now = new Date();
    return mockBudgets.filter(budget => 
      budget.userId === userId && 
      (!budget.endDate || new Date(budget.endDate) >= now)
    );
  }),
  
  create: jest.fn().mockImplementation((userId, data) => {
    const newBudget = {
      id: 'new-budget-id',
      name: data.name,
      amount: data.amount,
      period: data.period,
      categoryId: data.categoryId,
      startDate: data.startDate,
      endDate: data.endDate,
      rollover: data.rollover,
      userId,
      familyId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      category: mockBudgets[0].category, // 使用已有的分类
    };
    return newBudget;
  }),
  
  update: jest.fn().mockImplementation((id, data) => {
    const budget = mockBudgets.find(b => b.id === id);
    if (!budget) return null;
    
    const updatedBudget = {
      ...budget,
      ...data,
      updatedAt: new Date(),
    };
    return updatedBudget;
  }),
  
  delete: jest.fn().mockImplementation((id) => {
    const budget = mockBudgets.find(b => b.id === id);
    if (!budget) return null;
    return budget;
  }),
  
  calculateSpentAmount: jest.fn().mockImplementation(() => {
    return 500; // 固定返回500作为已花费金额
  }),
};

// 模拟CategoryRepository
export const mockCategoryRepository = {
  findById: jest.fn().mockImplementation((id) => {
    if (id === testCategoryId) {
      return mockBudgets[0].category;
    }
    return null;
  }),
};

// 模拟jest.mock
jest.mock('../../src/repositories/budget.repository', () => ({
  BudgetRepository: jest.fn().mockImplementation(() => mockBudgetRepository),
}));

jest.mock('../../src/repositories/category.repository', () => ({
  CategoryRepository: jest.fn().mockImplementation(() => mockCategoryRepository),
}));
