import request from 'supertest';
import { Express } from 'express';
import expressApp from '../../src/app';
import { setupTestEnvironment, teardownTestEnvironment, testUserToken, testCategoryId, testTransactionId } from './setup';
import { TransactionType } from '@prisma/client';
import { TransactionExportFormat } from '../../src/models/transaction.model';

describe('Transaction API', () => {
  let app: Express;
  let createdTransactionId: string;

  beforeAll(async () => {
    try {
      // 设置测试环境
      await setupTestEnvironment();

      // 使用Express应用
      app = expressApp;

      // 使用测试记账ID
      createdTransactionId = testTransactionId;

      console.log('Using test transaction ID:', testTransactionId);
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

  describe('GET /api/transactions', () => {
    it('should get all transactions', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter transactions by type', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .query({ type: TransactionType.EXPENSE })
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0]).toHaveProperty('type', TransactionType.EXPENSE);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get('/api/transactions')
        .expect(401);
    });
  });

  describe('POST /api/transactions', () => {
    it('should create a new transaction', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      const transactionData = {
        amount: 200,
        type: TransactionType.EXPENSE,
        categoryId: testCategoryId,
        description: 'Test Transaction Creation',
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(transactionData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount', transactionData.amount);
      expect(response.body).toHaveProperty('type', transactionData.type);
      expect(response.body).toHaveProperty('categoryId', transactionData.categoryId);
      expect(response.body).toHaveProperty('description', transactionData.description);

      createdTransactionId = response.body.id;
    });

    it('should return 400 with invalid data', async () => {
      const invalidData = {
        amount: 100,
        // 缺少必填字段type和categoryId
        description: 'Invalid Transaction',
        date: new Date().toISOString(),
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should get a specific transaction', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      const response = await request(app)
        .get(`/api/transactions/${testTransactionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', testTransactionId);
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('type');
      expect(response.body).toHaveProperty('categoryId');
    });

    it('should return 404 for non-existent transaction', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/transactions/${nonExistentId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('不存在');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should update a transaction', async () => {
      const updateData = {
        amount: 150,
        description: 'Updated Transaction Description',
      };

      const response = await request(app)
        .put(`/api/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', createdTransactionId);
      expect(response.body).toHaveProperty('amount', updateData.amount);
      expect(response.body).toHaveProperty('description', updateData.description);
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should delete a transaction', async () => {
      await request(app)
        .delete(`/api/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(204);

      // 验证记账已被删除
      await request(app)
        .get(`/api/transactions/${createdTransactionId}`)
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(404);
    });
  });

  describe('GET /api/transactions/statistics', () => {
    it('should get transaction statistics', async () => {
      const response = await request(app)
        .get('/api/transactions/statistics')
        .set('Authorization', `Bearer ${testUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('byCategory');
      expect(Array.isArray(response.body.byCategory)).toBe(true);
    });
  });

  describe('POST /api/transactions/export', () => {
    it('should export transactions as CSV', async () => {
      const exportData = {
        format: TransactionExportFormat.CSV,
        type: TransactionType.EXPENSE,
      };

      const response = await request(app)
        .post('/api/transactions/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(exportData)
        .expect(200);

      expect(response.header['content-type']).toContain('text/csv');
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.header['content-disposition']).toContain('.csv');
      expect(response.text).toContain('ID,金额,类型,分类,描述,日期,创建时间');
    });

    it('should export transactions as JSON', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      const exportData = {
        format: TransactionExportFormat.JSON,
        type: TransactionType.EXPENSE,
      };

      const response = await request(app)
        .post('/api/transactions/export')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(exportData)
        .expect(200);

      expect(response.header['content-type']).toContain('application/json');
      expect(response.header['content-disposition']).toContain('attachment');
      expect(response.header['content-disposition']).toContain('.json');

      const exportedData = JSON.parse(response.text);
      expect(Array.isArray(exportedData)).toBe(true);
      if (exportedData.length > 0) {
        expect(exportedData[0]).toHaveProperty('id');
        expect(exportedData[0]).toHaveProperty('amount');
        expect(exportedData[0]).toHaveProperty('type');
      }
    });
  });

  describe('POST /api/transactions/import', () => {
    it('should import transactions from CSV', async () => {
      jest.setTimeout(30000); // 增加超时时间到30秒
      const csvContent = `金额,类型,分类,描述,日期
300,EXPENSE,Test Category,Imported Transaction,${new Date().toISOString().split('T')[0]}`;

      const importData = {
        format: TransactionExportFormat.CSV,
        fileContent: csvContent,
      };

      const response = await request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(importData)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('failed');
      expect(response.body).toHaveProperty('errors');
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.success).toBeGreaterThan(0);
    });

    it('should import transactions from JSON', async () => {
      const jsonContent = JSON.stringify([
        {
          amount: 400,
          type: 'EXPENSE',
          category: 'Test Category',
          description: 'Imported JSON Transaction',
          date: new Date().toISOString().split('T')[0],
        },
      ]);

      const importData = {
        format: TransactionExportFormat.JSON,
        fileContent: jsonContent,
      };

      const response = await request(app)
        .post('/api/transactions/import')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send(importData)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('success');
      expect(response.body.total).toBeGreaterThan(0);
      expect(response.body.success).toBeGreaterThan(0);
    });
  });
});
