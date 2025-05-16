import request from 'supertest';
import { Express } from 'express';
import expressApp from '../../src/app';
import { setupTestEnvironment, teardownTestEnvironment, testUserToken, testBudgetId, testCategoryId } from './setup';
import '../mocks/budget.repository.mock';


describe('Budget API', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      // 设置测试环境
      await setupTestEnvironment();

      // 使用Express应用
      app = expressApp;

      console.log('Using test budget ID:', testBudgetId);
      console.log('Using test category ID:', testCategoryId);
    } catch (error) {
      console.error('Failed to setup test environment:', error);
      throw error; // 如果测试环境设置失败，则中止测试
    }
  });

  afterAll(async () => {
    // 清理测试环境
    await teardownTestEnvironment();
  });

  describe('GET /api/budgets', () => {
    it('should get all budgets', async () => {
      const response = await request(app)
        .get('/api/budgets')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter budgets by period', async () => {
      const response = await request(app)
        .get('/api/budgets?period=MONTHLY')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证所有返回的预算都是月度预算
      response.body.data.forEach((budget: any) => {
        expect(budget.period).toBe('MONTHLY');
      });
    });

    it('should filter budgets by category', async () => {
      const response = await request(app)
        .get(`/api/budgets?categoryId=${testCategoryId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);

      // 验证所有返回的预算都属于指定分类
      response.body.data.forEach((budget: any) => {
        expect(budget.categoryId).toBe(testCategoryId);
      });
    });

    it('should paginate budgets', async () => {
      const response = await request(app)
        .get('/api/budgets?page=1&limit=5')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/budgets/:id', () => {
    it('should get a specific budget', async () => {
      const response = await request(app)
        .get(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBudgetId);
      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('period');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('categoryId');
      expect(response.body).toHaveProperty('spent');
      expect(response.body).toHaveProperty('remaining');
      expect(response.body).toHaveProperty('progress');
    });

    it('should return 404 for non-existent budget', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/budgets/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('POST /api/budgets', () => {
    it('should create a new budget', async () => {
      const budgetData = {
        name: 'Test Budget Creation',
        amount: 2000,
        period: 'MONTHLY',
        categoryId: testCategoryId,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        rollover: false,
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(budgetData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', budgetData.name);
      expect(response.body).toHaveProperty('amount', budgetData.amount);
      expect(response.body).toHaveProperty('period', budgetData.period);
      expect(response.body).toHaveProperty('categoryId', budgetData.categoryId);
      expect(response.body).toHaveProperty('rollover', budgetData.rollover);
    });

    it('should return 400 if required fields are missing', async () => {
      const incompleteBudgetData = {
        name: 'Incomplete Budget',
        // 缺少必填字段
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(incompleteBudgetData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 if category does not exist', async () => {
      const budgetData = {
        name: 'Test Budget Invalid Category',
        amount: 2000,
        period: 'MONTHLY',
        categoryId: '00000000-0000-0000-0000-000000000000', // 不存在的分类ID
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        rollover: false,
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(budgetData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('分类不存在');
    });
  });

  describe('PUT /api/budgets/:id', () => {
    it('should update a budget', async () => {
      const updateData = {
        name: 'Updated Budget Name',
        amount: 2500,
        rollover: true,
      };

      const response = await request(app)
        .put(`/api/budgets/${testBudgetId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', testBudgetId);
      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('amount', updateData.amount);
      expect(response.body).toHaveProperty('rollover', updateData.rollover);
    });

    it('should return 404 for non-existent budget', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = {
        name: 'Updated Budget Name',
      };

      const response = await request(app)
        .put(`/api/budgets/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('DELETE /api/budgets/:id', () => {
    // 创建一个临时预算用于删除测试
    let tempBudgetId: string;

    beforeAll(async () => {
      const budgetData = {
        name: 'Temporary Budget for Deletion',
        amount: 1500,
        period: 'MONTHLY',
        categoryId: testCategoryId,
        startDate: new Date().toISOString(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        rollover: false,
      };

      const response = await request(app)
        .post('/api/budgets')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(budgetData);

      tempBudgetId = response.body.id;
    });

    it('should delete a budget', async () => {
      await request(app)
        .delete(`/api/budgets/${tempBudgetId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(204);

      // 验证预算已被删除
      await request(app)
        .get(`/api/budgets/${tempBudgetId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent budget', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/budgets/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('GET /api/budgets/active', () => {
    it('should get active budgets', async () => {
      const response = await request(app)
        .get('/api/budgets/active')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // 验证所有返回的预算都是活跃的（结束日期大于当前日期或为空）
      const now = new Date();
      response.body.forEach((budget: any) => {
        if (budget.endDate) {
          const endDate = new Date(budget.endDate);
          expect(endDate.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000); // 允许1天的误差
        }
      });
    });
  });
});
